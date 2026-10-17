'use server'

// Rotina dos cultos (Pregações): guardar a ordem de um culto, passá-la aos
// próximos cultos da série e gerir os modelos de cada congregação.
// Só os administradores e os líderes da Diaconia; tudo dentro da igreja.

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { sendPushToMembros } from '@/lib/web-push'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { serieDoEvento } from '@/lib/eventos-serie'
import { normalizarItens, semNotas } from '@/lib/rotina-culto'
import { congregacoesDosModelos, podeEditarRotina, podeGerirModelos } from '@/lib/rotina-culto-dados'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const SEM_PERMISSAO = 'Só os administradores e os líderes da Diaconia alteram a rotina dos cultos.'

function erro(e: unknown, padrao: string): { ok: false; error: string } {
    return { ok: false, error: (e instanceof Error && e.message) || padrao }
}

async function eventoQuePossoEditar(eventoId: number) {
    const sessao = await getSessionData()
    if (!sessao) throw new Error('Sessão expirada. Entre de novo.')
    const db = getTenantClient(sessao.tenantId)
    const evento = await db.evento.findUnique({ where: { id: eventoId }, select: { id: true, congregacao_id: true } })
    if (!evento) throw new Error('Culto não encontrado.')
    if (!(await podeEditarRotina(sessao, evento.congregacao_id))) throw new Error(SEM_PERMISSAO)
    return { sessao, db, evento }
}

function revalidar(eventoId?: number) {
    if (eventoId) revalidatePath(`/pregacao/culto/${eventoId}`)
    revalidatePath('/pregacao')
    revalidatePath('/membros/agenda')
}

/** Guarda a rotina de um culto (lista vazia = apaga). */
export async function guardarRotina(eventoId: number, entrada: unknown): Promise<Resultado> {
    try {
        const { sessao, db } = await eventoQuePossoEditar(eventoId)
        const itens = normalizarItens(entrada)
        const antes = await db.rotinaCulto.findUnique({ where: { evento_id: eventoId }, select: { itens: true } })
        if (!itens.length) {
            await db.rotinaCulto.deleteMany({ where: { evento_id: eventoId } })
        } else {
            await db.rotinaCulto.upsert({
                where: { evento_id: eventoId },
                create: { evento_id: eventoId, itens, atualizado_por: sessao.membroId, tenant_id: sessao.tenantId },
                update: { itens, atualizado_por: sessao.membroId },
            })
            // Quem passou a ter um momento recebe um aviso no telemóvel (não quem gravou)
            const jaTinha = new Set(normalizarItens(antes?.itens).filter((i) => i.membro_id).map((i) => `${i.membro_id}|${i.momento}`))
            const novos = itens.filter((i) => i.membro_id && i.membro_id !== sessao.membroId && !jaTinha.has(`${i.membro_id}|${i.momento}`))
            if (novos.length) {
                const evento = await db.evento.findUnique({ where: { id: eventoId }, select: { nome: true, data: true } })
                const quando = evento ? evento.data.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }) : ''
                const porMembro = new Map<number, string[]>()
                for (const i of novos) porMembro.set(i.membro_id!, [...(porMembro.get(i.membro_id!) ?? []), i.momento])
                after(async () => {
                    for (const [membroId, momentos] of porMembro) {
                        await sendPushToMembros([membroId], {
                            title: 'Tem um momento no culto',
                            body: `${momentos.join(', ')} · ${evento?.nome ?? 'Culto'}, ${quando}`,
                            url: `/pregacao/culto/${eventoId}`,
                        }).catch(() => {})
                    }
                })
            }
        }
        revalidar(eventoId)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Não foi possível guardar a rotina.')
    }
}

/**
 * Passa a rotina deste culto aos próximos cultos da mesma série (sem as notas,
 * que são de cada culto). Por omissão não mexe nos que já têm rotina.
 */
export async function aplicarRotinaASerie(eventoId: number, substituir = false): Promise<Resultado<{ aplicados: number; ignorados: number }>> {
    try {
        const { sessao, db } = await eventoQuePossoEditar(eventoId)
        const rotina = await db.rotinaCulto.findUnique({ where: { evento_id: eventoId }, select: { itens: true } })
        const itens = rotina ? semNotas(normalizarItens(rotina.itens)) : []
        if (!itens.length) return { ok: false, error: 'Guarde primeiro a rotina deste culto.' }
        const s = await serieDoEvento(db, eventoId)
        const outros = (s?.serie ?? []).filter((e) => e.id !== eventoId)
        if (!outros.length) return { ok: false, error: 'Não há mais cultos desta série marcados.' }
        const existentes = await db.rotinaCulto.findMany({ where: { evento_id: { in: outros.map((e) => e.id) } }, select: { evento_id: true } })
        const comRotina = new Set(existentes.map((r) => r.evento_id))
        let aplicados = 0
        for (const e of outros) {
            if (comRotina.has(e.id) && !substituir) continue
            await db.rotinaCulto.upsert({
                where: { evento_id: e.id },
                create: { evento_id: e.id, itens, atualizado_por: sessao.membroId, tenant_id: sessao.tenantId },
                update: { itens, atualizado_por: sessao.membroId },
            })
            aplicados++
        }
        revalidar(eventoId)
        return { ok: true, aplicados, ignorados: outros.length - aplicados }
    } catch (e) {
        return erro(e, 'Não foi possível passar a rotina aos outros cultos.')
    }
}

// ── MODELOS ────────────────────────────────────────────────────────────────

async function exigirGestorDeModelos(congregacaoId: number | null) {
    const sessao = await getSessionData()
    if (!sessao) throw new Error('Sessão expirada. Entre de novo.')
    if (!(await podeGerirModelos(sessao))) throw new Error(SEM_PERMISSAO)
    const minhas = congregacoesDosModelos(sessao)
    if (minhas && (congregacaoId === null || !minhas.includes(congregacaoId))) {
        throw new Error('Só pode alterar os modelos da sua congregação.')
    }
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

/** Cria ou altera um modelo de rotina. */
export async function guardarModelo(dados: { id?: number; nome: string; congregacaoId: number | null; itens: unknown }): Promise<Resultado<{ id: number }>> {
    try {
        const nome = (dados.nome ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
        if (!nome) return { ok: false, error: 'Dê um nome ao modelo (ex.: Culto de domingo).' }
        const itens = normalizarItens(dados.itens)
        if (!itens.length) return { ok: false, error: 'O modelo precisa de pelo menos um momento.' }
        const congregacaoId = dados.congregacaoId ? Number(dados.congregacaoId) : null
        const { db, sessao } = await exigirGestorDeModelos(congregacaoId)
        if (congregacaoId) {
            const c = await db.congregacao.findUnique({ where: { id: congregacaoId }, select: { id: true } })
            if (!c) return { ok: false, error: 'Congregação não encontrada.' }
        }
        if (dados.id) {
            const atual = await db.rotinaModelo.findUnique({ where: { id: dados.id }, select: { congregacao_id: true } })
            if (!atual) return { ok: false, error: 'Modelo não encontrado.' }
            await exigirGestorDeModelos(atual.congregacao_id) // também a congregação de onde vem
            await db.rotinaModelo.update({ where: { id: dados.id }, data: { nome, congregacao_id: congregacaoId, itens } })
            revalidatePath('/pregacao/modelos')
            return { ok: true, id: dados.id }
        }
        const novo = await db.rotinaModelo.create({ data: { nome, congregacao_id: congregacaoId, itens, tenant_id: sessao.tenantId } })
        revalidatePath('/pregacao/modelos')
        return { ok: true, id: novo.id }
    } catch (e) {
        return erro(e, 'Não foi possível guardar o modelo.')
    }
}

export async function apagarModelo(id: number): Promise<Resultado> {
    try {
        const sessao = await getSessionData()
        if (!sessao) throw new Error('Sessão expirada. Entre de novo.')
        const atual = await getTenantClient(sessao.tenantId).rotinaModelo.findUnique({ where: { id }, select: { congregacao_id: true } })
        if (!atual) return { ok: false, error: 'Modelo não encontrado.' }
        const { db } = await exigirGestorDeModelos(atual.congregacao_id)
        await db.rotinaModelo.delete({ where: { id } })
        revalidatePath('/pregacao/modelos')
        return { ok: true }
    } catch (e) {
        return erro(e, 'Não foi possível apagar o modelo.')
    }
}

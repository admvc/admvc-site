'use server'

// Esboços das pregações (app): quem prega escreve o seu, a partir do culto;
// quem gere as pregações escreve e altera todos. Tudo dentro da igreja.

import { revalidatePath } from 'next/cache'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirSermoes } from '@/lib/cursos-permissoes'
import { podeEditarSermao } from '@/lib/pregacoes'
import { podeEditarRotina } from '@/lib/rotina-culto-dados'
import { normalizarItens, palavraDe } from '@/lib/rotina-culto'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string }

function erro(e: unknown, padrao: string): { ok: false; error: string } {
    return { ok: false, error: (e instanceof Error && e.message) || padrao }
}

async function sessaoOuErro() {
    const sessao = await getSessionData()
    if (!sessao) throw new Error('Sessão expirada. Entre de novo.')
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

function revalidar(id?: string, eventoId?: number | null) {
    revalidatePath('/pregacao/historico')
    if (id) revalidatePath(`/pregacao/sermao/${id}`)
    if (eventoId) revalidatePath(`/pregacao/culto/${eventoId}`)
}

/** Lê "Mateus 25:14-30; João 3:16" para a lista de referências do esboço. */
function referencias(texto: string | null | undefined) {
    return (texto ?? '').split(/[;,]\s*(?=[1-3]?\s*\p{L})/u).map((t) => t.trim()).filter(Boolean).slice(0, 20).map((t) => {
        const m = /^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/.exec(t)
        return m
            ? { livro: m[1], capitulo: Number(m[2]), versiculo_inicio: m[3] ? Number(m[3]) : 0, versiculo_fim: m[4] ? Number(m[4]) : null }
            : { livro: t.slice(0, 60), capitulo: 0, versiculo_inicio: 0, versiculo_fim: null }
    })
}

/**
 * O esboço da Palavra de um culto: abre o que existe ou cria-o (com o tema e o
 * texto da rotina). Para quem prega, quem faz a rotina e quem gere as pregações.
 */
export async function abrirEsbocoDoCulto(eventoId: number): Promise<Resultado<{ id: string }>> {
    try {
        const { sessao, db } = await sessaoOuErro()
        const evento = await db.evento.findUnique({
            where: { id: eventoId },
            select: { id: true, data: true, congregacao_id: true, rotina: { select: { itens: true } } },
        })
        if (!evento) return { ok: false, error: 'Culto não encontrado.' }
        const palavra = palavraDe(evento.rotina ? normalizarItens(evento.rotina.itens) : [])
        if (!palavra?.membro_id) return { ok: false, error: 'Escolha primeiro, na rotina, o membro que prega.' }
        const pode = palavra.membro_id === sessao.membroId
            || (await podeEditarRotina(sessao, evento.congregacao_id))
            || (await podeGerirSermoes(sessao.membroId, sessao.role))
        if (!pode) return { ok: false, error: 'Só quem prega (ou quem gere as pregações) escreve o esboço.' }

        const existente = await db.sermao.findFirst({ where: { evento_id: eventoId, pregador_id: palavra.membro_id }, select: { id: true } })
        if (existente) return { ok: true, id: existente.id }
        const novo = await db.sermao.create({
            data: {
                titulo: palavra.nota || 'Palavra',
                referencias_biblicas: referencias(palavra.texto),
                data_pregacao: evento.data,
                pregador_id: palavra.membro_id,
                evento_id: eventoId,
                tenant_id: sessao.tenantId,
            },
            select: { id: true },
        })
        revalidar(novo.id, eventoId)
        return { ok: true, id: novo.id }
    } catch (e) {
        return erro(e, 'Não foi possível abrir o esboço.')
    }
}

/** Um esboço solto (sem culto), para quem gere as pregações. */
export async function novoEsboco(dados: { titulo: string; pregadorId: number; data: string }): Promise<Resultado<{ id: string }>> {
    try {
        const { sessao, db } = await sessaoOuErro()
        if (!(await podeGerirSermoes(sessao.membroId, sessao.role))) return { ok: false, error: 'Sem permissão para criar esboços.' }
        const titulo = (dados.titulo ?? '').trim().slice(0, 200)
        const data = new Date(`${dados.data}T00:00:00.000Z`)
        if (!titulo || Number.isNaN(data.getTime())) return { ok: false, error: 'Escreva o tema e a data.' }
        const pregador = await db.membro.findUnique({ where: { id: Number(dados.pregadorId) }, select: { id: true } })
        if (!pregador) return { ok: false, error: 'Escolha quem prega.' }
        const novo = await db.sermao.create({
            data: { titulo, data_pregacao: data, pregador_id: pregador.id, tenant_id: sessao.tenantId },
            select: { id: true },
        })
        revalidar(novo.id)
        return { ok: true, id: novo.id }
    } catch (e) {
        return erro(e, 'Não foi possível criar o esboço.')
    }
}

export type DadosEsboco = {
    titulo: string
    referencias: string // "Mateus 25:14-30; João 3:16"
    texto_corpo: string
    notas_privadas: string
    tags: string // "fé, oração"
    publicado: boolean
}

/** Guarda o esboço (quem prega ou quem gere as pregações). */
export async function guardarEsboco(id: string, dados: DadosEsboco): Promise<Resultado> {
    try {
        const { sessao, db } = await sessaoOuErro()
        const sermao = await db.sermao.findUnique({ where: { id }, select: { pregador_id: true, evento_id: true } })
        if (!sermao) return { ok: false, error: 'Esboço não encontrado.' }
        if (!(await podeEditarSermao(sessao, sermao))) return { ok: false, error: 'Só quem prega (ou quem gere as pregações) altera este esboço.' }
        const titulo = (dados.titulo ?? '').trim().slice(0, 200)
        if (!titulo) return { ok: false, error: 'Escreva o tema.' }
        const tags = (dados.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 15)
        await db.sermao.update({
            where: { id },
            data: {
                titulo,
                referencias_biblicas: referencias(dados.referencias),
                texto_corpo: (dados.texto_corpo ?? '').slice(0, 100_000) || null,
                notas_privadas: (dados.notas_privadas ?? '').slice(0, 20_000) || null,
                tags,
                publicado: !!dados.publicado,
            },
        })
        revalidar(id, sermao.evento_id)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Não foi possível guardar o esboço.')
    }
}

export async function apagarEsboco(id: string): Promise<Resultado> {
    try {
        const { sessao, db } = await sessaoOuErro()
        const sermao = await db.sermao.findUnique({ where: { id }, select: { pregador_id: true, evento_id: true } })
        if (!sermao) return { ok: false, error: 'Esboço não encontrado.' }
        if (!(await podeEditarSermao(sessao, sermao))) return { ok: false, error: 'Sem permissão para apagar este esboço.' }
        await db.escolaBiblica.updateMany({ where: { sermao_id: id }, data: { sermao_id: null } })
        await db.sermao.delete({ where: { id } })
        revalidar(undefined, sermao.evento_id)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Não foi possível apagar o esboço.')
    }
}

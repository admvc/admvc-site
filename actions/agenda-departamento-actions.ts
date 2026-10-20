'use server'

// Agenda de uma equipa (departamento) OU de um grupo: o líder (ou quem ele nomeou) e a administração marcam, mudam e
// cancelam encontros; depois do encontro registam o que se fez, quem esteve e uma foto (para o relatório).
// Horas como hora de Lisboa gravada em UTC (docs/BASE-DE-DADOS.md).

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { put } from '@vercel/blob'
import { comprimirImagem } from '@/lib/image-utils'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { podeGerirGrupo } from '@/lib/agenda-grupos'
import { tipoAgendaValido, TIPOS_AGENDA_DEPTO } from '@/lib/agenda'
import { sendPushToMembros } from '@/lib/web-push'
import { agoraLisboa } from '@/lib/alertas-encontros'

type R = { ok: true } | { ok: false; error: string }
/** O encontro é de um departamento ou de um grupo (nunca dos dois). */
export type AlvoAgenda = { deptoId?: number | null; grupoId?: number | null }
const texto = (v: FormDataEntryValue | null, max: number) => String(v ?? '').trim().slice(0, max) || null

const alvoDoForm = (f: FormData): AlvoAgenda => {
    const grupoId = Number(f.get('grupo_id')) || null
    return { grupoId, deptoId: grupoId ? null : Number(f.get('departamento_id')) || null }
}
/** O filtro do encontro (where) e os campos ao criar. */
const doAlvo = (a: AlvoAgenda) => (a.grupoId ? { grupo_id: a.grupoId } : { departamento_id: a.deptoId! })

async function gestor(alvo: AlvoAgenda) {
    const sessao = await requireAuth()
    const pode = alvo.grupoId ? await podeGerirGrupo(sessao, alvo.grupoId)
        : alvo.deptoId ? await podeGerirEscalasDoDepartamento(sessao, alvo.deptoId) : false
    if (!pode) throw new Error('Só o líder da equipa ou do grupo, ou a administração, mudam a agenda.')
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

type Db = ReturnType<typeof getTenantClient>

/** Os membros do alvo: a equipa (integrantes + líder) ou o grupo (membros + líderes). */
async function pessoasDoAlvo(db: Db, alvo: AlvoAgenda): Promise<number[]> {
    if (alvo.grupoId) {
        const g = await db.grupo.findUnique({ where: { id: alvo.grupoId }, select: { membros: { select: { id: true } }, lideres: { select: { id: true } } } })
        return [...new Set([...(g?.membros.map((m) => m.id) ?? []), ...(g?.lideres.map((m) => m.id) ?? [])])]
    }
    const equipa = await db.integranteDepartamento.findMany({ where: { departamento_id: alvo.deptoId! }, select: { membro_id: true } })
    const lider = await db.departamento.findUnique({ where: { id: alvo.deptoId! }, select: { lider_id: true } })
    return [...new Set([...equipa.map((i) => i.membro_id), ...(lider?.lider_id ? [lider.lider_id] : [])])]
}

const paginaDoAlvo = (a: AlvoAgenda) => (a.grupoId ? `/membros/grupo/${a.grupoId}/agenda` : `/membros/gestao/equipa/${a.deptoId}/agenda`)

/** Aviso no telemóvel a toda a equipa/grupo (menos a quem fez a alteração). */
async function avisar(db: Db, alvo: AlvoAgenda, autorId: number, titulo: string, corpo: string, url = '/membros/dashboard') {
    const ids = (await pessoasDoAlvo(db, alvo)).filter((m) => m !== autorId)
    if (ids.length) after(() => sendPushToMembros(ids, { title: titulo, body: corpo, url }).catch(() => {}))
}

function refrescar(alvo: AlvoAgenda) {
    revalidatePath('/membros/dashboard')
    revalidatePath(paginaDoAlvo(alvo))
    revalidatePath('/membros/agenda')
}

export async function guardarEncontro(formData: FormData): Promise<R> {
    try {
        const alvo = alvoDoForm(formData)
        const { sessao, db } = await gestor(alvo)
        const id = Number(formData.get('id')) || null
        const titulo = texto(formData.get('titulo'), 120)
        const dia = String(formData.get('dia') ?? '')
        const hora = String(formData.get('hora') ?? '')
        const horaFim = String(formData.get('hora_fim') ?? '')
        if (!titulo) return { ok: false, error: 'Escreva o que é (ex.: Reunião de equipa).' }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: 'Escolha o dia e a hora.' }
        const inicio = new Date(`${dia}T${hora}:00Z`)
        const fim = /^\d{2}:\d{2}$/.test(horaFim) ? new Date(`${dia}T${horaFim}:00Z`) : null
        if (fim && fim <= inicio) return { ok: false, error: 'A hora de fim tem de ser depois do início.' }
        const tipo = tipoAgendaValido(formData.get('tipo'))
        const dados = { titulo, tipo, inicio, fim, local: texto(formData.get('local'), 120), descricao: texto(formData.get('descricao'), 1000) }
        const quando = inicio.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
        if (id) {
            const antes = await db.agendaDepartamento.findFirst({ where: { id, ...doAlvo(alvo) }, select: { inicio: true, fim: true, local: true } })
            const n = await db.agendaDepartamento.updateMany({ where: { id, ...doAlvo(alvo) }, data: dados })
            if (!n.count || !antes) return { ok: false, error: 'Encontro não encontrado.' }
            const mudou = antes.inicio.getTime() !== inicio.getTime() || (antes.fim?.getTime() ?? null) !== (fim?.getTime() ?? null) || (antes.local ?? null) !== (dados.local ?? null)
            if (mudou && inicio >= agoraLisboa()) {
                await avisar(db, alvo, sessao.membroId, `Mudou: ${titulo}`, `Agora: ${quando}, às ${hora}${dados.local ? ` · ${dados.local}` : ''}`)
            }
        } else {
            await db.agendaDepartamento.create({ data: { ...dados, ...doAlvo(alvo), tenant_id: sessao.tenantId, criado_por: sessao.membroId } as never })
            await avisar(db, alvo, sessao.membroId, `${TIPOS_AGENDA_DEPTO[tipo]}: ${titulo}`, `${quando}, às ${hora}${dados.local ? ` · ${dados.local}` : ''}`, paginaDoAlvo(alvo))
        }
        refrescar(alvo)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível guardar.' }
    }
}

/** Depois do encontro: o que se fez, quem esteve (pessoas da equipa/grupo) e uma foto (como nos Grupos e PGs). */
export async function registarEncontro(formData: FormData): Promise<R> {
    try {
        const alvo = alvoDoForm(formData)
        const id = Number(formData.get('id'))
        const { db } = await gestor(alvo)
        const encontro = await db.agendaDepartamento.findFirst({ where: { id, ...doAlvo(alvo) }, select: { id: true } })
        if (!encontro) return { ok: false, error: 'Encontro não encontrado.' }

        // Só pessoas desta equipa/grupo
        const pedidos = [...new Set(formData.getAll('presentes_ids').map(Number).filter((n) => Number.isInteger(n) && n > 0))]
        const daEquipa = new Set(await pessoasDoAlvo(db, alvo))
        const ids = pedidos.filter((m) => daEquipa.has(m))
        const usaLista = formData.get('com_lista') === '1'
        const numero = formData.get('presentes') ? Math.max(0, Math.min(999, Number(formData.get('presentes')) || 0)) : null

        let foto_url: string | undefined
        const foto = formData.get('foto')
        if (foto instanceof File && foto.size > 0) {
            if (!/^image\/(jpeg|png|webp)$/.test(foto.type)) return { ok: false, error: 'A foto tem de ser JPG, PNG ou WEBP.' }
            if (foto.size > 4 * 1024 * 1024) return { ok: false, error: 'A foto é demasiado grande (máx. 4 MB).' }
            try {
                const webp = await comprimirImagem(Buffer.from(await foto.arrayBuffer()))
                foto_url = (await put(`agenda/${alvo.grupoId ? `grupo-${alvo.grupoId}` : `depto-${alvo.deptoId}`}/${id}-${Date.now()}.webp`, webp, { access: 'public', contentType: 'image/webp' })).url
            } catch (e) {
                const m = String((e as Error)?.message || '')
                return { ok: false, error: /token|unauthori|forbidden|private store|401|403/i.test(m)
                    ? 'A foto não foi enviada: o armazenamento de imagens recusou o acesso (chave do Blob na Vercel). Nada foi gravado.'
                    : 'A foto não foi enviada. Tente outra vez ou sem foto.' }
            }
        }

        await db.agendaDepartamento.update({
            where: { id },
            data: {
                registo: texto(formData.get('registo'), 3000),
                presentes: usaLista ? ids.length : numero,
                ...(usaLista ? { presentes_membros: { set: ids.map((m) => ({ id: m })) } } : {}),
                ...(foto_url ? { foto_url } : {}),
                ...(formData.get('tirar_foto') === '1' && !foto_url ? { foto_url: null } : {}),
            },
        })
        refrescar(alvo)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível guardar.' }
    }
}

/** Cancelar (não apagar): o encontro fica riscado e quem o tinha visto recebe o alerta "Cancelado". */
export async function cancelarEncontro(id: number, alvo: AlvoAgenda): Promise<R> {
    try {
        const { sessao, db } = await gestor(alvo)
        const e = await db.agendaDepartamento.findFirst({ where: { id, ...doAlvo(alvo) }, select: { titulo: true, tipo: true, inicio: true, cancelado_em: true } })
        if (!e) return { ok: false, error: 'Encontro não encontrado.' }
        if (e.cancelado_em) return { ok: true }
        await db.agendaDepartamento.updateMany({ where: { id, ...doAlvo(alvo) }, data: { cancelado_em: new Date() } })
        if (e.inicio >= agoraLisboa()) await avisar(db, alvo, sessao.membroId, `Cancelado: ${e.titulo}`, 'Este encontro foi cancelado.')
        refrescar(alvo)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível cancelar.' }
    }
}

/** Volta a pôr um encontro cancelado (engano do líder). */
export async function reativarEncontro(id: number, alvo: AlvoAgenda): Promise<R> {
    try {
        const { db } = await gestor(alvo)
        await db.agendaDepartamento.updateMany({ where: { id, ...doAlvo(alvo) }, data: { cancelado_em: null } })
        refrescar(alvo)
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Não foi possível reativar.' }
    }
}

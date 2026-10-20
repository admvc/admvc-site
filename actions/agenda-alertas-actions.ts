'use server'

// Alertas de encontro: fechar um alerta e responder "Vou" / "Não posso". Só quem é da equipa do encontro; só encontros futuros e
// não cancelados (para responder). Fechar vale em todos os aparelhos (fica na base, não no telemóvel).

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { agoraLisboa, daMinhaEquipa } from '@/lib/alertas-encontros'
import { grupoOndeEstou } from '@/lib/agenda-grupos'

type R = { ok: true } | { ok: false; error: string }

async function doMeuEncontro(agendaId: number) {
    const sessao = await requireAuth()
    if (!Number.isInteger(agendaId) || agendaId <= 0) throw new Error('Encontro inválido.')
    const db = getTenantClient(sessao.tenantId)
    const e = await db.agendaDepartamento.findFirst({
        where: { id: agendaId, OR: [{ departamento: daMinhaEquipa(sessao.membroId) }, { grupo: grupoOndeEstou(sessao.membroId) }] },
        select: { id: true, departamento_id: true, grupo_id: true, inicio: true, cancelado_em: true },
    })
    if (!e) throw new Error('Este encontro não é da sua equipa nem do seu grupo.')
    return { sessao, db, e }
}

function refrescar(e: { departamento_id: number | null; grupo_id: number | null }) {
    revalidatePath('/membros/dashboard')
    revalidatePath('/membros/agenda')
    if (e.departamento_id) revalidatePath(`/membros/gestao/equipa/${e.departamento_id}/agenda`)
    if (e.grupo_id) revalidatePath(`/membros/grupo/${e.grupo_id}/agenda`)
}

async function marcarFechado(db: ReturnType<typeof getTenantClient>, agendaId: number, membroId: number) {
    const ja = await db.agendaAlertaFechado.findFirst({ where: { agenda_id: agendaId, membro_id: membroId }, select: { id: true } })
    if (ja) await db.agendaAlertaFechado.update({ where: { id: ja.id }, data: { fechado_em: new Date() } })
    else await db.agendaAlertaFechado.create({ data: { agenda_id: agendaId, membro_id: membroId } as never })
}

export async function fecharAlertaEncontro(agendaId: number): Promise<R> {
    try {
        const { sessao, db, e } = await doMeuEncontro(agendaId)
        await marcarFechado(db, e.id, sessao.membroId)
        refrescar(e)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível fechar.' }
    }
}

export async function responderEncontro(agendaId: number, resposta: string, motivo?: string): Promise<R> {
    try {
        if (resposta !== 'VOU' && resposta !== 'NAO_POSSO') return { ok: false, error: 'Resposta inválida.' }
        const { sessao, db, e } = await doMeuEncontro(agendaId)
        if (e.cancelado_em) return { ok: false, error: 'Este encontro foi cancelado.' }
        if (e.inicio < agoraLisboa()) return { ok: false, error: 'Este encontro já passou.' }
        const texto = String(motivo ?? '').trim().slice(0, 200) || null
        const ja = await db.agendaResposta.findFirst({ where: { agenda_id: e.id, membro_id: sessao.membroId }, select: { id: true } })
        if (ja) await db.agendaResposta.update({ where: { id: ja.id }, data: { resposta, motivo: resposta === 'NAO_POSSO' ? texto : null, respondido_em: new Date() } })
        else await db.agendaResposta.create({ data: { agenda_id: e.id, membro_id: sessao.membroId, resposta, motivo: resposta === 'NAO_POSSO' ? texto : null } as never })
        await marcarFechado(db, e.id, sessao.membroId)   // responder também fecha o alerta
        refrescar(e)
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível guardar a resposta.' }
    }
}

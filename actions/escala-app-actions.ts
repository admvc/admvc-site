'use server'

// Acoes do ecra "Montar escala" (lider, no telemovel). Usam as actions que ja
// existem (criarEscalaAction/deletarEscalaAction), que verificam a permissao;
// aqui confirma-se tambem que o culto e a pessoa sao desta igreja e equipa.

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { sendPushToMembros } from '@/lib/web-push'
import { criarEscalaAction, deletarEscalaAction } from '@/actions/escalas-actions'

async function exigirGestor(deptoId: number) {
    const sessao = await requireAuth()
    if (!(await podeGerirEscalasDoDepartamento(sessao, deptoId))) {
        throw new Error('Não tem permissão para gerir as escalas desta equipa.')
    }
    return sessao
}

/** Escala uma pessoa da equipa numa funcao deste culto. */
export async function escalarNaFuncao(eventoId: number, deptoId: number, funcaoId: number, membroId: number) {
    try {
        const sessao = await exigirGestor(deptoId)
        const db = getTenantClient(sessao.tenantId)
        const [evento, funcao, integrante] = await Promise.all([
            db.evento.findUnique({ where: { id: eventoId }, select: { data: true } }),
            db.funcaoDepartamento.findFirst({ where: { id: funcaoId, departamento_id: deptoId }, select: { id: true } }),
            db.integranteDepartamento.findFirst({ where: { membro_id: membroId, departamento_id: deptoId }, select: { id: true } }),
        ])
        if (!evento || !funcao || !integrante) return { ok: false, error: 'Culto, função ou pessoa não encontrados nesta equipa.' }

        const f = new FormData()
        f.set('evento_id', String(eventoId))
        f.set('membro_id', String(membroId))
        f.set('departamento_id', String(deptoId))
        f.set('funcao_id', String(funcaoId))
        f.set('horario', evento.data.toTimeString().slice(0, 5))
        const r = await criarEscalaAction(f)
        revalidatePath(`/escalas/culto/${eventoId}`)
        return r
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Erro ao escalar.' }
    }
}

/** Tira uma pessoa da escala. */
export async function tirarDaEscala(escalaId: number) {
    const r = await deletarEscalaAction(escalaId)
    revalidatePath('/membros/dashboard')
    return r.ok ? { ok: true } : { ok: false, error: (r as any).error || 'Não foi possível tirar da escala.' }
}

/**
 * Lembrete (notificacao na app) a quem esta escalado neste culto e ainda nao
 * confirmou. Quem e escalado ja recebe uma notificacao na hora.
 */
export async function lembrarQuemNaoConfirmou(eventoId: number, deptoId: number) {
    try {
        const sessao = await exigirGestor(deptoId)
        const db = getTenantClient(sessao.tenantId)
        const [evento, escalas] = await Promise.all([
            db.evento.findUnique({ where: { id: eventoId }, select: { nome: true, data: true } }),
            db.escala.findMany({
                where: { evento_id: eventoId, departamento_id: deptoId, confirmado: false, motivo_recusa: null },
                select: { membro_id: true },
            }),
        ])
        if (!evento) return { ok: false, error: 'Culto não encontrado.' }
        const ids = [...new Set(escalas.map((e) => e.membro_id))]
        if (ids.length) {
            const quando = evento.data.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
            await sendPushToMembros(ids, {
                title: 'Confirma a tua escala',
                body: `${evento.nome}, ${quando}. Toca para confirmar.`,
                url: '/membros/dashboard',
            }).catch(() => {})
        }
        return { ok: true, enviados: ids.length }
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Erro ao enviar o lembrete.' }
    }
}

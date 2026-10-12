'use server'

// Apagamento (anonimizacao) a pedido do titular, feito por um administrador.
// A exportacao de dados e por rota (descarrega um ficheiro):
// /api/membros/meus-dados e /api/admin/membros/[id]/dados.

import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { requireRole } from '@/lib/auth-utils'
import { anonimizarMembro, anonimizarVisitante } from '@/lib/rgpd'

function normalizar(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Anonimiza um membro. Confirma-se escrevendo o nome completo.
 * Nao se anonimiza a si proprio (para nao ficar sem acesso por engano).
 */
export async function anonimizarMembroAction(membroId: number, confirmacaoNome: string) {
    try {
        const sessao = await requireRole(['ADMIN'])
        const membro = await prisma.membro.findUnique({
            where: { id: membroId },
            select: { id: true, first_name: true, last_name: true, tenant_id: true },
        })
        if (!membro || membro.tenant_id !== sessao.tenantId) return { error: 'Membro não encontrado.' }
        if (membro.id === sessao.membroId) return { error: 'Não pode anonimizar a sua própria conta.' }
        const nome = `${membro.first_name} ${membro.last_name}`
        if (normalizar(confirmacaoNome) !== normalizar(nome)) {
            return { error: 'O nome escrito não corresponde. Nada foi alterado.' }
        }

        await anonimizarMembro(membro.id)
        await audit({
            tenant_id: membro.tenant_id,
            categoria: 'RGPD',
            acao: 'ANONIMIZAR',
            alvo_id: membro.id,
            alvo_tipo: 'MEMBRO',
            descricao: `Membro #${membro.id} anonimizado a pedido do titular`,
        })
        revalidatePath('/admin/membros')
        return { ok: true }
    } catch (err: any) {
        return { error: err?.message || 'Erro ao anonimizar.' }
    }
}

/** Anonimiza um visitante (a pedido, antes do prazo automatico). */
export async function anonimizarVisitanteAction(visitanteId: number) {
    try {
        const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const v = await prisma.visitante.findUnique({ where: { id: visitanteId }, select: { id: true, tenant_id: true } })
        if (!v || v.tenant_id !== sessao.tenantId) return { error: 'Visitante não encontrado.' }

        await anonimizarVisitante(v.id)
        await audit({
            tenant_id: v.tenant_id,
            categoria: 'RGPD',
            acao: 'ANONIMIZAR',
            alvo_id: v.id,
            descricao: `Visitante #${v.id} anonimizado a pedido`,
        })
        revalidatePath('/departamentos/acolhimento/dashboard')
        return { ok: true }
    } catch (err: any) {
        return { error: err?.message || 'Erro ao anonimizar.' }
    }
}

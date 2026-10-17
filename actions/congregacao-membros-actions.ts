'use server'

// Dizer de que congregação são vários membros de uma vez (só o administrador geral).

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { audit } from '@/lib/audit'

export async function atribuirCongregacao(membroIds: number[], congregacaoId: number) {
    try {
        const sessao = await requireAuth()
        if (sessao.role !== 'ADMIN') return { ok: false, error: 'Só o administrador geral muda a congregação de vários membros.' }
        const db = getTenantClient(sessao.tenantId)
        const casa = await db.congregacao.findUnique({ where: { id: Number(congregacaoId) }, select: { id: true, nome: true } })
        if (!casa) return { ok: false, error: 'Congregação não encontrada.' }
        const ids = membroIds.map(Number).filter(Number.isInteger).slice(0, 500)
        // Só os que ainda não têm casa (não muda quem já tem)
        const r = await db.membro.updateMany({ where: { id: { in: ids }, congregacao_id: null }, data: { congregacao_id: casa.id } })
        audit({ tenant_id: sessao.tenantId, categoria: 'MEMBROS', acao: 'EDITAR', descricao: `${r.count} membros sem congregação passaram para ${casa.nome}` }).catch(() => {})
        revalidatePath('/admin/membros')
        return { ok: true, n: r.count }
    } catch (err) {
        console.error('[CONGREGACAO] Atribuir:', err)
        return { ok: false, error: 'Não foi possível atribuir.' }
    }
}

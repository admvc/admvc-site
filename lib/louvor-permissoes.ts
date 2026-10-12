// lib/louvor-permissoes.ts
// Quem gere o repertorio e as cifras: admin, o lider do Louvor, ou um
// integrante do Louvor com "pode gerir escalas".

import { getTenantClient } from '@/lib/prisma'
import { isAdmin, requireAuth } from '@/lib/auth-utils'

export async function requireLouvorPermission() {
    const session = await requireAuth()
    if (isAdmin(session.role)) return session

    const db = getTenantClient(session.tenantId)
    const lideraLouvor = await db.departamento.findFirst({
        where: { lider_id: session.membroId, nome: { contains: 'Louvor', mode: 'insensitive' } },
    })
    const delegadoLouvor = await db.integranteDepartamento.findFirst({
        where: {
            membro_id: session.membroId,
            pode_gerir_escalas: true,
            departamento: { nome: { contains: 'Louvor', mode: 'insensitive' } },
        },
    })
    if (!lideraLouvor && !delegadoLouvor) {
        throw new Error('Apenas lideres ou delegados do Louvor podem gerir o repertorio.')
    }
    return session
}

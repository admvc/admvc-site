// lib/escalas-permissoes.ts
// Quem gere as escalas de um departamento. Usada nas actions de escalas e nas
// rotas /api/escalas (fora de actions/ para nao ficar exposta como action).

import { getTenantClient } from '@/lib/prisma'
import { isAdmin, type SessionData } from '@/lib/auth-utils'

/**
 * Admin (ou admin de congregacao), o lider do departamento, ou um integrante
 * com "pode gerir escalas" ou com uma funcao de lider.
 */
export async function podeGerirEscalasDoDepartamento(
    session: Pick<SessionData, 'membroId' | 'role' | 'tenantId'>,
    deptoId: number,
): Promise<boolean> {
    if (isAdmin(session.role)) return true
    const db = getTenantClient(session.tenantId)
    const depto = await db.departamento.findUnique({ where: { id: deptoId }, select: { lider_id: true } })
    if (!depto) return false
    if (depto.lider_id === session.membroId) return true
    const vinculoLider = await db.integranteDepartamento.findFirst({
        where: {
            membro_id: session.membroId,
            departamento_id: deptoId,
            OR: [
                { pode_gerir_escalas: true },
                { funcoes: { some: { funcao: { nome: { contains: 'Lider', mode: 'insensitive' } } } } },
            ],
        },
    })
    return !!vinculoLider
}

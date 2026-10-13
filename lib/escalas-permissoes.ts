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
    // Uma so consulta (cada ida a base conta)
    const n = await db.departamento.count({ where: { id: deptoId, ...gereDepartamento(session.membroId) } })
    return n > 0
}

/** Filtro de departamento: o lider, ou um integrante nomeado por ele. */
export function gereDepartamento(membroId: number) {
    return {
        OR: [
            { lider_id: membroId },
            {
                integrantes: {
                    some: {
                        membro_id: membroId,
                        OR: [
                            { pode_gerir_escalas: true },
                            // "Lider" ou "Líder" (o ILIKE nao ignora acentos)
                            { funcoes: { some: { funcao: { nome: { contains: 'Lider', mode: 'insensitive' as const } } } } },
                            { funcoes: { some: { funcao: { nome: { contains: 'Líder', mode: 'insensitive' as const } } } } },
                        ],
                    },
                },
            },
        ],
    }
}

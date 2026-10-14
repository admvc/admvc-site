// lib/louvor-permissoes.ts
// Quem ve e quem gere o repertorio. O ministerio de louvor e o departamento
// marcado com e_louvor (nao se procura "louvor" no nome).

import { getTenantClient } from '@/lib/prisma'
import { isAdmin, requireAuth, type SessionData } from '@/lib/auth-utils'
import { gereDepartamento } from '@/lib/escalas-permissoes'

type Sessao = Pick<SessionData, 'membroId' | 'role' | 'tenantId'>

/**
 * Gere o repertorio e as músicas dos cultos quem gere as escalas de um
 * ministério de louvor: admin, o líder, ou alguem nomeado pelo líder
 * ("pode gerir escalas" ou uma função de Líder). A mesma regra das escalas.
 */
export async function podeGerirRepertorio(session: Sessao): Promise<boolean> {
    if (isAdmin(session.role)) return true
    const db = getTenantClient(session.tenantId)
    const n = await db.departamento.count({ where: { e_louvor: true, ...gereDepartamento(session.membroId) } })
    return n > 0
}

/** Ve o repertorio: admin ou quem esta (ou lidera) um ministerio de louvor. */
export async function podeVerRepertorio(session: Sessao): Promise<boolean> {
    if (isAdmin(session.role)) return true
    const db = getTenantClient(session.tenantId)
    const n = await db.departamento.count({
        where: {
            e_louvor: true,
            OR: [{ lider_id: session.membroId }, { integrantes: { some: { membro_id: session.membroId } } }],
        },
    })
    return n > 0
}

export async function requireLouvorPermission() {
    const session = await requireAuth()
    if (!(await podeGerirRepertorio(session))) {
        throw new Error('Apenas o líder do louvor ou alguém nomeado por ele pode mudar as músicas.')
    }
    return session
}

/** Envia as musicas de um culto para o Holyrics: quem ve o repertorio ou e da midia. */
export async function podeUsarHolyrics(session: Sessao): Promise<boolean> {
    if (await podeVerRepertorio(session)) return true
    const db = getTenantClient(session.tenantId)
    const n = await db.departamento.count({
        where: {
            OR: ['mídia', 'midia', 'multimédia', 'multimedia'].map((t) => ({ nome: { contains: t, mode: 'insensitive' as const } })),
            AND: [{ OR: [{ lider_id: session.membroId }, { integrantes: { some: { membro_id: session.membroId } } }] }],
        },
    })
    return n > 0
}

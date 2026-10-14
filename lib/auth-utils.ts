import { cookies } from 'next/headers'
import * as React from 'react'
import prisma from '@/lib/prisma'
import { COOKIE_MEMBRO, impressaoDaSenha, lerSessao } from '@/lib/sessao-core'

/**
 * Interface representing the session data structure.
 * Tudo o que aqui vem foi confirmado na base, nao no cookie.
 */
export interface SessionData {
    membroId: number;
    tenantId: number;
    role: string;
    email?: string;
    plano?: string;
    congregacaoId?: number;
    /** Sessao aberta por um Super Admin do Cloud ("impersonar") */
    impersonadoPor?: { saId: number; nome: string };
}

export type Role = 'ADMIN' | 'CONGREGATION_ADMIN' | 'LEADER' | 'USER' | 'FINANCE' | 'MANAGER'

/**
 * Verifica se o role tem permissoes de administracao (ADMIN ou CONGREGATION_ADMIN).
 */
export function isAdmin(role: string): boolean {
    return role === 'ADMIN' || role === 'CONGREGATION_ADMIN'
}

/**
 * Requires an authenticated session. Throws if not authenticated.
 * Use in any server action that needs a logged-in user.
 */
export async function requireAuth(): Promise<SessionData> {
    const session = await getSessionData()
    if (!session) throw new Error('Não autenticado. Faça login para continuar.')
    return session
}

/**
 * Requires an authenticated session with one of the specified roles.
 * Throws if not authenticated or role is not allowed.
 */
export async function requireRole(rolesPermitidos: Role[]): Promise<SessionData> {
    const session = await requireAuth()
    if (!rolesPermitidos.includes(session.role as Role)) {
        throw new Error('Sem permissão para esta ação.')
    }
    return session
}

/**
 * Le a sessao a partir do valor do cookie: verifica a assinatura e a validade,
 * e depois confirma na base que o membro existe, esta ativo, pertence a mesma
 * igreja e nao mudou de senha. O papel e a igreja devolvidos vem da base.
 */
export async function sessaoDoCookie(valor: string | undefined): Promise<SessionData | null> {
    const payload = await lerSessao(valor)
    if (!payload || payload.t !== 'm') return null

    const membro = await prisma.membro.findUnique({
        where: { id: payload.id },
        select: {
            id: true,
            email: true,
            role: true,
            tenant_id: true,
            congregacao_id: true,
            is_active: true,
            password: true,
            tenant: { select: { plano: true } },
        },
    })
    if (!membro || membro.is_active === false) return null
    if (membro.tenant_id !== payload.tid) return null
    if ((await impressaoDaSenha(membro.password)) !== payload.pw) return null

    // Impersonacao: so vale enquanto a conta do Cloud estiver ativa
    let impersonadoPor: SessionData['impersonadoPor']
    if (payload.imp) {
        const sa = await prisma.superAdmin.findUnique({ where: { id: payload.imp }, select: { id: true, nome: true, is_active: true } })
        if (!sa || !sa.is_active) return null
        impersonadoPor = { saId: sa.id, nome: sa.nome }
    }

    return {
        membroId: membro.id,
        tenantId: membro.tenant_id,
        role: String(membro.role).toUpperCase(),
        email: membro.email || undefined,
        plano: membro.tenant?.plano || 'FREE',
        congregacaoId: membro.congregacao_id ?? undefined,
        ...(impersonadoPor ? { impersonadoPor } : {}),
    }
}

// Uma consulta a base por pedido, mesmo que varias funcoes peçam a sessao.
// (`cache` existe no React do Next; nos testes nao, e ai corre sem memoria.)
const memoPorPedido: <T extends (...a: any[]) => any>(f: T) => T =
    (React as any).cache ?? ((f: any) => f)

const sessaoDoPedido = memoPorPedido(async (): Promise<SessionData | null> => {
    const cookieStore = await cookies()
    return sessaoDoCookie(cookieStore.get(COOKIE_MEMBRO)?.value)
})

/**
 * Devolve a sessao do membro autenticado, ou null.
 */
export async function getSessionData(): Promise<SessionData | null> {
    return sessaoDoPedido()
}

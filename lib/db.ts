// lib/db.ts
// Helper centralizado para obter o cliente Prisma filtrado por tenant.
// Usar em TODAS as paginas e actions protegidas em vez do prisma global.
//
// A igreja e o utilizador vem SEMPRE da sessao verificada (lib/auth-utils.ts),
// nunca de cabecalhos do pedido. Os nomes "FromHeaders" ficaram por
// compatibilidade com o codigo que ja os usa.

import { redirect } from 'next/navigation'
import { getTenantClient } from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'

/**
 * Retorna o cliente Prisma filtrado pelo tenant_id do utilizador autenticado.
 */
export async function getDb() {
    const tenantId = await getTenantIdFromHeaders()
    // Sem sessao valida (expirou, senha mudou, conta inativa): para o login,
    // em vez de rebentar com erro 500 nas paginas que pedem a base primeiro.
    if (!tenantId) redirect('/membros/login')
    return getTenantClient(tenantId)
}

/**
 * Retorna o tenant_id do utilizador autenticado (0 sem sessao).
 */
export async function getTenantIdFromHeaders() {
    return (await getSessionData())?.tenantId ?? 0
}

/**
 * Retorna o user_id do utilizador autenticado (0 sem sessao).
 */
export async function getUserIdFromHeaders() {
    return (await getSessionData())?.membroId ?? 0
}

/**
 * Retorna o user_role do utilizador autenticado ('' sem sessao).
 */
export async function getUserRoleFromHeaders() {
    return (await getSessionData())?.role ?? ''
}

/**
 * Retorna a congregacao do utilizador autenticado (undefined sem sessao).
 */
export async function getCongregacaoIdDaSessao() {
    return (await getSessionData())?.congregacaoId
}

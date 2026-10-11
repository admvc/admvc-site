// lib/db.ts
// Helper centralizado para obter o cliente Prisma filtrado por tenant.
// Usar em TODAS as paginas e actions protegidas em vez do prisma global.

import { headers } from 'next/headers'
import { getTenantClient } from '@/lib/prisma'

/**
 * Retorna o cliente Prisma filtrado pelo tenant_id do utilizador autenticado.
 * Extrai o tenant_id do header x-tenant-id injectado pelo middleware.
 */
export async function getDb() {
    const headersList = await headers()
    const tenantId = Number(headersList.get('x-tenant-id') || 0)
    if (!tenantId) throw new Error('Tenant nao identificado.')
    return getTenantClient(tenantId)
}

/**
 * Retorna o tenant_id do utilizador autenticado.
 */
export async function getTenantIdFromHeaders() {
    const headersList = await headers()
    return Number(headersList.get('x-tenant-id') || 0)
}

/**
 * Retorna o user_id do utilizador autenticado.
 */
export async function getUserIdFromHeaders() {
    const headersList = await headers()
    return Number(headersList.get('x-user-id') || 0)
}

/**
 * Retorna o user_role do utilizador autenticado.
 */
export async function getUserRoleFromHeaders() {
    const headersList = await headers()
    return headersList.get('x-user-role') || ''
}

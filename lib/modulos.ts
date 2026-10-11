// lib/modulos.ts
// Helpers server-side para verificação de módulos activos

import prisma from '@/lib/prisma'
import { headers } from 'next/headers'
import { type Modulo, isModuloAtivo, getModulosAtivos, PLANOS, type PlanoId } from '@/lib/planos'

interface TenantModuloInfo {
    tenantId: number
    plano: string
    modulosAtivos: Modulo[]
}

/**
 * Obtém informação do tenant e seus módulos activos.
 * Usa o header x-tenant-id injectado pelo middleware.
 */
export async function getTenantModulos(): Promise<TenantModuloInfo> {
    const headersList = await headers()
    const tenantId = Number(headersList.get('x-tenant-id') || 0)

    if (!tenantId) {
        throw new Error('Igreja não identificada.')
    }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plano: true, modulos_custom: true },
    })

    if (!tenant) {
        throw new Error('Igreja não encontrada.')
    }

    const modulosCustom = tenant.modulos_custom as string[] | null
    const modulosAtivos = getModulosAtivos(tenant.plano, modulosCustom)

    return {
        tenantId,
        plano: tenant.plano,
        modulosAtivos,
    }
}

/**
 * Verifica se um módulo está activo para o tenant actual.
 * Lança erro se o módulo não está disponível no plano.
 * Usar em server actions para bloquear operações.
 */
export async function requireModulo(modulo: Modulo): Promise<TenantModuloInfo> {
    const info = await getTenantModulos()

    if (!info.modulosAtivos.includes(modulo)) {
        const planoConfig = PLANOS[info.plano as PlanoId]
        throw new Error(
            `O módulo "${modulo}" não está disponível no plano ${planoConfig?.nome || info.plano}. ` +
            `Contacte a administração para activar esta funcionalidade.`
        )
    }

    return info
}

/**
 * Verifica se um módulo está activo (retorna boolean, não lança erro).
 * Usar em pages para mostrar/esconder elementos condicionalmente.
 */
export async function checkModulo(modulo: Modulo): Promise<boolean> {
    try {
        const info = await getTenantModulos()
        return info.modulosAtivos.includes(modulo)
    } catch {
        return false
    }
}

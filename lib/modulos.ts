// lib/modulos.ts
// Helpers server-side para verificação de módulos activos

import * as React from 'react'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { type Modulo, isModuloAtivo, getModulosAtivos, PLANOS, type PlanoId } from '@/lib/planos'
import { getTenantIdFromHeaders } from '@/lib/db'

// Uma consulta por pedido (o `cache` do React existe no Next; nos testes nao).
const memoPorPedido: <T extends (...a: any[]) => any>(f: T) => T = (React as any).cache ?? ((f: any) => f)

interface TenantModuloInfo {
    tenantId: number
    plano: string
    modulosAtivos: Modulo[]
}

/**
 * Obtém informação do tenant e seus módulos activos.
 * Usa a igreja da sessao verificada (lib/db.ts).
 */
export async function getTenantModulos(): Promise<TenantModuloInfo> {
    const tenantId = await getTenantIdFromHeaders()

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

/**
 * Lista de modulos ativos da igreja da sessao (plano + o que esta ligado no
 * painel Cloud). Vazia sem sessao. Uma consulta por pedido.
 */
export const modulosAtivosDaIgreja = memoPorPedido(async (): Promise<Modulo[]> => {
    try {
        return (await getTenantModulos()).modulosAtivos
    } catch {
        return []
    }
})

/**
 * Para layouts e paginas: se o modulo estiver desligado, volta ao inicio
 * (em vez de mostrar uma area que a igreja nao usa).
 */
export async function exigirModuloAtivo(modulo: Modulo, destino = '/membros/dashboard') {
    const ativos = await modulosAtivosDaIgreja()
    if (!ativos.includes(modulo)) redirect(destino)
}

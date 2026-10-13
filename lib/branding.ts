// lib/branding.ts
// O tema e o logotipo da igreja actual. As cores de cada tema estao em
// app/globals.css (claro e escuro); aqui so se escolhe qual.

import prisma from '@/lib/prisma'
import { getTenantIdFromHeaders } from '@/lib/db'

/** Os temas do portal (um de cada vez; claro/escuro segue o telemovel). */
export const TEMAS = ['verde', 'louveapp'] as const
export type Tema = typeof TEMAS[number]
export const temaValido = (t: unknown): Tema => (TEMAS.includes(t as Tema) ? (t as Tema) : 'verde')

export interface TenantBranding {
    tema: Tema
    logoUrl: string | null
}

const DEFAULTS: TenantBranding = { tema: 'verde', logoUrl: null }

/** Tema e logotipo da igreja da sessao (os de omissao se nao houver sessao). */
export async function getTenantBranding(): Promise<TenantBranding> {
    try {
        const tenantId = await getTenantIdFromHeaders()
        if (!tenantId) return DEFAULTS
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { tema: true, logo_url: true },
        })
        if (!tenant) return DEFAULTS
        return { tema: temaValido(tenant.tema), logoUrl: tenant.logo_url || null }
    } catch {
        return DEFAULTS
    }
}

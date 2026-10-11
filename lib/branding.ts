// lib/branding.ts
// Helper para obter branding (cores e logo) do tenant actual

import prisma from '@/lib/prisma'
import { headers } from 'next/headers'

export interface TenantBranding {
    corPrimaria: string
    corSecundaria: string
    corFundo: string
    logoUrl: string | null
}

const DEFAULTS: TenantBranding = {
    corPrimaria: '#3F6B4F',
    corSecundaria: '#7FAE93',
    corFundo: '#0b0d0c',
    logoUrl: null,
}

/**
 * Busca as cores e logo do tenant actual via header x-tenant-id.
 * Retorna defaults se o tenant nao tem customizacao.
 */
export async function getTenantBranding(): Promise<TenantBranding> {
    try {
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)

        if (!tenantId) return DEFAULTS

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                cor_primaria: true,
                cor_secundaria: true,
                cor_fundo: true,
                logo_url: true,
            },
        })

        if (!tenant) return DEFAULTS

        return {
            corPrimaria: tenant.cor_primaria || DEFAULTS.corPrimaria,
            corSecundaria: tenant.cor_secundaria || DEFAULTS.corSecundaria,
            corFundo: tenant.cor_fundo || DEFAULTS.corFundo,
            logoUrl: tenant.logo_url || null,
        }
    } catch {
        return DEFAULTS
    }
}

/**
 * Gera uma cor mais escura (deep) a partir de uma cor hex.
 */
export function gerarCorDeep(hex: string): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 30)
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 30)
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 30)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Gera uma cor de fundo secundaria (bg2) ligeiramente mais clara.
 */
export function gerarBg2(hex: string): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + 12)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + 14)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + 12)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Converte hex para string RGB "r, g, b" (para Tailwind opacity).
 */
export function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
}

/** Gera cor de border derivada do fundo (ligeiramente mais clara). */
export function gerarBorder(bgHex: string): string {
    const r = Math.min(255, parseInt(bgHex.slice(1, 3), 16) + 20)
    const g = Math.min(255, parseInt(bgHex.slice(3, 5), 16) + 22)
    const b = Math.min(255, parseInt(bgHex.slice(5, 7), 16) + 20)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Detecta se o fundo é claro (para ajustar fg/muted). */
export function isFundoClaro(hex: string): boolean {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

/** Gera cor de texto principal baseada no fundo. */
export function gerarFg(bgHex: string): string {
    return isFundoClaro(bgHex) ? '#1a1a1a' : '#e6efea'
}

/** Gera cor de texto secundário baseada no fundo. */
export function gerarMuted(bgHex: string): string {
    return isFundoClaro(bgHex) ? '#6b7280' : '#b8cfc4'
}

/** Gera cor de texto terciário baseada no fundo. */
export function gerarMuted2(bgHex: string): string {
    return isFundoClaro(bgHex) ? '#9ca3af' : '#7e948a'
}

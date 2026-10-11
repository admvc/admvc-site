import prisma from '@/lib/prisma'
import { cached, invalidatePrefix } from '@/lib/redis'

// ── Keys com tenant prefix ───────────────────────────────────────────────────
const k = (tenant: number, entity: string) => `admvc:${tenant}:${entity}`

// ── Membros activos (usado em ~10 páginas) ──────────────────────────────────
export function getCachedMembrosAtivos(tenantId: number) {
    return cached(k(tenantId, 'membros-ativos'), 60, () =>
        prisma.membro.findMany({
            where: { tenant_id: tenantId, is_active: true },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
        })
    )
}

// ── Departamentos (usado em ~8 páginas) ──────────────────────────────────────
export function getCachedDepartamentos(tenantId: number) {
    return cached(k(tenantId, 'departamentos'), 120, () =>
        prisma.departamento.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        })
    )
}

// ── Grupos (usado em ~5 páginas) ─────────────────────────────────────────────
export function getCachedGrupos(tenantId: number) {
    return cached(k(tenantId, 'grupos'), 120, () =>
        prisma.grupo.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        })
    )
}

// ── Sermões recentes (usado em ~3 páginas) ───────────────────────────────────
export function getCachedSermoes(tenantId: number) {
    return cached(k(tenantId, 'sermoes'), 60, () =>
        prisma.sermao.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, titulo: true, data_pregacao: true },
            orderBy: { data_pregacao: 'desc' },
            take: 100,
        })
    )
}

// ── Congregações (usado em ~6 páginas) ───────────────────────────────────────
export function getCachedCongregacoes(tenantId: number) {
    return cached(k(tenantId, 'congregacoes'), 300, () =>
        prisma.congregacao.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        })
    )
}

// ── Tenant config (usado em ~5 páginas media) ────────────────────────────────
export function getCachedTenantConfig(tenantId: number) {
    return cached(k(tenantId, 'tenant-config'), 300, () =>
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true, nome: true,
                holyrics_url: true, holyrics_token: true,
                x32_ip: true, x32_port: true,
                lumikit_url: true, lumikit_cenas: true,
                regioes_custom: true,
            },
        })
    )
}

// ── Invalidação por entidade ─────────────────────────────────────────────────
export async function invalidateMembros(tenantId: number) {
    await invalidatePrefix(k(tenantId, 'membros'))
}

export async function invalidateDepartamentos(tenantId: number) {
    await invalidatePrefix(k(tenantId, 'departamentos'))
}

export async function invalidateGrupos(tenantId: number) {
    await invalidatePrefix(k(tenantId, 'grupos'))
}

export async function invalidateSermoes(tenantId: number) {
    await invalidatePrefix(k(tenantId, 'sermoes'))
}

export async function invalidateTenant(tenantId: number) {
    await invalidatePrefix(k(tenantId, 'tenant'))
}

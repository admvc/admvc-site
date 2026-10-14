'use server'
// Mapa das famílias (só administradores): localizar as moradas que faltam.

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { geocodificarMorada } from '@/lib/geocode'
import { chaveMorada, consultasDeMorada, porLocalizar, type MembroMapa } from '@/lib/mapa-familias'

const POR_VEZ = 4 // o OpenStreetMap aceita 1 pedido por segundo: poucos de cada vez
const esperar = (ms: number) => new Promise(r => setTimeout(r, ms))

const SELECAO = {
    id: true, first_name: true, last_name: true, familia_id: true, congregacao_id: true,
    address_1: true, address_number: true, postal_code: true, neighborhood: true, id_city: true,
    latitude: true, longitude: true, geo_fonte: true, geo_chave: true, geo_falhou: true,
} as const

/**
 * Localiza algumas moradas em falta (rua → código postal → bairro). A página
 * chama outra vez enquanto houver; devolve quantas faltam.
 */
export async function localizarMoradasAction() {
    try {
        const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const db = getTenantClient(sessao.tenantId)
        const membros = await db.membro.findMany({ where: { is_active: true }, select: SELECAO })
        const lista = (membros as unknown as MembroMapa[]).filter(porLocalizar)
        let encontrados = 0, pedidos = 0
        for (const m of lista.slice(0, POR_VEZ)) {
            let achado: { lat: number; lng: number; fonte: string } | null = null
            for (const c of consultasDeMorada(m)) {
                if (pedidos++ > 0) await esperar(1100)
                const r = await geocodificarMorada(c.q, '')
                if (r) { achado = { lat: r.latitude, lng: r.longitude, fonte: c.fonte }; break }
            }
            await db.membro.update({
                where: { id: m.id },
                data: achado
                    ? { latitude: achado.lat, longitude: achado.lng, geo_fonte: achado.fonte, geo_chave: chaveMorada(m), geo_falhou: false }
                    : { latitude: null, longitude: null, geo_fonte: null, geo_chave: chaveMorada(m), geo_falhou: true },
            })
            if (achado) encontrados++
        }
        revalidatePath('/admin/familias/mapa')
        return { ok: true as const, feitos: Math.min(lista.length, POR_VEZ), encontrados, faltam: Math.max(0, lista.length - POR_VEZ) }
    } catch (error) {
        console.error('[MAPA] Erro ao localizar moradas:', error)
        return { ok: false as const, error: 'Não foi possível localizar as moradas.' }
    }
}

/** Voltar a tentar as moradas que não se encontraram (ex.: depois de as corrigir no OpenStreetMap). */
export async function repetirFalhadasAction() {
    try {
        const sessao = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const r = await getTenantClient(sessao.tenantId).membro.updateMany({ where: { geo_falhou: true }, data: { geo_falhou: false, geo_chave: null } })
        revalidatePath('/admin/familias/mapa')
        return { ok: true as const, total: r.count }
    } catch {
        return { ok: false as const, error: 'Não foi possível.' }
    }
}

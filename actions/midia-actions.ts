'use server'

import prisma from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'
import { audit } from '@/lib/audit'

export async function salvarConfigMidia(formData: FormData) {
    try {
        await requireRole(['ADMIN'])
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)
        if (!tenantId) return { ok: false, error: 'Tenant nao identificado.' }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                holyrics_url: (formData.get('holyrics_url') as string)?.trim() || null,
                holyrics_token: (formData.get('holyrics_token') as string)?.trim() || null,
                x32_ip: (formData.get('x32_ip') as string)?.trim() || null,
                x32_port: formData.get('x32_port') ? Number(formData.get('x32_port')) : 10023,
                lumikit_url: (formData.get('lumikit_url') as string)?.trim() || null,
            }
        })

        audit({ tenant_id: tenantId, categoria: 'CONFIGURACAO', acao: 'CONFIG', alvo_tipo: 'CONFIG', descricao: 'Configuração de mídia atualizada' }).catch(() => {})

        revalidatePath('/admin/midia')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar configuracoes.' }
    }
}

export async function testarConectividade(tipo: 'holyrics' | 'x32' | 'lumikit', url: string, token?: string) {
    try {
        await requireRole(['ADMIN'])

        if (tipo === 'holyrics') {
            const endpoint = `${url}/api/GetMediaPlaylist?token=${token || ''}`
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)
            const res = await fetch(endpoint, { signal: controller.signal })
            clearTimeout(timeout)
            return { ok: res.ok, status: res.status }
        }

        if (tipo === 'x32') {
            // X32 usa protocolo OSC (UDP) — nao testavel directamente do servidor cloud
            // Retorna status informativo
            return { ok: false, status: 0, info: 'O X32 usa protocolo OSC. O teste de conectividade requer o agente local.' }
        }

        if (tipo === 'lumikit') {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)
            try {
                const res = await fetch(url, { signal: controller.signal })
                clearTimeout(timeout)
                return { ok: res.ok || res.status < 500, status: res.status }
            } catch {
                clearTimeout(timeout)
                return { ok: false, status: 0, info: 'Nao foi possivel ligar ao Lumikit. Verificar IP e se esta na mesma rede.' }
            }
        }

        return { ok: false, status: 0 }
    } catch (error: any) {
        return { ok: false, status: 0, info: error.message }
    }
}

// ── LUMIKIT CENAS & DIMMERS ──

// ── X32 CENAS (via Holyrics) ──

export type X32Scene = {
    id: string
    nome: string
    cor: string
    icone: string
    tipo: 'push' | 'toggle'
    endpoint: string
    scriptOn: string
    scriptOff?: string
}

export type X32CenasConfig = {
    scenes: X32Scene[]
}

export async function salvarX32Cenas(config: X32CenasConfig) {
    try {
        await requireRole(['ADMIN'])
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)
        if (!tenantId) return { ok: false, error: 'Tenant nao identificado.' }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { x32_cenas: config as any }
        })

        audit({ tenant_id: tenantId, categoria: 'CONFIGURACAO', acao: 'CONFIG', alvo_tipo: 'CONFIG', descricao: `Presets X32 atualizados (${config.scenes.length} cenas)` }).catch(() => {})

        revalidatePath('/admin/midia')
        revalidatePath('/midia/mesax32')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar cenas X32.' }
    }
}

// ── LUMIKIT CENAS & DIMMERS ──

export type LumikitScene = {
    id: string
    nome: string
    cor: string
    icone: string
    tipo: 'push' | 'toggle'
    endpoint: string       // Endpoint da API Holyrics (ex: FavoriteAction, ScriptAction)
    scriptOn: string       // ID para executar / ligar
    scriptOff?: string     // ID para desligar (só para toggle)
}

export type LumikitConfig = {
    scenes: LumikitScene[]
}

export async function salvarLumikitCenas(config: LumikitConfig) {
    try {
        await requireRole(['ADMIN'])
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)
        if (!tenantId) return { ok: false, error: 'Tenant nao identificado.' }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: { lumikit_cenas: config as any }
        })

        audit({ tenant_id: tenantId, categoria: 'CONFIGURACAO', acao: 'CONFIG', alvo_tipo: 'CONFIG', descricao: `Botões Lumikit atualizados (${config.scenes.length} cenas)` }).catch(() => {})

        revalidatePath('/admin/midia')
        revalidatePath('/midia/lumikit')
        revalidatePath('/admin/dashboard')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar cenas Lumikit.' }
    }
}

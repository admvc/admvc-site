'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { put } from '@vercel/blob'
import { requireRole } from '@/lib/auth-utils'
import { audit } from '@/lib/audit'
import { getTenantIdFromHeaders } from '@/lib/db'
import { TEMAS, type Tema } from '@/lib/branding'


async function getTenantId(): Promise<number> {
    const id = await getTenantIdFromHeaders()
    if (!id) throw new Error('Igreja nao identificada.')
    return Number(id)
}

export async function atualizarBranding(formData: FormData) {
    try {
        await requireRole(['ADMIN'])
        const tenantId = await getTenantId()

        // Tema: um da lista (claro/escuro segue o telemovel)
        const tema = formData.get('tema') as string
        if (tema && !TEMAS.includes(tema as Tema)) {
            return { ok: false, error: 'Tema inválido.' }
        }
        const logoFile = formData.get('logo') as File | null

        const youtubeChannelId = (formData.get('youtube_channel_id') as string)?.trim() || null
        const instagramHandle = (formData.get('instagram_handle') as string)?.trim().replace(/^@/, '') || null

        const data: any = {}
        if (tema) data.tema = tema
        data.youtube_channel_id = youtubeChannelId
        data.instagram_handle = instagramHandle

        // Upload do logo se fornecido
        if (logoFile && logoFile.size > 0 && logoFile.name !== 'undefined') {
            if (logoFile.size > 2 * 1024 * 1024) {
                return { ok: false, error: 'Logo deve ter no maximo 2MB.' }
            }

            const blob = await put(`branding/tenant_${tenantId}_logo.png`, logoFile, {
                access: 'public',
                addRandomSuffix: true,
            })
            data.logo_url = blob.url
        }

        await prisma.tenant.update({
            where: { id: tenantId },
            data,
        })

        audit({ tenant_id: tenantId, categoria: 'CONFIGURACAO', acao: 'CONFIG', alvo_tipo: 'CONFIG', descricao: 'Branding atualizado' }).catch(() => {})

        revalidatePath('/admin')
        revalidatePath('/membros')
        revalidatePath('/', 'layout')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

export async function resetBranding() {
    try {
        await requireRole(['ADMIN'])
        const tenantId = await getTenantId()

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                tema: 'verde',
                logo_url: null,
                youtube_channel_id: null,
                instagram_handle: null,
            },
        })

        audit({ tenant_id: tenantId, categoria: 'CONFIGURACAO', acao: 'CONFIG', alvo_tipo: 'CONFIG', descricao: 'Branding reposto para valores padrão' }).catch(() => {})

        revalidatePath('/admin')
        revalidatePath('/membros')
        revalidatePath('/', 'layout')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

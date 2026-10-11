'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { put } from '@vercel/blob'
import { requireRole } from '@/lib/auth-utils'
import { audit } from '@/lib/audit'

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    const id = headersList.get('x-tenant-id')
    if (!id) throw new Error('Igreja nao identificada.')
    return Number(id)
}

export async function atualizarBranding(formData: FormData) {
    try {
        await requireRole(['ADMIN'])
        const tenantId = await getTenantId()

        const corPrimaria = formData.get('cor_primaria') as string
        const corSecundaria = formData.get('cor_secundaria') as string
        const corFundo = formData.get('cor_fundo') as string
        const logoFile = formData.get('logo') as File | null

        // Validar cores
        if (corPrimaria && !HEX_REGEX.test(corPrimaria)) {
            return { ok: false, error: 'Cor primaria invalida. Use formato #RRGGBB.' }
        }
        if (corSecundaria && !HEX_REGEX.test(corSecundaria)) {
            return { ok: false, error: 'Cor secundaria invalida. Use formato #RRGGBB.' }
        }
        if (corFundo && !HEX_REGEX.test(corFundo)) {
            return { ok: false, error: 'Cor de fundo invalida. Use formato #RRGGBB.' }
        }

        const youtubeChannelId = (formData.get('youtube_channel_id') as string)?.trim() || null
        const instagramHandle = (formData.get('instagram_handle') as string)?.trim().replace(/^@/, '') || null

        const data: any = {}
        if (corPrimaria) data.cor_primaria = corPrimaria
        if (corSecundaria) data.cor_secundaria = corSecundaria
        if (corFundo) data.cor_fundo = corFundo
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
                cor_primaria: '#3F6B4F',
                cor_secundaria: '#7FAE93',
                cor_fundo: '#0b0d0c',
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

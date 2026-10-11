'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { getTenantClient } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

/**
 * Submete um novo donativo online (pagina publica, sem auth).
 */
export async function submeterDonativo(tenantSlug: string, formData: FormData) {
    // Find tenant by slug
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return { error: 'Igreja nao encontrada.' }

    const db = getTenantClient(tenant.id)

    const nome_doador = (formData.get('nome_doador') as string)?.trim()
    const email_doador = (formData.get('email_doador') as string)?.trim() || null
    const nif_doador = (formData.get('nif_doador') as string)?.trim() || null
    const valorStr = (formData.get('valor') as string)?.trim()
    const forma_pagamento = (formData.get('forma_pagamento') as string)?.trim()
    const fundo_id_str = formData.get('fundo_id') as string
    const anonimo = formData.get('anonimo') === 'true'
    const mensagem = (formData.get('mensagem') as string)?.trim() || null
    const recorrente = formData.get('recorrente') === 'true'

    if (!nome_doador) return { error: 'O nome e obrigatorio.' }

    const valor = parseFloat(valorStr)
    if (!valor || valor <= 0) return { error: 'Valor invalido.' }
    if (valor > 100000) return { error: 'Valor excede o limite permitido.' }

    const formasValidas = ['MBWAY', 'TRANSFERENCIA']
    if (!formasValidas.includes(forma_pagamento)) return { error: 'Forma de pagamento invalida.' }

    const fundo_id = fundo_id_str ? parseInt(fundo_id_str) : null
    if (fundo_id && isNaN(fundo_id)) return { error: 'Fundo invalido.' }

    // Generate unique reference
    const random4 = Math.floor(1000 + Math.random() * 9000)
    const referencia = `DON-${tenant.id}-${Date.now()}-${random4}`

    try {
        await db.donativoOnline.create({
            data: {
                tenant_id: tenant.id,
                nome_doador: anonimo ? 'Anonimo' : nome_doador,
                email_doador: anonimo ? null : email_doador,
                nif_doador: anonimo ? null : nif_doador,
                valor,
                forma_pagamento,
                fundo_id,
                anonimo,
                mensagem,
                recorrente,
                referencia,
                status: 'PENDENTE',
            }
        })

        return { success: true, referencia }
    } catch (error) {
        console.error('Erro ao submeter donativo:', error)
        return { error: 'Erro ao processar donativo. Tente novamente.' }
    }
}

/**
 * Confirma um donativo pendente (ADMIN/FINANCE).
 */
export async function confirmarDonativo(donativoId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const donativo = await db.donativoOnline.findFirst({
            where: { id: donativoId, status: 'PENDENTE' }
        })

        if (!donativo) return { ok: false, error: 'Donativo nao encontrado ou ja confirmado.' }

        // Update status
        await db.donativoOnline.update({
            where: { id: donativoId },
            data: {
                status: 'CONFIRMADO',
                confirmado_em: new Date(),
            }
        })

        // If fundo_id exists, increment saldo
        if (donativo.fundo_id) {
            await db.fundoFinanceiro.update({
                where: { id: donativo.fundo_id },
                data: {
                    saldo_atual: { increment: donativo.valor }
                }
            })
        }

        revalidatePath('/financeiro/donativos')
        revalidatePath('/financeiro/fundos')
        return { ok: true }
    } catch (error) {
        console.error('Erro ao confirmar donativo:', error)
        return { ok: false, error: 'Erro ao confirmar donativo.' }
    }
}

/**
 * Obter donativos pendentes (ADMIN/FINANCE).
 */
export async function obterDonativosPendentes() {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()

    return db.donativoOnline.findMany({
        where: { status: 'PENDENTE' },
        orderBy: { criado_em: 'desc' },
        include: { fundo: { select: { nome: true } } }
    })
}

/**
 * Obter historico de donativos (ADMIN/FINANCE).
 */
export async function obterHistoricoDonativos(limite: number = 50) {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()

    return db.donativoOnline.findMany({
        orderBy: { criado_em: 'desc' },
        take: limite,
        include: { fundo: { select: { nome: true } } }
    })
}

'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// ══════════════════════════════════════════════════════════════════════════════
// SUBMETER DESPESA
// ══════════════════════════════════════════════════════════════════════════════

export async function submeterDespesaCantina(formData: FormData) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const descricao = (formData.get('descricao') as string)?.trim()
    const valor = parseFloat(formData.get('valor') as string)
    const data = formData.get('data') as string
    const categoria = (formData.get('categoria') as string)?.trim()
    const fornecedor = (formData.get('fornecedor') as string)?.trim() || null
    const observacao = (formData.get('observacao') as string)?.trim() || null

    if (!descricao) return { error: 'Descricao e obrigatoria.' }
    if (!valor || isNaN(valor) || valor <= 0) return { error: 'Valor invalido.' }
    if (!data) return { error: 'Data e obrigatoria.' }
    if (!categoria) return { error: 'Categoria e obrigatoria.' }

    try {
        await (db as any).despesaCantina.create({
            data: {
                tenant_id: tenantId,
                descricao,
                valor,
                data: new Date(data),
                categoria,
                fornecedor,
                observacao,
                submetido_por: session.membroId,
                status: 'PENDENTE',
            },
        })
        revalidatePath('/cantina/despesas')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao submeter despesa:', error)
        return { error: 'Erro ao submeter despesa.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// APROVAR DESPESA
// ══════════════════════════════════════════════════════════════════════════════

export async function aprovarDespesaCantina(despesaId: number) {
    const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    try {
        await (db as any).despesaCantina.update({
            where: { id: despesaId },
            data: {
                status: 'APROVADA',
                aprovado_por: session.membroId,
            },
        })
        revalidatePath('/cantina/despesas')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao aprovar despesa:', error)
        return { error: 'Erro ao aprovar despesa.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// REJEITAR DESPESA
// ══════════════════════════════════════════════════════════════════════════════

export async function rejeitarDespesaCantina(despesaId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    try {
        await (db as any).despesaCantina.update({
            where: { id: despesaId },
            data: { status: 'REJEITADA' },
        })
        revalidatePath('/cantina/despesas')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao rejeitar despesa:', error)
        return { error: 'Erro ao rejeitar despesa.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGAR DESPESA
// ══════════════════════════════════════════════════════════════════════════════

export async function pagarDespesaCantina(despesaId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    const db = await getDb()

    try {
        const despesa = await (db as any).despesaCantina.findUnique({
            where: { id: despesaId },
        })
        if (!despesa) return { error: 'Despesa nao encontrada.' }
        if (despesa.status !== 'APROVADA') return { error: 'Apenas despesas aprovadas podem ser pagas.' }

        await (db as any).despesaCantina.update({
            where: { id: despesaId },
            data: { status: 'PAGA' },
        })
        revalidatePath('/cantina/despesas')
        return { success: true }
    } catch (error: any) {
        console.error('Erro ao pagar despesa:', error)
        return { error: 'Erro ao pagar despesa.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LISTAR DESPESAS
// ══════════════════════════════════════════════════════════════════════════════

export async function listarDespesasCantina() {
    await requireAuth()
    const db = await getDb()

    try {
        const despesas = await (db as any).despesaCantina.findMany({
            orderBy: { criado_em: 'desc' },
        })
        return { success: true, despesas }
    } catch (error: any) {
        console.error('Erro ao listar despesas:', error)
        return { error: 'Erro ao listar despesas.' }
    }
}

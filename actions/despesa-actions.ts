'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

/**
 * Submete uma nova despesa financeira. Qualquer lider autenticado pode submeter.
 */
export async function submeterDespesa(formData: FormData) {
    const session = await requireAuth()
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const fundo_id = Number(formData.get('fundo_id'))
    const categoria_id = formData.get('categoria_id') ? Number(formData.get('categoria_id')) : null
    const descricao = (formData.get('descricao') as string)?.trim()
    const valor = parseFloat(formData.get('valor') as string)
    const dataStr = formData.get('data') as string
    const forma_pagamento = (formData.get('forma_pagamento') as string)?.trim() || null
    const fornecedor = (formData.get('fornecedor') as string)?.trim() || null
    const comprovante_url = (formData.get('comprovante_url') as string)?.trim() || null
    const observacao = (formData.get('observacao') as string)?.trim() || null

    if (!fundo_id || isNaN(fundo_id)) {
        return { ok: false, error: 'Fundo e obrigatorio.' }
    }

    if (!descricao) {
        return { ok: false, error: 'Descricao e obrigatoria.' }
    }

    if (!valor || isNaN(valor) || valor <= 0) {
        return { ok: false, error: 'Valor deve ser maior que zero.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundo_id, tenant_id: tenantId, ativo: true }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado ou inativo.' }
        }

        // Se o fundo e restrito, validar que a despesa tem categoria adequada
        if (fundo.restrito && !categoria_id) {
            return { ok: false, error: 'Fundos restritos exigem uma categoria de orcamento.' }
        }

        // Se categoria informada, verificar se pertence ao fundo
        if (categoria_id) {
            const categoria = await prisma.categoriaOrcamento.findFirst({
                where: { id: categoria_id, fundo_id: fundo_id, tenant_id: tenantId }
            })

            if (!categoria) {
                return { ok: false, error: 'Categoria nao pertence a este fundo.' }
            }
        }

        const despesa = await prisma.despesaFinanceira.create({
            data: {
                tenant_id: tenantId,
                fundo_id,
                categoria_id,
                descricao,
                valor,
                data: dataStr ? new Date(dataStr) : new Date(),
                forma_pagamento,
                fornecedor,
                comprovante_url,
                submetido_por: session.membroId,
                status: 'PENDENTE',
                observacao,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, despesa }
    } catch (error) {
        console.error('Erro ao submeter despesa:', error)
        return { ok: false, error: 'Erro ao submeter despesa.' }
    }
}

/**
 * Aprova uma despesa pendente.
 */
export async function aprovarDespesa(despesaId: number) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const despesa = await prisma.despesaFinanceira.findFirst({
            where: { id: despesaId, tenant_id: tenantId }
        })

        if (!despesa) {
            return { ok: false, error: 'Despesa nao encontrada.' }
        }

        if (despesa.status !== 'PENDENTE') {
            return { ok: false, error: 'Apenas despesas pendentes podem ser aprovadas.' }
        }

        const atualizada = await prisma.despesaFinanceira.update({
            where: { id: despesaId },
            data: {
                status: 'APROVADA',
                aprovado_por: session.membroId,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, despesa: atualizada }
    } catch (error) {
        console.error('Erro ao aprovar despesa:', error)
        return { ok: false, error: 'Erro ao aprovar despesa.' }
    }
}

/**
 * Rejeita uma despesa pendente, com motivo opcional.
 */
export async function rejeitarDespesa(despesaId: number, motivo?: string) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const despesa = await prisma.despesaFinanceira.findFirst({
            where: { id: despesaId, tenant_id: tenantId }
        })

        if (!despesa) {
            return { ok: false, error: 'Despesa nao encontrada.' }
        }

        if (despesa.status !== 'PENDENTE') {
            return { ok: false, error: 'Apenas despesas pendentes podem ser rejeitadas.' }
        }

        const atualizada = await prisma.despesaFinanceira.update({
            where: { id: despesaId },
            data: {
                status: 'REJEITADA',
                observacao: motivo?.trim() || despesa.observacao,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, despesa: atualizada }
    } catch (error) {
        console.error('Erro ao rejeitar despesa:', error)
        return { ok: false, error: 'Erro ao rejeitar despesa.' }
    }
}

/**
 * Marca uma despesa aprovada como paga e decrementa o saldo do fundo.
 */
export async function pagarDespesa(despesaId: number) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const despesa = await prisma.despesaFinanceira.findFirst({
            where: { id: despesaId, tenant_id: tenantId },
            include: { fundo: true }
        })

        if (!despesa) {
            return { ok: false, error: 'Despesa nao encontrada.' }
        }

        if (despesa.status !== 'APROVADA') {
            return { ok: false, error: 'Apenas despesas aprovadas podem ser marcadas como pagas.' }
        }

        // Verificar saldo suficiente no fundo
        if (despesa.fundo.saldo_atual < despesa.valor) {
            return { ok: false, error: 'Saldo insuficiente no fundo para pagar esta despesa.' }
        }

        // Transacao: atualizar despesa + decrementar saldo do fundo
        await prisma.$transaction([
            prisma.despesaFinanceira.update({
                where: { id: despesaId },
                data: { status: 'PAGA' }
            }),
            prisma.fundoFinanceiro.update({
                where: { id: despesa.fundo_id },
                data: { saldo_atual: { decrement: despesa.valor } }
            }),
        ])

        revalidatePath('/departamentos/financeiro')
        return { ok: true }
    } catch (error) {
        console.error('Erro ao pagar despesa:', error)
        return { ok: false, error: 'Erro ao registrar pagamento da despesa.' }
    }
}

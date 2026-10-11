'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(Number(tenantId))
}

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    return Number(headersList.get('x-tenant-id') || 0)
}

// ── FUNDOS ─────────────────────────────────────────────────────────────────────

export async function criarFundoAction(formData: FormData) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenantId = await getTenantId()

        const nome = (formData.get('nome') as string)?.trim()
        const descricao = (formData.get('descricao') as string)?.trim() || null
        const tipo = (formData.get('tipo') as string) || 'CUSTOM'
        const restrito = formData.get('restrito') === 'true'

        if (!nome) return { ok: false, error: 'Nome do fundo e obrigatorio.' }

        await db.fundoFinanceiro.create({
            data: {
                tenant_id: tenantId,
                nome,
                descricao,
                tipo,
                restrito,
                saldo_atual: 0,
                ativo: true,
            },
        })

        revalidatePath('/financeiro/fundos')
        return { ok: true }
    } catch (err: any) {
        if (err.code === 'P2002') return { ok: false, error: 'Ja existe um fundo com este nome.' }
        return { ok: false, error: err.message || 'Erro ao criar fundo.' }
    }
}

export async function transferirEntreeFundosAction(formData: FormData) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenantId = await getTenantId()

        const fundoOrigemId = Number(formData.get('fundo_origem_id'))
        const fundoDestinoId = Number(formData.get('fundo_destino_id'))
        const valor = parseFloat(formData.get('valor') as string)
        const motivo = (formData.get('motivo') as string)?.trim()

        if (!fundoOrigemId || !fundoDestinoId) return { ok: false, error: 'Selecione ambos os fundos.' }
        if (fundoOrigemId === fundoDestinoId) return { ok: false, error: 'Os fundos de origem e destino devem ser diferentes.' }
        if (!valor || valor <= 0) return { ok: false, error: 'Valor deve ser maior que zero.' }
        if (!motivo) return { ok: false, error: 'Motivo e obrigatorio.' }

        const origem = await db.fundoFinanceiro.findUnique({ where: { id: fundoOrigemId } })
        if (!origem) return { ok: false, error: 'Fundo de origem nao encontrado.' }
        if (origem.saldo_atual < valor) return { ok: false, error: 'Saldo insuficiente no fundo de origem.' }

        // Execute transfer in transaction
        await db.$transaction([
            db.fundoFinanceiro.update({
                where: { id: fundoOrigemId },
                data: { saldo_atual: { decrement: valor } },
            }),
            db.fundoFinanceiro.update({
                where: { id: fundoDestinoId },
                data: { saldo_atual: { increment: valor } },
            }),
            db.transferenciaFundo.create({
                data: {
                    tenant_id: tenantId,
                    fundo_origem_id: fundoOrigemId,
                    fundo_destino_id: fundoDestinoId,
                    valor,
                    motivo,
                    aprovado_por: session.membroId,
                    status: 'APROVADA',
                },
            }),
        ])

        revalidatePath('/financeiro/fundos')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Erro ao transferir.' }
    }
}

// ── DESPESAS ───────────────────────────────────────────────────────────────────

export async function submeterDespesaAction(formData: FormData) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE', 'LEADER'])
        const db = await getDb()
        const tenantId = await getTenantId()

        const fundo_id = Number(formData.get('fundo_id'))
        const categoria_id = formData.get('categoria_id') ? Number(formData.get('categoria_id')) : null
        const descricao = (formData.get('descricao') as string)?.trim()
        const valor = parseFloat(formData.get('valor') as string)
        const fornecedor = (formData.get('fornecedor') as string)?.trim() || null
        const dataStr = formData.get('data') as string

        if (!fundo_id) return { ok: false, error: 'Selecione um fundo.' }
        if (!descricao) return { ok: false, error: 'Descricao e obrigatoria.' }
        if (!valor || valor <= 0) return { ok: false, error: 'Valor deve ser maior que zero.' }

        await db.despesaFinanceira.create({
            data: {
                tenant_id: tenantId,
                fundo_id,
                categoria_id: categoria_id || null,
                descricao,
                valor,
                data: dataStr ? new Date(dataStr) : new Date(),
                fornecedor,
                submetido_por: session.membroId,
                status: 'PENDENTE',
            },
        })

        revalidatePath('/financeiro/despesas')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Erro ao submeter despesa.' }
    }
}

export async function aprovarDespesaAction(despesaId: number) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()

        const despesa = await db.despesaFinanceira.findUnique({ where: { id: despesaId } })
        if (!despesa) return { ok: false, error: 'Despesa nao encontrada.' }
        if (despesa.status !== 'PENDENTE') return { ok: false, error: 'Despesa ja foi processada.' }

        await db.despesaFinanceira.update({
            where: { id: despesaId },
            data: {
                status: 'APROVADA',
                aprovado_por: session.membroId,
            },
        })

        revalidatePath('/financeiro/despesas')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Erro ao aprovar despesa.' }
    }
}

export async function rejeitarDespesaAction(despesaId: number, motivo?: string) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()

        const despesa = await db.despesaFinanceira.findUnique({ where: { id: despesaId } })
        if (!despesa) return { ok: false, error: 'Despesa nao encontrada.' }
        if (despesa.status !== 'PENDENTE') return { ok: false, error: 'Despesa ja foi processada.' }

        await db.despesaFinanceira.update({
            where: { id: despesaId },
            data: {
                status: 'REJEITADA',
                aprovado_por: session.membroId,
                observacao: motivo || null,
            },
        })

        revalidatePath('/financeiro/despesas')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Erro ao rejeitar despesa.' }
    }
}

export async function pagarDespesaAction(despesaId: number) {
    try {
        const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const db = await getDb()

        const despesa = await db.despesaFinanceira.findUnique({ where: { id: despesaId } })
        if (!despesa) return { ok: false, error: 'Despesa nao encontrada.' }
        if (despesa.status !== 'APROVADA') return { ok: false, error: 'Despesa precisa estar aprovada antes de ser paga.' }

        // Debit the fund and mark as paid in a transaction
        await db.$transaction([
            db.fundoFinanceiro.update({
                where: { id: despesa.fundo_id },
                data: { saldo_atual: { decrement: despesa.valor } },
            }),
            db.despesaFinanceira.update({
                where: { id: despesaId },
                data: { status: 'PAGA' },
            }),
        ])

        revalidatePath('/financeiro/despesas')
        revalidatePath('/financeiro/fundos')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || 'Erro ao registar pagamento.' }
    }
}

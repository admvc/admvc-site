'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { audit } from '@/lib/audit'

// ══════════════════════════════════════════════════════════════════════════════
// P&L REPORT
// ══════════════════════════════════════════════════════════════════════════════

export async function obterRelatorioCantinaPN(de: string, ate: string) {
    await requireAuth()
    const db = await getDb()

    const dataInicio = new Date(de)
    const dataFim = new Date(ate)
    dataFim.setHours(23, 59, 59, 999)

    // 1. Revenue: sum of abs(valor) from CONSUMO transactions
    const transacoes = await db.transacaoCantina.findMany({
        where: {
            tipo: 'CONSUMO',
            criado_em: { gte: dataInicio, lte: dataFim },
        },
        include: {
            pagamentos: true,
            itens: {
                include: {
                    produto: { select: { id: true, custo: true } },
                },
            },
        },
    })

    const receita = transacoes.reduce((sum: number, t: any) => sum + Math.abs(t.valor), 0)

    // 2. Revenue by payment method
    const receitaPorMetodo: Record<string, number> = {}
    for (const t of transacoes) {
        for (const p of (t as any).pagamentos || []) {
            const key = p.forma_pagamento as string
            receitaPorMetodo[key] = (receitaPorMetodo[key] || 0) + p.valor
        }
    }

    // 3. COGS: sum(quantidade * custo) where custo is not null
    let custoMercadoria = 0
    let produtosComCusto = 0
    let produtosSemCusto = 0
    const produtosContados = new Set<number>()

    for (const t of transacoes) {
        for (const item of (t as any).itens || []) {
            const produtoId = item.produto_id as number
            if (!produtosContados.has(produtoId)) {
                produtosContados.add(produtoId)
                if (item.produto?.custo != null) {
                    produtosComCusto++
                } else {
                    produtosSemCusto++
                }
            }
            if (item.produto?.custo != null) {
                custoMercadoria += item.quantidade * item.produto.custo
            }
        }
    }

    // 4. Operating expenses: sum DespesaCantina WHERE status='PAGA' AND data BETWEEN dates
    const despesas = await db.despesaCantina.findMany({
        where: {
            status: 'PAGA',
            data: { gte: dataInicio, lte: dataFim },
        },
    })

    const despesasOperacionais = despesas.reduce((sum: number, d: any) => sum + d.valor, 0)

    // 5. Expenses by category
    const despesasPorCategoria: Record<string, number> = {}
    for (const d of despesas) {
        const cat = (d as any).categoria || 'Sem Categoria'
        despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + d.valor
    }

    // 6. Calculated fields
    const margemBruta = receita - custoMercadoria
    const lucroLiquido = margemBruta - despesasOperacionais

    return {
        receita,
        custoMercadoria,
        margemBruta,
        despesasOperacionais,
        despesasPorCategoria,
        lucroLiquido,
        receitaPorMetodo,
        produtosSemCusto,
        produtosComCusto,
        periodo: { de, ate },
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SALDO TRANSFERIVEL
// ══════════════════════════════════════════════════════════════════════════════

export async function obterSaldoCantinaTransferivel() {
    await requireAuth()
    const db = await getDb()

    // Find CANTINA fund
    let fundoCantina = await db.fundoFinanceiro.findFirst({
        where: {
            OR: [
                { tipo: 'CANTINA' },
                { nome: { contains: 'cantina', mode: 'insensitive' } },
            ],
        },
    })

    // Total cash revenue (non-credit payments)
    const transacoesCash = await db.transacaoCantina.findMany({
        where: {
            tipo: 'CONSUMO',
        },
        include: {
            pagamentos: true,
        },
    })

    let receitaCash = 0
    for (const t of transacoesCash) {
        for (const p of (t as any).pagamentos || []) {
            if (['DINHEIRO', 'MBWAY', 'TRANSFERENCIA'].includes(p.forma_pagamento)) {
                receitaCash += p.valor
            }
        }
    }

    // Already transferred from cantina fund
    let jaTransferido = 0
    if (fundoCantina) {
        const transferencias = await db.transferenciaFundo.findMany({
            where: {
                fundo_origem_id: fundoCantina.id,
                status: 'APROVADA',
            },
        })
        jaTransferido = transferencias.reduce((sum: number, t: any) => sum + t.valor, 0)
    }

    const disponivel = receitaCash - jaTransferido

    return {
        receitaCash,
        jaTransferido,
        disponivel: Math.max(0, disponivel),
        fundoCantinaId: fundoCantina?.id || null,
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// TRANSFERIR PARA FUNDO
// ══════════════════════════════════════════════════════════════════════════════

export async function transferirCantinaParaFundo(formData: FormData) {
    const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const fundoDestinoId = Number(formData.get('fundo_destino_id'))
    const valor = Number(formData.get('valor'))
    const motivo = (formData.get('motivo') as string)?.trim() || 'Transferencia de receita da cantina'

    if (!fundoDestinoId) return { error: 'Selecione o fundo de destino.' }
    if (!valor || valor <= 0) return { error: 'O valor deve ser positivo.' }

    // Validate disponivel
    const saldo = await obterSaldoCantinaTransferivel()
    if (valor > saldo.disponivel) {
        return { error: `Valor excede o disponivel (${saldo.disponivel.toFixed(2)} EUR).` }
    }

    try {
        // Find or create CANTINA fund
        let fundoCantina = await db.fundoFinanceiro.findFirst({
            where: {
                OR: [
                    { tipo: 'CANTINA' },
                    { nome: { contains: 'cantina', mode: 'insensitive' } },
                ],
            },
        })

        if (!fundoCantina) {
            fundoCantina = await (db as any).fundoFinanceiro.create({
                data: {
                    tenant_id: tenantId,
                    nome: 'Cantina',
                    tipo: 'CANTINA',
                    descricao: 'Fundo da cantina (gerado automaticamente)',
                    saldo_atual: 0,
                    ativo: true,
                },
            })
        }

        // Create transfer record
        await (db as any).transferenciaFundo.create({
            data: {
                tenant_id: tenantId,
                fundo_origem_id: fundoCantina!.id,
                fundo_destino_id: fundoDestinoId,
                valor,
                motivo,
                aprovado_por: session.membroId,
                status: 'APROVADA',
            },
        })

        // Increment destination fund saldo
        const fundoDestino = await db.fundoFinanceiro.update({
            where: { id: fundoDestinoId },
            data: { saldo_atual: { increment: valor } },
        })

        // Registar auditoria
        await audit({
            tenant_id: tenantId,
            categoria: 'CANTINA',
            acao: 'APROVAR',
            actor_id: session.membroId,
            alvo_tipo: 'LANCAMENTO',
            descricao: `Transferência de €${valor.toFixed(2)} da cantina para fundo "${fundoDestino.nome}". Motivo: ${motivo}`,
            dados_apos: { valor, fundo_origem: 'Cantina', fundo_destino: fundoDestino.nome, fundo_destino_id: fundoDestinoId },
        })

        revalidatePath('/cantina')
        revalidatePath('/cantina/dashboard')
        revalidatePath('/cantina/relatorio-financeiro')
        revalidatePath('/financeiro')

        return { success: true }
    } catch (error) {
        console.error('Erro ao transferir para fundo:', error)
        return { error: 'Erro ao realizar transferencia.' }
    }
}

'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'

export interface AlertaOrcamento {
    fundoNome: string
    categoriaNome: string
    valorPrevisto: number
    valorGasto: number
    percentagem: number
    limiar: number
    excedeu: boolean
}

/**
 * Obter alertas de orcamento para um dado ano.
 * Compara despesas pagas com o valor previsto por categoria.
 */
export async function obterAlertasOrcamento(ano?: number): Promise<AlertaOrcamento[]> {
    await requireAuth()
    const db = await getDb()

    const anoAtual = ano ?? new Date().getFullYear()
    const inicioAno = new Date(anoAtual, 0, 1)
    const fimAno = new Date(anoAtual + 1, 0, 1)

    // Fetch all budgets for the year, include fund and category info
    const orcamentos = await db.orcamento.findMany({
        where: { ano: anoAtual },
        include: {
            fundo: { select: { nome: true, alerta_orcamento_percentagem: true } },
            categoria: { select: { nome: true } },
        },
    })

    if (orcamentos.length === 0) return []

    // Fetch all paid expenses for the year
    const despesas = await db.despesaFinanceira.findMany({
        where: {
            status: 'PAGA',
            data: { gte: inicioAno, lt: fimAno },
        },
        select: {
            categoria_id: true,
            valor: true,
        },
    })

    // Aggregate spending by categoria_id
    const gastoPorCategoria: Record<number, number> = {}
    for (const d of despesas) {
        if (d.categoria_id) {
            gastoPorCategoria[d.categoria_id] = (gastoPorCategoria[d.categoria_id] || 0) + d.valor
        }
    }

    // Build alerts array
    const alertas: AlertaOrcamento[] = orcamentos
        .filter(o => o.valor_previsto > 0 && o.categoria_id)
        .map(o => {
            const valorGasto = gastoPorCategoria[o.categoria_id!] || 0
            const percentagem = Math.round((valorGasto / o.valor_previsto) * 100)
            const limiar = o.fundo?.alerta_orcamento_percentagem ?? 80

            return {
                fundoNome: o.fundo?.nome ?? 'Sem fundo',
                categoriaNome: o.categoria?.nome ?? 'Sem categoria',
                valorPrevisto: o.valor_previsto,
                valorGasto,
                percentagem,
                limiar,
                excedeu: percentagem >= limiar,
            }
        })

    // Sort by percentagem descending
    alertas.sort((a, b) => b.percentagem - a.percentagem)

    return alertas
}

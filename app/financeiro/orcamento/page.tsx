import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import TabelaOrcamento from '@/components/financeiro/TabelaOrcamento'
import AlertasOrcamento from '@/components/financeiro/AlertasOrcamento'
import { obterAlertasOrcamento } from '@/actions/alerta-orcamento-actions'

export default async function OrcamentoPage({
    searchParams,
}: {
    searchParams: Promise<{ ano?: string; fundo?: string }>
}) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const role = session.role
    if (!isAdmin(role) && role !== 'FINANCE') {
        redirect('/membros/dashboard')
    }

    const db = await getDb()
    const params = await searchParams
    const anoAtual = new Date().getFullYear()
    const ano = params.ano ? parseInt(params.ano) : anoAtual

    // Fetch all active funds
    const fundos = await db.fundoFinanceiro.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
    })

    // Fetch all categories grouped by fund
    const categorias = await db.categoriaOrcamento.findMany({
        orderBy: { nome: 'asc' },
    })

    // Fetch budgets for the selected year (annual only, mes = null)
    const orcamentos = await db.orcamento.findMany({
        where: {
            ano,
            mes: null,
        },
    })

    // Fetch actual spending (PAGAS) for the year, grouped by categoria
    const inicioAno = new Date(ano, 0, 1)
    const fimAno = new Date(ano + 1, 0, 1)

    const despesas = await db.despesaFinanceira.findMany({
        where: {
            status: 'PAGA',
            data: {
                gte: inicioAno,
                lt: fimAno,
            },
        },
        select: {
            categoria_id: true,
            fundo_id: true,
            valor: true,
        },
    })

    // Aggregate spending by categoria
    const despesasAgregadas: Record<string, number> = {}
    for (const d of despesas) {
        const key = `${d.fundo_id}-${d.categoria_id ?? 'sem'}`
        despesasAgregadas[key] = (despesasAgregadas[key] || 0) + d.valor
    }

    // Serialise data for client component
    const fundosData = fundos.map(f => ({ id: f.id, nome: f.nome, tipo: f.tipo }))
    const categoriasData = categorias.map(c => ({
        id: c.id,
        fundo_id: c.fundo_id,
        nome: c.nome,
    }))
    const orcamentosData = orcamentos.map(o => ({
        id: o.id,
        fundo_id: o.fundo_id,
        categoria_id: o.categoria_id,
        ano: o.ano,
        valor_previsto: o.valor_previsto,
    }))

    // Fetch budget alerts
    const alertas = await obterAlertasOrcamento(ano)
    const alertasExcedidos = alertas.filter(a => a.excedeu)

    return (
        <div className="pt-16 md:pt-8 pb-28 space-y-6">
            {alertasExcedidos.length > 0 && (
                <AlertasOrcamento alertas={alertas} />
            )}
            <TabelaOrcamento
                fundos={fundosData}
                categorias={categoriasData}
                orcamentos={orcamentosData}
                despesasAgregadas={despesasAgregadas}
                ano={ano}
            />
        </div>
    )
}

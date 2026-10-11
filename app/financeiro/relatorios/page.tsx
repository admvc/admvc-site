import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import {
    TrendingUp, TrendingDown, Scale, Landmark, Users,
    ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import BotaoExportCSV from '@/components/financeiro/BotaoExportCSV'
import BotaoExportPDF from '@/components/financeiro/BotaoExportPDF'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const MESES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default async function RelatoriosFinanceiros() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado ao modulo financeiro')
    }

    const now = new Date()
    const anoAtual = now.getFullYear()
    const mesAtual = now.getMonth() // 0-based
    const inicioAno = new Date(anoAtual, 0, 1)
    const inicioMes = new Date(anoAtual, mesAtual, 1)
    const inicioMesAnterior = new Date(anoAtual, mesAtual - 1, 1)
    const fimMesAnterior = new Date(anoAtual, mesAtual, 0, 23, 59, 59)
    const inicioMesmoMesAnoAnterior = new Date(anoAtual - 1, mesAtual, 1)
    const fimMesmoMesAnoAnterior = new Date(anoAtual - 1, mesAtual + 1, 0, 23, 59, 59)

    // Fetch all data in parallel
    const [
        contribuicoesAno,
        lancamentosAno,
        despesasPagasAno,
        fundos,
        contribuicoesMesAnterior,
        lancamentosMesAnterior,
        despesasMesAnterior,
        contribuicoesMesmoMesAnoAnterior,
        lancamentosMesmoMesAnoAnterior,
        despesasMesmoMesAnoAnterior,
        topContribuintes,
    ] = await Promise.all([
        db.contribuicao.findMany({
            where: { data: { gte: inicioAno } },
            select: { valor: true, fundo_id: true, data: true },
        }),
        db.lancamentoFinanceiro.findMany({
            where: { data_recebimento: { gte: inicioAno } },
            select: { valor_pago: true, fundo_id: true, data_recebimento: true },
        }),
        db.despesaFinanceira.findMany({
            where: { status: 'PAGA', data: { gte: inicioAno } },
            select: { valor: true, fundo_id: true, data: true },
        }),
        db.fundoFinanceiro.findMany({
            where: { ativo: true },
            orderBy: { nome: 'asc' },
        }),
        // Mes anterior
        db.contribuicao.findMany({
            where: { data: { gte: inicioMesAnterior, lte: fimMesAnterior } },
            select: { valor: true },
        }),
        db.lancamentoFinanceiro.findMany({
            where: { data_recebimento: { gte: inicioMesAnterior, lte: fimMesAnterior } },
            select: { valor_pago: true },
        }),
        db.despesaFinanceira.findMany({
            where: { status: 'PAGA', data: { gte: inicioMesAnterior, lte: fimMesAnterior } },
            select: { valor: true },
        }),
        // Mesmo mes ano anterior
        db.contribuicao.findMany({
            where: { data: { gte: inicioMesmoMesAnoAnterior, lte: fimMesmoMesAnoAnterior } },
            select: { valor: true },
        }),
        db.lancamentoFinanceiro.findMany({
            where: { data_recebimento: { gte: inicioMesmoMesAnoAnterior, lte: fimMesmoMesAnoAnterior } },
            select: { valor_pago: true },
        }),
        db.despesaFinanceira.findMany({
            where: { status: 'PAGA', data: { gte: inicioMesmoMesAnoAnterior, lte: fimMesmoMesAnoAnterior } },
            select: { valor: true },
        }),
        // Top 10 contribuintes
        db.contribuicao.groupBy({
            by: ['membro_id'],
            where: { data: { gte: inicioAno } },
            _sum: { valor: true },
            _count: true,
            orderBy: { _sum: { valor: 'desc' } },
            take: 10,
        }),
    ])

    // Fetch member names for top contributors
    const membroIds = topContribuintes.map(c => c.membro_id)
    const membros = membroIds.length > 0
        ? await db.membro.findMany({
            where: { id: { in: membroIds } },
            select: { id: true, first_name: true, last_name: true },
        })
        : []
    const membroMap = new Map(membros.map(m => [m.id, `${m.first_name} ${m.last_name}`]))

    // --- A. Resumo Geral ---
    const totalEntradasContrib = contribuicoesAno.reduce((s, c) => s + c.valor, 0)
    const totalEntradasLanc = lancamentosAno.reduce((s, l) => s + l.valor_pago, 0)
    const totalEntradas = totalEntradasContrib + totalEntradasLanc
    const totalSaidas = despesasPagasAno.reduce((s, d) => s + d.valor, 0)
    const resultado = totalEntradas - totalSaidas

    // --- Entradas/saidas do mes atual ---
    const entradasMesAtual =
        contribuicoesAno.filter(c => c.data >= inicioMes).reduce((s, c) => s + c.valor, 0) +
        lancamentosAno.filter(l => l.data_recebimento >= inicioMes).reduce((s, l) => s + l.valor_pago, 0)
    const saidasMesAtual =
        despesasPagasAno.filter(d => d.data >= inicioMes).reduce((s, d) => s + d.valor, 0)

    // --- B. Balancete por Fundo ---
    const fundoEntradas: Record<number, number> = {}
    const fundoSaidas: Record<number, number> = {}
    for (const c of contribuicoesAno) {
        if (c.fundo_id) fundoEntradas[c.fundo_id] = (fundoEntradas[c.fundo_id] || 0) + c.valor
    }
    for (const l of lancamentosAno) {
        if (l.fundo_id) fundoEntradas[l.fundo_id] = (fundoEntradas[l.fundo_id] || 0) + l.valor_pago
    }
    for (const d of despesasPagasAno) {
        fundoSaidas[d.fundo_id] = (fundoSaidas[d.fundo_id] || 0) + d.valor
    }

    // --- C. Fluxo de Caixa Mensal (last 12 months) ---
    type FluxoMensal = { mes: string; entradas: number; saidas: number; saldo: number }
    const fluxoMensal: FluxoMensal[] = []
    for (let i = 0; i < 12; i++) {
        const m = new Date(anoAtual, i, 1)
        const mFim = new Date(anoAtual, i + 1, 0, 23, 59, 59)
        const ent =
            contribuicoesAno.filter(c => c.data >= m && c.data <= mFim).reduce((s, c) => s + c.valor, 0) +
            lancamentosAno.filter(l => l.data_recebimento >= m && l.data_recebimento <= mFim).reduce((s, l) => s + l.valor_pago, 0)
        const sai = despesasPagasAno.filter(d => d.data >= m && d.data <= mFim).reduce((s, d) => s + d.valor, 0)
        fluxoMensal.push({ mes: MESES[i], entradas: ent, saidas: sai, saldo: ent - sai })
    }
    const maxFluxo = Math.max(...fluxoMensal.map(f => Math.max(f.entradas, f.saidas)), 1)

    // --- E. Comparativo Mensal ---
    const entradasMesAnteriorTotal =
        contribuicoesMesAnterior.reduce((s, c) => s + c.valor, 0) +
        lancamentosMesAnterior.reduce((s, l) => s + l.valor_pago, 0)
    const saidasMesAnteriorTotal = despesasMesAnterior.reduce((s, d) => s + d.valor, 0)

    const entradasMesmoAnoAnterior =
        contribuicoesMesmoMesAnoAnterior.reduce((s, c) => s + c.valor, 0) +
        lancamentosMesmoMesAnoAnterior.reduce((s, l) => s + l.valor_pago, 0)
    const saidasMesmoAnoAnterior = despesasMesmoMesAnoAnterior.reduce((s, d) => s + d.valor, 0)

    function variacao(atual: number, anterior: number): string {
        if (anterior === 0) return atual > 0 ? '+100%' : '0%'
        const pct = ((atual - anterior) / anterior) * 100
        return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`
    }

    const comparativo = [
        {
            categoria: 'Entradas',
            esteMes: entradasMesAtual,
            mesAnterior: entradasMesAnteriorTotal,
            mesmoMesAnoAnterior: entradasMesmoAnoAnterior,
        },
        {
            categoria: 'Saidas',
            esteMes: saidasMesAtual,
            mesAnterior: saidasMesAnteriorTotal,
            mesmoMesAnoAnterior: saidasMesmoAnoAnterior,
        },
        {
            categoria: 'Resultado',
            esteMes: entradasMesAtual - saidasMesAtual,
            mesAnterior: entradasMesAnteriorTotal - saidasMesAnteriorTotal,
            mesmoMesAnoAnterior: entradasMesmoAnoAnterior - saidasMesmoAnoAnterior,
        },
    ]

    // --- CSV data ---
    const csvData = {
        resumo: { totalEntradas, totalSaidas, resultado },
        fundos: fundos.map(f => ({
            nome: f.nome,
            saldo_atual: f.saldo_atual,
            entradas: fundoEntradas[f.id] || 0,
            saidas: fundoSaidas[f.id] || 0,
        })),
        fluxoMensal,
        comparativo,
    }

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 print:py-2 print:px-0 print:space-y-4">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Relatorio Financeiro</h1>
                    <p className="text-xs text-muted">Ano {anoAtual} &mdash; Dados atualizados em tempo real</p>
                </div>
                <div className="flex items-center gap-2">
                    <BotaoExportPDF />
                    <BotaoExportCSV data={csvData} />
                </div>
            </header>

            {/* Print header */}
            <div className="hidden print:block text-center mb-4">
                <h1 className="text-2xl font-black uppercase">Relatorio Financeiro {anoAtual}</h1>
                <p className="text-sm text-gray-500">Gerado em {now.toLocaleDateString('pt-PT')}</p>
            </div>

            {/* ======================== A. RESUMO GERAL ======================== */}
            <section>
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">Resumo Geral &mdash; {anoAtual}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total Entradas */}
                    <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <TrendingUp size={16} className="text-green-500" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted">Total Entradas</span>
                        </div>
                        <p className="text-2xl font-black text-green-500">{euro(totalEntradas)}</p>
                        <p className="text-[10px] md:text-xs text-muted">Contribuicoes + Lancamentos</p>
                    </div>
                    {/* Total Saidas */}
                    <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <TrendingDown size={16} className="text-red-500" />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted">Total Saidas</span>
                        </div>
                        <p className="text-2xl font-black text-red-500">{euro(totalSaidas)}</p>
                        <p className="text-[10px] md:text-xs text-muted">Despesas pagas</p>
                    </div>
                    {/* Resultado */}
                    <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${resultado >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                <Scale size={16} className={resultado >= 0 ? 'text-green-500' : 'text-red-500'} />
                            </div>
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted">Resultado</span>
                        </div>
                        <p className={`text-2xl font-black ${resultado >= 0 ? 'text-green-500' : 'text-red-500'}`}>{euro(resultado)}</p>
                        <p className="text-[10px] md:text-xs text-muted">Entradas - Saidas</p>
                    </div>
                </div>
            </section>

            {/* ======================== B. BALANCETE POR FUNDO ======================== */}
            <section>
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
                    <Landmark size={14} />
                    Balancete por Fundo
                </h2>
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-soft">
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">Fundo</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Saldo Atual</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Entradas</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Saidas</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Saldo Final</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fundos.map(f => {
                                    const ent = fundoEntradas[f.id] || 0
                                    const sai = fundoSaidas[f.id] || 0
                                    const saldoFinal = f.saldo_atual
                                    return (
                                        <tr key={f.id} className="border-b border-soft/50 hover:bg-soft/10 transition-all">
                                            <td className="px-6 py-3">
                                                <span className="text-xs font-bold text-fg">{f.nome}</span>
                                                {f.restrito && (
                                                    <span className="ml-2 text-[8px] md:text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">Restrito</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-xs font-bold text-fg text-right">{euro(saldoFinal)}</td>
                                            <td className="px-6 py-3 text-xs font-bold text-green-500 text-right">{euro(ent)}</td>
                                            <td className="px-6 py-3 text-xs font-bold text-red-500 text-right">{euro(sai)}</td>
                                            <td className={`px-6 py-3 text-xs font-black text-right ${saldoFinal >= 0 ? 'text-fg' : 'text-red-500'}`}>
                                                {euro(saldoFinal)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-soft/20">
                                    <td className="px-6 py-4 text-xs font-black uppercase text-fg">Total</td>
                                    <td className="px-6 py-4 text-xs font-black text-fg text-right">
                                        {euro(fundos.reduce((s, f) => s + f.saldo_atual, 0))}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black text-green-500 text-right">
                                        {euro(Object.values(fundoEntradas).reduce((s, v) => s + v, 0))}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black text-red-500 text-right">
                                        {euro(Object.values(fundoSaidas).reduce((s, v) => s + v, 0))}
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black text-fg text-right">
                                        {euro(fundos.reduce((s, f) => s + f.saldo_atual, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </section>

            {/* ======================== C. FLUXO DE CAIXA MENSAL ======================== */}
            <section>
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">Fluxo de Caixa Mensal &mdash; {anoAtual}</h2>
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-soft">
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">Mes</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Entradas</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Saidas</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Saldo</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted print:hidden w-48">Grafico</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fluxoMensal.map((f, i) => (
                                    <tr key={i} className={`border-b border-soft/50 hover:bg-soft/10 transition-all ${i > mesAtual ? 'opacity-30' : ''}`}>
                                        <td className="px-6 py-3 text-xs font-bold text-fg">{f.mes}</td>
                                        <td className="px-6 py-3 text-xs font-bold text-green-500 text-right">{euro(f.entradas)}</td>
                                        <td className="px-6 py-3 text-xs font-bold text-red-500 text-right">{euro(f.saidas)}</td>
                                        <td className={`px-6 py-3 text-xs font-black text-right ${f.saldo >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {euro(f.saldo)}
                                        </td>
                                        <td className="px-6 py-3 print:hidden">
                                            <div className="flex gap-1 items-end h-6">
                                                <div
                                                    className="bg-green-500/60 rounded-sm min-w-[2px]"
                                                    style={{ width: `${(f.entradas / maxFluxo) * 100}%`, height: '100%' }}
                                                    title={`Entradas: ${euro(f.entradas)}`}
                                                />
                                                <div
                                                    className="bg-red-500/60 rounded-sm min-w-[2px]"
                                                    style={{ width: `${(f.saidas / maxFluxo) * 100}%`, height: '100%' }}
                                                    title={`Saidas: ${euro(f.saidas)}`}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ======================== E. COMPARATIVO MENSAL ======================== */}
            <section>
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted mb-4">
                    Comparativo Mensal &mdash; {MESES[mesAtual]} {anoAtual}
                </h2>
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-soft">
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">Categoria</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Este Mes</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Mes Anterior</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Var. Mensal</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">{MESES[mesAtual]} {anoAtual - 1}</th>
                                    <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Var. Anual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparativo.map((c, i) => {
                                    const varMensal = variacao(c.esteMes, c.mesAnterior)
                                    const varAnual = variacao(c.esteMes, c.mesmoMesAnoAnterior)
                                    return (
                                        <tr key={i} className="border-b border-soft/50 hover:bg-soft/10 transition-all">
                                            <td className="px-6 py-3 text-xs font-bold text-fg">{c.categoria}</td>
                                            <td className="px-6 py-3 text-xs font-bold text-fg text-right">{euro(c.esteMes)}</td>
                                            <td className="px-6 py-3 text-xs font-bold text-muted text-right">{euro(c.mesAnterior)}</td>
                                            <td className={`px-6 py-3 text-xs font-black text-right flex items-center justify-end gap-1 ${varMensal.startsWith('+') ? 'text-green-500' : varMensal.startsWith('-') ? 'text-red-500' : 'text-muted'}`}>
                                                {varMensal.startsWith('+') ? <ArrowUpRight size={12} /> : varMensal.startsWith('-') ? <ArrowDownRight size={12} /> : null}
                                                {varMensal}
                                            </td>
                                            <td className="px-6 py-3 text-xs font-bold text-muted text-right">{euro(c.mesmoMesAnoAnterior)}</td>
                                            <td className={`px-6 py-3 text-xs font-black text-right ${varAnual.startsWith('+') ? 'text-green-500' : varAnual.startsWith('-') ? 'text-red-500' : 'text-muted'}`}>
                                                {varAnual}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ======================== D. CONTRIBUICOES POR MEMBRO (ADMIN only) ======================== */}
            {session.role === 'ADMIN' && (
                <section>
                    <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted mb-4 flex items-center gap-2">
                        <Users size={14} />
                        Top 10 Contribuintes &mdash; {anoAtual}
                    </h2>
                    <p className="text-[10px] md:text-xs text-muted mb-3">Visivel apenas para o pastor / administrador principal.</p>
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-soft">
                                        <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">#</th>
                                        <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">Nome</th>
                                        <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">Total Contribuido</th>
                                        <th className="px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">N. Contribuicoes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topContribuintes.map((c, i) => (
                                        <tr key={c.membro_id} className="border-b border-soft/50 hover:bg-soft/10 transition-all">
                                            <td className="px-6 py-3 text-xs font-bold text-muted">{i + 1}</td>
                                            <td className="px-6 py-3 text-xs font-bold text-fg">
                                                {membroMap.get(c.membro_id) || `Membro #${c.membro_id}`}
                                            </td>
                                            <td className="px-6 py-3 text-xs font-black text-figueira text-right">
                                                {euro(c._sum.valor || 0)}
                                            </td>
                                            <td className="px-6 py-3 text-xs font-bold text-muted text-right">
                                                {c._count}
                                            </td>
                                        </tr>
                                    ))}
                                    {topContribuintes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-xs text-muted">
                                                Nenhuma contribuicao registada este ano.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* Print footer */}
            <div className="hidden print:block text-center mt-8 pt-4 border-t border-gray-300">
                <p className="text-xs text-gray-500">Documento gerado automaticamente pelo sistema ADMVC</p>
            </div>
        </main>
    )
}

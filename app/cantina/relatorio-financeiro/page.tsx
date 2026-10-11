import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart3, AlertTriangle } from 'lucide-react'
import { obterRelatorioCantinaPN } from '@/actions/cantina-relatorio-actions'

export const dynamic = 'force-dynamic'

export default async function RelatorioFinanceiroPage({
    searchParams,
}: {
    searchParams: Promise<{ de?: string; ate?: string }>
}) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const admin = isAdminCheck(session.role)
    if (!admin) {
        const db = await getDb()
        const lideraCantina = await db.departamento.findFirst({
            where: { lider_id: session.membroId, nome: { contains: 'Cantina', mode: 'insensitive' } },
        })
        if (!lideraCantina) redirect('/membros/dashboard?error=Acesso restrito')
    }

    const params = await searchParams
    const now = new Date()
    const defaultDe = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const defaultAte = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const de = params.de || defaultDe
    const ate = params.ate || defaultAte

    const relatorio = await obterRelatorioCantinaPN(de, ate)

    const fmt = (v: number) => v.toFixed(2).replace('.', ',')

    // Period buttons
    const mesAtualDe = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const mesAtualAte = defaultAte

    const trimestreMonth = now.getMonth() - (now.getMonth() % 3)
    const trimestreDe = `${now.getFullYear()}-${String(trimestreMonth + 1).padStart(2, '0')}-01`

    const anoDe = `${now.getFullYear()}-01-01`

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-28">
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="flex items-center gap-4">
                <Link
                    href="/cantina"
                    className="p-2.5 rounded-2xl bg-bg2 border border-soft hover:border-figueira/50 transition-all"
                >
                    <ArrowLeft size={18} className="text-muted" />
                </Link>
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                        Relatorio Financeiro
                    </h1>
                    <p className="text-xs text-muted">
                        Periodo: {de.split('-').reverse().join('/')} a {ate.split('-').reverse().join('/')}
                    </p>
                </div>
            </header>

            {/* ── PERIOD SELECTOR ─────────────────────────────────────── */}
            <section className="flex flex-wrap gap-2">
                <Link
                    href={`/cantina/relatorio-financeiro?de=${mesAtualDe}&ate=${mesAtualAte}`}
                    className="px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    Este Mes
                </Link>
                <Link
                    href={`/cantina/relatorio-financeiro?de=${trimestreDe}&ate=${mesAtualAte}`}
                    className="px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    Este Trimestre
                </Link>
                <Link
                    href={`/cantina/relatorio-financeiro?de=${anoDe}&ate=${mesAtualAte}`}
                    className="px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    Este Ano
                </Link>
            </section>

            {/* ── P&L STATEMENT ────────────────────────────────────────── */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-soft">
                    <DollarSign size={20} className="text-figueira" />
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-fg">
                        Demonstracao de Resultados
                    </h2>
                </div>

                <div className="p-6 space-y-4">
                    {/* Receita */}
                    <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp size={16} className="text-green-500" />
                            <span className="text-sm font-bold text-fg">Receita de Vendas</span>
                        </div>
                        <span className="text-lg font-black text-green-500">{fmt(relatorio.receita)} EUR</span>
                    </div>

                    {/* COGS */}
                    <div className="flex items-center justify-between py-3 border-t border-soft">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={16} className="text-red-400" />
                            <span className="text-sm font-bold text-fg">(-) Custo de Mercadoria</span>
                        </div>
                        <span className="text-lg font-black text-red-400">{fmt(relatorio.custoMercadoria)} EUR</span>
                    </div>

                    {/* Margem Bruta */}
                    <div className="flex items-center justify-between py-3 border-t border-soft bg-soft/10 rounded-xl px-3 -mx-3">
                        <span className="text-sm font-black text-fg">= Margem Bruta</span>
                        <span className={`text-lg font-black ${relatorio.margemBruta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {fmt(relatorio.margemBruta)} EUR
                        </span>
                    </div>

                    {/* Despesas Operacionais */}
                    <div className="flex items-center justify-between py-3 border-t border-soft">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={16} className="text-red-400" />
                            <span className="text-sm font-bold text-fg">(-) Despesas Operacionais</span>
                        </div>
                        <span className="text-lg font-black text-red-400">{fmt(relatorio.despesasOperacionais)} EUR</span>
                    </div>

                    {/* Resultado Liquido */}
                    <div className={`flex items-center justify-between py-4 border-t-2 border-fg/20 rounded-xl px-3 -mx-3 ${relatorio.lucroLiquido >= 0 ? 'bg-green-500/5' : 'bg-red-500/5'}`}>
                        <span className="text-base font-black text-fg">= Resultado Liquido</span>
                        <span className={`text-2xl font-black ${relatorio.lucroLiquido >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {fmt(relatorio.lucroLiquido)} EUR
                        </span>
                    </div>
                </div>
            </section>

            {/* ── WARNING: Products without cost ─────────────────────── */}
            {relatorio.produtosSemCusto > 0 && (
                <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                    <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-amber-600">
                            {relatorio.produtosSemCusto} produto{relatorio.produtosSemCusto > 1 ? 's' : ''} sem custo de aquisicao definido
                        </p>
                        <p className="text-xs text-amber-500/80 mt-1">
                            O calculo do custo de mercadoria esta incompleto. Edite os produtos para adicionar o custo de aquisicao.
                            ({relatorio.produtosComCusto} produto{relatorio.produtosComCusto !== 1 ? 's' : ''} com custo definido)
                        </p>
                    </div>
                </div>
            )}

            {/* ── REVENUE BY PAYMENT METHOD ───────────────────────────── */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-soft">
                    <BarChart3 size={20} className="text-figueira" />
                    <h2 className="text-lg font-black uppercase italic tracking-tighter text-fg">
                        Receita por Metodo de Pagamento
                    </h2>
                </div>

                <div className="p-6 space-y-3">
                    {Object.keys(relatorio.receitaPorMetodo).length === 0 ? (
                        <p className="text-sm text-muted text-center py-4">Sem dados no periodo.</p>
                    ) : (
                        (() => {
                            const labels: Record<string, string> = {
                                CREDITOS: 'Creditos',
                                DINHEIRO: 'Dinheiro',
                                MBWAY: 'MBWay',
                                TRANSFERENCIA: 'Transferencia',
                            }
                            const entries = Object.entries(relatorio.receitaPorMetodo).sort((a, b) => b[1] - a[1])
                            const maxVal = Math.max(...entries.map(([, v]) => v), 1)

                            return entries.map(([key, val]) => (
                                <div key={key} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fg">
                                            {labels[key] || key}
                                        </span>
                                        <span className="text-sm font-black text-figueira">
                                            {fmt(val)} EUR
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-figueira rounded-full transition-all"
                                            style={{ width: `${(val / maxVal) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        })()
                    )}
                </div>
            </section>

            {/* ── EXPENSES BY CATEGORY ─────────────────────────────────── */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-soft">
                    <TrendingDown size={20} className="text-red-400" />
                    <h2 className="text-lg font-black uppercase italic tracking-tighter text-fg">
                        Despesas por Categoria
                    </h2>
                </div>

                <div className="p-6 space-y-3">
                    {Object.keys(relatorio.despesasPorCategoria).length === 0 ? (
                        <p className="text-sm text-muted text-center py-4">Sem despesas pagas no periodo.</p>
                    ) : (
                        (() => {
                            const entries = Object.entries(relatorio.despesasPorCategoria).sort((a, b) => b[1] - a[1])
                            const maxVal = Math.max(...entries.map(([, v]) => v), 1)

                            return entries.map(([cat, val]) => (
                                <div key={cat} className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fg">
                                            {cat}
                                        </span>
                                        <span className="text-sm font-black text-red-400">
                                            {fmt(val)} EUR
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-400 rounded-full transition-all"
                                            style={{ width: `${(val / maxVal) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))
                        })()
                    )}
                </div>
            </section>
        </main>
    )
}

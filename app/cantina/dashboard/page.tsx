import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, TrendingUp, CreditCard, Coffee, ShoppingCart, DollarSign, ArrowRightLeft } from 'lucide-react'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'
import FormTransferirParaFundo from '@/components/cantina/FormTransferirParaFundo'
import { obterSaldoCantinaTransferivel } from '@/actions/cantina-relatorio-actions'

export const dynamic = 'force-dynamic'

export default async function DashboardCantinaPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const db = await getDb()

    // Verificar permissao: admin ou lider da cantina
    const admin = isAdminCheck(session.role)
    let temPermissao = admin

    if (!temPermissao) {
        const lideraCantina = await db.departamento.findFirst({
            where: { lider_id: session.membroId, nome: { contains: 'Cantina', mode: 'insensitive' } },
        })
        if (lideraCantina) temPermissao = true
    }

    if (!temPermissao) redirect('/membros/dashboard?error=Acesso restrito')

    // ── Date boundaries ──────────────────────────────────────────────
    const now = new Date()
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const dayOfWeek = now.getDay() // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(todayMidnight)
    weekStart.setDate(weekStart.getDate() - mondayOffset)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // ── Queries ──────────────────────────────────────────────────────
    const [todayTx, weekTx, monthTx, topProducts, lastTx] = await Promise.all([
        // Today
        db.transacaoCantina.findMany({
            where: { criado_em: { gte: todayMidnight }, tipo: 'CONSUMO' },
        }),
        // This week
        db.transacaoCantina.findMany({
            where: { criado_em: { gte: weekStart }, tipo: 'CONSUMO' },
        }),
        // This month
        db.transacaoCantina.findMany({
            where: { criado_em: { gte: monthStart }, tipo: 'CONSUMO' },
        }),
        // Top 5 products (last 30 days) — filtrar via transacao (que tem tenant_id)
        db.transacaoCantina.findMany({
            where: { criado_em: { gte: thirtyDaysAgo }, tipo: 'CONSUMO' },
            select: { itens: { include: { produto: { select: { nome: true } } } } },
        }),
        // Last 20 transactions
        db.transacaoCantina.findMany({
            where: { tipo: 'CONSUMO' },
            include: {
                membro: { select: { first_name: true, last_name: true } },
                itens: { include: { produto: { select: { nome: true } } } },
            },
            orderBy: { criado_em: 'desc' },
            take: 20,
        }),
    ])

    // ── Financeiro: saldo transferivel + fundos ativos ──────────────
    const [saldoTransferivel, fundosAtivos] = await Promise.all([
        obterSaldoCantinaTransferivel(),
        db.fundoFinanceiro.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        }),
    ])

    // ── Aggregate helpers ────────────────────────────────────────────
    const sumAbs = (list: { valor: number }[]) =>
        list.reduce((s, t) => s + Math.abs(t.valor), 0)

    const todayCount = todayTx.length
    const todayTotal = sumAbs(todayTx)

    const weekCount = weekTx.length
    const weekTotal = sumAbs(weekTx)

    const monthCount = monthTx.length
    const monthTotal = sumAbs(monthTx)

    const ticketMedio = monthCount > 0 ? monthTotal / monthCount : 0

    // ── Payment breakdown (this month) ───────────────────────────────
    const paymentMap: Record<string, number> = {}
    for (const t of monthTx) {
        const key = t.forma_pagamento
        paymentMap[key] = (paymentMap[key] || 0) + Math.abs(t.valor)
    }
    const paymentLabels: Record<string, string> = {
        CREDITOS: 'Creditos',
        DINHEIRO: 'Dinheiro',
        MBWAY: 'MBWay',
        TRANSFERENCIA: 'Transferencia',
    }
    const paymentBreakdown = Object.entries(paymentMap)
        .sort((a, b) => b[1] - a[1])
        .map(([key, val]) => ({ label: paymentLabels[key] || key, value: val }))

    const maxPayment = Math.max(...paymentBreakdown.map((p) => p.value), 1)

    // ── Top 5 products ───────────────────────────────────────────────
    const productAgg: Record<number, { nome: string; qty: number; revenue: number }> = {}
    for (const tx of topProducts) {
        for (const item of (tx as any).itens || []) {
            const pid = item.produto_id
            if (!productAgg[pid]) {
                productAgg[pid] = { nome: item.produto?.nome || 'Desconhecido', qty: 0, revenue: 0 }
            }
            productAgg[pid].qty += item.quantidade
            productAgg[pid].revenue += item.quantidade * item.preco_unitario
        }
    }
    const top5 = Object.values(productAgg)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

    // ── Format helpers ───────────────────────────────────────────────
    const fmt = (v: number) => v.toFixed(2).replace('.', ',')
    const fmtDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const mins = String(d.getMinutes()).padStart(2, '0')
        return `${day}/${month} ${hours}:${mins}`
    }

    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-28">
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                        Dashboard Cantina
                    </h1>
                    <p className="text-xs text-muted">{todayStr}</p>
                </div>
                <div className="flex items-center gap-2 text-figueira">
                    <BarChart3 size={18} />
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest">Analise de Vendas</span>
                </div>
            </header>

            {/* ── STATS ROW ──────────────────────────────────────────── */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Vendas Hoje */}
                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <ShoppingCart size={10} className="text-figueira" />
                        Vendas Hoje
                    </p>
                    <p className="text-3xl font-black text-fg">{todayCount}</p>
                    <p className="text-xs font-bold text-figueira">{fmt(todayTotal)} EUR</p>
                </div>

                {/* Vendas Semana */}
                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <TrendingUp size={10} className="text-figueira" />
                        Vendas Semana
                    </p>
                    <p className="text-3xl font-black text-fg">{weekCount}</p>
                    <p className="text-xs font-bold text-figueira">{fmt(weekTotal)} EUR</p>
                </div>

                {/* Vendas Mes */}
                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <BarChart3 size={10} className="text-figueira" />
                        Vendas Mes
                    </p>
                    <p className="text-3xl font-black text-fg">{monthCount}</p>
                    <p className="text-xs font-bold text-figueira">{fmt(monthTotal)} EUR</p>
                </div>

                {/* Ticket Medio */}
                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <CreditCard size={10} className="text-figueira" />
                        Ticket Medio
                    </p>
                    <p className="text-3xl font-black text-fg">{fmt(ticketMedio)}</p>
                    <p className="text-xs font-bold text-muted">EUR / venda</p>
                </div>
            </section>

            {/* ── PAYMENT BREAKDOWN ──────────────────────────────────── */}
            <section className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <CreditCard size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Formas de Pagamento
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Este Mes</span>
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
                    {paymentBreakdown.length === 0 ? (
                        <p className="text-sm text-muted text-center py-4">Sem dados este mes.</p>
                    ) : (
                        paymentBreakdown.map((p) => (
                            <div key={p.label} className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fg">
                                        {p.label}
                                    </span>
                                    <span className="text-sm font-black text-figueira">
                                        {fmt(p.value)} EUR
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-bg rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-figueira rounded-full transition-all"
                                        style={{ width: `${(p.value / maxPayment) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* ── TOP 5 PRODUTOS ──────────────────────────────────────── */}
            <section className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <Coffee size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Top 5 Produtos
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                    <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Ultimos 30 Dias</span>
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    {top5.length === 0 ? (
                        <p className="text-sm text-muted text-center py-8">Sem dados nos ultimos 30 dias.</p>
                    ) : (
                        <>
                            <div className="hidden sm:grid grid-cols-[auto_1fr_100px_100px] gap-4 px-6 py-3 border-b border-soft">
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted w-8">#</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Produto</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Qtd</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Receita</p>
                            </div>
                            {top5.map((p, i) => (
                                <div
                                    key={i}
                                    className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_100px_100px] gap-4 px-6 py-4 border-b border-soft last:border-b-0 items-center"
                                >
                                    <span className="text-lg font-black text-figueira w-8">{i + 1}</span>
                                    <p className="text-sm font-bold text-fg">{p.nome}</p>
                                    <p className="text-sm font-black text-fg text-right">{p.qty}</p>
                                    <p className="hidden sm:block text-sm font-black text-figueira text-right">
                                        {fmt(p.revenue)} EUR
                                    </p>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </section>

            {/* ── ULTIMAS TRANSACOES ──────────────────────────────────── */}
            <section className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <ShoppingCart size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Ultimas Transacoes
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    {lastTx.length === 0 ? (
                        <p className="text-sm text-muted text-center py-8">Nenhuma transacao registada.</p>
                    ) : (
                        <>
                            {/* Desktop header */}
                            <div className="hidden lg:grid grid-cols-[110px_1fr_1fr_90px_110px] gap-4 px-6 py-3 border-b border-soft">
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Data</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Cliente</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Itens</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Total</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Pagamento</p>
                            </div>
                            {lastTx.map((tx) => {
                                const memberName = tx.membro
                                    ? `${tx.membro.first_name} ${tx.membro.last_name || ''}`.trim()
                                    : 'Venda Avulsa'
                                const itemsDesc = tx.itens
                                    .map((it) => `${it.quantidade}x ${it.produto?.nome || '?'}`)
                                    .join(', ')

                                return (
                                    <div
                                        key={tx.id}
                                        className="lg:grid lg:grid-cols-[110px_1fr_1fr_90px_110px] gap-4 px-6 py-4 border-b border-soft last:border-b-0 items-center"
                                    >
                                        <p className="text-xs font-bold text-muted">
                                            {fmtDate(tx.criado_em)}
                                        </p>
                                        <p className="text-sm font-bold text-fg">{memberName}</p>
                                        <p className="text-xs text-muted truncate">{itemsDesc || '-'}</p>
                                        <p className="text-sm font-black text-fg text-right">
                                            {fmt(Math.abs(tx.valor))} EUR
                                        </p>
                                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted text-right">
                                            {paymentLabels[tx.forma_pagamento] || tx.forma_pagamento}
                                        </p>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            </section>

            {/* ── FINANCEIRO ─────────────────────────────────────────── */}
            <section className="pt-6 border-t border-soft">
                <SeccaoColapsavel
                    titulo="Financeiro"
                    icon={<DollarSign size={16} className="text-figueira" />}
                    headerExtra={
                        <Link
                            href="/cantina/relatorio-financeiro"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest bg-figueira/10 text-figueira border border-figueira/20 hover:bg-figueira/20 transition-all active:scale-95"
                        >
                            <BarChart3 size={12} />
                            Relatorio P&L
                        </Link>
                    }
                >
                    <FormTransferirParaFundo
                        fundos={fundosAtivos}
                        saldoDisponivel={saldoTransferivel.disponivel}
                        receitaCash={saldoTransferivel.receitaCash}
                        jaTransferido={saldoTransferivel.jaTransferido}
                    />
                </SeccaoColapsavel>
            </section>

            {/* ── LINKS ──────────────────────────────────────────────── */}
            <section className="flex flex-wrap gap-2 pt-6 border-t border-soft">
                <Link
                    href="/cantina/turnos"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <BarChart3 size={14} className="text-figueira" /> Turnos
                </Link>
                <Link
                    href="/cantina/pos"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <ShoppingCart size={14} className="text-figueira" /> Ponto de Venda
                </Link>
                <Link
                    href="/cantina/produtos"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <Coffee size={14} className="text-figueira" /> Produtos
                </Link>
                <Link
                    href="/cantina/relatorio-financeiro"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <DollarSign size={14} className="text-figueira" /> Relatorio Financeiro
                </Link>
            </section>
        </main>
    )
}

import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Wallet, ArrowRightLeft, PlusCircle, Lock, Unlock,
    TrendingUp, TrendingDown, Layers, Landmark, AlertTriangle
} from 'lucide-react'
import { obterAlertasOrcamento } from '@/actions/alerta-orcamento-actions'
import FormCriarFundo from '@/components/financeiro/FormCriarFundo'
import FormTransferencia from '@/components/financeiro/FormTransferencia'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

export default async function FundosDashboard() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado ao módulo financeiro')
    }

    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)

    const [fundos, contribuicoesMes, despesasPagasMes, despesasPendentes] = await Promise.all([
        db.fundoFinanceiro.findMany({
            where: { ativo: true },
            orderBy: { criado_em: 'desc' },
        }),
        db.contribuicao.findMany({
            where: { data: { gte: inicioMes } },
            select: { fundo_id: true, valor: true },
        }),
        db.despesaFinanceira.findMany({
            where: { status: 'PAGA', data: { gte: inicioMes } },
            select: { fundo_id: true, valor: true },
        }),
        db.despesaFinanceira.count({
            where: { status: 'PENDENTE' },
        }),
    ])

    // Aggregate entradas/saidas per fundo this month
    const entradasPorFundo: Record<number, number> = {}
    const saidasPorFundo: Record<number, number> = {}

    for (const c of contribuicoesMes) {
        if (c.fundo_id) {
            entradasPorFundo[c.fundo_id] = (entradasPorFundo[c.fundo_id] || 0) + c.valor
        }
    }
    for (const d of despesasPagasMes) {
        saidasPorFundo[d.fundo_id] = (saidasPorFundo[d.fundo_id] || 0) + d.valor
    }

    // Budget alerts
    const alertas = await obterAlertasOrcamento()
    const alertasExcedidos = alertas.filter(a => a.excedeu)

    const totalGeral = fundos.reduce((s, f) => s + f.saldo_atual, 0)
    const totalRestrito = fundos.filter(f => f.restrito).reduce((s, f) => s + f.saldo_atual, 0)
    const totalLivre = totalGeral - totalRestrito

    const tipoBadgeColor: Record<string, string> = {
        GERAL: 'bg-blue-500/10 text-blue-500',
        CONSTRUCAO: 'bg-amber-500/10 text-amber-500',
        MISSOES: 'bg-purple-500/10 text-purple-500',
        SOCIAL: 'bg-pink-500/10 text-pink-500',
        CANTINA: 'bg-green-500/10 text-green-500',
        CUSTOM: 'bg-gray-500/10 text-gray-400',
    }

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Gestao de Fundos</h1>
                    <p className="text-xs text-muted">Controlo de saldos, entradas e saidas por fundo.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/financeiro/despesas"
                        className="h-11 px-4 bg-bg2 border border-soft text-fg rounded-xl flex items-center gap-2 hover:bg-bg transition-all active:scale-95 text-[9px] md:text-[11px] font-black uppercase tracking-widest"
                    >
                        <Wallet size={14} />
                        Despesas
                    </Link>
                </div>
            </header>

            {/* KPIs */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total Geral" value={euro(totalGeral)} accent />
                <KpiCard label="Restrito" value={euro(totalRestrito)} />
                <KpiCard label="Livre" value={euro(totalLivre)} />
                <KpiCard label="Despesas Pendentes" value={despesasPendentes} />
            </section>

            {/* Budget Alert Banner */}
            {alertasExcedidos.length > 0 && (
                <Link
                    href="/financeiro/orcamento"
                    className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-all group"
                >
                    <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-amber-500">
                        {alertasExcedidos.length} categoria{alertasExcedidos.length !== 1 ? 's' : ''} de orcamento acima do limiar definido
                    </p>
                    <span className="ml-auto text-[8px] md:text-[10px] font-black uppercase tracking-widest text-amber-500 group-hover:translate-x-0.5 transition-transform">
                        Ver detalhes &rarr;
                    </span>
                </Link>
            )}

            {/* Fund Grid */}
            <section className="space-y-3">
                <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Layers size={14} /> Fundos Ativos ({fundos.length})
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {fundos.map((fundo) => {
                        const entradas = entradasPorFundo[fundo.id] || 0
                        const saidas = saidasPorFundo[fundo.id] || 0
                        const badgeClass = tipoBadgeColor[fundo.tipo] || tipoBadgeColor.CUSTOM

                        return (
                            <div
                                key={fundo.id}
                                className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4 hover:-translate-y-0.5 transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                                {fundo.nome}
                                            </h3>
                                            {fundo.restrito && (
                                                <span className="flex items-center gap-1 text-[7px] md:text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                                                    <Lock size={8} /> Restrito
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${badgeClass}`}>
                                            {fundo.tipo}
                                        </span>
                                    </div>
                                    <div className="bg-figueira/10 p-3 rounded-2xl text-figueira">
                                        <Landmark size={20} />
                                    </div>
                                </div>

                                {fundo.descricao && (
                                    <p className="text-[10px] md:text-xs text-muted leading-relaxed">{fundo.descricao}</p>
                                )}

                                <p className="text-3xl font-black italic tracking-tighter text-fg leading-none valor-dinheiro">
                                    {euro(fundo.saldo_atual)}
                                </p>

                                <div className="flex items-center gap-4 pt-2 border-t border-soft">
                                    <div className="flex items-center gap-1.5">
                                        <TrendingUp size={12} className="text-green-500" />
                                        <span className="text-[9px] md:text-[11px] font-bold text-green-500">{euro(entradas)}</span>
                                        <span className="text-[7px] md:text-[9px] text-muted font-black uppercase tracking-widest">este mes</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <TrendingDown size={12} className="text-red-500" />
                                        <span className="text-[9px] md:text-[11px] font-bold text-red-500">{euro(saidas)}</span>
                                        <span className="text-[7px] md:text-[9px] text-muted font-black uppercase tracking-widest">este mes</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {fundos.length === 0 && (
                    <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center space-y-3">
                        <Landmark size={32} className="text-muted mx-auto" />
                        <p className="text-[10px] md:text-xs font-bold text-muted">Nenhum fundo criado ainda.</p>
                    </div>
                )}
            </section>

            {/* Transfer Between Funds */}
            <section className="space-y-3">
                <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <ArrowRightLeft size={14} /> Transferencia entre Fundos
                </h2>
                <FormTransferencia fundos={fundos.map(f => ({ id: f.id, nome: f.nome, saldo_atual: f.saldo_atual }))} />
            </section>

            {/* Create Fund */}
            <section className="space-y-3">
                <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <PlusCircle size={14} /> Criar Fundo
                </h2>
                <FormCriarFundo />
            </section>
        </main>
    )
}

function KpiCard({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
    return (
        <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all hover:-translate-y-0.5
            ${accent ? 'bg-figueira/5 border-figueira/20' : 'bg-bg2 border-soft'}`}>
            <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${accent ? 'text-figueira' : 'text-muted'}`}>{label}</p>
            <p className={`text-2xl font-black italic tracking-tighter leading-none ${accent ? 'text-figueira' : 'text-fg'}`}>{value}</p>
        </div>
    )
}

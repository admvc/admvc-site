import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Landmark, CheckCircle2, Clock, ArrowLeft,
    TrendingUp, TrendingDown, Banknote
} from 'lucide-react'
import FormImportarExtrato from '@/components/financeiro/FormImportarExtrato'
import BotaoAutoReconciliar from '@/components/financeiro/BotaoAutoReconciliar'
import FormCriarConta from '@/components/financeiro/FormCriarConta'
import { BotaoReconciliar, BotaoDesreconciliar } from '@/components/financeiro/BotaoReconciliar'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatarData = (data: any) =>
    new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(data))

export default async function ReconciliacaoPage({
    searchParams,
}: {
    searchParams: Promise<{ conta?: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado')
    }

    const params = await searchParams

    // Load all bank accounts
    const contas = await db.contaBancaria.findMany({
        where: { ativa: true },
        orderBy: { nome: 'asc' },
    })

    const contaSelecionadaId = params.conta ? Number(params.conta) : contas[0]?.id
    const contaSelecionada = contas.find(c => c.id === contaSelecionadaId)

    // Load movements for selected account
    let movimentos: any[] = []
    let stats = { total: 0, reconciliados: 0, pendentes: 0, totalCreditos: 0, totalDebitos: 0, saldo: 0 }

    if (contaSelecionada) {
        movimentos = await db.movimentoBancario.findMany({
            where: { conta_id: contaSelecionada.id },
            orderBy: { data: 'desc' },
        })

        stats.total = movimentos.length
        stats.reconciliados = movimentos.filter((m: any) => m.reconciliado).length
        stats.pendentes = stats.total - stats.reconciliados
        stats.totalCreditos = movimentos.filter((m: any) => m.valor > 0).reduce((s: number, m: any) => s + m.valor, 0)
        stats.totalDebitos = movimentos.filter((m: any) => m.valor < 0).reduce((s: number, m: any) => s + m.valor, 0)
        stats.saldo = stats.totalCreditos + stats.totalDebitos
    }

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Reconciliacao Bancaria</h1>
                    <p className="text-xs text-muted">Importar extratos e reconciliar movimentos com registos financeiros.</p>
                </div>
                <Link
                    href="/financeiro/fundos"
                    className="h-11 px-4 bg-bg2 border border-soft text-fg rounded-xl flex items-center gap-2 hover:bg-bg transition-all active:scale-95 text-[9px] md:text-[11px] font-black uppercase tracking-widest w-fit"
                >
                    <ArrowLeft size={14} />
                    Financeiro
                </Link>
            </header>

            {/* Account Selector + Create */}
            <section className="flex flex-wrap items-center gap-3">
                {contas.map(conta => (
                    <Link
                        key={conta.id}
                        href={`/financeiro/reconciliacao?conta=${conta.id}`}
                        className={`h-10 px-4 rounded-xl flex items-center gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            conta.id === contaSelecionadaId
                                ? 'bg-accent text-white'
                                : 'bg-bg2 border border-soft text-fg hover:bg-bg'
                        }`}
                    >
                        <Landmark size={12} />
                        {conta.nome}
                        {conta.banco && <span className="text-[8px] md:text-[10px] opacity-60">({conta.banco})</span>}
                    </Link>
                ))}
                <FormCriarConta />
            </section>

            {!contaSelecionada && contas.length === 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center space-y-2">
                    <Landmark size={32} className="mx-auto text-muted" />
                    <p className="text-sm text-muted">Nenhuma conta bancaria registada.</p>
                    <p className="text-xs text-muted">Crie uma conta para comecar a importar extratos.</p>
                </div>
            )}

            {contaSelecionada && (
                <>
                    {/* Import + Auto-Reconcile Actions */}
                    <section className="flex flex-wrap items-start gap-4">
                        <FormImportarExtrato contaId={contaSelecionada.id} />
                        <BotaoAutoReconciliar contaId={contaSelecionada.id} />
                    </section>

                    {/* Stats Cards */}
                    <section className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-1">
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted">Total Movimentos</p>
                            <p className="text-2xl font-black text-fg">{stats.total}</p>
                        </div>
                        <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-green-400 flex items-center gap-1">
                                <CheckCircle2 size={10} /> Reconciliados
                            </p>
                            <p className="text-2xl font-black text-green-400">{stats.reconciliados}</p>
                        </div>
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 flex items-center gap-1">
                                <Clock size={10} /> Pendentes
                            </p>
                            <p className="text-2xl font-black text-orange-400">{stats.pendentes}</p>
                        </div>
                        <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-1">
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                                <TrendingUp size={10} /> Creditos
                            </p>
                            <p className="text-lg font-black text-green-400">{euro(stats.totalCreditos)}</p>
                            <p className="text-[10px] text-muted flex items-center gap-1">
                                <TrendingDown size={10} /> Debitos: <span className="text-red-400">{euro(stats.totalDebitos)}</span>
                            </p>
                        </div>
                        <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-1">
                            <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-muted flex items-center gap-1">
                                <Banknote size={10} /> Saldo
                            </p>
                            <p className={`text-2xl font-black ${stats.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {euro(stats.saldo)}
                            </p>
                        </div>
                    </section>

                    {/* Movements Table */}
                    <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-soft">
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Data</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Descricao</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Valor</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Saldo</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Estado</th>
                                        <th className="px-4 py-3 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Accoes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimentos.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                                                Nenhum movimento importado. Importe um extrato CSV para comecar.
                                            </td>
                                        </tr>
                                    )}
                                    {movimentos.map((mov: any) => (
                                        <tr key={mov.id} className="border-b border-soft/50 hover:bg-bg/50 transition-colors">
                                            <td className="px-4 py-3 text-xs text-fg whitespace-nowrap">
                                                {formatarData(mov.data)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-fg max-w-xs truncate" title={mov.descricao}>
                                                {mov.descricao}
                                                {mov.referencia && (
                                                    <span className="ml-1 text-[10px] md:text-xs text-muted">({mov.referencia})</span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-xs font-bold text-right whitespace-nowrap ${
                                                mov.valor >= 0 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {mov.valor >= 0 ? '+' : ''}{euro(mov.valor)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted text-right whitespace-nowrap">
                                                {mov.saldo_apos != null ? euro(mov.saldo_apos) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {mov.reconciliado ? (
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                                                            <CheckCircle2 size={10} />
                                                            Reconciliado
                                                        </span>
                                                        {mov.reconciliado_com && (
                                                            <p className="text-[9px] md:text-[11px] text-muted truncate max-w-[140px]" title={mov.reconciliado_com}>
                                                                {mov.reconciliado_com}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                                                        <Clock size={10} />
                                                        Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {mov.reconciliado ? (
                                                    <BotaoDesreconciliar movimentoId={mov.id} />
                                                ) : (
                                                    <BotaoReconciliar movimentoId={mov.id} />
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </main>
    )
}

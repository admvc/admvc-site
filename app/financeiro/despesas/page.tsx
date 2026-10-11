import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Wallet, AlertCircle, CheckCircle2, XCircle, Clock,
    Receipt, Landmark, ArrowLeft
} from 'lucide-react'
import FormDespesa from '@/components/financeiro/FormDespesa'
import BotaoAprovarDespesa from '@/components/financeiro/BotaoAprovarDespesa'
import BotaoRejeitarDespesa from '@/components/financeiro/BotaoRejeitarDespesa'
import BotaoPagarDespesa from '@/components/financeiro/BotaoPagarDespesa'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatarData = (data: any) =>
    new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit', month: 'short', year: 'numeric'
    }).format(new Date(data))

export default async function DespesasPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN', 'LEADER'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado ao módulo financeiro')
    }

    const [pendentes, recentes, fundos, categorias] = await Promise.all([
        db.despesaFinanceira.findMany({
            where: { status: 'PENDENTE' },
            include: {
                fundo: { select: { nome: true } },
                categoria: { select: { nome: true } },
            },
            orderBy: { criado_em: 'asc' },
        }),
        db.despesaFinanceira.findMany({
            take: 30,
            include: {
                fundo: { select: { nome: true } },
                categoria: { select: { nome: true } },
            },
            orderBy: { criado_em: 'desc' },
        }),
        db.fundoFinanceiro.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        }),
        db.categoriaOrcamento.findMany({
            select: { id: true, nome: true, fundo_id: true },
            orderBy: { nome: 'asc' },
        }),
    ])

    const statusConfig: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        PENDENTE: { bg: 'bg-orange-500/10', text: 'text-orange-500', icon: <Clock size={12} /> },
        APROVADA: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: <CheckCircle2 size={12} /> },
        PAGA: { bg: 'bg-green-500/10', text: 'text-green-500', icon: <CheckCircle2 size={12} /> },
        REJEITADA: { bg: 'bg-red-500/10', text: 'text-red-500', icon: <XCircle size={12} /> },
    }

    const isFinanceOrAdmin = ['FINANCE', 'ADMIN'].includes(session.role)

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Despesas</h1>
                    <p className="text-xs text-muted">Submeter, aprovar e gerir despesas da igreja.</p>
                </div>
                <Link
                    href="/financeiro/fundos"
                    className="h-11 px-4 bg-bg2 border border-soft text-fg rounded-xl flex items-center gap-2 hover:bg-bg transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest w-fit"
                >
                    <Landmark size={14} />
                    Fundos
                </Link>
            </header>

            {/* Pending Approvals */}
            {pendentes.length > 0 && isFinanceOrAdmin && (
                <section className="space-y-3">
                    <details open className="group">
                        <summary className="list-none cursor-pointer marker:hidden [&::-webkit-details-marker]:hidden">
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-6 py-4 flex items-center gap-4">
                                <div className="bg-orange-500/10 p-3 rounded-2xl text-orange-500">
                                    <AlertCircle size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] font-black uppercase text-orange-700">
                                        {pendentes.length} despesa{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-[9px] text-orange-600/80 font-bold">A aguardar aprovacao</p>
                                </div>
                            </div>
                        </summary>

                        <div className="space-y-2 pt-3">
                            {pendentes.map((d: any) => (
                                <div key={d.id} className="bg-bg2 border border-orange-500/20 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1 flex-1">
                                        <p className="text-[11px] font-black uppercase text-fg">{d.descricao}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted bg-bg px-2 py-0.5 rounded-md">
                                                {d.fundo.nome}
                                            </span>
                                            {d.categoria && (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted bg-bg px-2 py-0.5 rounded-md">
                                                    {d.categoria.nome}
                                                </span>
                                            )}
                                            {d.fornecedor && (
                                                <span className="text-[8px] text-muted">{d.fornecedor}</span>
                                            )}
                                        </div>
                                        <p className="text-[8px] text-muted">{formatarData(d.data)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black italic tracking-tighter text-fg">{euro(d.valor)}</span>
                                        <BotaoAprovarDespesa despesaId={d.id} />
                                        <BotaoRejeitarDespesa despesaId={d.id} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                </section>
            )}

            {/* Submit new expense */}
            <section className="space-y-3">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Receipt size={14} /> Submeter Despesa
                </h2>
                <FormDespesa
                    fundos={fundos}
                    categorias={categorias}
                />
            </section>

            {/* History table */}
            <section className="space-y-3">
                <h2 className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Wallet size={14} /> Historico de Despesas
                </h2>

                {recentes.length === 0 ? (
                    <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center space-y-3">
                        <Wallet size={32} className="text-muted mx-auto" />
                        <p className="text-[10px] font-bold text-muted">Nenhuma despesa registada.</p>
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-soft">
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Data</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Descricao</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Fundo</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Categoria</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Valor</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Fornecedor</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Status</th>
                                        <th className="px-5 py-3.5 text-[8px] font-black uppercase tracking-widest text-muted">Acoes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentes.map((d: any) => {
                                        const sc = statusConfig[d.status] || statusConfig.PENDENTE
                                        return (
                                            <tr key={d.id} className="border-b border-soft/50 last:border-0 hover:bg-bg/50 transition-colors">
                                                <td className="px-5 py-3 text-[10px] text-muted whitespace-nowrap">{formatarData(d.data)}</td>
                                                <td className="px-5 py-3 text-[10px] font-bold text-fg max-w-[200px] truncate">{d.descricao}</td>
                                                <td className="px-5 py-3">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted bg-bg px-2 py-0.5 rounded-md">
                                                        {d.fundo.nome}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-[10px] text-muted">{d.categoria?.nome || '-'}</td>
                                                <td className="px-5 py-3 text-[11px] font-black text-fg whitespace-nowrap">{euro(d.valor)}</td>
                                                <td className="px-5 py-3 text-[10px] text-muted">{d.fornecedor || '-'}</td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${sc.bg} ${sc.text}`}>
                                                        {sc.icon} {d.status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    {d.status === 'APROVADA' && isFinanceOrAdmin && (
                                                        <BotaoPagarDespesa despesaId={d.id} />
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>
        </main>
    )
}

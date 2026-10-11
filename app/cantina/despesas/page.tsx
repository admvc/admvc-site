import { getDb } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { ArrowLeft, Receipt, Clock, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'
import FormDespesaCantina from '@/components/cantina/FormDespesaCantina'
import BotaoAprovarDespesaCantina from '@/components/cantina/BotaoAprovarDespesaCantina'

export default async function DespesasCantinaPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const isAdmin = isAdminCheck(session.role)

    const despesas = await (db as any).despesaCantina.findMany({
        orderBy: { criado_em: 'desc' },
    })

    // KPI calculations
    const pendentes = despesas.filter((d: any) => d.status === 'PENDENTE')
    const totalPago = despesas
        .filter((d: any) => d.status === 'PAGA')
        .reduce((sum: number, d: any) => sum + (d.valor || 0), 0)

    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    const totalEsteMes = despesas
        .filter((d: any) => new Date(d.criado_em) >= inicioMes)
        .reduce((sum: number, d: any) => sum + (d.valor || 0), 0)

    const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
        PENDENTE: { label: 'Pendente', bg: 'bg-orange-500/10', text: 'text-orange-600' },
        APROVADA: { label: 'Aprovada', bg: 'bg-blue-500/10', text: 'text-blue-600' },
        REJEITADA: { label: 'Rejeitada', bg: 'bg-red-500/10', text: 'text-red-500' },
        PAGA: { label: 'Paga', bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    }

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-28">

            {/* HEADER */}
            <header className="flex items-center gap-3">
                <Link href="/cantina"
                    className="text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-1">
                    <ArrowLeft size={12} /> Cantina
                </Link>
                <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-fg">Despesas da Cantina</h1>
            </header>

            {/* KPI ROW */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg2 border border-soft rounded-2xl p-4 text-center">
                    <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
                        <Clock size={16} className="text-orange-500" />
                    </div>
                    <p className="text-lg sm:text-xl font-black text-fg">{pendentes.length}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Pendentes</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-4 text-center">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
                        <DollarSign size={16} className="text-emerald-500" />
                    </div>
                    <p className="text-lg sm:text-xl font-black text-fg">{totalPago.toFixed(2)}&euro;</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Total Pago</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-4 text-center">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                        <Receipt size={16} className="text-blue-500" />
                    </div>
                    <p className="text-lg sm:text-xl font-black text-fg">{totalEsteMes.toFixed(2)}&euro;</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Este Mes</p>
                </div>
            </div>

            {/* PENDING SECTION */}
            {pendentes.length > 0 && (
                <section className="bg-orange-500/5 border border-orange-500/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-500/10">
                        <div className="w-8 h-8 bg-orange-500 text-white rounded-xl flex items-center justify-center animate-pulse">
                            <Clock size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-fg">Aguardam Aprovacao</h2>
                            <p className="text-[8px] font-bold text-orange-600 uppercase tracking-widest">
                                {pendentes.length} despesa{pendentes.length !== 1 ? 's' : ''} pendente{pendentes.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-orange-500/10">
                        {pendentes.map((d: any) => (
                            <div key={d.id} className="px-5 py-4 hover:bg-orange-500/5 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[11px] font-black uppercase text-fg">{d.descricao}</p>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <span className="text-[10px] font-black text-orange-600">{Number(d.valor).toFixed(2)}&euro;</span>
                                            <span className="text-[8px] font-bold text-muted">{d.categoria}</span>
                                            {d.fornecedor && (
                                                <span className="text-[8px] font-bold text-muted">Fornecedor: {d.fornecedor}</span>
                                            )}
                                            <span className="text-[8px] font-bold text-muted">
                                                {new Date(d.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </div>
                                        {d.observacao && (
                                            <p className="text-[9px] text-muted italic mt-1">"{d.observacao}"</p>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="shrink-0">
                                            <BotaoAprovarDespesaCantina despesaId={d.id} statusAtual={d.status} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* SUBMIT FORM */}
            <SeccaoColapsavel
                titulo="Registar Despesa"
                icon={<Receipt size={14} className="text-figueira" />}
                defaultOpen={pendentes.length === 0}
            >
                <div className="p-1">
                    <FormDespesaCantina />
                </div>
            </SeccaoColapsavel>

            {/* HISTORY TABLE */}
            <SeccaoColapsavel
                titulo="Historico"
                icon={<Receipt size={14} className="text-muted" />}
                badge={<span className="text-[8px] font-black bg-soft px-2 py-0.5 rounded text-muted">{despesas.length}</span>}
                defaultOpen={true}
            >
                {despesas.length === 0 ? (
                    <div className="py-12 text-center">
                        <Receipt size={24} className="mx-auto text-muted/20 mb-3" />
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhuma despesa registada.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-soft">
                                    <th className="text-[8px] font-black uppercase tracking-widest text-muted px-5 py-3">Data</th>
                                    <th className="text-[8px] font-black uppercase tracking-widest text-muted px-3 py-3">Descricao</th>
                                    <th className="text-[8px] font-black uppercase tracking-widest text-muted px-3 py-3 hidden sm:table-cell">Categoria</th>
                                    <th className="text-[8px] font-black uppercase tracking-widest text-muted px-3 py-3 text-right">Valor</th>
                                    <th className="text-[8px] font-black uppercase tracking-widest text-muted px-3 py-3 text-center">Status</th>
                                    {isAdmin && (
                                        <th className="text-[8px] font-black uppercase tracking-widest text-muted px-3 py-3 text-right">Acoes</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft">
                                {despesas.map((d: any) => {
                                    const cfg = statusConfig[d.status] || statusConfig.PENDENTE
                                    return (
                                        <tr key={d.id} className="hover:bg-soft/10 transition-colors">
                                            <td className="px-5 py-3">
                                                <span className="text-[10px] font-bold text-fg whitespace-nowrap">
                                                    {new Date(d.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="text-[10px] font-black text-fg">{d.descricao}</p>
                                                {d.fornecedor && (
                                                    <p className="text-[8px] font-bold text-muted">{d.fornecedor}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 hidden sm:table-cell">
                                                <span className="text-[9px] font-bold text-muted">{d.categoria}</span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <span className="text-[11px] font-black text-fg">{Number(d.valor).toFixed(2)}&euro;</span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${cfg.bg} ${cfg.text}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="px-3 py-3 text-right">
                                                    {(d.status === 'PENDENTE' || d.status === 'APROVADA') && (
                                                        <BotaoAprovarDespesaCantina despesaId={d.id} statusAtual={d.status} />
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </SeccaoColapsavel>
        </main>
    )
}

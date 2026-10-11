import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import {
    HeartHandshake, AlertTriangle, CheckCircle2, XCircle,
    Clock, TrendingUp, Users
} from 'lucide-react'
import BotaoAtualizarPledges from '@/components/financeiro/BotaoAtualizarPledges'
import FormNovoPledge from '@/components/financeiro/FormNovoPledge'
import { atualizarPledgesAutomatico } from '@/actions/pledge-actions'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    ATIVO: { label: 'Ativo', color: 'text-blue-500', bgColor: 'bg-blue-500/10 text-blue-500', icon: Clock },
    ATRASADO: { label: 'Atrasado', color: 'text-red-500', bgColor: 'bg-red-500/10 text-red-500', icon: AlertTriangle },
    CUMPRIDO: { label: 'Cumprido', color: 'text-green-500', bgColor: 'bg-green-500/10 text-green-500', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'text-gray-400', bgColor: 'bg-gray-500/10 text-gray-400', icon: XCircle },
}

export default async function PledgesPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado')
    }

    // Auto-update pledge statuses before rendering
    await atualizarPledgesAutomatico()

    const [pledges, fundos, membros] = await Promise.all([
        db.pledge.findMany({
            include: {
                membro: { select: { id: true, first_name: true, last_name: true } },
                fundo: { select: { id: true, nome: true } },
            },
            orderBy: { criado_em: 'desc' },
        }),
        db.fundoFinanceiro.findMany({
            where: { ativo: true },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        }),
        db.membro.findMany({
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
        }),
    ])

    const ativos = pledges.filter(p => p.status === 'ATIVO')
    const atrasados = pledges.filter(p => p.status === 'ATRASADO')
    const cumpridos = pledges.filter(p => p.status === 'CUMPRIDO')
    const cancelados = pledges.filter(p => p.status === 'CANCELADO')

    const totalPrometidoMensal = ativos.reduce((s, p) => s + p.valor_mensal, 0) +
        atrasados.reduce((s, p) => s + p.valor_mensal, 0)
    const totalCumprido = pledges.reduce((s, p) => s + p.valor_cumprido, 0)

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 pb-28 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700">

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">
                        Promessas de Contribuicao
                    </h1>
                    <p className="text-xs text-muted">
                        Gestao de pledges e acompanhamento de cumprimento.
                    </p>
                </div>
                <BotaoAtualizarPledges />
            </header>

            {/* KPIs */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard
                    label="Ativos"
                    value={ativos.length}
                    icon={Clock}
                    iconColor="text-blue-500"
                />
                <KpiCard
                    label="Atrasados"
                    value={atrasados.length}
                    icon={AlertTriangle}
                    iconColor="text-red-500"
                    accent={atrasados.length > 0 ? 'red' : undefined}
                />
                <KpiCard
                    label="Cumpridos"
                    value={cumpridos.length}
                    icon={CheckCircle2}
                    iconColor="text-green-500"
                />
                <KpiCard
                    label="Total Prometido/Mes"
                    value={euro(totalPrometidoMensal)}
                    icon={TrendingUp}
                    iconColor="text-figueira"
                    accent="figueira"
                />
            </section>

            {/* Alertas de Atrasados */}
            {atrasados.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                        <AlertTriangle size={14} /> Pledges Atrasados ({atrasados.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {atrasados.map(pledge => {
                            const inicio = new Date(pledge.data_inicio)
                            const now = new Date()
                            const mesesPassados = (now.getFullYear() - inicio.getFullYear()) * 12 + (now.getMonth() - inicio.getMonth())
                            const mesesAtras = Math.max(0, mesesPassados - pledge.meses_cumpridos)

                            return (
                                <div key={pledge.id} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-black uppercase tracking-tight text-fg">
                                            {pledge.membro.first_name} {pledge.membro.last_name}
                                        </p>
                                        <span className="text-[7px] md:text-[9px] md:text-[11px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md">
                                            {mesesAtras} mes(es) atras
                                        </span>
                                    </div>
                                    <p className="text-[9px] md:text-[11px] text-muted">
                                        {pledge.fundo?.nome || 'Sem fundo'} - {euro(pledge.valor_mensal)}/mes
                                    </p>
                                    <div className="w-full h-1.5 bg-red-500/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-red-500 rounded-full"
                                            style={{ width: `${Math.min(100, Math.round((pledge.meses_cumpridos / pledge.duracao_meses) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* Tabela de todos os pledges */}
            <section className="space-y-3">
                <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Users size={14} /> Todos os Pledges ({pledges.length})
                </h2>

                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-soft">
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Membro</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Fundo</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Valor/Mes</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Duracao</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Cumprido</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Progresso</th>
                                    <th className="px-6 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pledges.map(pledge => {
                                    const cfg = statusConfig[pledge.status] || statusConfig.ATIVO
                                    const Icon = cfg.icon
                                    const progresso = pledge.duracao_meses > 0
                                        ? Math.min(100, Math.round((pledge.meses_cumpridos / pledge.duracao_meses) * 100))
                                        : 0

                                    return (
                                        <tr key={pledge.id} className="border-b border-soft/50 hover:bg-soft/10 transition-all">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-fg">
                                                    {pledge.membro.first_name} {pledge.membro.last_name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-muted">
                                                    {pledge.fundo?.nome || 'Sem fundo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-fg">
                                                    {euro(pledge.valor_mensal)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-muted">
                                                    {pledge.duracao_meses} meses
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-muted">
                                                    {pledge.meses_cumpridos}/{pledge.duracao_meses} meses
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 min-w-[120px]">
                                                    <div className="flex-1 h-2 bg-soft rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                pledge.status === 'ATRASADO' ? 'bg-red-500' :
                                                                pledge.status === 'CUMPRIDO' ? 'bg-green-500' :
                                                                pledge.status === 'CANCELADO' ? 'bg-gray-400' :
                                                                'bg-figueira'
                                                            }`}
                                                            style={{ width: `${progresso}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] md:text-[11px] font-bold text-muted w-8 text-right">{progresso}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`flex items-center gap-1 text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit ${cfg.bgColor}`}>
                                                    <Icon size={10} />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {pledges.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center">
                                            <HeartHandshake size={28} className="text-muted mx-auto mb-2" />
                                            <p className="text-[10px] md:text-xs font-bold text-muted">Nenhuma promessa criada ainda.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Criar novo pledge */}
            <section className="space-y-3">
                <h2 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <HeartHandshake size={14} /> Criar Nova Promessa
                </h2>
                <FormNovoPledge fundos={fundos} membros={membros} isAdmin={true} />
            </section>
        </main>
    )
}

function KpiCard({ label, value, icon: Icon, iconColor, accent }: {
    label: string
    value: any
    icon: any
    iconColor?: string
    accent?: 'red' | 'figueira'
}) {
    const borderClass = accent === 'red'
        ? 'bg-red-500/5 border-red-500/20'
        : accent === 'figueira'
            ? 'bg-figueira/5 border-figueira/20'
            : 'bg-bg2 border-soft'
    const valueClass = accent === 'red'
        ? 'text-red-500'
        : accent === 'figueira'
            ? 'text-figueira'
            : 'text-fg'

    return (
        <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all hover:-translate-y-0.5 ${borderClass}`}>
            <div className="flex items-center justify-between">
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">{label}</p>
                <Icon size={16} className={iconColor || 'text-muted'} />
            </div>
            <p className={`text-2xl font-black italic tracking-tighter leading-none ${valueClass}`}>{value}</p>
        </div>
    )
}

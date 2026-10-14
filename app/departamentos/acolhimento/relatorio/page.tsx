// app/departamentos/acolhimento/relatorio/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAcolhimentoRole, podeVerRelatorio } from '@/lib/acolhimento-permissions'
import {
    ArrowLeft, Users, UserPlus, UserCheck, Clock, UserX,
    TrendingUp, HeartHandshake, Calendar, Shield, BarChart3
} from 'lucide-react'

export default async function RelatorioAcolhimentoPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
    const { c } = await searchParams
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    // Permissão: só líder ou admin
    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true
        }
    })
    if (!membroLogado) redirect('/membros/login')

    const acolhimentoRole = getAcolhimentoRole(membroLogado, session.role)
    if (!podeVerRelatorio(acolhimentoRole)) {
        redirect('/membros/dashboard?error=Acesso restrito ao relatorio.')
    }

    // Filtro por congregação (?c=id): visitantes dessa casa e os contactos com eles
    const congregacoes = await db.congregacao.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
    const congFiltro = congregacoes.find(x => String(x.id) === c) ?? null
    const fv = congFiltro ? { congregacao_id: congFiltro.id } : {}
    const fa = congFiltro ? { visitante: { congregacao_id: congFiltro.id } } : {}

    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)
    const inicioMesAnterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
    const fimMesAnterior = new Date(agora.getFullYear(), agora.getMonth(), 0, 23, 59, 59)

    const [
        totalVisitantes,
        novosEsteMes,
        novosMesAnterior,
        emContacto,
        consolidados,
        totalAcompanhamentos,
        acompanhamentosEsteMes,
        visitantesPorMes,
        ultimosConsolidados,
        porStatus,
        followUpsPorMembro,
    ] = await Promise.all([
        db.visitante.count({ where: fv }),
        db.visitante.count({ where: { ...fv, data_primeira_visita: { gte: inicioMes } } }),
        db.visitante.count({ where: { ...fv, data_primeira_visita: { gte: inicioMesAnterior, lte: fimMesAnterior } } }),
        db.visitante.count({ where: { ...fv, status: 'EM_CONTACTO' } }),
        db.visitante.count({ where: { ...fv, status: 'CONSOLIDADO' } }),
        db.acompanhamentoVisitante.count({ where: { ...fa, tipo_evento: 'CONTACTO' } }),
        db.acompanhamentoVisitante.count({ where: { ...fa, data_contacto: { gte: inicioMes }, tipo_evento: 'CONTACTO' } }),
        // Visitantes por mes (ultimos 6 meses)
        Promise.all(
            Array.from({ length: 6 }, (_, i) => {
                const inicio = new Date(agora.getFullYear(), agora.getMonth() - 5 + i, 1)
                const fim = new Date(agora.getFullYear(), agora.getMonth() - 4 + i, 0, 23, 59, 59)
                return db.visitante.count({ where: { ...fv, data_primeira_visita: { gte: inicio, lte: fim } } })
                    .then(count => ({
                        mes: inicio.toLocaleDateString('pt-PT', { month: 'short' }),
                        count,
                    }))
            })
        ),
        db.visitante.findMany({
            where: { ...fv, status: 'CONSOLIDADO' },
            select: { id: true, nome: true, data_primeira_visita: true, data_ultima_visita: true },
            orderBy: { data_ultima_visita: 'desc' },
            take: 10,
        }),
        // Distribuição por status (funil)
        db.visitante.groupBy({
            by: ['status'],
            where: fv,
            _count: true
        }),
        // Follow-ups por membro este mês
        db.acompanhamentoVisitante.groupBy({
            by: ['membro_id'],
            where: { ...fa, data_contacto: { gte: inicioMes }, tipo_evento: 'CONTACTO' },
            _count: true
        }),
    ])

    // Buscar nomes dos membros para follow-ups
    const membroIds = followUpsPorMembro.map(f => f.membro_id)
    const membros = membroIds.length > 0
        ? await db.membro.findMany({
            where: { id: { in: membroIds } },
            select: { id: true, first_name: true, last_name: true }
        })
        : []
    const membroMap = new Map(membros.map(m => [m.id, m]))

    const followUpsComNome = followUpsPorMembro
        .map(f => ({
            membro: membroMap.get(f.membro_id),
            count: f._count
        }))
        .filter(f => f.membro)
        .sort((a, b) => b.count - a.count)

    const taxaConsolidacao = totalVisitantes > 0 ? Math.round((consolidados / totalVisitantes) * 100) : 0
    const crescimento = novosMesAnterior > 0
        ? Math.round(((novosEsteMes - novosMesAnterior) / novosMesAnterior) * 100)
        : novosEsteMes > 0 ? 100 : 0

    // Funil
    const statusLabels: Record<string, string> = {
        NOVO: 'Novos', EM_CONTACTO: 'Em Contacto', REUNIAO_PASTOR: 'Reunião com pastor',
        CONSOLIDADO: 'Consolidados', NAO_RETORNOU: 'Não voltou', OUTRA_IGREJA: 'Outra Igreja', DESISTIU: 'Desistiu'
    }
    const statusCores: Record<string, string> = {
        NOVO: 'bg-orange-500', EM_CONTACTO: 'bg-figueira', REUNIAO_PASTOR: 'bg-blue-500',
        CONSOLIDADO: 'bg-emerald-500', NAO_RETORNOU: 'bg-red-400', OUTRA_IGREJA: 'bg-red-300', DESISTIU: 'bg-red-500'
    }
    const totalFunil = porStatus.reduce((sum, s) => sum + s._count, 0) || 1

    const saidasCount = porStatus
        .filter(s => ['NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU'].includes(s.status))
        .reduce((sum, s) => sum + s._count, 0)
    const taxaSaida = totalVisitantes > 0 ? Math.round((saidasCount / totalVisitantes) * 100) : 0

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <header className="space-y-1">
                <Link href="/departamentos/acolhimento/dashboard" className="flex items-center gap-2 text-[14px] font-bold uppercase text-muted hover:text-figueira transition-all mb-2">
                    <ArrowLeft size={12} /> Acolhimento
                </Link>
                <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-fg">Relatório de Acolhimento</h1>
                    <span className="text-[13px] font-bold uppercase tracking-wide bg-figueira/10 text-figueira px-2 py-1 rounded-lg border border-figueira/20 flex items-center gap-1">
                        <Shield size={9} /> Líder
                    </span>
                </div>
                <p className="text-xs text-muted">Métricas de visitantes, acompanhamentos e consolidação.</p>
            </header>

            {congregacoes.length > 1 && (
                <nav aria-label="Congregação" className="flex flex-wrap gap-2">
                    {[{ id: null as number | null, nome: 'Todas as casas' }, ...congregacoes].map(x => {
                        const ativo = (congFiltro?.id ?? null) === x.id
                        return (
                            <Link key={x.id ?? 'todas'} href={x.id ? `?c=${x.id}` : '?'} aria-current={ativo ? 'page' : undefined}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition-all ${ativo ? 'bg-figueira text-white border-figueira' : 'bg-bg2 text-muted border-soft hover:text-fg'}`}>
                                {x.nome}
                            </Link>
                        )
                    })}
                </nav>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Total Visitantes" value={totalVisitantes} icon={<Users size={13} />} />
                <Kpi label="Novos este Mês" value={novosEsteMes} icon={<UserPlus size={13} />}
                    cor={novosEsteMes > 0 ? 'emerald' : undefined} />
                <Kpi label="Em Contacto" value={emContacto} icon={<Clock size={13} />}
                    cor={emContacto > 0 ? 'orange' : 'emerald'} />
                <Kpi label="Consolidados" value={consolidados} icon={<UserCheck size={13} />} cor="emerald" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Kpi label="Taxa Consolidacao" value={`${taxaConsolidacao}%`} icon={<TrendingUp size={13} />}
                    cor={taxaConsolidacao >= 50 ? 'emerald' : taxaConsolidacao >= 25 ? 'orange' : 'red'} />
                <Kpi label="Crescimento vs Mês Ant." value={`${crescimento > 0 ? '+' : ''}${crescimento}%`}
                    icon={<TrendingUp size={13} />} cor={crescimento >= 0 ? 'emerald' : 'red'} />
                <Kpi label="Total Follow-ups" value={totalAcompanhamentos} icon={<HeartHandshake size={13} />} />
                <Kpi label="Taxa de Saída" value={`${taxaSaida}%`} icon={<UserX size={13} />}
                    cor={taxaSaida > 30 ? 'red' : taxaSaida > 15 ? 'orange' : 'emerald'} />
            </div>

            {/* FUNIL */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-soft">
                    <BarChart3 size={14} className="text-figueira" />
                    <h2 className="text-sm font-bold text-fg">Funil de Integracao</h2>
                </div>
                <div className="p-5 space-y-3">
                    {porStatus
                        .sort((a, b) => {
                            const order = ['NOVO', 'EM_CONTACTO', 'REUNIAO_PASTOR', 'CONSOLIDADO', 'NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU']
                            return order.indexOf(a.status) - order.indexOf(b.status)
                        })
                        .map(s => {
                            const pct = Math.round((s._count / totalFunil) * 100)
                            return (
                                <div key={s.status} className="flex items-center gap-3">
                                    <span className="text-[13px] font-bold uppercase tracking-wide text-muted w-28 shrink-0 text-right">
                                        {statusLabels[s.status] || s.status}
                                    </span>
                                    <div className="flex-1 bg-soft/30 rounded-full h-5 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${statusCores[s.status] || 'bg-muted'} flex items-center justify-end pr-2 transition-all`}
                                            style={{ width: `${Math.max(pct, 3)}%` }}
                                        >
                                            {pct > 10 && (
                                                <span className="text-[13px] font-bold text-white">{s._count}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-[13px] font-bold text-fg w-10 text-right">{pct}%</span>
                                </div>
                            )
                        })}
                </div>
            </section>

            {/* GRAFICO - Visitantes por Mes */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-soft">
                    <TrendingUp size={14} className="text-figueira" />
                    <h2 className="text-sm font-bold text-fg">Visitantes por Mês</h2>
                </div>
                <div className="p-5">
                    <div className="flex items-end gap-2 h-32">
                        {visitantesPorMes.map((m, i) => {
                            const maxCount = Math.max(...visitantesPorMes.map(v => v.count), 1)
                            const pct = (m.count / maxCount) * 100
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <span className="text-[13px] font-bold text-fg">{m.count}</span>
                                    <div className="w-full rounded-t-lg bg-figueira/20 relative" style={{ height: `${Math.max(pct, 4)}%` }}>
                                        <div className="absolute inset-0 bg-figueira rounded-t-lg" style={{ height: `${pct}%` }} />
                                    </div>
                                    <span className="text-[13px] font-bold text-muted uppercase">{m.mes}</span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* FOLLOW-UPS POR MEMBRO */}
            {followUpsComNome.length > 0 && (
                <section className="bg-bg2 border border-figueira/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-figueira/10">
                        <HeartHandshake size={14} className="text-figueira" />
                        <h2 className="text-sm font-bold text-fg">Follow-ups por Membro (este mês)</h2>
                    </div>
                    <div className="divide-y divide-soft">
                        {followUpsComNome.map((f, i) => (
                            <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-soft/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-figueira/10 flex items-center justify-center">
                                        <span className="text-[13px] font-bold text-figueira">{f.membro?.first_name?.[0]}</span>
                                    </div>
                                    <span className="text-[14px] font-bold uppercase text-fg">{f.membro?.first_name} {f.membro?.last_name}</span>
                                </div>
                                <span className="text-sm font-bold text-fg">{f.count}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ULTIMOS CONSOLIDADOS */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-soft">
                    <UserCheck size={14} className="text-emerald-500" />
                    <h2 className="text-sm font-bold text-fg">Últimos Consolidados</h2>
                </div>
                {ultimosConsolidados.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-[14px] font-bold text-muted uppercase tracking-wide">Nenhum visitante consolidado ainda.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-soft">
                        {ultimosConsolidados.map(v => (
                            <div key={v.id} className="flex items-center justify-between px-5 py-3 hover:bg-soft/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <span className="text-[13px] font-bold text-emerald-600">{v.nome?.[0]}</span>
                                    </div>
                                    <span className="text-[14px] font-bold uppercase text-fg">{v.nome}</span>
                                </div>
                                <span className="text-[13px] font-bold text-muted uppercase tracking-wide">
                                    {v.data_ultima_visita ? new Date(v.data_ultima_visita).toLocaleDateString('pt-PT') : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}

function Kpi({ label, value, icon, cor }: { label: string; value: any; icon: React.ReactNode; cor?: string }) {
    const cores: Record<string, string> = {
        emerald: 'text-emerald-600 bg-emerald-500/8 border-emerald-500/15',
        orange: 'text-orange-600 bg-orange-500/8 border-orange-500/15',
        red: 'text-red-500 bg-red-500/8 border-red-500/15',
    }
    return (
        <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${cor ? cores[cor] : 'bg-bg2 border-soft text-fg'}`}>
            <div className="flex items-center justify-between">
                <p className="text-[13px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                <div className="opacity-40">{icon}</div>
            </div>
            <p className="text-xl font-bold leading-none">{value}</p>
        </div>
    )
}

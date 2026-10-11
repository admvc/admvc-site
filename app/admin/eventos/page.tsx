// app/admin/eventos/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import CalendarioAgenda from '@/components/escalas/CalendarioAgenda'
import ModalNovoEvento from '@/components/escalas/ModalNovoEvento'
import { CalendarDays, Users, ArrowRight } from 'lucide-react'
import { getTipoEvento, LISTA_TIPOS } from '@/lib/evento-tipos'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function EventosPage({ searchParams }: { searchParams: Promise<{ congregacao?: string; tipo?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined

    const tenantId = await getTenantIdFromHeaders()

    // Past 1 month + future
    const dataInicio = new Date()
    dataInicio.setMonth(dataInicio.getMonth() - 1)
    dataInicio.setDate(1)

    const congWhere = congFilter ? { congregacao_id: congFilter } : {}
    const tipoFilter = params.tipo && params.tipo !== 'TODOS' ? { tipo: params.tipo } : {}

    const [eventos, congregacoes] = await Promise.all([
        db.evento.findMany({
            where: { data: { gte: dataInicio }, ...congWhere, ...tipoFilter },
            include: {
                mensagemEvento: {
                    include: {
                        pregador: {
                            select: { id: true, first_name: true, last_name: true, avatar_file: true }
                        }
                    }
                },
                escalas: {
                    include: {
                        membro: {
                            select: { id: true, first_name: true, last_name: true, avatar_file: true, phone_1: true }
                        },
                        departamento: true
                    },
                    orderBy: [{ departamento: { nome: 'asc' } }]
                }
            },
            orderBy: { data: 'asc' }
        }),
        tenantId ? db.congregacao.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true, cidade: true },
            orderBy: { nome: 'asc' }
        }) : [],
    ])

    const hoje = new Date(new Date().setHours(0, 0, 0, 0))
    const eventosFuturos = eventos.filter((e: any) => new Date(e.data) >= hoje)

    // Stats: this month
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59)
    const eventosEsteMes = eventosFuturos.filter((e: any) => {
        const d = new Date(e.data)
        return d >= inicioMes && d <= fimMes
    })

    // Count by tipo
    const contagemPorTipo: Record<string, number> = {}
    eventosFuturos.forEach((e: any) => {
        const t = e.tipo || 'CULTO_REGULAR'
        contagemPorTipo[t] = (contagemPorTipo[t] || 0) + 1
    })

    const tipoAtivo = params.tipo || 'TODOS'

    return (
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <Breadcrumbs items={[{ label: 'Eventos' }]} />

            {/* HEADER */}
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Gestao de Eventos</h1>
                    <p className="text-xs text-muted">Criar, visualizar e gerir todos os eventos da igreja.</p>
                </div>
                <ModalNovoEvento congregacoes={congregacoes} />
            </header>

            {/* FILTER TABS */}
            <div className="flex flex-wrap gap-2">
                <Link
                    href="/admin/eventos"
                    className={`px-4 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest border transition-all ${
                        tipoAtivo === 'TODOS'
                            ? 'bg-fg text-bg border-fg'
                            : 'bg-bg2 text-muted border-soft hover:border-fg/30'
                    }`}
                >
                    Todos
                    <span className="ml-1.5 opacity-60">{eventosFuturos.length}</span>
                </Link>
                {LISTA_TIPOS.map(t => {
                    const count = contagemPorTipo[t.value] || 0
                    return (
                        <Link
                            key={t.value}
                            href={`/admin/eventos?tipo=${t.value}`}
                            className={`px-4 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest border transition-all ${
                                tipoAtivo === t.value
                                    ? `${t.corFundo} ${t.corTexto} ${t.corBorda}`
                                    : 'bg-bg2 text-muted border-soft hover:border-fg/30'
                            }`}
                        >
                            {t.label}
                            {count > 0 && <span className="ml-1.5 opacity-60">{count}</span>}
                        </Link>
                    )
                })}
            </div>

            {/* STATS */}
            <div className="flex flex-wrap gap-3">
                <div className="bg-bg2 border border-soft rounded-2xl px-5 py-4">
                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Este Mes</p>
                    <p className="text-2xl font-black italic text-fg">{eventosEsteMes.length}</p>
                </div>
                {LISTA_TIPOS.filter(t => (contagemPorTipo[t.value] || 0) > 0).map(t => (
                    <div key={t.value} className={`border rounded-2xl px-5 py-4 ${t.corFundo} ${t.corBorda}`}>
                        <p className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest ${t.corTexto}`}>{t.label}</p>
                        <p className={`text-2xl font-black italic ${t.corTexto}`}>{contagemPorTipo[t.value]}</p>
                    </div>
                ))}
            </div>

            {/* CALENDARIO */}
            <section className="bg-bg2 border border-soft rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-soft">
                    <CalendarDays size={16} className="text-figueira" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Visao Calendario</h2>
                </div>
                <div className="p-6">
                    <CalendarioAgenda eventos={eventos} congregacoes={congregacoes} />
                </div>
            </section>

            {/* UPCOMING EVENTS LIST */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <CalendarDays size={15} className="text-figueira" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Proximos Eventos</h2>
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-soft border border-soft px-2 py-1 rounded-lg text-muted">
                        {eventosFuturos.length} evento{eventosFuturos.length !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="grid gap-3">
                    {eventosFuturos.length === 0 && (
                        <div className="bg-bg2 border border-soft rounded-2xl px-6 py-10 text-center">
                            <p className="text-sm text-muted font-bold">Nenhum evento encontrado.</p>
                        </div>
                    )}
                    {eventosFuturos.map((evento: any) => {
                        const tipoInfo = getTipoEvento(evento.tipo || 'CULTO_REGULAR')
                        const dataEvento = new Date(evento.data)
                        const diaSemana = dataEvento.toLocaleDateString('pt-PT', { weekday: 'short' })
                        const dataFormatada = dataEvento.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
                        const horaFormatada = dataEvento.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                        const nEscalados = evento.escalas?.length || 0

                        return (
                            <div
                                key={evento.id}
                                className={`bg-bg2 border border-soft rounded-2xl overflow-hidden flex`}
                            >
                                {/* Colored left border */}
                                <div className={`w-1.5 shrink-0 ${tipoInfo.cor}`} />

                                <div className="flex-1 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                    {/* Date block */}
                                    <div className="text-center sm:text-left shrink-0 w-20">
                                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">{diaSemana}</p>
                                        <p className="text-lg font-black italic text-fg leading-tight">{dataEvento.getDate()}</p>
                                        <p className="text-[8px] md:text-[10px] font-bold text-muted">{dataEvento.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase()}</p>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-black uppercase tracking-wider text-fg truncate">{evento.nome}</h3>
                                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${tipoInfo.corFundo} ${tipoInfo.corTexto} ${tipoInfo.corBorda}`}>
                                                {tipoInfo.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-[9px] md:text-[11px] font-bold text-muted">
                                            <span>{dataFormatada} as {horaFormatada}</span>
                                            <span className="flex items-center gap-1">
                                                <Users size={10} /> {nEscalados} escalado{nEscalados !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Link to escalas */}
                                    <Link
                                        href={`/admin/escalas?evento=${evento.id}`}
                                        className="flex items-center gap-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-figueira hover:text-figueira/70 transition-all shrink-0"
                                    >
                                        Escalas <ArrowRight size={12} />
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>
        </main>
    )
}

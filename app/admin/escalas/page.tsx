// app/admin/escalas/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { Settings2, Users, ArrowRight } from 'lucide-react'
import MontadorEscalas from '@/components/escalas/MontadorEscalas'
import ListaEscalados from '@/components/escalas/ListaEscalados'
import { getTipoEvento } from '@/lib/evento-tipos'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function EscalasPage({ searchParams }: { searchParams: Promise<{ congregacao?: string; evento?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined

    const tenantId = await getTenantIdFromHeaders()

    const dataInicioMes = new Date()
    dataInicioMes.setDate(1)

    const congWhere = congFilter ? { congregacao_id: congFilter } : {}

    const [eventos, departamentos, membrosComFuncoes, congregacoes] = await Promise.all([
        db.evento.findMany({
            where: { data: { gte: dataInicioMes }, ...congWhere },
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
        db.departamento.findMany({
            where: congFilter
                ? { OR: [{ congregacaoId: congFilter }, { is_global: true }] }
                : undefined,
            select: { id: true, nome: true, congregacaoId: true, is_global: true, funcoes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' as const } } },
            orderBy: { nome: 'asc' }
        }),
        db.membro.findMany({
            where: { status: 'ATIVO', ...congWhere },
            include: {
                ministerios: {
                    select: {
                        departamento_id: true,
                        funcoes: {
                            select: { funcao_id: true, funcao: { select: { id: true, nome: true } } }
                        }
                    }
                },
                departamentos_liderados: { select: { id: true } }
            },
            orderBy: { first_name: 'asc' }
        }),
        tenantId ? db.congregacao.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true, cidade: true },
            orderBy: { nome: 'asc' }
        }) : [],
    ])

    // Formatar membros com funcoesHabilitadas por departamento
    const membrosFormatados = membrosComFuncoes.map((m: any) => ({
        ...m,
        funcoesHabilitadas: m.ministerios.flatMap((min: any) =>
            min.funcoes.map((f: any) => f.funcao_id)
        ),
    }))

    const hoje = new Date(new Date().setHours(0, 0, 0, 0))
    const eventosFuturos = eventos.filter(e => new Date(e.data) >= hoje)

    // KPIs rapidos
    const totalVoluntarios = eventosFuturos.reduce((sum, ev) => sum + ev.escalas.length, 0)
    const totalEventos = eventosFuturos.length
    const pendentesConfirmacao = eventosFuturos.reduce(
        (sum, ev) => sum + ev.escalas.filter((e: any) => !e.confirmado && !e.motivo_recusa).length, 0
    )

    return (
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <Breadcrumbs items={[{ label: 'Escalas' }]} />

            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Gestao de Escalas</h1>
                    <p className="text-xs text-muted">Atribuir voluntarios aos eventos agendados.</p>
                </div>
                <Link
                    href="/admin/eventos"
                    className="flex items-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-figueira hover:text-figueira/70 transition-all"
                >
                    Gerir eventos <ArrowRight size={14} />
                </Link>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Proximos Eventos', value: totalEventos, cor: 'text-fg' },
                    { label: 'Voluntarios Escalados', value: totalVoluntarios, cor: 'text-blue-600' },
                    { label: 'Pendentes Confirmacao', value: pendentesConfirmacao, cor: pendentesConfirmacao > 0 ? 'text-orange-600' : 'text-emerald-600' },
                ].map(k => (
                    <div key={k.label} className="bg-bg2 border border-soft rounded-2xl px-5 py-4">
                        <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">{k.label}</p>
                        <p className={`text-2xl font-black italic ${k.cor}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* EVENT SELECTOR - Upcoming events with tipo badge */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-soft">
                    <Settings2 size={14} className="text-figueira" />
                    <h2 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fg">Eventos Proximos</h2>
                </div>
                <div className="p-4 flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {eventosFuturos.length === 0 && (
                        <p className="text-xs text-muted font-bold px-2">Nenhum evento agendado. <Link href="/admin/eventos" className="text-figueira underline">Criar evento</Link></p>
                    )}
                    {eventosFuturos.slice(0, 20).map((ev: any) => {
                        const tipoInfo = getTipoEvento(ev.tipo || 'CULTO_REGULAR')
                        const d = new Date(ev.data)
                        const isSelected = params.evento === String(ev.id)
                        return (
                            <Link
                                key={ev.id}
                                href={`/admin/escalas?evento=${ev.id}`}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] md:text-[11px] font-bold transition-all ${
                                    isSelected
                                        ? 'bg-figueira/10 border-figueira text-figueira'
                                        : 'bg-bg border-soft text-muted hover:border-fg/30'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${tipoInfo.cor}`} />
                                <span className="font-black">{d.getDate()}/{d.getMonth() + 1}</span>
                                <span className="truncate max-w-[120px]">{ev.nome}</span>
                                <span className={`text-[7px] md:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${tipoInfo.corFundo} ${tipoInfo.corTexto} ${tipoInfo.corBorda}`}>
                                    {tipoInfo.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </section>

            {/* MONTADOR — FULL WIDTH */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
                <div className="flex items-center gap-4 px-6 py-5 border-b border-soft">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Settings2 size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg leading-none">Atribuir Escala</h2>
                        <p className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-muted mt-1">
                            Selecionar evento, departamento, membro e funcao
                        </p>
                    </div>
                </div>
                <div className="p-6">
                    <MontadorEscalas
                        eventos={eventosFuturos}
                        departamentos={departamentos}
                        membros={membrosFormatados}
                    />
                </div>
            </section>

            {/* LISTA DE ESCALADOS */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <Users size={15} className="text-emerald-500" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Quadro Geral de Escalas</h2>
                    {totalEventos > 0 && (
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest bg-soft border border-soft px-2 py-1 rounded-lg text-muted">
                            {totalEventos} evento{totalEventos !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <ListaEscalados
                        eventos={eventosFuturos}
                        isAdmin={true}
                        membros={membrosFormatados}
                        congregacoes={congregacoes}
                        podeEditarRepertorio={true}
                    />
                </div>
            </section>
        </main>
    )
}

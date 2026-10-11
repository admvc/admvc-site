// app/admin/dashboard/page.tsx
import Link from 'next/link'
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import {
    Calendar, Users, Home, AlertTriangle,
    ArrowUpRight, BookOpen, Clock, CheckCircle2,
    HeartHandshake, UserPlus, ArrowRight, Briefcase
} from 'lucide-react'
import BotaoModalDocumentos from '@/components/admin/BotaoModalDocumentos'

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ congregacao?: string }> }) {
    const params = await searchParams
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const congFilter = session.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined
    const congWhere = congFilter ? { congregacao_id: congFilter } : {}

    const adminLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        select: { first_name: true, last_name: true }
    })

    const statusAtivo = { in: ['Ativo', 'ATIVO'] }
    const statusPendente = { in: ['Pendente', 'PENDENTE'] }

    const [
        totalMembros, pendentesCount, batizados, totalFamilias,
        proximasEscalas, todosMembros, membrosPendentesDocs,
        escalasPendentesConfirmacao, ,
        visitantesNovos, visitantesEmContacto, visitantesReuniao, visitantesConsolidados,
        interessesPendentes,
    ] = await Promise.all([
        db.membro.count({ where: { status: statusAtivo, ...congWhere } }),
        db.membro.count({ where: { status: statusPendente, ...congWhere } }),
        db.membro.count({ where: { baptism_status: 'Batizado', status: statusAtivo, ...congWhere } }),
        db.familia.count(),
        db.evento.findMany({
            where: { data: { gte: new Date() }, ...congWhere },
            orderBy: { data: 'asc' },
            take: 6,
            include: {
                _count: { select: { escalas: true } },
                mensagemEvento: {
                    select: { titulo: true, pregador: { select: { first_name: true, last_name: true } } }
                }
            }
        }),
        db.membro.findMany({
            where: { status: statusAtivo, ...congWhere },
            select: { first_name: true, last_name: true, birthdate: true }
        }),
        db.membro.findMany({
            where: {
                ...congWhere,
                OR: [
                    { gdpr_aceite: false },
                    { permanecer_aceite: false },
                    { gdpr_validade: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } },
                    { permanecer_validade: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
                ]
            },
            select: {
                id: true, first_name: true, last_name: true, avatar_file: true,
                phone_1: true, gdpr_aceite: true, gdpr_validade: true,
                permanecer_aceite: true, permanecer_validade: true
            },
            orderBy: { first_name: 'asc' }
        }),
        db.escala.count({
            where: { confirmado: false, ...congWhere, evento: { data: { gte: new Date() } } }
        }),
        tenantId ? db.tenant.findUnique({
            where: { id: tenantId },
            select: { holyrics_url: true, holyrics_token: true }
        }) : null,
        db.visitante.count({ where: { status: 'NOVO' } }),
        db.visitante.count({ where: { status: 'EM_CONTACTO' } }),
        db.visitante.count({ where: { status: 'REUNIAO_PASTOR' } }),
        db.visitante.count({ where: { status: 'CONSOLIDADO' } }),
        db.interesseDepartamento.count({ where: { status: 'PENDENTE' } }),
    ])

    const mesAtual = new Date().getMonth() + 1
    const aniversariantesDoMes = todosMembros
        .filter(m => m.birthdate && new Date(m.birthdate).getMonth() + 1 === mesAtual)
        .sort((a, b) => new Date(a.birthdate!).getDate() - new Date(b.birthdate!).getDate())
        .slice(0, 6)

    const taxaBatismo = totalMembros > 0 ? Math.round((batizados / totalMembros) * 100) : 0
    const hora = new Date().getHours()
    const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">

            {/* HEADER */}
            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    {saudacao}, {adminLogado?.first_name || 'Admin'}.
                </h1>
                <p className="text-[10px] md:text-xs text-muted">Visao geral da sua igreja.</p>
            </header>

            {/* ALERTA COMPLIANCE */}
            {membrosPendentesDocs.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                        <p className="text-[10px] md:text-xs font-bold text-orange-600 uppercase tracking-widest">
                            {membrosPendentesDocs.length} membro{membrosPendentesDocs.length !== 1 ? 's' : ''} com documentos pendentes
                        </p>
                    </div>
                    <BotaoModalDocumentos membrosPendentes={membrosPendentesDocs} />
                </div>
            )}

            {/* KPIs */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Kpi label="Membros" value={totalMembros} icon={<Users size={14} />} />
                <Kpi label="Familias" value={totalFamilias} icon={<Home size={14} />} />
                <Kpi label="Batizados" value={`${taxaBatismo}%`} icon={<CheckCircle2 size={14} />} cor="emerald" />
                <Kpi label="Escalas Pendentes" value={escalasPendentesConfirmacao} icon={<Clock size={14} />} cor={escalasPendentesConfirmacao > 0 ? 'orange' : 'emerald'} />
                <Kpi label="Aprovacao" value={pendentesCount} icon={<AlertTriangle size={14} />} cor={pendentesCount > 0 ? 'red' : 'emerald'} />
            </section>

            {/* GRID */}
            <div className="grid lg:grid-cols-12 gap-6">

                {/* EVENTOS */}
                <section className="lg:col-span-7 bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-soft">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-figueira" />
                            <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-fg">Proximos Eventos</h2>
                        </div>
                        <Link href="/escalas/admin" className="text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-1">
                            Ver todos <ArrowUpRight size={11} />
                        </Link>
                    </div>

                    <div className="divide-y divide-soft">
                        {proximasEscalas.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest">Nenhum evento programado</p>
                            </div>
                        ) : proximasEscalas.map((ev) => {
                            const dataEv = new Date(ev.data)
                            const isHoje = dataEv.toDateString() === new Date().toDateString()
                            const diasFaltam = Math.ceil((dataEv.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

                            return (
                                <Link key={ev.id} href="/escalas/admin"
                                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-soft/10 transition-all group">
                                    <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 font-black text-[9px]
                                        ${isHoje ? 'bg-figueira text-white' : 'bg-bg border border-soft text-fg'}`}>
                                        <span className="uppercase tracking-widest opacity-70 text-[7px]">
                                            {format(dataEv, 'MMM', { locale: pt })}
                                        </span>
                                        <span className="text-base italic leading-none">{format(dataEv, 'dd')}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] md:text-xs font-black uppercase text-fg truncate group-hover:text-figueira transition-colors">
                                            {ev.nome}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-widest">
                                                {format(dataEv, "EEEE 'as' HH:mm", { locale: pt })}
                                            </span>
                                            {ev.mensagemEvento?.titulo && (
                                                <span className="text-[7px] md:text-[9px] font-bold bg-figueira/10 text-figueira px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <BookOpen size={10} /> {ev.mensagemEvento.titulo}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {isHoje && <span className="text-[7px] md:text-[9px] font-black bg-figueira text-white px-1.5 py-0.5 rounded">Hoje</span>}
                                        {!isHoje && diasFaltam <= 7 && <span className="text-[7px] md:text-[9px] font-bold bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">{diasFaltam}d</span>}
                                        <span className="text-[8px] md:text-[10px] font-bold bg-bg border border-soft px-2 py-0.5 rounded text-muted">{ev._count.escalas}</span>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                </section>

                {/* ANIVERSARIANTES */}
                <section className="lg:col-span-5 bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-soft">
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-fg">
                            Aniversariantes
                        </h3>
                        <span className="text-[8px] md:text-[10px] font-bold bg-figueira/10 text-figueira px-2 py-0.5 rounded">
                            {format(new Date(), 'MMMM', { locale: pt })}
                        </span>
                    </div>

                    <div className="divide-y divide-soft">
                        {aniversariantesDoMes.length === 0 ? (
                            <div className="py-10 text-center">
                                <p className="text-[10px] md:text-xs font-bold text-muted uppercase tracking-widest">Nenhum este mes</p>
                            </div>
                        ) : aniversariantesDoMes.map((m, i) => {
                            const dia = new Date(m.birthdate!).getDate()
                            const isHoje = dia === new Date().getDate()
                            return (
                                <div key={i} className={`flex items-center justify-between px-5 py-3 ${isHoje ? 'bg-figueira/5' : 'hover:bg-soft/10'} transition-all`}>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black
                                            ${isHoje ? 'bg-figueira text-white' : 'bg-bg border border-soft text-muted'}`}>
                                            {m.first_name[0]}
                                        </div>
                                        <p className={`text-[11px] md:text-xs font-bold ${isHoje ? 'text-figueira' : 'text-fg'}`}>
                                            {m.first_name} {m.last_name}
                                        </p>
                                    </div>
                                    <span className="text-[8px] md:text-[10px] font-bold bg-bg border border-soft px-2 py-0.5 rounded text-muted">
                                        {isHoje ? 'Hoje' : `Dia ${dia}`}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </div>

            {/* PIPELINE DE INTEGRACAO */}
            {(visitantesNovos > 0 || visitantesEmContacto > 0 || visitantesReuniao > 0 || visitantesConsolidados > 0 || interessesPendentes > 0) && (
                <section className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                            <HeartHandshake size={14} className="text-figueira" /> Pipeline de Integracao
                        </h2>
                        <Link href="/departamentos/acolhimento/dashboard" className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors flex items-center gap-1">
                            Acolhimento <ArrowUpRight size={10} />
                        </Link>
                    </div>

                    {/* PIPELINE VISUAL */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1">
                        {[
                            { label: 'Novos', value: visitantesNovos, cor: 'orange' },
                            { label: 'Contacto', value: visitantesEmContacto, cor: 'blue' },
                            { label: 'Reuniao', value: visitantesReuniao, cor: 'purple' },
                            { label: 'Consolidados', value: visitantesConsolidados, cor: 'emerald' },
                        ].map((step, i) => (
                            <div key={step.label} className="flex items-center gap-1">
                                {i > 0 && <ArrowRight size={10} className="text-muted/30 shrink-0" />}
                                <div className={`shrink-0 px-3 py-2 rounded-xl border text-center min-w-[80px] ${
                                    step.value > 0
                                        ? step.cor === 'orange' ? 'bg-orange-500/10 border-orange-500/20 text-orange-600'
                                        : step.cor === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-600'
                                        : step.cor === 'purple' ? 'bg-purple-500/10 border-purple-500/20 text-purple-600'
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'
                                        : 'bg-bg border-soft text-muted'
                                }`}>
                                    <p className="text-lg font-black italic leading-none">{step.value}</p>
                                    <p className="text-[7px] md:text-[9px] font-black uppercase tracking-widest mt-0.5">{step.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* INTERESSES PENDENTES */}
                    {interessesPendentes > 0 && (
                        <Link href="/admin/configuracoes" className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3 hover:bg-orange-500/10 transition-all">
                            <Briefcase size={14} className="text-orange-600 shrink-0" />
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-600 flex-1">
                                {interessesPendentes} interesse{interessesPendentes !== 1 ? 's' : ''} em servir pendente{interessesPendentes !== 1 ? 's' : ''}
                            </p>
                            <ArrowRight size={12} className="text-orange-600" />
                        </Link>
                    )}
                </section>
            )}

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
                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <div className="opacity-40">{icon}</div>
            </div>
            <p className="text-xl font-black italic tracking-tighter leading-none">{value}</p>
        </div>
    )
}

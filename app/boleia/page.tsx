// app/boleia/page.tsx
// Pagina principal — listar boleias disponiveis para os proximos eventos
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Car, MapPin, Clock, Users, Plus, ChevronRight, Calendar, Map } from 'lucide-react'
import BotaoReservar from '@/components/boleia/BotaoReservar'
import BotaoCancelarReserva from '@/components/boleia/BotaoCancelarReserva'
import BotaoAgradecer from '@/components/boleia/BotaoAgradecer'
import MapaBoleiasWrapper from '@/components/boleia/MapaBoleiasWrapper'
import type { OfertaMapa } from '@/components/boleia/MapaBoleias'

export const dynamic = 'force-dynamic'

export default async function BoleiaPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const { membroId } = session

    const db = await getDb()

    // Proximos eventos (7 dias)
    const agora = new Date()
    const emSeteDias = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Ultimas 48h para mostrar boleias passadas com botao de agradecer
    const ha48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000)

    const [ofertas, proximosEventos, minhasReservasPassadas] = await Promise.all([
        db.boleiaOferta.findMany({
            where: {
                status: 'ATIVA',
                data_hora_saida: { gte: agora },
            },
            include: {
                motorista: { select: { id: true, first_name: true, last_name: true } },
                evento: { select: { id: true, nome: true, data: true } },
                reservas: {
                    where: { status: 'CONFIRMADA' },
                    include: { passageiro: { select: { id: true, first_name: true, last_name: true } } },
                },
            },
            orderBy: { data_hora_saida: 'asc' },
        }),
        db.evento.findMany({
            where: { data: { gte: agora, lte: emSeteDias } },
            orderBy: { data: 'asc' },
            take: 10,
        }),
        // Boleias passadas (ultimas 48h) onde o membro tem reserva, para mostrar botao de agradecer
        db.boleiaOferta.findMany({
            where: {
                data_hora_saida: { gte: ha48h, lt: agora },
                reservas: { some: { passageiro_id: membroId, status: 'CONFIRMADA' } },
            },
            include: {
                motorista: { select: { id: true, first_name: true, last_name: true } },
                evento: { select: { id: true, nome: true, data: true } },
                reservas: {
                    where: { status: 'CONFIRMADA' },
                    include: { passageiro: { select: { id: true, first_name: true, last_name: true } } },
                },
            },
            orderBy: { data_hora_saida: 'desc' },
        }),
    ])

    return (
        <main className="max-w-6xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-5 md:space-y-10 pb-28 md:pb-24 animate-in fade-in duration-700">

            {/* HEADER */}
            <header className="bg-bg/95 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 lg:px-8 py-3 md:py-4 border-b border-soft">
                <div className="flex justify-between items-center gap-3 max-w-6xl mx-auto">
                    <div>
                        <span className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 mb-0.5">
                            <Car size={12} /> Boleia Solidaria
                        </span>
                        <h1 className="text-lg md:text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                            Boleias <span className="text-muted/20">Disponiveis.</span>
                        </h1>
                    </div>

                    <div className="flex gap-2 md:gap-3 shrink-0">
                        <Link
                            href="/boleia/oferecer"
                            className="inline-flex items-center gap-1.5 bg-figueira text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95"
                        >
                            <Plus size={12} /> Oferecer
                        </Link>
                        <Link
                            href="/boleia/minhas"
                            className="inline-flex items-center gap-1.5 bg-bg2 border border-soft text-fg px-3 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-soft transition-all active:scale-95"
                        >
                            Minhas
                        </Link>
                    </div>
                </div>
            </header>

            {/* STATS */}
            <div className="flex items-center gap-4 md:gap-6">
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black italic text-fg">{ofertas.length}</p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Ativas</p>
                </div>
                <div className="w-px h-6 md:h-8 bg-soft" />
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black italic text-fg">
                        {ofertas.reduce((sum, o) => sum + Math.max(0, o.vagas_total - o.reservas.length), 0)}
                    </p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Livres</p>
                </div>
                <div className="w-px h-6 md:h-8 bg-soft" />
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black italic text-fg">{proximosEventos.length}</p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Eventos</p>
                </div>
            </div>

            {/* MAPA DE BOLEIAS */}
            {(() => {
                const ofertasComCoordenadas: OfertaMapa[] = ofertas
                    .filter((o) => o.latitude && o.longitude)
                    .map((o) => ({
                        id: o.id,
                        latitude: o.latitude!,
                        longitude: o.longitude!,
                        motorista_nome: `${o.motorista.first_name} ${o.motorista.last_name}`,
                        hora: new Date(o.data_hora_saida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
                        vagas_livres: o.vagas_total - o.reservas.length,
                        vagas_total: o.vagas_total,
                        zona: o.zona_partida || o.endereco_partida,
                        evento_nome: o.evento?.nome,
                    }))
                if (ofertasComCoordenadas.length === 0) return null
                return (
                    <section className="hidden md:block space-y-3">
                        <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-muted flex items-center gap-2">
                            <Map size={14} /> Mapa de Boleias
                        </h2>
                        <MapaBoleiasWrapper ofertas={ofertasComCoordenadas} />
                    </section>
                )
            })()}

            {/* LISTA DE OFERTAS */}
            {ofertas.length > 0 ? (
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {ofertas.map((oferta) => {
                        const vagasLivres = oferta.vagas_total - oferta.reservas.length
                        const minhaReserva = oferta.reservas.find(r => r.passageiro.id === membroId)
                        const souMotorista = oferta.motorista.id === membroId
                        const dataFormatada = new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                        const horaFormatada = new Date(oferta.data_hora_saida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

                        return (
                            <div key={oferta.id} className="bg-bg2 border border-soft rounded-2xl md:rounded-2xl overflow-hidden hover:border-figueira/20 transition-all shadow-sm">
                                <div className={`h-1 md:h-1.5 ${vagasLivres > 0 ? 'bg-figueira' : 'bg-soft'}`} />

                                <div className="p-4 md:p-6 space-y-3 md:space-y-4">
                                    {/* Motorista */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-figueira/10 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] md:text-[10px] font-black text-figueira">
                                                {oferta.motorista.first_name[0]}{oferta.motorista.last_name[0]}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs md:text-sm font-black uppercase text-fg leading-none truncate">
                                                {oferta.motorista.first_name} {oferta.motorista.last_name}
                                            </p>
                                            {souMotorista && (
                                                <span className="text-[8px] md:text-[10px] font-black uppercase text-figueira tracking-widest">Voce</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detalhes */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-fg font-medium">
                                            <Clock size={11} className="text-figueira shrink-0" />
                                            {dataFormatada} as {horaFormatada}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-muted">
                                            <MapPin size={11} className="shrink-0" />
                                            <span className="truncate">{oferta.zona_partida || oferta.endereco_partida}</span>
                                        </div>
                                        {oferta.evento && (
                                            <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-muted">
                                                <Calendar size={11} className="shrink-0" />
                                                <span className="truncate">{oferta.evento.nome}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[10px] md:text-[11px] text-muted">
                                            <Users size={11} className="shrink-0" />
                                            {vagasLivres}/{oferta.vagas_total} {vagasLivres === 1 ? 'lugar livre' : 'lugares livres'}
                                        </div>
                                    </div>

                                    {/* Nota */}
                                    {oferta.nota && (
                                        <p className="text-[9px] md:text-[10px] text-muted italic border-t border-soft pt-2 md:pt-3">
                                            &ldquo;{oferta.nota}&rdquo;
                                        </p>
                                    )}

                                    {/* Passageiros */}
                                    {oferta.reservas.length > 0 && (
                                        <div className="flex items-center gap-1 pt-1">
                                            {oferta.reservas.map(r => (
                                                <div key={r.id} className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-soft flex items-center justify-center" title={`${r.passageiro.first_name} ${r.passageiro.last_name}`}>
                                                    <span className="text-[7px] md:text-[8px] font-black text-muted">
                                                        {r.passageiro.first_name[0]}{r.passageiro.last_name[0]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Acao */}
                                    <div className="pt-1 md:pt-2 flex items-center gap-3">
                                        {souMotorista ? (
                                            <Link href="/boleia/minhas" className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors flex items-center gap-1">
                                                Gerir <ChevronRight size={12} />
                                            </Link>
                                        ) : minhaReserva ? (
                                            <>
                                                <BotaoCancelarReserva reservaId={minhaReserva.id} />
                                                {new Date(oferta.data_hora_saida) < agora && (
                                                    <BotaoAgradecer reservaId={minhaReserva.id} jaAgradeceu={minhaReserva.agradecimento ?? false} />
                                                )}
                                            </>
                                        ) : vagasLivres > 0 ? (
                                            <BotaoReservar ofertaId={oferta.id} />
                                        ) : (
                                            <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Sem vagas</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </section>
            ) : (
                <div className="py-20 text-center">
                    <Car size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">
                        Nenhuma boleia disponivel de momento
                    </p>
                    <Link href="/boleia/oferecer" className="inline-flex items-center gap-2 mt-4 text-figueira text-[10px] md:text-xs font-black uppercase tracking-widest hover:text-fg transition-colors">
                        <Plus size={12} /> Seja o primeiro a oferecer
                    </Link>
                </div>
            )}
            {/* BOLEIAS PASSADAS — AGRADECER */}
            {minhasReservasPassadas.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-muted">
                        Boleias Recentes — Agradecer
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                        {minhasReservasPassadas.map((oferta) => {
                            const minhaReserva = oferta.reservas.find(r => r.passageiro.id === membroId)
                            if (!minhaReserva) return null
                            const dataFormatada = new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                            const horaFormatada = new Date(oferta.data_hora_saida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

                            return (
                                <div key={oferta.id} className="bg-bg2 border border-soft rounded-2xl md:rounded-2xl overflow-hidden opacity-75">
                                    <div className="h-1 md:h-1.5 bg-soft" />
                                    <div className="p-4 md:p-6 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-soft flex items-center justify-center shrink-0">
                                                <span className="text-[10px] md:text-xs font-black text-muted">
                                                    {oferta.motorista.first_name[0]}{oferta.motorista.last_name[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase text-fg leading-none">
                                                    {oferta.motorista.first_name} {oferta.motorista.last_name}
                                                </p>
                                                <p className="text-[10px] md:text-xs text-muted">{dataFormatada} as {horaFormatada}</p>
                                            </div>
                                        </div>
                                        <div className="pt-1">
                                            <BotaoAgradecer reservaId={minhaReserva.id} jaAgradeceu={minhaReserva.agradecimento ?? false} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}
        </main>
    )
}

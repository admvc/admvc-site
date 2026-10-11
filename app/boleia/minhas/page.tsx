// app/boleia/minhas/page.tsx
// Minhas ofertas e reservas
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car, Clock, MapPin, Users, Calendar, Plus, Navigation } from 'lucide-react'
import BotaoCancelarOferta from '@/components/boleia/BotaoCancelarOferta'
import BotaoCancelarReserva from '@/components/boleia/BotaoCancelarReserva'

export const dynamic = 'force-dynamic'

export default async function MinhasBoleiasPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const { membroId } = session

    const db = await getDb()

    const [minhasOfertas, minhasReservas] = await Promise.all([
        db.boleiaOferta.findMany({
            where: { motorista_id: membroId },
            include: {
                evento: { select: { nome: true, data: true } },
                reservas: {
                    where: { status: 'CONFIRMADA' },
                    include: { passageiro: { select: { first_name: true, last_name: true, phone_1: true } } },
                },
            },
            orderBy: { data_hora_saida: 'desc' },
        }),
        db.boleiaReserva.findMany({
            where: { passageiro_id: membroId, status: 'CONFIRMADA' },
            include: {
                oferta: {
                    include: {
                        motorista: { select: { first_name: true, last_name: true, phone_1: true } },
                        evento: { select: { nome: true, data: true } },
                    },
                },
            },
            orderBy: { criado_em: 'desc' },
        }),
    ])

    const ofertasAtivas = minhasOfertas.filter(o => o.status === 'ATIVA')
    const ofertasPassadas = minhasOfertas.filter(o => o.status !== 'ATIVA')

    return (
        <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10 pb-24 animate-in fade-in duration-700">

            {/* HEADER */}
            <header className="space-y-4">
                <Link href="/boleia" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={14} /> Voltar
                </Link>

                <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
                    <div>
                        <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                            <Car size={14} /> As Minhas Boleias
                        </span>
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg leading-none">
                            Ofertas & Reservas
                        </h1>
                    </div>
                    <Link
                        href="/boleia/oferecer"
                        className="inline-flex items-center gap-2 bg-figueira text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95"
                    >
                        <Plus size={14} /> Nova Oferta
                    </Link>
                </div>
            </header>

            {/* MINHAS OFERTAS ATIVAS */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-3">
                    <Car size={16} className="text-figueira" />
                    Boleias que Ofereco ({ofertasAtivas.length})
                </h2>

                {ofertasAtivas.length > 0 ? (
                    <div className="grid gap-4">
                        {ofertasAtivas.map(oferta => {
                            const dataFormatada = new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
                            const horaFormatada = new Date(oferta.data_hora_saida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

                            return (
                                <div key={oferta.id} className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-[11px] text-fg font-medium">
                                                <Clock size={12} className="text-figueira" />
                                                {dataFormatada} as {horaFormatada}
                                            </div>
                                            <div className="flex items-center gap-2 text-[11px] text-muted">
                                                <MapPin size={12} />
                                                {oferta.endereco_partida}
                                            </div>
                                            {oferta.evento && (
                                                <div className="flex items-center gap-2 text-[11px] text-muted">
                                                    <Calendar size={12} />
                                                    {oferta.evento.nome}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-[11px] text-muted">
                                                <Users size={12} />
                                                {oferta.reservas.length}/{oferta.vagas_total} lugares ocupados
                                            </div>
                                        </div>
                                        <BotaoCancelarOferta ofertaId={oferta.id} />
                                    </div>

                                    {/* Passageiros */}
                                    {oferta.reservas.length > 0 && (
                                        <div className="border-t border-soft pt-4 space-y-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">Passageiros:</p>
                                            {oferta.reservas.map(r => (
                                                <div key={r.id} className="flex items-center justify-between bg-bg border border-soft rounded-xl px-4 py-3">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase text-fg">
                                                            {r.passageiro.first_name} {r.passageiro.last_name}
                                                        </p>
                                                        {r.passageiro.phone_1 && (
                                                            <p className="text-[10px] text-muted">{r.passageiro.phone_1}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                                                        Confirmado
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Botão Tracking */}
                                    {oferta.reservas.length > 0 && (
                                        <Link
                                            href={`/boleia/tracking/${oferta.id}`}
                                            className="flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                        >
                                            <Navigation size={14} /> Tracking em Tempo Real
                                        </Link>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhuma oferta ativa</p>
                    </div>
                )}
            </section>

            {/* MINHAS RESERVAS */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-3">
                    <Users size={16} className="text-figueira" />
                    Boleias que Reservei ({minhasReservas.length})
                </h2>

                {minhasReservas.length > 0 ? (
                    <div className="grid gap-4">
                        {minhasReservas.map(reserva => {
                            const oferta = reserva.oferta
                            const dataFormatada = new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
                            const horaFormatada = new Date(oferta.data_hora_saida).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

                            return (
                                <div key={reserva.id} className="bg-bg2 border border-soft rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-black uppercase text-fg">
                                            Boleia com {oferta.motorista.first_name} {oferta.motorista.last_name}
                                        </p>
                                        <div className="flex items-center gap-2 text-[11px] text-muted">
                                            <Clock size={12} />
                                            {dataFormatada} as {horaFormatada}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-muted">
                                            <MapPin size={12} />
                                            {oferta.endereco_partida}
                                        </div>
                                        {oferta.motorista.phone_1 && (
                                            <p className="text-[10px] text-muted">Contacto: {oferta.motorista.phone_1}</p>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <Link
                                            href={`/boleia/tracking/${oferta.id}`}
                                            className="flex items-center justify-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                        >
                                            <Navigation size={12} /> Tracking
                                        </Link>
                                        <BotaoCancelarReserva reservaId={reserva.id} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhuma reserva ativa</p>
                    </div>
                )}
            </section>

            {/* HISTORICO */}
            {ofertasPassadas.length > 0 && (
                <section className="space-y-4 opacity-60">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Historico ({ofertasPassadas.length})</h2>
                    <div className="grid gap-2">
                        {ofertasPassadas.slice(0, 5).map(oferta => (
                            <div key={oferta.id} className="bg-bg2 border border-soft rounded-xl px-4 py-3 flex items-center justify-between">
                                <div className="text-[10px] text-muted">
                                    {new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT')} — {oferta.endereco_partida}
                                </div>
                                <span className="text-[8px] font-black uppercase tracking-widest text-muted bg-soft px-2 py-0.5 rounded">
                                    {oferta.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}

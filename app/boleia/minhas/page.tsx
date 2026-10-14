// app/boleia/minhas/page.tsx
// Minhas ofertas e reservas
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, MapPin, Users, Calendar, Plus, Navigation, Phone, type LucideIcon } from 'lucide-react'
import BotaoCancelarOferta from '@/components/boleia/BotaoCancelarOferta'
import BotaoCancelarReserva from '@/components/boleia/BotaoCancelarReserva'

export const dynamic = 'force-dynamic'

const ESTADO: Record<string, string> = { CANCELADA: 'Cancelada', CONCLUIDA: 'Feita' }

const quando = (d: Date) => {
    const t = `${new Date(d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })} às ${new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    return t[0].toUpperCase() + t.slice(1)
}

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
        <div className="app-novo mx-auto max-w-2xl space-y-6 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">As minhas boleias</h1>
                <p className="text-[17px] a-suave">Os lugares que oferece e os que pediu.</p>
            </div>

            <section className="space-y-3">
                <h2 className="text-[19px] font-semibold">Levo no meu carro</h2>
                {ofertasAtivas.length > 0 ? (
                    <ul className="space-y-3">
                        {ofertasAtivas.map(oferta => (
                            <li key={oferta.id} className="a-card space-y-3 p-4">
                                <ul className="space-y-1.5 text-[16px]">
                                    <Info icone={Clock}>{quando(oferta.data_hora_saida)}</Info>
                                    <Info icone={MapPin}>Sai de {oferta.endereco_partida}</Info>
                                    {oferta.evento && <Info icone={Calendar}>Para {oferta.evento.nome}</Info>}
                                    <Info icone={Users}>{oferta.reservas.length} de {oferta.vagas_total} lugares ocupados</Info>
                                </ul>

                                {oferta.reservas.length > 0 && (
                                    <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--a-borda)' }}>
                                        <p className="text-[16px] font-semibold">Quem vai consigo</p>
                                        {oferta.reservas.map(r => (
                                            <div key={r.id} className="flex items-center justify-between gap-3">
                                                <p className="text-[17px]">{r.passageiro.first_name} {r.passageiro.last_name}</p>
                                                {r.passageiro.phone_1 && (
                                                    <a href={`tel:${r.passageiro.phone_1}`} className="a-botao a-botao-secundario !min-h-[44px] shrink-0">
                                                        <Phone size={18} aria-hidden /> Ligar
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                        <Link href={`/boleia/tracking/${oferta.id}`} className="a-botao a-botao-principal w-full">
                                            <Navigation size={20} aria-hidden /> Partilhar onde estou
                                        </Link>
                                    </div>
                                )}

                                <BotaoCancelarOferta ofertaId={oferta.id} />
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="a-card space-y-3 p-6 text-center">
                        <p className="text-[16px] a-suave">Não tem boleias oferecidas.</p>
                        <Link href="/boleia/oferecer" className="a-botao a-botao-principal w-full">
                            <Plus size={20} aria-hidden /> Oferecer lugar
                        </Link>
                    </div>
                )}
            </section>

            <section className="space-y-3">
                <h2 className="text-[19px] font-semibold">Vou à boleia</h2>
                {minhasReservas.length > 0 ? (
                    <ul className="space-y-3">
                        {minhasReservas.map(reserva => {
                            const oferta = reserva.oferta
                            return (
                                <li key={reserva.id} className="a-card space-y-3 p-4">
                                    <p className="text-[17px] font-semibold">Com {oferta.motorista.first_name} {oferta.motorista.last_name}</p>
                                    <ul className="space-y-1.5 text-[16px]">
                                        <Info icone={Clock}>{quando(oferta.data_hora_saida)}</Info>
                                        <Info icone={MapPin}>Sai de {oferta.endereco_partida}</Info>
                                        {oferta.evento && <Info icone={Calendar}>Para {oferta.evento.nome}</Info>}
                                    </ul>
                                    <div className="grid gap-2">
                                        <Link href={`/boleia/tracking/${oferta.id}`} className="a-botao a-botao-principal w-full">
                                            <Navigation size={20} aria-hidden /> Ver onde está o carro
                                        </Link>
                                        {oferta.motorista.phone_1 && (
                                            <a href={`tel:${oferta.motorista.phone_1}`} className="a-botao a-botao-secundario w-full">
                                                <Phone size={20} aria-hidden /> Ligar a {oferta.motorista.first_name}
                                            </a>
                                        )}
                                        <BotaoCancelarReserva reservaId={reserva.id} />
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <p className="a-card p-6 text-center text-[16px] a-suave">Não pediu lugar em nenhuma boleia.</p>
                )}
            </section>

            {ofertasPassadas.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[19px] font-semibold">Anteriores</h2>
                    <ul className="a-card a-divide">
                        {ofertasPassadas.slice(0, 5).map(oferta => (
                            <li key={oferta.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <span className="min-w-0 truncate text-[16px]">
                                    {new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT')} · {oferta.zona_partida || oferta.endereco_partida}
                                </span>
                                <span className="shrink-0 text-[15px] a-suave">{ESTADO[oferta.status] ?? oferta.status}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    )
}

function Info({ icone: Icone, children }: { icone: LucideIcon; children: React.ReactNode }) {
    return (
        <li className="flex items-start gap-2">
            <Icone size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
            <span>{children}</span>
        </li>
    )
}

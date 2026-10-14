// app/boleia/page.tsx
// Pagina principal — listar boleias disponiveis para os proximos eventos
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Car, MapPin, Clock, Users, Plus, Calendar } from 'lucide-react'
import BotaoReservar from '@/components/boleia/BotaoReservar'
import BotaoCancelarReserva from '@/components/boleia/BotaoCancelarReserva'
import BotaoAgradecer from '@/components/boleia/BotaoAgradecer'
import MapaBoleiasWrapper from '@/components/boleia/MapaBoleiasWrapper'
import type { OfertaMapa } from '@/components/boleia/MapaBoleias'

export const dynamic = 'force-dynamic'

const quando = (d: Date) => {
    const t = `${new Date(d).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })} às ${new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    return t[0].toUpperCase() + t.slice(1)
}

export default async function BoleiaPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const { membroId } = session

    const db = await getDb()

    const agora = new Date()
    // Ultimas 48h para mostrar boleias passadas com botao de agradecer
    const ha48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000)

    const incluir = {
        motorista: { select: { id: true, first_name: true, last_name: true } },
        evento: { select: { id: true, nome: true, data: true } },
        reservas: {
            where: { status: 'CONFIRMADA' as const },
            include: { passageiro: { select: { id: true, first_name: true, last_name: true } } },
        },
    }

    const [ofertas, minhasReservasPassadas] = await Promise.all([
        db.boleiaOferta.findMany({
            where: { status: 'ATIVA', data_hora_saida: { gte: agora } },
            include: incluir,
            orderBy: { data_hora_saida: 'asc' },
        }),
        db.boleiaOferta.findMany({
            where: {
                data_hora_saida: { gte: ha48h, lt: agora },
                reservas: { some: { passageiro_id: membroId, status: 'CONFIRMADA' } },
            },
            include: incluir,
            orderBy: { data_hora_saida: 'desc' },
        }),
    ])

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

    return (
        <div className="app-novo mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Boleias</h1>
                <p className="text-[17px] a-suave">Quem tem lugar no carro leva quem precisa.</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <Link href="/boleia/oferecer" className="a-botao a-botao-principal">
                    <Plus size={20} aria-hidden /> Oferecer lugar
                </Link>
                <Link href="/boleia/minhas" className="a-botao a-botao-secundario">
                    As minhas
                </Link>
            </div>

            {ofertasComCoordenadas.length > 0 && (
                <section className="hidden md:block">
                    <MapaBoleiasWrapper ofertas={ofertasComCoordenadas} />
                </section>
            )}

            {ofertas.length > 0 ? (
                <ul className="space-y-3">
                    {ofertas.map((oferta) => {
                        const vagasLivres = oferta.vagas_total - oferta.reservas.length
                        const minhaReserva = oferta.reservas.find(r => r.passageiro.id === membroId)
                        const souMotorista = oferta.motorista.id === membroId

                        return (
                            <li key={oferta.id} className="a-card space-y-3 p-4">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
                                        style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                        {oferta.motorista.first_name[0]}{oferta.motorista.last_name[0]}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[17px] font-semibold">
                                            {souMotorista ? 'Eu' : `${oferta.motorista.first_name} ${oferta.motorista.last_name}`}
                                        </p>
                                        <p className="text-[15px] a-suave">
                                            {vagasLivres > 0
                                                ? `${vagasLivres} ${vagasLivres === 1 ? 'lugar livre' : 'lugares livres'}`
                                                : 'Carro cheio'}
                                        </p>
                                    </div>
                                </div>

                                <ul className="space-y-1.5 text-[16px]">
                                    <li className="flex items-start gap-2">
                                        <Clock size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
                                        {quando(oferta.data_hora_saida)}
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <MapPin size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
                                        <span>Sai de {oferta.zona_partida || oferta.endereco_partida}</span>
                                    </li>
                                    {oferta.evento && (
                                        <li className="flex items-start gap-2">
                                            <Calendar size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
                                            <span>Para {oferta.evento.nome}</span>
                                        </li>
                                    )}
                                    {oferta.reservas.length > 0 && (
                                        <li className="flex items-start gap-2">
                                            <Users size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
                                            <span>{oferta.reservas.map(r => r.passageiro.first_name).join(', ')}</span>
                                        </li>
                                    )}
                                </ul>

                                {oferta.nota && (
                                    <p className="border-t pt-3 text-[16px] a-suave" style={{ borderColor: 'var(--a-borda)' }}>
                                        &ldquo;{oferta.nota}&rdquo;
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-3">
                                    {souMotorista ? (
                                        <Link href="/boleia/minhas" className="a-botao a-botao-secundario w-full">Gerir a minha boleia</Link>
                                    ) : minhaReserva ? (
                                        <BotaoCancelarReserva reservaId={minhaReserva.id} />
                                    ) : vagasLivres > 0 ? (
                                        <BotaoReservar ofertaId={oferta.id} />
                                    ) : (
                                        <p className="text-[16px] a-suave">Já não há lugares.</p>
                                    )}
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <div className="a-card space-y-2 p-6 text-center">
                    <Car size={36} className="mx-auto a-suave" aria-hidden />
                    <p className="text-[18px] font-semibold">Ainda não há boleias</p>
                    <p className="text-[16px] a-suave">Se vai de carro, ofereça um lugar.</p>
                </div>
            )}

            {minhasReservasPassadas.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-[19px] font-semibold">Diga obrigado</h2>
                    <ul className="space-y-3">
                        {minhasReservasPassadas.map((oferta) => {
                            const minhaReserva = oferta.reservas.find(r => r.passageiro.id === membroId)
                            if (!minhaReserva) return null
                            return (
                                <li key={oferta.id} className="a-card space-y-3 p-4">
                                    <div>
                                        <p className="text-[17px] font-semibold">{oferta.motorista.first_name} {oferta.motorista.last_name}</p>
                                        <p className="text-[15px] a-suave">{quando(oferta.data_hora_saida)}</p>
                                    </div>
                                    <BotaoAgradecer reservaId={minhaReserva.id} jaAgradeceu={minhaReserva.agradecimento ?? false} />
                                </li>
                            )
                        })}
                    </ul>
                </section>
            )}
        </div>
    )
}

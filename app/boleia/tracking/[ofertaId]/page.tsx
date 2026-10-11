import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import TrackingClient from '@/components/boleia/TrackingClient'

export const dynamic = 'force-dynamic'

export default async function TrackingPage({ params }: { params: Promise<{ ofertaId: string }> }) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const { ofertaId: ofertaIdStr } = await params
    const ofertaId = Number(ofertaIdStr)
    const db = await getDb()

    const oferta = await db.boleiaOferta.findUnique({
        where: { id: ofertaId },
        include: {
            motorista: { select: { id: true, first_name: true, last_name: true } },
            evento: { select: { nome: true } },
            reservas: {
                where: { status: 'CONFIRMADA' },
                include: {
                    passageiro: { select: { id: true, first_name: true, last_name: true } },
                },
            },
        },
    })

    if (!oferta || oferta.status !== 'ATIVA') redirect('/boleia')

    const isMotorista = oferta.motorista_id === session.membroId
    const isPassageiro = oferta.reservas.some((r: any) => r.passageiro_id === session.membroId)
    if (!isMotorista && !isPassageiro) redirect('/boleia')

    const participantes = [
        {
            membroId: oferta.motorista.id,
            nome: `${oferta.motorista.first_name} ${oferta.motorista.last_name}`,
            papel: 'MOTORISTA' as const,
        },
        ...oferta.reservas.map((r: any) => ({
            membroId: r.passageiro.id,
            nome: `${r.passageiro.first_name} ${r.passageiro.last_name}`,
            papel: 'PASSAGEIRO' as const,
        })),
    ]

    return (
        <TrackingClient
            ofertaId={ofertaId}
            membroId={session.membroId}
            isMotorista={isMotorista}
            participantes={participantes}
            enderecoPartida={oferta.endereco_partida}
            dataHoraSaida={oferta.data_hora_saida.toISOString()}
            eventoNome={oferta.evento?.nome || null}
            latitudePartida={oferta.latitude}
            longitudePartida={oferta.longitude}
        />
    )
}

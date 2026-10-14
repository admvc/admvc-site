// app/boleia/oferecer/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import FormOferecer from '@/components/boleia/FormOferecer'

export const dynamic = 'force-dynamic'

export default async function OferecerBoleiaPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = await getDb()

    // Proximos eventos para selecao
    const agora = new Date()
    const em30Dias = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000)

    const eventos = await db.evento.findMany({
        where: { data: { gte: agora, lte: em30Dias } },
        orderBy: { data: 'asc' },
        select: { id: true, nome: true, data: true },
    })

    const eventosSerializados = eventos.map(e => ({
        id: e.id,
        nome: e.nome,
        data: e.data.toISOString(),
    }))

    return (
        <div className="app-novo mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Oferecer lugar</h1>
                <p className="text-[17px] a-suave">Diga quando sai e quantos lugares tem.</p>
            </div>
            <FormOferecer eventos={eventosSerializados} />
        </div>
    )
}

// app/membros/agendar/page.tsx — Vista do membro para pedir agendamento
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import AgendarClient from '@/components/membros/AgendarClient'

export default async function AgendarPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    // Buscar agendas publicas com horarios dos proximos dias
    const agendas = await db.agenda.findMany({
        where: { is_publica: true },
        include: {
            dono: { select: { first_name: true, last_name: true, avatar_file: true } },
            compromissos: {
                where: { data_inicio: { gte: new Date() }, status: { in: ['AGENDADO', 'PENDENTE'] } },
                select: { data_inicio: true, data_fim: true },
                orderBy: { data_inicio: 'asc' },
                take: 20,
            }
        },
        orderBy: { nome: 'asc' }
    })

    const membro = await db.membro.findUnique({
        where: { id: session.membroId },
        select: { id: true, first_name: true, last_name: true, phone_1: true, email: true }
    })

    return (
        <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <AgendarClient agendas={agendas} membro={membro} />
        </div>
    )
}

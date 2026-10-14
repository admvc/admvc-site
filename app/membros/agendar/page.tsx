import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
// app/membros/agendar/page.tsx — Vista do membro para pedir agendamento
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import AgendarClient from '@/components/membros/AgendarClient'

export default async function AgendarPage() {
    await exigirModuloAtivo(MODULOS.GABINETE)
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
        <div className="app-novo mx-auto max-w-2xl space-y-5 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <AgendarClient agendas={agendas} membro={membro} />
        </div>
    )
}

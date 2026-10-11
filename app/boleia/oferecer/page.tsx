// app/boleia/oferecer/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car } from 'lucide-react'
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
        <main className="max-w-lg mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">

            {/* HEADER */}
            <div className="space-y-4">
                <Link href="/boleia" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={14} /> Voltar
                </Link>

                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-figueira text-white rounded-2xl flex items-center justify-center shadow-lg shadow-figueira/30">
                        <Car size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-fg leading-none">
                            Oferecer Boleia
                        </h1>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                            Partilhe lugar no seu carro
                        </p>
                    </div>
                </div>
            </div>

            {/* FORM */}
            <div className="bg-bg2 border border-soft rounded-[2.5rem] p-8 shadow-sm">
                <FormOferecer eventos={eventosSerializados} />
            </div>
        </main>
    )
}

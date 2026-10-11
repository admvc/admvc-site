import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Music2, Calendar } from 'lucide-react'
import ModalRepertorio from '@/components/louvor/ModalRepertorio'
import BotaoSetlistPalco from '@/components/louvor/BotaoSetlistPalco'

export const dynamic = 'force-dynamic'

export default async function RepertorioPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const { membroId, role } = session

    const db = await getDb()

    // Verifica se o membro pertence ao louvor
    const vinculoLouvor = await db.integranteDepartamento.findFirst({
        where: {
            membro_id: membroId,
            departamento: {
                nome: { contains: 'louvor', mode: 'insensitive' }
            }
        },
        include: { departamento: true }
    })

    const deptoLouvor = await db.departamento.findFirst({
        where: { nome: { contains: 'louvor', mode: 'insensitive' } },
        select: { id: true, lider_id: true }
    })

    const eAdmin = isAdmin(role)
    const eLider = deptoLouvor?.lider_id === membroId
    const temAcesso = eAdmin || !!vinculoLouvor

    if (!temAcesso) redirect('/membros/dashboard')

    const podeEditar = eAdmin || eLider

    // Próximos eventos com repertório
    const eventos = await db.evento.findMany({
        where: { data: { gte: new Date() } },
        include: {
            repertorio: {
                include: { musica: true },
                orderBy: { ordem: 'asc' }
            }
        },
        orderBy: { data: 'asc' },
        take: 10,
    })

    return (
        <main className="max-w-4xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-8 pb-28 md:pb-24 animate-in fade-in duration-700">
            <header className="space-y-2 pb-4 md:pb-6 border-b border-soft">
                <span className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <Music2 size={14} /> Louvor
                </span>
                <h1 className="text-xl md:text-4xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Repertório
                </h1>
            </header>

            {eventos.length > 0 ? (
                <div className="space-y-4">
                    {eventos.map((evento) => {
                        const d = new Date(evento.data)
                        const dataFormatada = d.toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })
                        const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                        const totalMusicas = evento.repertorio?.length || 0

                        return (
                            <div key={evento.id} className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                                <div className="p-4 md:p-5 flex items-center gap-4">
                                    <div className="p-2 rounded-lg bg-fg text-bg text-center min-w-[44px] shrink-0">
                                        <span className="block text-[7px] md:text-[9px] font-black uppercase opacity-60">
                                            {d.toLocaleDateString('pt-PT', { month: 'short' })}
                                        </span>
                                        <span className="block text-lg font-black italic leading-tight">
                                            {d.toLocaleDateString('pt-PT', { day: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-black uppercase italic text-fg truncate">{evento.nome}</h3>
                                        <p className="text-[9px] md:text-[11px] text-muted font-bold mt-0.5">{dataFormatada} · {hora}</p>
                                        <p className="text-[8px] md:text-[10px] text-figueira font-black uppercase tracking-widest mt-1">
                                            {totalMusicas > 0 ? `${totalMusicas} música${totalMusicas !== 1 ? 's' : ''}` : 'Sem repertório'}
                                        </p>
                                    </div>
                                </div>
                                <div className="px-4 pb-4 flex flex-wrap gap-2">
                                    {podeEditar && (
                                        <ModalRepertorio eventoId={evento.id} repertorioInical={evento.repertorio || []} podeEditar={true} />
                                    )}
                                    <BotaoSetlistPalco eventoId={evento.id} totalMusicas={totalMusicas} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16">
                    <Calendar size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">
                        Sem eventos agendados
                    </p>
                </div>
            )}
        </main>
    )
}

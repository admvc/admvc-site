import prisma from '@/lib/prisma'
import { CalendarDays, Clock, Coffee, BookOpen, Users, Utensils, CheckCircle2, Clock3 } from 'lucide-react'

function getCategoriaEstilo(categoria: string) {
    switch (categoria) {
        case 'CAFE': return { cor: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icone: Coffee, label: 'Café com Pastor' };
        case 'PERMANECER': return { cor: 'text-figueira', bg: 'bg-figueira/10', border: 'border-figueira/20', icone: BookOpen, label: 'Plano Permanecer' };
        case 'DISCIPULADO': return { cor: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icone: Users, label: 'Discipulado' };
        case 'LIDERANCA': return { cor: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icone: Users, label: 'Liderança' };
        case 'MESA': return { cor: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icone: Utensils, label: 'A Mesa' };
        default: return { cor: 'text-muted', bg: 'bg-soft/30', border: 'border-soft', icone: CalendarDays, label: 'Outros' };
    }
}

export default async function WidgetMeusCompromissos({ membroId }: { membroId: number }) {
    // Procura todos os compromissos futuros onde este membro está na lista de participantes
    const meusCompromissos = await prisma.compromisso.findMany({
        where: {
            membros: { some: { id: membroId } },
            data_inicio: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        },
        include: {
            agenda: { include: { dono: true } }
        },
        orderBy: { data_inicio: 'asc' }
    });

    // Se o membro não tiver nada marcado, o widget esconde-se para não poluir o ecrã
    if (meusCompromissos.length === 0) return null;

    return (
        <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 sm:p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center">
                    <CalendarDays size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg">As Minhas Marcações</h3>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">Com o Gabinete Pastoral</p>
                </div>
            </div>

            <div className="space-y-4">
                {meusCompromissos.map(comp => {
                    const estilo = getCategoriaEstilo(comp.categoria);
                    const Icone = estilo.icone;
                    const data = new Date(comp.data_inicio);
                    const isPendente = comp.status === 'PENDENTE';

                    return (
                        <div key={comp.id} className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${isPendente ? 'bg-orange-500/5 border-orange-500/20' : 'bg-bg border-soft'}`}>
                            
                            <div className="flex items-center gap-4">
                                {/* DATA (Estilo Calendário rasgado) */}
                                <div className="flex flex-col items-center justify-center min-w-[50px] border-r border-soft pr-4">
                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest">{data.toLocaleDateString('pt-PT', { weekday: 'short' })}</span>
                                    <span className="text-xl font-black italic text-fg leading-none my-0.5">{data.getDate()}</span>
                                    <span className="text-[9px] font-bold text-muted">{data.toLocaleDateString('pt-PT', { month: 'short' })}</span>
                                </div>

                                {/* DETALHES */}
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-fg truncate">
                                        {comp.titulo}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border flex items-center gap-1 ${estilo.bg} ${estilo.cor} ${estilo.border}`}>
                                            <Icone size={10} /> {estilo.label}
                                        </span>
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={10} /> {data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
                                            • Com {comp.agenda.dono.first_name}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* STATUS */}
                            <div className="hidden sm:flex shrink-0">
                                {isPendente ? (
                                    <span className="bg-orange-500/10 text-orange-500 border border-orange-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
                                        <Clock3 size={12} /> Aguardar
                                    </span>
                                ) : (
                                    <span className="bg-figueira/10 text-figueira border border-figueira/20 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <CheckCircle2 size={12} /> Confirmado
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
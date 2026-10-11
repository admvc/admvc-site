import prisma from '@/lib/prisma'
import Link from 'next/link'
import { CalendarDays, BellRing, Clock, ArrowRight, CheckCircle2 } from 'lucide-react'

export default async function WidgetAgendaPastoral({ membroId }: { membroId: number }) {
// 1. Verifica se este membro é dono de alguma agenda
    const agenda = await prisma.agenda.findUnique({
        where: { dono_id: membroId },
        include: {
            compromissos: {
                where: {
                    // Traz tudo de hoje para a frente
                    data_inicio: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                    status: { in: ['AGENDADO', 'PENDENTE'] }
                },
                orderBy: { data_inicio: 'asc' },
                // APENAS AS RELAÇÕES AQUI: O "externos" já vem automaticamente!
                include: { membros: true, visitantes: true, departamentos: true, grupos: true }
            }
        }
    });

    // Se não for líder/pastor com agenda, não mostra nada
    if (!agenda) return null;

    // 2. Filtra os dados para o resumo
    const pendentes = agenda.compromissos.filter(c => c.status === 'PENDENTE');
    
    const hoje = new Date();
    const agendadosHoje = agenda.compromissos.filter(c => 
        c.status === 'AGENDADO' && 
        new Date(c.data_inicio).toDateString() === hoje.toDateString()
    );

    // Se não tiver nada pendente nem nada para hoje, podemos mostrar um aviso amigável ou ocultar.
    // Vamos mostrar um card verde a dizer que o dia está livre!
    if (pendentes.length === 0 && agendadosHoje.length === 0) {
        return (
            <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black uppercase italic tracking-tight text-fg">Agenda Livre</h4>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Nenhum compromisso marcado para hoje.</p>
                    </div>
                </div>
                <Link href="/gabinete" className="text-[10px] font-black uppercase tracking-widest text-figueira flex items-center gap-1 hover:gap-2 transition-all">
                    Ver Agenda <ArrowRight size={12} />
                </Link>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* ALERTA DE PENDENTES (Laranja/Urgente) */}
            {pendentes.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-6 flex items-center justify-between group hover:bg-orange-500/10 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-orange-500/20 text-orange-600 rounded-2xl flex items-center justify-center animate-pulse">
                            <BellRing size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase italic tracking-tight text-fg">Pedidos Pendentes</h4>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">
                                Tens {pendentes.length} marcação(ões) a aguardar aprovação.
                            </p>
                        </div>
                    </div>
                    <Link href="/gabinete" className="w-10 h-10 bg-bg border border-soft rounded-xl flex items-center justify-center text-muted group-hover:text-orange-500 group-hover:border-orange-200 transition-all shrink-0">
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}

            {/* ALERTA DE COMPROMISSOS DE HOJE */}
            {agendadosHoje.length > 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-6 flex items-center justify-between group hover:border-figueira/30 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center">
                            <CalendarDays size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase italic tracking-tight text-fg">Compromissos Hoje</h4>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                O teu próximo é às <strong className="text-figueira">{new Date(agendadosHoje[0].data_inicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</strong>.
                            </p>
                        </div>
                    </div>
                    <Link href="/gabinete" className="w-10 h-10 bg-bg border border-soft rounded-xl flex items-center justify-center text-muted group-hover:text-figueira group-hover:border-figueira/30 transition-all shrink-0">
                        <ArrowRight size={16} />
                    </Link>
                </div>
            )}
            
        </div>
    )
}
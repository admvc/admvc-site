'use client'

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, isToday } from 'date-fns'
import { pt } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Users, Trash2, Loader2 } from 'lucide-react'
import { apagarEventoAction } from '@/actions/admin-actions'
import ModalEditarEvento from '@/components/admin/ModalEditarEvento'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function CalendarioAgenda({ eventos, congregacoes }: { eventos: any[]; congregacoes?: { id: number; nome: string; cidade: string }[] }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [mesAtual, setMesAtual] = useState(new Date())
    const [diaSelecionado, setDiaSelecionado] = useState(new Date())
    const [isDeleting, setIsDeleting] = useState<number | null>(null)

    const inicioDoMes = startOfMonth(mesAtual)
    const fimDoMes = endOfMonth(mesAtual)
    const inicioCalendario = startOfWeek(inicioDoMes, { weekStartsOn: 1 })
    const fimCalendario = endOfWeek(fimDoMes, { weekStartsOn: 1 })

    const dias = eachDayOfInterval({ start: inicioCalendario, end: fimCalendario })
    const eventosDoDia = eventos.filter(e => isSameDay(new Date(e.data), diaSelecionado))

    const proximoMes = () => setMesAtual(addMonths(mesAtual, 1))
    const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1))

    const handleApagarEvento = async (eventoId: number) => {
        const ok = await confirmar({ mensagem: 'Tem a certeza que deseja cancelar e apagar este evento? Esta ação removerá também as equipas escaladas.', tipo: 'perigo' })
        if (!ok) return
        setIsDeleting(eventoId);
        const res = await apagarEventoAction(eventoId);
        setIsDeleting(null);

        if (!res.ok) {
            toast(res.error, 'erro');
        }
    }

    return (
        <div className="grid lg:grid-cols-12 gap-8 items-start">

            {/* LADO ESQUERDO: O CALENDÁRIO VISUAL */}
            <div className="lg:col-span-7 xl:col-span-8 bg-bg2 border border-soft rounded-[3rem] p-8 shadow-sm">

                {/* HEADER DO CALENDÁRIO */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-fg capitalize">
                        {format(mesAtual, 'MMMM yyyy', { locale: pt })}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button onClick={mesAnterior} className="p-3 bg-soft rounded-2xl hover:bg-figueira hover:text-white transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => { setMesAtual(new Date()); setDiaSelecionado(new Date()); }} className="px-4 py-3 bg-soft rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira hover:text-white transition-all hidden sm:block">
                            Hoje
                        </button>
                        <button onClick={proximoMes} className="p-3 bg-soft rounded-2xl hover:bg-figueira hover:text-white transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* DIAS DA SEMANA */}
                <div className="grid grid-cols-7 mb-4">
                    {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(dia => (
                        <div key={dia} className="text-center text-[10px] font-black text-muted uppercase tracking-widest pb-4 border-b border-soft">
                            {dia}
                        </div>
                    ))}
                </div>

                {/* GRELHA DE DIAS */}
                <div className="grid grid-cols-7 gap-2">
                    {dias.map((dia, idx) => {
                        const isMesAtual = isSameMonth(dia, mesAtual)
                        const selecionado = isSameDay(dia, diaSelecionado)
                        const hoje = isToday(dia)
                        const eventosNesteDia = eventos.filter(e => isSameDay(new Date(e.data), dia))
                        const temEvento = eventosNesteDia.length > 0

                        return (
                            <button
                                key={idx}
                                onClick={() => setDiaSelecionado(dia)}
                                className={`
                                    flex flex-col items-center justify-center p-2 sm:p-4 rounded-2xl min-h-[60px] relative transition-all active:scale-95
                                    ${!isMesAtual ? 'opacity-30' : 'hover:bg-soft'}
                                    ${selecionado ? 'bg-fg text-bg shadow-xl scale-105 z-10' : 'bg-transparent text-fg'}
                                `}
                            >
                                <span className={`text-lg font-black italic leading-none ${hoje && !selecionado ? 'text-figueira' : ''}`}>
                                    {format(dia, 'd')}
                                </span>

                                {temEvento && (
                                    <div className="flex gap-1 mt-2">
                                        {eventosNesteDia.slice(0, 3).map((_, i) => (
                                            <span key={i} className={`w-1.5 h-1.5 rounded-full ${selecionado ? 'bg-bg' : 'bg-figueira'}`}></span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* LADO DIREITO: DETALHES DO DIA SELECIONADO */}
            <div className="lg:col-span-5 xl:col-span-4 bg-bg border border-soft rounded-[3rem] p-8 shadow-inner sticky top-24">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-soft border-dashed">
                    <Calendar size={20} className="text-figueira" />
                    <div>
                        <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg">
                            {format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: pt })}
                        </h3>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">Eventos Agendados</p>
                    </div>
                </div>

                {eventosDoDia.length > 0 ? (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {eventosDoDia.map(ev => {
                            const totalEscalados = ev.escalas?.length || 0;
                            // AQUI ESTÁ A CORREÇÃO: Formatamos a hora diretamente da data do evento!
                            const horarioEvento = format(new Date(ev.data), 'HH:mm');

return (
                                <div key={ev.id} className="bg-bg2 p-5 rounded-3xl border border-soft hover:border-figueira/30 transition-all flex flex-col gap-4 group relative overflow-hidden">

                                    {/* GRUPO DE AÇÕES (EDITAR E APAGAR) - Canto superior direito */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                                        
                                        {/* O TEU MODAL DE EDITAR ENTRA AQUI */}
                                        <ModalEditarEvento evento={ev} congregacoes={congregacoes} />

                                        {/* O TEU BOTÃO DE APAGAR (Ajustei um pouco as margens para não colidir) */}
                                        <button
                                            onClick={() => handleApagarEvento(ev.id)}
                                            disabled={isDeleting === ev.id}
                                            title="Apagar Evento"
                                            className="p-2.5 bg-red-500/5 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors active:scale-90 disabled:opacity-50 border border-red-500/10 shadow-sm"
                                        >
                                            {isDeleting === ev.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        </button>
                                    </div>

                                    {/* DETALHES DO EVENTO */}
                                    <div className="pr-20"> {/* Aumentei o padding direito para o texto não ficar por baixo dos botões */}
                                        <h4 className="text-sm font-black uppercase tracking-tight text-fg group-hover:text-figueira transition-colors truncate">{ev.nome}</h4>
                                        <div className="flex items-center gap-3 mt-2 text-[9px] font-black uppercase text-muted tracking-widest">
                                            {/* MOSTRA O HORÁRIO CORRETO AQUI */}
                                            <span className="flex items-center gap-1"><Clock size={10} /> {horarioEvento}</span>
                                            <span className="flex items-center gap-1"><MapPin size={10} /> Presencial</span>
                                        </div>
                                    </div>

                                    {/* CONTADOR DE VOLUNTÁRIOS */}
                                    <div className="flex items-center justify-between border-t border-soft/50 pt-3 mt-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted">Voluntários:</span>

                                        <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${totalEscalados > 0 ? 'bg-soft/50 text-fg border-soft' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            <Users size={12} />
                                            {totalEscalados} {totalEscalados === 1 ? 'Escalado' : 'Escalados'}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 opacity-50">
                        <Calendar size={32} className="mx-auto mb-3" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum evento neste dia.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
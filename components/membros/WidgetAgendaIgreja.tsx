'use client'

import { useState } from 'react'
import { CalendarDays, Clock, MapPin, ChevronDown, Edit3, X, Info } from 'lucide-react'
import Link from 'next/link'

// 🗑️ cultosMock ELIMINADO

export default function WidgetAgendaIgreja({ eventos = [], isAdmin = false }: { eventos: any[], isAdmin?: boolean }) {
    const [expandido, setExpandido] = useState(false);
    const [eventoSelecionado, setEventoSelecionado] = useState<any>(null);

    const eventosVisiveis = expandido ? eventos : eventos.slice(0, 2);

    // Formatações (ajustadas para Date objetos que vêm do Prisma)
    const formatarDia = (d: Date) => new Date(d).getDate().toString().padStart(2, '0');
    const formatarMes = (d: Date) => new Intl.DateTimeFormat('pt-PT', { month: 'short' }).format(new Date(d)).replace('.', '').toUpperCase();
    const formatarHora = (d: Date) => new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
    const formatarDiaSemana = (d: Date) => new Intl.DateTimeFormat('pt-PT', { weekday: 'long' }).format(new Date(d));

    return (
        <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col h-full transition-all duration-500">

            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                    <CalendarDays size={18} />
                </div>
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-fg leading-none">Agenda da Igreja</h3>
                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">Dados em Tempo Real</p>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                {eventosVisiveis.length > 0 ? eventosVisiveis.map((evento, index) => (
                    <div key={evento.id} className="relative group">
                        <button
                            onClick={() => setEventoSelecionado(evento)}
                            className={`w-full flex gap-4 p-3 rounded-3xl transition-all text-left hover:bg-bg ${index !== eventosVisiveis.length - 1 ? 'border-b border-soft pb-5' : ''}`}
                        >
                            <div className="w-14 h-14 bg-soft/50 group-hover:bg-figueira group-hover:text-white rounded-2xl flex flex-col items-center justify-center shrink-0 transition-colors shadow-sm">
                                <span className="text-lg font-black leading-none">{formatarDia(evento.data)}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">{formatarMes(evento.data)}</span>
                            </div>

                            <div className="flex flex-col justify-center min-w-0 flex-1">
                                <p className="text-[10px] text-figueira font-black uppercase tracking-widest mb-0.5 truncate capitalize">
                                    {formatarDiaSemana(evento.data)}
                                </p>
                                <h4 className="text-sm font-black uppercase text-fg truncate tracking-tight">
                                    {evento.nome} {/* 👈 Ajustado de 'titulo' para 'nome' */}
                                </h4>
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold text-muted uppercase tracking-widest">
                                    <span className="flex items-center gap-1"><Clock size={10} /> {formatarHora(evento.data)}</span>
                                </div>
                            </div>
                        </button>

                        {isAdmin && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Link href={`/admin/eventos/editar/${evento.id}`} className="p-2.5 bg-bg border border-soft text-muted hover:text-figueira rounded-xl shadow-sm block">
                                    <Edit3 size={14} />
                                </Link>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-[10px] text-muted italic p-4 text-center">Sem eventos agendados.</p>
                )}
            </div>

            {/* BOTÃO EXPANDIR */}
            {eventos.length > 2 && (
                <button
                    onClick={() => setExpandido(!expandido)}
                    className="mt-6 w-full py-4 bg-bg border border-soft rounded-2xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-fg hover:border-figueira transition-all flex items-center justify-center gap-2"
                >
                    {expandido ? 'Ocultar' : `Ver todos (${eventos.length})`}
                    <ChevronDown size={14} className={expandido ? 'rotate-180' : ''} />
                </button>
            )}

            {/* MODAL (O mesmo que criámos antes, apenas usa evento.nome) */}
            {eventoSelecionado && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft animate-in zoom-in-95 duration-300">
                        <div className="relative h-24 bg-figueira flex items-center justify-center">
                            <button onClick={() => setEventoSelecionado(null)} className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-xl"><X size={20} /></button>
                            <h2 className="text-xl font-black uppercase italic text-white tracking-tighter">Detalhes do Evento</h2>
                        </div>
                        <div className="p-8 space-y-6">
                            <h3 className="text-2xl font-black uppercase italic text-fg tracking-tighter">{eventoSelecionado.nome}</h3>
                            <div className="bg-bg2/50 border-2 border-dashed border-soft p-5 rounded-2xl">
                                <p className="text-xs font-bold text-muted leading-relaxed italic">
                                    {eventoSelecionado.descricao || "Sem descrição disponível."}
                                </p>
                            </div>
                            <button onClick={() => setEventoSelecionado(null)} className="w-full py-5 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-[0.3em]">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
// components/membros/WidgetMural.tsx
'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Menu, X, ArrowRight, UserCircle, Hash, Heart, Users } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface WidgetMuralProps {
    avisos?: any[];
    alertasAcolhimento?: any[];
}

export default function WidgetMural({ avisos = [], alertasAcolhimento = [] }: WidgetMuralProps) {
    const [open, setOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Evitar erros de hidratação (Next.js)
    useEffect(() => setMounted(true), []);

    // VERIFICA SE HÁ MENSAGENS NÃO LIDAS
    useEffect(() => {
        if (!mounted) return;

        const totalItems = avisos.length + alertasAcolhimento.length;
        if (totalItems === 0) return;

        const lastReadTime = localStorage.getItem('mural_last_read');
        let newestTime = 0;

        if (avisos.length > 0 && avisos[0].createdAt) {
            newestTime = Math.max(newestTime, new Date(avisos[0].createdAt).getTime());
        }

        // ✅ CORRIGIDO: usa data_ultima_visita em vez de updatedAt
        if (alertasAcolhimento.length > 0 && alertasAcolhimento[0].data_ultima_visita) {
            newestTime = Math.max(newestTime, new Date(alertasAcolhimento[0].data_ultima_visita).getTime());
        }

        if (!lastReadTime || newestTime > Number(lastReadTime)) {
            setHasUnread(true);
        }
    }, [avisos, alertasAcolhimento, mounted]);

    const handleToggle = () => {
        const newState = !open;
        setOpen(newState);

        if (newState) {
            let newestTime = 0;

            if (avisos.length > 0 && avisos[0].createdAt) {
                newestTime = Math.max(newestTime, new Date(avisos[0].createdAt).getTime());
            }

            // ✅ CORRIGIDO: usa data_ultima_visita em vez de updatedAt
            if (alertasAcolhimento.length > 0 && alertasAcolhimento[0].data_ultima_visita) {
                newestTime = Math.max(newestTime, new Date(alertasAcolhimento[0].data_ultima_visita).getTime());
            }

            if (newestTime > 0) {
                localStorage.setItem('mural_last_read', newestTime.toString());
            }
            setHasUnread(false);
        }
    };

    if (!mounted) return null; // Evita flash de conteúdo no SSR
    if (avisos.length === 0 && alertasAcolhimento.length === 0) return null;

    //alert.data_ultima_visita

    // Protege o formatDate contra valores inválidos:
    const formatDate = (dateString: string | Date | undefined | null) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '—';
        return new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-[100] flex flex-col items-end">

            {open && (
                <div className="mb-4 w-[calc(100vw-3rem)] sm:w-[400px] bg-bg2 border border-soft rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300 origin-bottom-right">

                    {/* CABEÇALHO DO WIDGET */}
                    <div className="bg-bg border-b border-soft p-5 flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                            <MessageSquare size={16} className="text-figueira" />
                            Central de Avisos
                        </h4>
                        <button onClick={() => setOpen(false)} className="text-muted hover:text-fg transition-colors bg-soft/50 p-2 rounded-xl">
                            <X size={16} />
                        </button>
                    </div>

                    {/* ÁREA DE SCROLL (MENSAGENS) */}
                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 space-y-4">

                        {/* SECÇÃO: ALERTAS DE ACOLHIMENTO */}
                        {alertasAcolhimento.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-500 px-2 pt-2 flex items-center gap-1.5">
                                    <Users size={12} /> Equipa de Acolhimento
                                </h5>
                                {alertasAcolhimento.map((alerta) => (
                                    <Link key={`alerta-${alerta.id}`} href="/departamentos/acolhimento/dashboard" className="block p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-colors group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                    <Heart size={14} className="text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-wider text-fg leading-none group-hover:text-emerald-700 transition-colors">
                                                        {alerta.nome}
                                                    </p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mt-1">
                                                        {formatDate(alerta.data_ultima_visita)}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${alerta.status === 'NOVO' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-soft text-muted'}`}>
                                                {alerta.status}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* DIVISÓRIA (Se houver os dois tipos de mensagem) */}
                        {alertasAcolhimento.length > 0 && avisos.length > 0 && (
                            <div className="h-px bg-soft mx-2 my-4"></div>
                        )}

                        {/* SECÇÃO: AVISOS DO MURAL GERAL */}
                        {avisos.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-[9px] font-black uppercase tracking-widest text-figueira px-2 pt-2 flex items-center gap-1.5">
                                    <MessageSquare size={12} /> Mural da Igreja
                                </h5>
                                {avisos.map((msg) => (
                                    <Link key={msg.id} href="/membros/mural" className="block p-4 rounded-2xl bg-bg border border-soft hover:border-figueira/30 hover:bg-soft/20 transition-colors group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {msg.autor?.avatar_file ? (
                                                    <Image src={msg.autor.avatar_file} alt="Avatar" width={32} height={32} className="rounded-xl object-cover border border-soft shadow-sm" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-xl bg-fg flex items-center justify-center text-bg shrink-0">
                                                        <UserCircle size={16} />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-wider text-fg leading-none">
                                                        {msg.autor?.first_name} {msg.autor?.last_name}
                                                    </p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mt-1">
                                                        {formatDate(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tag do Departamento/Grupo */}
                                            <span className="shrink-0 bg-figueira/10 text-figueira px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest flex items-center gap-1 border border-figueira/20 max-w-[100px] truncate">
                                                <Hash size={10} className="shrink-0" />
                                                <span className="truncate">{msg.departamento?.nome || msg.grupo?.nome || 'Geral'}</span>
                                            </span>
                                        </div>
                                        {/* 🔄 CORREÇÃO: Usar msg.mensagem em vez de msg.texto */}
                                        <p className="text-[11px] text-fg font-medium line-clamp-3 leading-relaxed opacity-90">
                                            {msg.mensagem || msg.texto}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* BOTÃO PARA VER TUDO DO MURAL */}
                        {avisos.length > 0 && (
                            <div className="pt-2 px-2 pb-2">
                                <Link href="/membros/mural" className="flex items-center justify-center gap-2 w-full py-3 bg-soft/50 text-muted rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira hover:text-white transition-all">
                                    Ver Histórico do Mural <ArrowRight size={14} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* BOTÃO FLUTUANTE (FAB) */}
            <button
                onClick={handleToggle}
                className="relative bg-figueira text-white h-16 w-16 rounded-[1.8rem] shadow-xl shadow-figueira/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 z-50 border-2 border-white/10"
            >
                {/* PONTO DE ALERTA ANIMADO */}
                {!open && hasUnread && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-figueira shadow-sm"></span>
                    </span>
                )}

                <div className="flex flex-col items-center justify-center gap-0.5">
                    {open ? (
                        <X size={28} strokeWidth={2.5} />
                    ) : (
                        <>
                            <MessageSquare size={22} strokeWidth={2.5} className="-mt-1" />
                            <Menu size={12} strokeWidth={4} className="opacity-80" />
                        </>
                    )}
                </div>
            </button>

        </div>
    )
}
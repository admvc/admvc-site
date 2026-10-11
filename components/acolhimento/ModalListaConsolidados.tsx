'use client'

import { useState } from 'react'
import { Users, X, Phone, CalendarCheck, History, MessageCircle, Clock } from 'lucide-react'

export default function ModalListaConsolidados({ consolidados }: { consolidados: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    // Controla qual cartão está expandido para mostrar o histórico
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const getIcon = (tipo: string) => {
        if (tipo === 'WHATSAPP') return <MessageCircle size={14} className="text-green-500" />;
        if (tipo === 'LIGACAO') return <Phone size={14} className="text-blue-500" />;
        return <Users size={14} className="text-figueira" />;
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full bg-fg text-bg py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira hover:text-white transition-all shadow-sm active:scale-95"
            >
                Ver Lista Completa
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full max-w-2xl border border-soft p-6 md:p-8 rounded-[3rem] shadow-2xl relative animate-in zoom-in-95 duration-200 text-left max-h-[90vh] flex flex-col">

                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors z-10">
                            <X size={16} />
                        </button>

                        <div className="mb-6 pr-8 shrink-0 border-b border-soft pb-6">
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-2">
                                <Users size={20} className="text-figueira" /> Membros Consolidados
                            </h2>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                Total: <span className="text-fg">{consolidados.length} pessoas que decidiram ficar.</span>
                            </p>
                        </div>

                        {/* Corpo com Scroll */}
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            {consolidados.length > 0 ? (
                                consolidados.map((v) => {
                                    const isExpanded = expandedId === v.id;
                                    
                                    return (
                                        <div key={v.id} className={`p-5 bg-bg border rounded-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'border-figueira/50 shadow-md' : 'border-soft hover:border-figueira/30'}`}>
                                            
                                            {/* CABEÇALHO DO CARTÃO */}
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-sm font-black uppercase text-fg">{v.nome}</h4>
                                                        <span className="text-[8px] font-black bg-green-500/10 text-green-600 px-2 py-0.5 rounded-md uppercase tracking-widest flex items-center gap-1">
                                                            <CalendarCheck size={10} /> Consolidado
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest flex items-center gap-1">
                                                        <Phone size={10} /> {v.telefone}
                                                    </p>
                                                </div>

                                                <div className="shrink-0">
                                                    <button
                                                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                                                        className={`flex items-center gap-2 transition-all group text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border ${isExpanded ? 'bg-figueira text-white border-figueira shadow-sm' : 'bg-bg2 text-figueira border-soft hover:border-figueira/30 hover:bg-figueira/5'}`}
                                                    >
                                                        <History size={12} className={isExpanded ? "" : "group-hover:-rotate-45 transition-transform"} />
                                                        {isExpanded ? "Fechar Histórico" : `Histórico (${v.acompanhamentos?.length || 0})`}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* CONTEÚDO EXPANDIDO (LINHA DO TEMPO) */}
                                            {isExpanded && (
                                                <div className="pt-6 border-t border-soft/50 mt-5 animate-in slide-in-from-top-2 duration-300">
                                                    {v.acompanhamentos && v.acompanhamentos.length > 0 ? (
                                                        <div className="relative border-l-2 border-soft/50 ml-4 space-y-6 py-2">
                                                            {v.acompanhamentos.map((acomp: any) => (
                                                                <div key={acomp.id} className="relative pl-8">
                                                                    {/* Ponto na Linha do Tempo */}
                                                                    <div className="absolute -left-[19px] top-0 w-9 h-9 bg-bg2 border-2 border-soft rounded-2xl flex items-center justify-center shadow-sm z-10 transition-colors">
                                                                        {getIcon(acomp.tipo_contacto)}
                                                                    </div>

                                                                    {/* Cartão de Registo */}
                                                                    <div className="bg-bg2 border border-soft p-4 md:p-5 rounded-[1.5rem] shadow-sm">
                                                                        <div className="flex justify-between items-start mb-3 gap-2">
                                                                            <div>
                                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-figueira bg-figueira/5 px-2 py-0.5 rounded-md border border-figueira/10">
                                                                                    {acomp.tipo_contacto}
                                                                                </span>
                                                                                <p className="text-[10px] font-black text-fg uppercase italic tracking-tight mt-1.5">
                                                                                    {acomp.membro?.first_name} {acomp.membro?.last_name}
                                                                                </p>
                                                                            </div>
                                                                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5 bg-soft/30 px-2 py-1 rounded-full border border-soft/50 shrink-0">
                                                                                <Clock size={10} />
                                                                                {new Date(acomp.data_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="pt-2 border-t border-soft/50">
                                                                            <p className="text-[10px] md:text-[11px] text-fg font-medium italic leading-relaxed">
                                                                                "{acomp.observacoes}"
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-10 opacity-40 flex flex-col items-center gap-2 bg-bg2 rounded-[1.5rem] border border-dashed border-soft">
                                                            <History size={24} />
                                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] italic">Nenhum registo documentado.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center py-10 opacity-50">
                                    <p className="text-[10px] font-bold uppercase tracking-widest italic">Ninguém foi consolidado ainda.</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    )
}
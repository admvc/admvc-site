'use client'

import { useState } from 'react'
import { History, X, MessageCircle, Phone, Users, Clock, ArrowRight, StickyNote, UserPlus } from 'lucide-react'

interface ModalHistoricoProps {
    visitante: any;
    acionador?: React.ReactNode;
    viewerRole?: string;
}

export default function ModalHistorico({ visitante, acionador, viewerRole }: ModalHistoricoProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isLider = viewerRole === 'LIDER' || viewerRole === 'ADMIN'

    const getIcon = (tipo: string, tipoEvento?: string) => {
        if (tipoEvento === 'MUDANCA_STATUS') return <ArrowRight size={14} className="text-amber-500" />;
        if (tipoEvento === 'NOTA_LIDER') return <StickyNote size={14} className="text-purple-500" />;
        if (tipoEvento === 'ATRIBUICAO') return <UserPlus size={14} className="text-blue-500" />;
        if (tipo === 'WHATSAPP') return <MessageCircle size={14} className="text-green-500" />;
        if (tipo === 'LIGACAO') return <Phone size={14} className="text-blue-500" />;
        return <Users size={14} className="text-figueira" />;
    };

    const getEventLabel = (acomp: any) => {
        if (acomp.tipo_evento === 'MUDANCA_STATUS') {
            const labels: Record<string, string> = {
                NOVO: 'Novo', EM_CONTACTO: 'Em Contacto', REUNIAO_PASTOR: 'Reuniao Pastor',
                CONSOLIDADO: 'Consolidado', NAO_RETORNOU: 'Nao Retornou', OUTRA_IGREJA: 'Outra Igreja', DESISTIU: 'Desistiu'
            }
            return `${labels[acomp.status_anterior] || acomp.status_anterior} → ${labels[acomp.status_novo] || acomp.status_novo}`
        }
        if (acomp.tipo_evento === 'NOTA_LIDER') return 'Nota do Lider'
        if (acomp.tipo_evento === 'ATRIBUICAO') return 'Atribuicao'
        return acomp.tipo_contacto
    }

    const acompanhamentos = (visitante.acompanhamentos || []).filter((a: any) => {
        if (a.tipo_evento === 'NOTA_LIDER' && !isLider) return false
        return true
    })

    return (
        <>
            {acionador ? (
                <div onClick={() => setIsOpen(true)} className="cursor-pointer inline-block">
                    {acionador}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="text-figueira hover:underline flex items-center gap-1 transition-all group text-[9px] font-black uppercase tracking-widest bg-figueira/10 px-3 py-1.5 rounded-lg hover:bg-figueira/20"
                >
                    <History size={12} className="group-hover:-rotate-45 transition-transform" />
                    Historico ({acompanhamentos.length})
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full sm:max-w-lg border border-soft p-6 md:p-8 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left max-h-[90vh] sm:max-h-[85vh] flex flex-col">

                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-bg border border-soft text-muted rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all z-20 shadow-sm">
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className="mb-6 pr-12 shrink-0 border-b border-soft pb-4">
                            <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
                                <History size={12} /> Linha do Tempo
                            </span>
                            <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-fg leading-none">
                                Historico de <span className="opacity-50">{visitante.nome}</span>
                            </h2>
                            {visitante.proximo_contacto && (
                                <p className="text-[9px] font-bold text-blue-600 mt-2 flex items-center gap-1">
                                    <Clock size={10} /> Proximo contacto: {new Date(visitante.proximo_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-4">
                            {acompanhamentos.length > 0 ? (
                                <div className="relative border-l-2 border-soft/50 ml-4 space-y-6 py-2">
                                    {acompanhamentos.map((acomp: any) => {
                                        const isSystemEvent = acomp.tipo_evento && acomp.tipo_evento !== 'CONTACTO'
                                        return (
                                            <div key={acomp.id} className="relative pl-6 md:pl-8">
                                                <div className={`absolute -left-[19px] md:-left-[23px] top-0 w-8 h-8 md:w-10 md:h-10 border-2 rounded-2xl flex items-center justify-center shadow-sm z-10 transition-colors ${
                                                    isSystemEvent ? 'bg-bg border-dashed border-muted/30' : 'bg-bg border-soft'
                                                }`}>
                                                    {getIcon(acomp.tipo_contacto, acomp.tipo_evento)}
                                                </div>

                                                <div className={`border p-4 md:p-5 rounded-[1.8rem] shadow-sm transition-all ${
                                                    isSystemEvent
                                                        ? 'bg-bg/50 border-dashed border-muted/20'
                                                        : 'bg-bg border-soft hover:border-figueira/20'
                                                }`}>
                                                    <div className="flex justify-between items-start mb-3 gap-2">
                                                        <div>
                                                            <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md border ${
                                                                isSystemEvent
                                                                    ? 'text-muted bg-soft/50 border-soft'
                                                                    : 'text-figueira bg-figueira/5 border-figueira/10'
                                                            }`}>
                                                                {getEventLabel(acomp)}
                                                            </span>
                                                            <p className="text-[10px] font-black text-fg uppercase italic tracking-tight mt-1.5 truncate max-w-[120px] md:max-w-none">
                                                                {acomp.membro?.first_name} {acomp.membro?.last_name}
                                                            </p>
                                                        </div>
                                                        <span className="text-[8px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5 bg-soft/30 px-2 py-1 rounded-full border border-soft/50 shrink-0">
                                                            <Clock size={10} />
                                                            {new Date(acomp.data_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    {acomp.observacoes && (
                                                        <div className="pt-2 border-t border-soft/50">
                                                            <p className="text-[10px] md:text-[11px] text-fg font-medium italic leading-relaxed">
                                                                &ldquo;{acomp.observacoes}&rdquo;
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-10 opacity-40 flex flex-col items-center gap-3 bg-bg rounded-3xl border border-dashed border-soft">
                                    <History size={32} />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] italic">Nenhum contacto registado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

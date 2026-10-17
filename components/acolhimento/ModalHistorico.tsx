'use client'

import { useState } from 'react'
import JanelaPorCima from '@/components/ui/JanelaPorCima'
import { History, X, MessageCircle, Phone, Users, Clock, ArrowRight, StickyNote, UserPlus, HandHeart, DoorOpen } from 'lucide-react'
import GestaoVisitante, { type MembroEquipa, type CongregacaoOpcao } from './GestaoVisitante'

interface ModalHistoricoProps {
    visitante: any;
    acionador?: React.ReactNode;
    viewerRole?: string;
    /** Com a equipa, a ficha mostra também responsável, próximo contacto e notas */
    equipa?: MembroEquipa[];
    congregacoes?: CongregacaoOpcao[];
}

export default function ModalHistorico({ visitante, acionador, viewerRole, equipa, congregacoes = [] }: ModalHistoricoProps) {
    const [isOpen, setIsOpen] = useState(false);

    const isLider = viewerRole === 'LIDER' || viewerRole === 'ADMIN'

    const getIcon = (tipo: string, tipoEvento?: string) => {
        if (tipoEvento === 'MUDANCA_STATUS') return <ArrowRight size={14} className="text-amber-500" />;
        if (tipoEvento === 'NOTA_LIDER') return <StickyNote size={14} className="text-purple-500" />;
        if (tipoEvento === 'ATRIBUICAO') return <UserPlus size={14} className="text-blue-500" />;
        if (tipoEvento === 'NOVA_VISITA') return <DoorOpen size={14} className="text-emerald-500" />;
        if (tipo === 'WHATSAPP') return <MessageCircle size={14} className="text-green-500" />;
        if (tipo === 'LIGACAO') return <Phone size={14} className="text-blue-500" />;
        return <Users size={14} className="text-figueira" />;
    };

    const getEventLabel = (acomp: any) => {
        if (acomp.tipo_evento === 'MUDANCA_STATUS') {
            const labels: Record<string, string> = {
                NOVO: 'Novo', EM_CONTACTO: 'Em contacto', REUNIAO_PASTOR: 'Reunião com pastor',
                CONSOLIDADO: 'Consolidado', NAO_RETORNOU: 'Não voltou', OUTRA_IGREJA: 'Outra igreja', DESISTIU: 'Desistiu'
            }
            return `${labels[acomp.status_anterior] || acomp.status_anterior} → ${labels[acomp.status_novo] || acomp.status_novo}`
        }
        if (acomp.tipo_evento === 'NOTA_LIDER') return 'Nota do líder'
        if (acomp.tipo_evento === 'ATRIBUICAO') return 'Responsável'
        if (acomp.tipo_evento === 'NOVA_VISITA') return 'Visita'
        const canais: Record<string, string> = { WHATSAPP: 'WhatsApp', LIGACAO: 'Chamada', PRESENCIAL: 'Presencial' }
        return canais[acomp.tipo_contacto] || acomp.tipo_contacto
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
                    onClick={() => setIsOpen(true)} aria-label={`Ficha de ${visitante.nome}`}
                    className="text-figueira flex items-center justify-center gap-1 transition-all group text-[13px] font-bold uppercase tracking-wide bg-figueira/10 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg hover:bg-figueira/20"
                >
                    <History size={16} className="group-hover:-rotate-45 transition-transform" />
                    <span className="hidden sm:inline">Ficha ({acompanhamentos.length})</span>
                </button>
            )}

            {isOpen && (
                <JanelaPorCima onFechar={() => setIsOpen(false)}>
                    <div className="bg-bg2 w-full sm:max-w-lg border border-soft p-6 md:p-8 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left max-h-[90vh] sm:max-h-[85vh] flex flex-col">

                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-bg border border-soft text-muted rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all z-20 shadow-sm">
                            <X size={18} strokeWidth={2.5} />
                        </button>

                        <div className="mb-6 pr-12 shrink-0 border-b border-soft pb-4">
                            <span className="text-figueira font-bold text-[13px] uppercase tracking-wide flex items-center gap-2 mb-1">
                                <History size={12} /> Ficha do visitante
                            </span>
                            <h2 className="text-xl md:text-2xl font-bold text-fg leading-none">
                                {visitante.nome}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[13px] font-bold text-muted">
                                {visitante.telefone && (
                                    <a href={`tel:${visitante.telefone}`} className="flex items-center gap-1 hover:text-fg">
                                        <Phone size={10} /> {visitante.telefone}
                                    </a>
                                )}
                                {visitante.quantidade_visitas != null && (
                                    <span>
                                        {visitante.quantidade_visitas} visita{visitante.quantidade_visitas !== 1 ? 's' : ''}
                                        {visitante.data_primeira_visita && ` · 1.ª em ${new Date(visitante.data_primeira_visita).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                                    </span>
                                )}
                            </div>
                            {!equipa && visitante.proximo_contacto && (
                                <p className="text-[13px] font-bold text-blue-600 mt-2 flex items-center gap-1">
                                    <Clock size={10} /> Próximo contacto: {new Date(visitante.proximo_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar pb-4">
                            {visitante.pedido_oracao && (
                                <div className="bg-figueira/5 border border-figueira/15 rounded-2xl p-4">
                                    <p className="text-[13px] font-bold uppercase text-figueira tracking-wide flex items-center gap-1.5 mb-1">
                                        <HandHeart size={12} /> Pedido de oração
                                    </p>
                                    <p className="text-sm text-fg whitespace-pre-line">{visitante.pedido_oracao}</p>
                                </div>
                            )}

                            {equipa && <GestaoVisitante visitante={visitante} equipa={equipa} congregacoes={congregacoes} isLider={isLider} />}

                            <p className="text-[13px] font-bold uppercase text-muted tracking-wide">Histórico</p>
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
                                                            <p className="text-[14px] font-bold text-fg uppercase tracking-wide mt-1.5 truncate max-w-[120px] md:max-w-none">
                                                                {acomp.membro ? `${acomp.membro.first_name} ${acomp.membro.last_name}` : 'Formulário (site ou QR)'}
                                                            </p>
                                                        </div>
                                                        <span className="text-[13px] font-bold uppercase tracking-wide text-muted flex items-center gap-1.5 bg-soft/30 px-2 py-1 rounded-full border border-soft/50 shrink-0">
                                                            <Clock size={10} />
                                                            {new Date(acomp.data_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    </div>
                                                    {acomp.observacoes && (
                                                        <div className="pt-2 border-t border-soft/50">
                                                            <p className="text-[14px] text-fg font-medium leading-relaxed">
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
                                    <p className="text-[13px] font-bold uppercase tracking-wide">Nenhum contacto registado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </JanelaPorCima>
            )}
        </>
    )
}

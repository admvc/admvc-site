'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    ShieldCheck, Calendar, Users, ChevronDown, ChevronUp,
    LayoutGrid, Edit3, ArrowRight, X, Phone, MessageCircle, Loader2
} from 'lucide-react'
import { buscarEquipaPorDepartamentoId } from '@/actions/admin-actions'
import { useToast } from '@/components/ui/ConfirmDialog'
import ModalGestaoGrupo from '@/components/membros/ModalGestaoGrupo'

export default function CardDepartamentoMembro({ depto, membroId, role, podeGerirEscalas }: any) {
    const toast = useToast()
    const [expandido, setExpandido] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [equipa, setEquipa] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const isGrupo = depto.tipo === 'GRUPO';

    // 1. Tratamento seguro das funções para evitar erro de toLowerCase()
    let funcoesDoMembro = depto.funcoes ? [...depto.funcoes] : [];

    const ehLiderPeloID = depto.lideres?.some((lider: any) => lider.id === membroId) || depto.lider_id === membroId;
    const ehAdmin = role === 'ADMIN';

    // 2. Verificação protegida da palavra "Líder"
    let temPalavraLider = funcoesDoMembro.some((f: any) => {
        if (!f || typeof f !== 'string') return false;
        return f.toLowerCase().includes('lider') || f.toLowerCase().includes('líder');
    });

    if (ehLiderPeloID && !temPalavraLider) {
        funcoesDoMembro.unshift('Líder');
        temPalavraLider = true;
    }

    if (funcoesDoMembro.length === 0) funcoesDoMembro.push(isGrupo ? 'Participante' : 'Voluntário');

    const funcoesTexto = funcoesDoMembro.join(' • ');

    // 3. Lógica de Permissões Unificada
    const podeGerenciar = ehAdmin || temPalavraLider || ehLiderPeloID;

    // Aqui garantimos que o botão de Escalas aparece se for Líder OU se o Admin delegou acesso
    const temAcessoEscalas = podeGerenciar || podeGerirEscalas;

    const tema = isGrupo ? {
        card: 'bg-figueira/5 border-figueira/20 hover:border-figueira/40',
        cardLider: 'bg-figueira/10 border-figueira/30 ring-4 ring-figueira/5 shadow-lg',
        iconBg: 'bg-figueira text-white shadow-md shadow-figueira/20',
        badge: 'bg-figueira/10 text-figueira border-figueira/20',
        btnPrimary: 'bg-fg text-bg hover:bg-fg/90',
        btnSecondary: 'bg-bg text-fg border border-figueira/30 hover:bg-figueira/10',
        watermark: 'text-figueira opacity-[0.03] group-hover:opacity-[0.08]'
    } : {
        card: 'bg-bg2 border-soft hover:border-figueira/30',
        cardLider: 'bg-bg border-soft ring-4 ring-figueira/5 shadow-lg',
        iconBg: 'bg-soft text-fg',
        badge: 'bg-bg border-soft text-muted',
        btnPrimary: 'bg-figueira text-white hover:brightness-110 shadow-md shadow-figueira/20',
        btnSecondary: 'bg-bg2 text-muted border border-soft hover:text-fg hover:border-fg',
        watermark: 'text-muted opacity-[0.02] group-hover:opacity-[0.05]'
    };

    async function handleAbrirEquipa(e: React.MouseEvent) {
        e.stopPropagation();
        setIsModalOpen(true);
        setIsLoading(true);
        const res = await buscarEquipaPorDepartamentoId(depto.id);
        if (res.ok) setEquipa(res.data);
        else toast(res.error, 'erro');
        setIsLoading(false);
    }

    return (
        <>
            <div className={`
                p-6 rounded-[2.5rem] transition-all duration-300 group relative overflow-hidden border-2 flex flex-col justify-between cursor-pointer
                ${podeGerenciar ? tema.cardLider : tema.card}
            `} onClick={() => setExpandido(!expandido)}>

                <div className={`absolute -right-6 -bottom-6 transition-opacity duration-500 pointer-events-none ${tema.watermark}`}>
                    {isGrupo ? <Users size={140} /> : <LayoutGrid size={140} />}
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="space-y-5">
                        <div className="flex justify-between items-center h-6">
                            <div className="flex items-center gap-2">
                                {podeGerenciar ? (
                                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[8px] font-black uppercase tracking-widest ${tema.badge}`}>
                                        <ShieldCheck size={12} /> Liderança
                                    </div>
                                ) : podeGerirEscalas ? (
                                    <div className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                        <Calendar size={10} /> Delegado
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 rounded-full border border-soft bg-bg/50 text-muted text-[8px] font-black uppercase tracking-widest">
                                        {isGrupo ? 'Grupo' : 'Departamento'}
                                    </div>
                                )}
                            </div>

                            <button className={`p-1.5 rounded-full transition-all bg-bg/50 border border-soft hover:bg-soft text-muted shadow-sm`}>
                                {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 ${expandido ? 'scale-110' : ''} ${tema.iconBg}`}>
                                {isGrupo ? <Users size={20} /> : <LayoutGrid size={20} />}
                            </div>
                            <h4 className="text-xl font-black uppercase italic leading-tight tracking-tighter text-fg">
                                {depto.nome}
                            </h4>
                        </div>
                    </div>

                    {expandido && (
                        <div className="animate-in slide-in-from-top-4 fade-in duration-300 space-y-4 pt-3 border-t border-soft mt-4" onClick={(e) => e.stopPropagation()}>
                            <div className="p-3.5 rounded-2xl bg-bg/50 border border-soft">
                                <p className="text-[10px] font-bold leading-tight uppercase tracking-tight text-fg">
                                    <span className="text-muted block text-[8px] mb-1 font-black tracking-widest">A tua função:</span>
                                    {funcoesTexto}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-2 pt-1">
                                {isGrupo ? (
                                    podeGerenciar ? (
                                        <Link href={`/grupos/gestao/${depto.id}`} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${tema.btnPrimary}`}>
                                            <Edit3 size={14} /> Gerir Grupo
                                        </Link>
                                    ) : (
                                        <Link href={`/grupos/gestao/${depto.id}`} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 group/btn ${tema.btnSecondary}`}>
                                            Acessar Grupo <ArrowRight size={14} className="opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                                        </Link>
                                    )
                                ) : (
                                    <div className={`grid ${temAcessoEscalas ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                                        {/* Botão Escalas: Visível para Líderes OU Delegados */}
                                        {temAcessoEscalas && (
                                            <Link href={`/escalas/gestao/${depto.id}`} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${tema.btnSecondary} border-figueira/30 text-figueira`}>
                                                <Calendar size={14} /> Escalas
                                            </Link>
                                        )}

                                        <button onClick={handleAbrirEquipa} className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${temAcessoEscalas ? tema.btnPrimary : tema.btnSecondary}`}>
                                            <Users size={14} /> Equipa
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL DA EQUIPA */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-bg w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 max-h-[85vh]" onClick={(e) => e.stopPropagation()}>

                        <div className="p-6 md:p-8 border-b border-soft flex justify-between items-center bg-bg2 relative shrink-0">
                            <div>
                                <span className="font-black text-figueira text-[9px] uppercase tracking-[0.3em] flex items-center gap-2 mb-1">
                                    <Users size={12} /> Equipa de Voluntários
                                </span>
                                <h3 className="text-2xl font-black italic uppercase text-fg leading-none tracking-tighter">
                                    {depto.nome}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-10 h-10 flex items-center justify-center bg-bg border border-soft text-muted rounded-2xl hover:bg-soft hover:text-fg transition-all shadow-sm active:scale-90"
                            >
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-2 md:p-4 overflow-y-auto custom-scrollbar flex-1 bg-bg2/30">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted gap-3">
                                    <Loader2 size={24} className="animate-spin text-figueira" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">A carregar voluntários...</span>
                                </div>
                            ) : equipa.length > 0 ? (
                                <div className="space-y-2">
                                    {equipa.map((integrante: any) => (
                                        <div key={integrante.membro.id} className="flex items-start gap-4 p-3 bg-bg hover:bg-soft/10 border border-soft rounded-2xl transition-colors group">

                                            {/* AVATAR */}
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-bg2 border border-soft flex items-center justify-center text-muted shrink-0 overflow-hidden shadow-sm">
                                                {integrante.membro.avatar_file ? (
                                                    <img src={integrante.membro.avatar_file} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black">{integrante.membro.first_name?.charAt(0)}</span>
                                                )}
                                            </div>

                                            {/* INFO DO MEMBRO */}
                                            <div className="flex-1 min-w-0 pt-0.5">
                                                <h4 className="text-xs sm:text-sm font-black uppercase text-fg leading-tight truncate group-hover:text-figueira transition-colors">
                                                    {integrante.membro.first_name} {integrante.membro.last_name}
                                                </h4>

                                                {/* TELEFONE */}
                                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                                    {integrante.membro.phone_1 || 'Sem contacto'}
                                                </p>

                                                {/* 👇 NOVAS ETIQUETAS DE CARGOS (BADGES) 👇 */}
                                                {integrante.funcoes && integrante.funcoes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {integrante.funcoes.map((f: any) => (
                                                            <span
                                                                key={f.funcao.id}
                                                                className="text-[8px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-widest"
                                                            >
                                                                {f.funcao.nome}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* CONTACTOS */}
                                            {integrante.membro.phone_1 && (
                                                <div className="flex gap-1 shrink-0 self-center">
                                                    <a href={`https://wa.me/${integrante.membro.phone_1.replace(/\D/g, '')}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="w-8 h-8 rounded-full bg-green-50 text-green-600 hover:bg-green-500 hover:text-white flex items-center justify-center transition-all"
                                                        title="WhatsApp">
                                                        <MessageCircle size={13} />
                                                    </a>
                                                    <a href={`tel:${integrante.membro.phone_1}`}
                                                        className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"
                                                        title="Ligar">
                                                        <Phone size={13} />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 text-muted">
                                    <div className="w-12 h-12 bg-soft rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Users size={20} className="text-muted/50" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma equipa atribuída.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
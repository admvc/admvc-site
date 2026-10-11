'use client'

import { useState } from 'react'
import { X, AlertTriangle, CheckCircle2, XCircle, Clock, FileSignature, RefreshCw, Loader2 } from 'lucide-react'
import { renovarDocumentoAction } from '@/actions/membro-actions'

export default function BotaoModalDocumentos({ membrosPendentes }: { membrosPendentes: any[] }) {
    const [aberto, setAberto] = useState(false);
    const [renovando, setRenovando] = useState<string | null>(null);

    async function handleRenovar(membroId: number, tipo: 'GDPR' | 'PERMANECER') {
        const key = `${membroId}-${tipo}`
        setRenovando(key)
        await renovarDocumentoAction(membroId, tipo)
        setRenovando(null)
    }

    // Função inteligente para avaliar o estado de cada documento
    const avaliarStatus = (aceite: boolean, validade: Date | null) => {
        if (!aceite) return { cor: 'text-red-500', bg: 'bg-red-500/10', icon: <XCircle size={14} />, texto: 'Pendente' };

        const hoje = new Date();
        const trintaDias = new Date();
        trintaDias.setDate(hoje.getDate() + 30);

        if (validade && new Date(validade) < hoje) {
            return { cor: 'text-orange-500', bg: 'bg-orange-500/10 border border-orange-500/20', icon: <Clock size={14} />, texto: 'Expirado' };
        }
        if (validade && new Date(validade) <= trintaDias) {
            return { cor: 'text-amber-500', bg: 'bg-amber-500/10 border border-amber-500/20', icon: <Clock size={14} />, texto: 'Vence em breve' };
        }

        return { cor: 'text-green-500', bg: 'bg-green-500/10', icon: <CheckCircle2 size={14} />, texto: 'Regular' };
    };

    return (
        <>
            {/* O BOTÃO QUE FICA NA DASHBOARD */}
            <button
                onClick={() => setAberto(true)}
                className="w-full md:w-auto px-6 py-3 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all active:scale-95 text-center shrink-0 shadow-lg shadow-orange-500/20"
            >
                Ver Relatório
            </button>

            {/* O MODAL */}
            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">

                        {/* CABEÇALHO DO MODAL */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center">
                                    <FileSignature size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter text-fg">Status de Assinaturas</h3>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mt-1">
                                        {membrosPendentes.length} membros requerem atenção
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setAberto(false)} className="p-4 bg-soft text-muted hover:bg-red-500 hover:text-white rounded-2xl transition-all">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* LISTA DE MEMBROS SCROLLÁVEL */}
                        <div className="p-6 md:p-8 overflow-y-auto space-y-3 bg-bg">
                            {membrosPendentes.map((membro: any) => {
                                const statusGDPR = avaliarStatus(membro.gdpr_aceite, membro.gdpr_validade);
                                const statusPermanecer = avaliarStatus(membro.permanecer_aceite, membro.permanecer_validade);

                                return (
                                    <div key={membro.id} className="bg-bg2 border border-soft p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-500/30 transition-colors">

                                        {/* INFO DO MEMBRO */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-soft overflow-hidden border border-soft shrink-0">
                                                {membro.avatar_file ? (
                                                    <img src={membro.avatar_file} alt={membro.first_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black uppercase text-muted">
                                                        {membro.first_name[0]}{membro.last_name[0]}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-fg uppercase">{membro.first_name} {membro.last_name}</h4>
                                                {membro.phone_1 && (
                                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">{membro.phone_1}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* BADGES + RENOVAÇÃO */}
                                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${statusGDPR.bg} ${statusGDPR.cor}`}>
                                                {statusGDPR.icon}
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">GDPR</span>
                                                    <span className="text-[9px] font-bold leading-none mt-0.5">{statusGDPR.texto}</span>
                                                </div>
                                            </div>
                                            {statusGDPR.texto !== 'Regular' && (
                                                <button
                                                    onClick={() => handleRenovar(membro.id, 'GDPR')}
                                                    disabled={renovando === `${membro.id}-GDPR`}
                                                    className="p-1.5 rounded-lg bg-figueira/10 text-figueira hover:bg-figueira hover:text-white transition-all disabled:opacity-50"
                                                    title="Renovar GDPR"
                                                >
                                                    {renovando === `${membro.id}-GDPR` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                </button>
                                            )}

                                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${statusPermanecer.bg} ${statusPermanecer.cor}`}>
                                                {statusPermanecer.icon}
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black uppercase tracking-widest leading-none">Permanecer</span>
                                                    <span className="text-[9px] font-bold leading-none mt-0.5">{statusPermanecer.texto}</span>
                                                </div>
                                            </div>
                                            {statusPermanecer.texto !== 'Regular' && (
                                                <button
                                                    onClick={() => handleRenovar(membro.id, 'PERMANECER')}
                                                    disabled={renovando === `${membro.id}-PERMANECER`}
                                                    className="p-1.5 rounded-lg bg-figueira/10 text-figueira hover:bg-figueira hover:text-white transition-all disabled:opacity-50"
                                                    title="Renovar Permanecer"
                                                >
                                                    {renovando === `${membro.id}-PERMANECER` ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
'use client'

import { useState, useEffect } from 'react'
import { CalendarSearch, X, Filter, Clock, ShieldCheck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { buscarRelatorioEscalasAction } from '@/actions/membro-actions' // Ajuste o caminho se necessário

export default function ModalRelatorioEscalas({ membroId, isMenuItem }: { membroId: number; isMenuItem?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [escalas, setEscalas] = useState<any[]>([]);

    // Bloquear scroll do body quando modal está aberto
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    // Filtros
    const hoje = new Date();
    const [mes, setMes] = useState(hoje.getMonth() + 1); // 1 a 12
    const [ano, setAno] = useState(hoje.getFullYear());

    // Busca os dados sempre que o Modal abre ou os filtros mudam
    useEffect(() => {
        if (!isOpen) return;

        async function fetchRelatorio() {
            setLoading(true);
            const res = await buscarRelatorioEscalasAction(membroId, mes, ano);
            if (res.sucesso) {
                setEscalas(res.escalas);
            }
            setLoading(false);
        }

        fetchRelatorio();
    }, [isOpen, mes, ano, membroId]);

    const mesesNome = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    // Gerar últimos 3 anos e o próximo
    const anosOpcoes = Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - 3 + i).reverse();

    return (
        <>
            {isMenuItem ? (
                <button onClick={() => setIsOpen(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 w-full text-left">
                    <CalendarSearch size={13} className="text-blue-500" /> Relatorio Escalas
                </button>
            ) : (
                <button onClick={() => setIsOpen(true)}
                    className="bg-bg text-muted border border-soft hover:border-figueira hover:text-figueira transition-all text-[9px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 shrink-0">
                    <CalendarSearch size={14} /> Ver Relatorio
                </button>
            )}

            {/* O Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-bg w-full max-w-lg rounded-[2.5rem] border border-soft shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex items-center justify-between p-5 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0">
                                    <CalendarSearch size={18} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                        Relatorio de Escalas
                                    </h2>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                        Historico e programacao
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-bg border border-soft text-muted hover:bg-soft rounded-xl transition-all shrink-0">
                                <X size={15} />
                            </button>
                        </div>

                        {/* FILTROS */}
                        <div className="flex gap-3 p-4 border-b border-soft shrink-0">
                            <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black uppercase text-muted tracking-widest">Mes</label>
                                <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-xs font-bold text-fg focus:border-figueira outline-none">
                                    {mesesNome.map((m, index) => (
                                        <option key={index + 1} value={index + 1}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[8px] font-black uppercase text-muted tracking-widest">Ano</label>
                                <select value={ano} onChange={(e) => setAno(Number(e.target.value))}
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-xs font-bold text-fg focus:border-figueira outline-none">
                                    {anosOpcoes.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* LISTA */}
                        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
                            {loading ? (
                                <div className="flex items-center justify-center py-12 gap-2">
                                    <Loader2 size={18} className="animate-spin text-figueira" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar...</span>
                                </div>
                            ) : escalas.length > 0 ? (
                                escalas.map((esc) => {
                                    const dataEvento = new Date(esc.evento.data);
                                    const jaPassou = dataEvento < new Date();
                                    return (
                                        <div key={esc.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${jaPassou ? 'bg-bg2/50 border-soft/50 opacity-60' : 'bg-bg2 border-soft hover:border-figueira/30'}`}>
                                            {/* Data */}
                                            <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${jaPassou ? 'bg-soft text-muted' : 'bg-fg text-bg'}`}>
                                                <span className="text-[7px] font-black uppercase opacity-70">{dataEvento.toLocaleDateString('pt-PT', { month: 'short' })}</span>
                                                <span className="text-base font-black italic leading-none">{dataEvento.toLocaleDateString('pt-PT', { day: '2-digit' })}</span>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black uppercase text-fg truncate leading-tight">{esc.evento.nome}</p>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-[8px] font-bold bg-figueira/10 text-figueira px-1.5 py-0.5 rounded border border-figueira/20 uppercase tracking-widest">
                                                        {esc.departamento.nome}
                                                    </span>
                                                    <span className="text-[8px] font-bold bg-bg border border-soft px-1.5 py-0.5 rounded text-muted uppercase tracking-widest flex items-center gap-1">
                                                        <ShieldCheck size={8} /> {esc.funcao}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="shrink-0">
                                                {esc.confirmado ? (
                                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                                ) : jaPassou ? (
                                                    <AlertCircle size={16} className="text-red-400" />
                                                ) : (
                                                    <Clock size={16} className="text-orange-500" />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-12">
                                    <CalendarSearch size={28} className="mx-auto text-muted/30 mb-3" />
                                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhuma escala neste periodo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
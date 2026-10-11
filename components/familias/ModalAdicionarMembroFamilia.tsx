'use client'

import { useState, useEffect } from 'react'
import { Search, UserPlus, Loader2, X, CheckCircle2 } from 'lucide-react'
import { buscarMembrosSemFamiliaAction, vincularMembroFamiliaAction } from '@/actions/familia-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalAdicionarMembroFamilia({ familiaId, familiaNome }: { familiaId: string, familiaNome: string }) {
    const toast = useToast()
    const [aberto, setAberto] = useState(false);

    // Estados da Busca
    const [busca, setBusca] = useState('');
    const [resultados, setResultados] = useState<any[]>([]);
    const [loadingBusca, setLoadingBusca] = useState(false);

    // Estados da Seleção e Envio
    const [membroSelecionado, setMembroSelecionado] = useState<any | null>(null);
    const [parentesco, setParentesco] = useState('MEMBRO');
    const [loadingSalvar, setLoadingSalvar] = useState(false);

    // Motor de Busca em Tempo Real (Debounce)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busca.length >= 2 && !membroSelecionado) {
                setLoadingBusca(true);
                const res = await buscarMembrosSemFamiliaAction(busca);
                setResultados(res);
                setLoadingBusca(false);
            } else {
                setResultados([]);
            }
        }, 400); // Aguarda 400ms após a última tecla antes de procurar

        return () => clearTimeout(timer);
    }, [busca, membroSelecionado]);

    async function handleSalvar() {
        if (!membroSelecionado) return;
        setLoadingSalvar(true);

        const res = await vincularMembroFamiliaAction(membroSelecionado.id, familiaId, parentesco);

        if (res.ok) {
            fecharModal();
        } else {
            toast(res.error, 'erro');
            setLoadingSalvar(false);
        }
    }

    function fecharModal() {
        setAberto(false);
        setBusca('');
        setResultados([]);
        setMembroSelecionado(null);
        setParentesco('MEMBRO');
        setLoadingSalvar(false);
    }

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="w-full flex items-center justify-center gap-2 bg-bg border border-soft text-muted py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-figueira hover:text-figueira transition-all border-dashed"
            >
                <UserPlus size={14} /> Adicionar Membro
            </button>

            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-soft relative animate-in zoom-in-95">

                        <button onClick={fecharModal} className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>

                        <div className="mb-6">
                            <span className="text-[9px] font-black text-figueira uppercase tracking-[0.2em]">Família {familiaNome}</span>
                            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-fg mt-1">Vincular Membro</h3>
                        </div>

                        {/* FASE 1: PESQUISAR MEMBRO */}
                        {!membroSelecionado ? (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome..."
                                        value={busca}
                                        onChange={(e) => setBusca(e.target.value)}
                                        className="w-full bg-bg border border-soft rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all"
                                        autoFocus
                                    />
                                    {loadingBusca && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-figueira animate-spin" />}
                                </div>

                                {/* LISTA DE RESULTADOS */}
                                {resultados.length > 0 && (
                                    <div className="bg-bg border border-soft rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-48 overflow-y-auto">
                                        {resultados.map(membro => (
                                            <button
                                                key={membro.id}
                                                onClick={() => { setMembroSelecionado(membro); setBusca(''); }}
                                                className="px-4 py-3 text-left text-xs font-bold text-fg hover:bg-soft transition-colors border-b border-soft last:border-0 flex items-center justify-between group"
                                            >
                                                {membro.fullName}
                                                <UserPlus size={14} className="opacity-0 group-hover:opacity-100 text-figueira transition-opacity" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {busca.length >= 2 && resultados.length === 0 && !loadingBusca && (
                                    <p className="text-center text-[10px] font-bold text-muted uppercase tracking-widest p-4">
                                        Nenhum membro livre encontrado.
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* FASE 2: MEMBRO SELECIONADO -> DEFINIR PARENTESCO */
                            <div className="space-y-6 animate-in slide-in-from-right-4">
                                <div className="bg-figueira/10 border border-figueira/20 p-4 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black uppercase text-figueira tracking-widest mb-1">Membro Selecionado</p>
                                        <p className="text-sm font-black text-fg">{membroSelecionado.fullName}</p>
                                    </div>
                                    <button onClick={() => setMembroSelecionado(null)} className="p-2 bg-white rounded-xl text-muted hover:text-red-500 shadow-sm transition-all">
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-widest">Papel na Família (Parentesco)</label>
                                    <select
                                        value={parentesco}
                                        onChange={(e) => setParentesco(e.target.value)}
                                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-xs font-bold text-fg outline-none focus:border-figueira cursor-pointer"
                                    >
                                        <option value="PAI">Pai</option>
                                        <option value="MÃE">Mãe</option>
                                        <option value="CONJUGE">Cônjuge</option>
                                        <option value="FILHO">Filho(a)</option>
                                        <option value="AVO">Avô/Avó</option>
                                        <option value="MEMBRO">Outro Membro</option>
                                    </select>
                                </div>

                                <button
                                    onClick={handleSalvar}
                                    disabled={loadingSalvar}
                                    className="w-full bg-figueira text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-figueira/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                >
                                    {loadingSalvar ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Confirmar Vínculo
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    )
}
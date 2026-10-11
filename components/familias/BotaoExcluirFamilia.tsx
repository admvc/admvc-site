'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Trash2, AlertTriangle, Loader2, Check } from 'lucide-react'
import { excluirFamiliaAction } from '@/actions/familia-actions'

interface Props {
    familiaId: number;
    nomeFamilia: string;
    qtdMembros: number;
}

export default function BotaoExcluirFamilia({ familiaId, nomeFamilia, qtdMembros }: Props) {
    const toast = useToast();
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleExcluir() {
        setLoading(true);
        const res = await excluirFamiliaAction(familiaId);
        if (res.ok) {
            setAberto(false);
        } else {
            toast(res.error, 'erro');
            setLoading(false);
        }
    }

    return (
        <>
            {/* O BOTÃO DA LIXEIRA (Fica na interface principal) */}
            <button
                onClick={() => setAberto(true)}
                className="p-2.5 bg-bg border border-soft text-muted hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                title="Excluir Família"
            >
                <Trash2 size={16} />
            </button>

            {/* O MODAL DE CONFIRMAÇÃO E AVISO */}
            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full max-w-sm rounded-[2.5rem] border border-soft shadow-2xl p-8 text-center animate-in zoom-in-95">

                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={32} />
                        </div>

                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-fg">
                            Excluir Família?
                        </h3>
                        <p className="text-sm font-bold text-fg mt-1">Família {nomeFamilia}</p>

                        {/* MENSAGEM CONDICIONAL DE ACORDO COM A QUANTIDADE DE MEMBROS */}
                        {qtdMembros > 0 ? (
                            <div className="mt-6 bg-orange-50 border border-orange-100 p-4 rounded-2xl text-left shadow-sm">
                                <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <AlertTriangle size={14} /> Atenção
                                </p>
                                <p className="text-xs text-orange-800 font-medium leading-relaxed">
                                    Esta família tem <strong>{qtdMembros} membro(s)</strong>. Ao excluí-la, as pessoas <strong>não serão apagadas</strong> do sistema, mas ficarão livres e <strong>sem vínculo familiar</strong>.
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs text-muted font-medium mt-4">
                                Esta família está vazia. Tem a certeza que deseja excluí-la permanentemente do sistema?
                            </p>
                        )}

                        {/* BOTÕES DE AÇÃO */}
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button
                                onClick={() => setAberto(false)}
                                disabled={loading}
                                className="py-4 bg-soft text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-soft/80 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleExcluir}
                                disabled={loading}
                                className="py-4 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 hover:bg-red-600 transition-all active:scale-95"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Confirmar
                            </button>
                        </div>

                    </div>
                </div>
            )}
        </>
    )
}
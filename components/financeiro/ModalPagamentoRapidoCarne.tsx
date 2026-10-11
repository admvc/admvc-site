'use client'

import { useState } from 'react'
import { Banknote, Loader2, Check, X, Plus, Minus } from 'lucide-react'
import { lancarPagamentoCarneAction } from '@/actions/financeiro-actions' // Criar esta action
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalPagamentoRapidoCarne({ carneId, membroNome, campanhaNome, valorParcela, parcelasRestantes }: any) {
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qtd, setQtd] = useState(1);
    const toast = useToast()

    const total = qtd * valorParcela;

    async function handlePagamento() {
        setLoading(true);
        const res = await lancarPagamentoCarneAction(carneId, qtd);
        if (res.ok) {
            setAberto(false);
            setQtd(1);
        } else {
            toast(res.error, 'erro');
        }
        setLoading(false);
    }

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
            >
                <Banknote size={14} />
            </button>

            {aberto && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-soft animate-in zoom-in-95">
                        <div className="text-center mb-6">
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">{campanhaNome}</span>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-fg mt-1">{membroNome}</h3>
                        </div>

                        <div className="bg-soft/30 p-6 rounded-3xl space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase text-muted">Parcelas:</span>
                                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-soft">
                                    <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="p-1 hover:bg-soft rounded-lg"><Minus size={14} /></button>
                                    <span className="font-black text-sm w-4 text-center">{qtd}</span>
                                    <button onClick={() => setQtd(Math.min(parcelasRestantes, qtd + 1))} className="p-1 hover:bg-soft rounded-lg"><Plus size={14} /></button>
                                </div>
                            </div>

                            <div className="border-t border-soft pt-4 flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase text-muted">Valor Total:</span>
                                <span className="text-2xl font-black text-emerald-600">
                                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(total)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button onClick={() => setAberto(false)} className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-soft text-muted hover:bg-red-50 hover:text-red-500 transition-all">Cancelar</button>
                            <button
                                onClick={handlePagamento}
                                disabled={loading}
                                className="py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all"
                            >
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
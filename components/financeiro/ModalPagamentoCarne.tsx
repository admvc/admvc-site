'use client'

import { useState } from 'react'
import { DollarSign, Loader2, Check, X } from 'lucide-react'
import { lancarPagamentoCarne } from '@/actions/financeiro-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalPagamentoCarne({ carne }: { carne: any }) {
    const toast = useToast()
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qtd, setQtd] = useState(1);

    const parcelasRestantes = carne.campanha.numParcelas - carne.parcelasPagas;
    const valorTotalUnitario = carne.campanha.valorParcela;
    const totalAPagar = qtd * valorTotalUnitario;

    async function confirmarPagamento() {
        setLoading(true);
        const res = await lancarPagamentoCarne(carne.id, qtd);
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
                disabled={carne.status === 'PAGO'}
                className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-30"
            >
                <DollarSign size={18} />
            </button>

            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg2 w-full max-w-sm rounded-2xl border border-soft shadow-2xl p-8 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                <DollarSign size={32} />
                            </div>
                            <h3 className="text-xl font-black uppercase italic tracking-tighter">Lançar Parcela</h3>
                            <p className="text-[10px] text-muted font-bold uppercase">{carne.membro.first_name} {carne.membro.last_name}</p>
                        </div>

                        <div className="bg-bg p-4 rounded-2xl border border-soft space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase text-muted">
                                <span>Parcelas a pagar:</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setQtd(Math.max(1, qtd - 1))} className="w-6 h-6 bg-soft rounded-lg">-</button>
                                    <span className="text-fg text-sm">{qtd}</span>
                                    <button onClick={() => setQtd(Math.min(parcelasRestantes, qtd + 1))} className="w-6 h-6 bg-soft rounded-lg">+</button>
                                </div>
                            </div>
                            <div className="border-t border-soft pt-3 flex justify-between items-end">
                                <span className="text-[10px] font-black uppercase text-muted">Total a Receber:</span>
                                <span className="text-xl font-black text-emerald-500">
                                    {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(totalAPagar)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setAberto(false)}
                                className="py-4 bg-soft text-fg rounded-xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmarPagamento}
                                disabled={loading}
                                className="py-4 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
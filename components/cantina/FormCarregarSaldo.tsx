'use client'

import { useState } from 'react'
import { Loader2, Wallet2, CheckCircle, XCircle } from 'lucide-react'
import { solicitarRecarga } from '@/actions/cantina-local-actions'

const VALORES_PREDEFINIDOS = [5, 10, 20, 50]
const FORMAS_PAGAMENTO = [
    { id: 'MBWAY', label: 'MBWay' },
    { id: 'TRANSFERENCIA', label: 'Transferencia' },
    { id: 'DINHEIRO', label: 'Dinheiro' },
]

export default function FormCarregarSaldo() {
    const [valor, setValor] = useState<number | null>(null)
    const [valorCustom, setValorCustom] = useState('')
    const [formaPagamento, setFormaPagamento] = useState('')
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ success?: boolean; error?: string } | null>(null)

    const valorFinal = valor ?? (parseFloat(valorCustom) || 0)

    async function handleSubmit() {
        if (valorFinal <= 0 || !formaPagamento) return

        setLoading(true)
        setResultado(null)

        try {
            const res = await solicitarRecarga(valorFinal, formaPagamento)
            if (res.error) {
                setResultado({ error: res.error })
            } else {
                setResultado({ success: true })
                setValor(null)
                setValorCustom('')
                setFormaPagamento('')
            }
        } catch {
            setResultado({ error: 'Erro inesperado. Tente novamente.' })
        } finally {
            setLoading(false)
        }
    }

    if (resultado?.success) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
                <CheckCircle size={48} className="mx-auto text-emerald-400" />
                <h2 className="text-xl font-black uppercase text-fg">Pedido Enviado!</h2>
                <p className="text-sm text-muted">
                    O seu pedido de recarga de <span className="text-figueira font-bold">{valorFinal.toFixed(2)}€</span> foi registado.
                </p>
                <p className="text-[10px] text-muted uppercase tracking-widest">Aguarde a aprovacao por parte da administracao.</p>
                <button
                    onClick={() => setResultado(null)}
                    className="mt-4 px-6 py-2 bg-bg2 border border-soft rounded-2xl text-xs font-black uppercase tracking-widest text-muted hover:text-fg transition-colors"
                >
                    Novo Pedido
                </button>
            </div>
        )
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                <Wallet2 size={14} className="text-figueira" /> Solicitar Recarga
            </h3>

            {/* Erro */}
            {resultado?.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                    <XCircle size={16} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{resultado.error}</p>
                </div>
            )}

            {/* Valor */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Valor</label>
                <div className="flex flex-wrap gap-2">
                    {VALORES_PREDEFINIDOS.map(v => (
                        <button
                            key={v}
                            onClick={() => { setValor(v); setValorCustom('') }}
                            className={`px-4 py-2 rounded-2xl text-sm font-black transition-all border ${
                                valor === v
                                    ? 'bg-figueira/10 border-figueira/30 text-figueira'
                                    : 'bg-bg border-soft text-muted hover:border-figueira/20'
                            }`}
                        >
                            {v}€
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Outro:</span>
                    <input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={valorCustom}
                        onChange={e => { setValorCustom(e.target.value); setValor(null) }}
                        className="w-24 bg-bg border border-soft rounded-xl px-3 py-2 text-sm font-bold text-fg placeholder:text-muted/40 focus:outline-none focus:border-figueira/30"
                    />
                    <span className="text-sm font-bold text-muted">€</span>
                </div>
            </div>

            {/* Forma de pagamento */}
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted">Forma de Pagamento</label>
                <div className="flex flex-wrap gap-2">
                    {FORMAS_PAGAMENTO.map(fp => (
                        <button
                            key={fp.id}
                            onClick={() => setFormaPagamento(fp.id)}
                            className={`px-4 py-2 rounded-2xl text-sm font-black transition-all border ${
                                formaPagamento === fp.id
                                    ? 'bg-figueira/10 border-figueira/30 text-figueira'
                                    : 'bg-bg border-soft text-muted hover:border-figueira/20'
                            }`}
                        >
                            {fp.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Resumo */}
            {valorFinal > 0 && formaPagamento && (
                <div className="bg-bg border border-soft rounded-2xl p-4 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total a carregar</span>
                    <span className="text-xl font-black italic text-figueira">{valorFinal.toFixed(2)}€</span>
                </div>
            )}

            {/* Botao */}
            <button
                onClick={handleSubmit}
                disabled={loading || valorFinal <= 0 || !formaPagamento}
                className="w-full py-3 bg-figueira text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : (
                    <Wallet2 size={14} />
                )}
                {loading ? 'A processar...' : 'Solicitar Recarga'}
            </button>
        </div>
    )
}

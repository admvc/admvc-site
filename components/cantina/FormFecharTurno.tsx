'use client'

import { useState, useTransition } from 'react'
import { fecharTurno } from '@/actions/turno-actions'
import { useRouter } from 'next/navigation'
import { Square } from 'lucide-react'

interface Props {
    turnoId: number
    valorInicial: number
    totalDinheiro: number
    totalVendas: number
    vendasCount: number
}

export default function FormFecharTurno({ turnoId, valorInicial, totalDinheiro, totalVendas, vendasCount }: Props) {
    const [valorFinalReal, setValorFinalReal] = useState('')
    const [observacao, setObservacao] = useState('')
    const [erro, setErro] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const valorEsperado = valorInicial + totalDinheiro
    const valorInput = parseFloat(valorFinalReal) || 0
    const diferenca = valorInput - valorEsperado
    const showPreview = valorFinalReal !== ''

    const fmt = (v: number) => v.toFixed(2).replace('.', ',')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setErro('')

        const valor = parseFloat(valorFinalReal)
        if (isNaN(valor) || valor < 0) {
            setErro('Indique o valor final em caixa.')
            return
        }

        startTransition(async () => {
            const result = await fecharTurno(turnoId, valor, observacao || undefined)
            if (result.error) {
                setErro(result.error)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg border border-soft rounded-xl p-3 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Vendas</p>
                    <p className="text-lg font-black text-fg">{vendasCount}</p>
                </div>
                <div className="bg-bg border border-soft rounded-xl p-3 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Total Vendas</p>
                    <p className="text-lg font-black text-fg">{fmt(totalVendas)} EUR</p>
                </div>
                <div className="bg-bg border border-soft rounded-xl p-3 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Dinheiro Recebido</p>
                    <p className="text-lg font-black text-fg">{fmt(totalDinheiro)} EUR</p>
                </div>
                <div className="bg-bg border border-soft rounded-xl p-3 space-y-0.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Valor Esperado</p>
                    <p className="text-lg font-black text-figueira">{fmt(valorEsperado)} EUR</p>
                </div>
            </div>

            {/* Input: valor final real */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted block">
                    Valor Contado em Caixa (EUR)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={valorFinalReal}
                    onChange={(e) => setValorFinalReal(e.target.value)}
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg placeholder:text-muted2 focus:outline-none focus:border-figueira/50 transition-colors"
                />
            </div>

            {/* Diferenca preview */}
            {showPreview && (
                <div
                    className={`rounded-xl p-3 border text-center ${
                        diferenca === 0
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : diferenca < 0
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    }`}
                >
                    <p className="text-[9px] font-black uppercase tracking-widest mb-1">Diferenca</p>
                    <p className="text-xl font-black">
                        {diferenca > 0 ? '+' : ''}{fmt(diferenca)} EUR
                    </p>
                </div>
            )}

            {/* Observacao */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted block">
                    Observacao (opcional)
                </label>
                <textarea
                    rows={2}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Notas sobre o turno..."
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg placeholder:text-muted2 focus:outline-none focus:border-figueira/50 transition-colors resize-none"
                />
            </div>

            {erro && (
                <p className="text-xs font-bold text-red-400">{erro}</p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-all disabled:opacity-50"
            >
                <Square size={14} />
                {isPending ? 'A fechar...' : 'Fechar Turno'}
            </button>
        </form>
    )
}

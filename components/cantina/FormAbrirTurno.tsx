'use client'

import { useState, useTransition } from 'react'
import { abrirTurno } from '@/actions/turno-actions'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'

export default function FormAbrirTurno() {
    const [valorInicial, setValorInicial] = useState('')
    const [erro, setErro] = useState('')
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setErro('')

        const valor = parseFloat(valorInicial) || 0
        if (valor < 0) {
            setErro('O valor inicial nao pode ser negativo.')
            return
        }

        startTransition(async () => {
            const result = await abrirTurno(valor)
            if (result.error) {
                setErro(result.error)
            } else {
                router.refresh()
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted block">
                    Valor Inicial em Caixa (EUR)
                </label>
                <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={valorInicial}
                    onChange={(e) => setValorInicial(e.target.value)}
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg placeholder:text-muted2 focus:outline-none focus:border-figueira/50 transition-colors"
                />
            </div>

            {erro && (
                <p className="text-xs font-bold text-red-400">{erro}</p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all disabled:opacity-50"
            >
                <Play size={14} />
                {isPending ? 'A abrir...' : 'Abrir Turno'}
            </button>
        </form>
    )
}

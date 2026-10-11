'use client'

import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { aprovarRecarga } from '@/actions/cantina-local-actions'

interface Props {
    pedidoId: number
}

export default function BotaoAprovarRecarga({ pedidoId }: Props) {
    const [loading, setLoading] = useState(false)
    const [aprovado, setAprovado] = useState(false)
    const [erro, setErro] = useState('')

    async function handleAprovar() {
        setLoading(true)
        setErro('')

        try {
            const res = await aprovarRecarga(pedidoId)
            if ('error' in res && res.error) {
                setErro(res.error)
            } else {
                setAprovado(true)
            }
        } catch {
            setErro('Erro inesperado.')
        } finally {
            setLoading(false)
        }
    }

    if (aprovado) {
        return (
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                <CheckCircle size={12} /> Aprovado
            </span>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {erro && <span className="text-[9px] text-red-400">{erro}</span>}
            <button
                onClick={handleAprovar}
                disabled={loading}
                className="px-4 py-2 bg-figueira text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-1"
            >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Aprovar
            </button>
        </div>
    )
}

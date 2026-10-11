'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { atualizarCumprimento } from '@/actions/pledge-actions'

export default function BotaoAtualizarPledges() {
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string | null>(null)

    async function handleClick() {
        setLoading(true)
        setMsg(null)
        try {
            const res = await atualizarCumprimento()
            if (res.ok) {
                setMsg(`${res.atualizados} pledge(s) atualizado(s).`)
            } else {
                setMsg(res.error || 'Erro ao atualizar.')
            }
        } catch {
            setMsg('Erro inesperado.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleClick}
                disabled={loading}
                className="h-11 px-5 bg-figueira text-white rounded-xl flex items-center gap-2 hover:bg-figueira/90 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
            >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'A atualizar...' : 'Atualizar Cumprimento'}
            </button>
            {msg && (
                <span className="text-[10px] font-bold text-figueira">{msg}</span>
            )}
        </div>
    )
}

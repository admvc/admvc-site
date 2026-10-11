'use client'

import { useState, useEffect } from 'react'
import { Wallet2, RefreshCw } from 'lucide-react'
import { obterSaldoMembro } from '@/actions/cantina-local-actions'

export default function CardSaldoLocal({ membroId }: { membroId: number }) {
    const [saldo, setSaldo] = useState<number | null>(null)
    const [loading, setLoading] = useState(true)

    async function fetchSaldo() {
        setLoading(true)
        const valor = await obterSaldoMembro(membroId)
        setSaldo(valor)
        setLoading(false)
    }

    useEffect(() => { fetchSaldo() }, [membroId])

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet2 size={16} className="text-figueira" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">Saldo Cantina</span>
                </div>
                <button
                    onClick={fetchSaldo}
                    disabled={loading}
                    className="text-muted hover:text-fg transition-colors disabled:opacity-50"
                    aria-label="Atualizar saldo"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <p className="text-3xl font-black italic text-fg leading-none">
                {loading ? '...' : `${(saldo || 0).toFixed(2)}€`}
            </p>
        </div>
    )
}

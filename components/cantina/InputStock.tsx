'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { atualizarStock } from '@/actions/cantina-local-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    produtoId: number
    stockAtual: number
}

export default function InputStock({ produtoId, stockAtual }: Props) {
    const [stock, setStock] = useState(stockAtual)
    const [loading, setLoading] = useState(false)
    const toast = useToast()
    const changed = stock !== stockAtual

    async function handleSave() {
        setLoading(true)
        const res = await atualizarStock(produtoId, stock)
        if (res?.error) toast(res.error, 'erro')
        setLoading(false)
    }

    return (
        <div className="flex items-center gap-2">
            <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                className="w-20 bg-bg border border-soft rounded-xl px-3 py-1.5 text-sm font-bold text-fg text-center focus:border-figueira outline-none"
            />
            {changed && (
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-2 py-1.5 rounded-xl bg-figueira text-bg text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? <Loader2 size={10} className="animate-spin" /> : 'OK'}
                </button>
            )}
        </div>
    )
}

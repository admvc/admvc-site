'use client'

import { useState } from 'react'
import { eliminarSA } from '@/actions/super-admin-actions'
import { Trash2, Loader2 } from 'lucide-react'

export default function BotaoEliminarSA({ saId, nome }: { saId: number; nome: string }) {
    const [confirming, setConfirming] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleDelete() {
        setLoading(true)
        await eliminarSA(saId)
        setLoading(false)
        setConfirming(false)
    }

    if (confirming) {
        return (
            <div className="flex items-center gap-1.5">
                <button onClick={handleDelete} disabled={loading}
                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                    {loading ? <Loader2 size={10} className="animate-spin" /> : 'Sim'}
                </button>
                <button onClick={() => setConfirming(false)}
                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
                    Nao
                </button>
            </div>
        )
    }

    return (
        <button onClick={() => setConfirming(true)} title={`Eliminar ${nome}`}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={14} />
        </button>
    )
}

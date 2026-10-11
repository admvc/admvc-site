'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Trash2, Loader2 } from 'lucide-react'
import { eliminarProduto } from '@/actions/cantina-local-actions'

interface Props {
    produtoId: number
}

export default function BotaoEliminarProduto({ produtoId }: Props) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [confirmar, setConfirmar] = useState(false)

    async function handleDelete() {
        setLoading(true)
        const res = await eliminarProduto(produtoId)
        if (res?.error) {
            toast(res.error, 'erro')
        }
        setLoading(false)
        setConfirmar(false)
    }

    if (confirmar) {
        return (
            <div className="flex items-center gap-1.5">
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 size={12} className="animate-spin" />
                    ) : (
                        <Trash2 size={12} />
                    )}
                    Confirmar
                </button>
                <button
                    onClick={() => setConfirmar(false)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-muted bg-bg border border-soft hover:border-figueira/50 transition-all active:scale-95"
                >
                    Cancelar
                </button>
            </div>
        )
    }

    return (
        <button
            onClick={() => setConfirmar(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
            title="Eliminar produto"
        >
            <Trash2 size={12} />
        </button>
    )
}

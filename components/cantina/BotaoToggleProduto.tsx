'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toggleDisponibilidadeProduto } from '@/actions/cantina-local-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    produtoId: number
    disponivel: boolean
}

export default function BotaoToggleProduto({ produtoId, disponivel }: Props) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    async function handleToggle() {
        setLoading(true)
        const res = await toggleDisponibilidadeProduto(produtoId)
        if (res?.error) toast(res.error, 'erro')
        setLoading(false)
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${
                disponivel
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20'
            }`}
            title={disponivel ? 'Desativar produto' : 'Ativar produto'}
        >
            {loading ? (
                <Loader2 size={12} className="animate-spin" />
            ) : disponivel ? (
                <Eye size={12} />
            ) : (
                <EyeOff size={12} />
            )}
            {disponivel ? 'Disponivel' : 'Indisponivel'}
        </button>
    )
}

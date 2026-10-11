'use client'

import { useState } from 'react'
import { XCircle, Loader2 } from 'lucide-react'
import { rejeitarDespesaAction } from '@/actions/fundos-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoRejeitarDespesa({ despesaId }: { despesaId: number }) {
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    async function handleRejeitar() {
        const motivo = prompt('Motivo da rejeicao (opcional):')
        if (motivo === null) return // cancelled
        setLoading(true)
        const res = await rejeitarDespesaAction(despesaId, motivo || undefined)
        if (!res.ok) {
            toast(res.error || 'Erro ao rejeitar despesa.', 'erro')
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleRejeitar}
            disabled={loading}
            className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
            {loading ? '...' : 'Rejeitar'}
        </button>
    )
}

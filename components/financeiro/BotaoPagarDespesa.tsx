'use client'

import { useState } from 'react'
import { Banknote, Loader2 } from 'lucide-react'
import { pagarDespesaAction } from '@/actions/fundos-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoPagarDespesa({ despesaId }: { despesaId: number }) {
    const [loading, setLoading] = useState(false)
    const confirmar = useConfirm()
    const toast = useToast()

    async function handlePagar() {
        if (!await confirmar({ mensagem: 'Marcar esta despesa como paga? O valor sera debitado do fundo.', tipo: 'aviso' })) return
        setLoading(true)
        const res = await pagarDespesaAction(despesaId)
        if (!res.ok) {
            toast(res.error || 'Erro ao registar pagamento.', 'erro')
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handlePagar}
            disabled={loading}
            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 active:scale-95"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />}
            {loading ? '...' : 'Pagar'}
        </button>
    )
}

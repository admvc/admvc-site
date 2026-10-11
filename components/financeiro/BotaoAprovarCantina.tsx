'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Euro } from 'lucide-react'
import { aprovarRecarga } from '@/actions/cantina-local-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoAprovarCantina({
    pedidoId,
    loyverseId,
    valor,
    nomeMembro
}: {
    pedidoId: number,
    loyverseId: string | null,
    valor: number,
    nomeMembro: string
}) {
    const [loading, setLoading] = useState(false)
    const confirmar = useConfirm()
    const toast = useToast()

    async function handleAprovar() {
        if (!await confirmar({ mensagem: `Aprovar o carregamento de €${valor} para ${nomeMembro}?`, tipo: 'info' })) return

        setLoading(true)

        const res = await aprovarRecarga(pedidoId)

        if (res && 'error' in res && res.error) {
            toast(`Erro ao aprovar: ${res.error}`, 'erro')
        }

        setLoading(false)
    }

    return (
        <button
            onClick={handleAprovar}
            disabled={loading}
            className="bg-orange-100 text-orange-600 hover:bg-orange-500 hover:text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-95"
            title={`Aprovar €${valor} para ${nomeMembro}`}
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'A Aprovar...' : 'Aprovar Pedido'}
        </button>
    )
}
'use client'

import { useState } from 'react'
import { cancelarOfertaBoleia } from '@/actions/boleia-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { Loader2, Trash2 } from 'lucide-react'

export default function BotaoCancelarOferta({ ofertaId }: { ofertaId: number }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    async function handleCancelar() {
        const ok = await confirmar({ mensagem: 'Tem a certeza que quer cancelar esta boleia? Os passageiros serão notificados.', tipo: 'aviso' })
        if (!ok) return
        setLoading(true)
        const res = await cancelarOfertaBoleia(ofertaId)
        if (res.error) {
            toast(res.error, 'erro')
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleCancelar}
            disabled={loading}
            className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
        >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {loading ? 'A cancelar...' : 'Cancelar'}
        </button>
    )
}

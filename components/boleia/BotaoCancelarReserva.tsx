'use client'

import { useState } from 'react'
import { cancelarReservaBoleia } from '@/actions/boleia-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { Loader2, X } from 'lucide-react'

export default function BotaoCancelarReserva({ reservaId }: { reservaId: number }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    async function handleCancelar() {
        const ok = await confirmar({ mensagem: 'Tem a certeza que quer cancelar a sua reserva?', tipo: 'aviso' })
        if (!ok) return
        setLoading(true)
        const res = await cancelarReservaBoleia(reservaId)
        if (res.error) {
            toast(res.error, 'erro')
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleCancelar}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-bg border border-soft text-muted py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:border-red-500/30 hover:text-red-400 transition-all active:scale-95 disabled:opacity-50"
        >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            {loading ? 'A cancelar...' : 'Cancelar Reserva'}
        </button>
    )
}

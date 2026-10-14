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
            type="button"
            className="a-botao a-botao-secundario w-full"
        >
            {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <X size={20} aria-hidden />}
            {loading ? 'A cancelar…' : 'Já não preciso do lugar'}
        </button>
    )
}

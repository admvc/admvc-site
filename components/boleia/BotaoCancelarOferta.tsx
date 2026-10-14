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
            type="button"
            className="a-botao a-botao-secundario w-full"
            style={{ color: 'var(--a-erro)' }}
        >
            {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Trash2 size={20} aria-hidden />}
            {loading ? 'A cancelar…' : 'Cancelar a boleia'}
        </button>
    )
}

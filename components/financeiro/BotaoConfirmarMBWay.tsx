'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { confirmarMBWayCarneAction } from '@/actions/financeiro-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

interface Pendente {
    id: number
    valor_pago: number
    objetivo: {
        membro: {
            first_name: string
            last_name: string
        }
    }
}

interface Props {
    pendentes: Pendente[]
}

export default function BotaoConfirmarMBWay({ pendentes }: Props) {
    const [loading, setLoading] = useState(false)
    const toast = useToast()
    const confirmarDialog = useConfirm()

    async function confirmar() {
        if (!await confirmarDialog({ mensagem: `Confirmar ${pendentes.length} transação(ões) MBWay pendente(s)?`, tipo: 'info' })) return

        setLoading(true)

        for (const lancamento of pendentes) {
            const res = await confirmarMBWayCarneAction(lancamento.id)
            if (res?.error) {
                toast(`Erro ao confirmar lançamento #${lancamento.id}: ` + res.error, 'erro')
            }
        }

        setLoading(false)
    }

    return (
        <button
            onClick={confirmar}
            disabled={loading}
            className="bg-fg text-bg px-5 py-3 rounded-xl font-black text-[9px] uppercase hover:bg-green-600 hover:text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50"
            title="Validar Pagamentos MBWay"
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Confirmar Todos
        </button>
    )
}
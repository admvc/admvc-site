'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { agradecerBoleia } from '@/actions/boleia-actions'

interface BotaoAgradecerProps {
    reservaId: number
    jaAgradeceu: boolean
}

export default function BotaoAgradecer({ reservaId, jaAgradeceu }: BotaoAgradecerProps) {
    const [agradecido, setAgradecido] = useState(jaAgradeceu)
    const [isPending, startTransition] = useTransition()

    function handleClick() {
        if (agradecido || isPending) return
        startTransition(async () => {
            const result = await agradecerBoleia(reservaId)
            if (result.success) {
                setAgradecido(true)
            }
        })
    }

    return (
        <button
            onClick={handleClick}
            disabled={agradecido || isPending}
            className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                agradecido
                    ? 'text-red-500 cursor-default'
                    : 'text-muted hover:text-red-500'
            }`}
            title={agradecido ? 'Agradecido!' : 'Agradecer ao motorista'}
        >
            <Heart size={14} fill={agradecido ? 'currentColor' : 'none'} />
            {agradecido ? 'Obrigado!' : 'Agradecer'}
        </button>
    )
}

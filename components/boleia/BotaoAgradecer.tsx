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
            type="button"
            className="a-botao a-botao-secundario w-full"
            style={agradecido ? { color: 'var(--a-destaque)' } : undefined}
            title={agradecido ? 'Agradecido!' : 'Agradecer ao motorista'}
        >
            <Heart size={20} aria-hidden fill={agradecido ? 'currentColor' : 'none'} />
            {agradecido ? 'Agradeceu' : 'Agradecer ao motorista'}
        </button>
    )
}

'use client'

// Cartão de aviso no Início que se pode minimizar (fica só o título) ou fechar até amanhã.
// Guarda-se só neste aparelho (localStorage). No dia seguinte volta a aparecer aberto.

import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown, Minus, X } from 'lucide-react'

const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())

function ler(id: string): 'aberto' | 'minimo' | 'fechado' {
    try {
        const v = JSON.parse(localStorage.getItem(`cartao:${id}`) || 'null') as { estado: 'minimo' | 'fechado'; dia: string } | null
        return v && v.dia === hoje() ? v.estado : 'aberto'
    } catch { return 'aberto' }
}

export default function CartaoFechavel({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
    const [estado, setEstado] = useState<'aberto' | 'minimo' | 'fechado'>('aberto')
    useEffect(() => { setEstado(ler(id)) }, [id])

    function mudar(novo: 'aberto' | 'minimo' | 'fechado') {
        setEstado(novo)
        try {
            if (novo === 'aberto') localStorage.removeItem(`cartao:${id}`)
            else localStorage.setItem(`cartao:${id}`, JSON.stringify({ estado: novo, dia: hoje() }))
        } catch { /* sem armazenamento: só nesta visita */ }
    }

    if (estado === 'fechado') return null
    if (estado === 'minimo') {
        return (
            <button type="button" onClick={() => mudar('aberto')} className="a-card a-foco flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span className="min-w-0 truncate text-[15px] font-semibold">{titulo}</span>
                <ChevronDown size={20} className="shrink-0 a-suave" aria-label="Abrir" />
            </button>
        )
    }
    return (
        <div className="relative">
            {children}
            <div className="absolute right-2 top-2 flex gap-1">
                <button type="button" onClick={() => mudar('minimo')} className="a-foco flex h-9 w-9 items-center justify-center rounded-full a-suave" aria-label={`Minimizar: ${titulo}`}>
                    <Minus size={18} aria-hidden />
                </button>
                <button type="button" onClick={() => mudar('fechado')} className="a-foco flex h-9 w-9 items-center justify-center rounded-full a-suave" aria-label={`Fechar até amanhã: ${titulo}`}>
                    <X size={18} aria-hidden />
                </button>
            </div>
        </div>
    )
}

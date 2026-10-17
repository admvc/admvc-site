'use client'

// Fundo de uma janela (modal) leve para o telemóvel: fica por cima de tudo (portal no body, fora de
// páginas com animação), não rola o que está atrás, fecha ao tocar fora ou com Esc. Sem desfoque
// (o backdrop-blur no iPhone deixava a janela lenta, "parecia que travava").

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function JanelaPorCima({ onFechar, children, z = 120 }: { onFechar: () => void; children: ReactNode; z?: number }) {
    useEffect(() => {
        const antes = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
        window.addEventListener('keydown', tecla)
        return () => { document.body.style.overflow = antes; window.removeEventListener('keydown', tecla) }
    }, [onFechar])

    return createPortal(
        <div className="fixed inset-0 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" style={{ zIndex: z }}
            onClick={(e) => { if (e.target === e.currentTarget) onFechar() }}>
            {children}
        </div>,
        document.body,
    )
}

'use client'

// Mensagem que outra página mandou pelo endereço (?error=…), ex.: "Acesso negado" ao abrir
// uma página sem permissão. Antes ficava só no endereço e a pessoa não percebia o que aconteceu.

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, X } from 'lucide-react'

export default function AvisoDoEndereco() {
    const texto = useSearchParams().get('error')
    const [fechado, setFechado] = useState(false)
    if (!texto || fechado) return null
    return (
        <div role="alert" className="a-card mb-4 flex items-start gap-3 p-4" style={{ borderColor: 'var(--a-aviso)', background: 'var(--a-aviso-suave)' }}>
            <AlertCircle size={22} className="shrink-0" style={{ color: 'var(--a-aviso)' }} aria-hidden />
            <p className="min-w-0 flex-1 text-[16px]">{texto.slice(0, 200)}</p>
            <button type="button" onClick={() => setFechado(true)} className="a-foco shrink-0 a-suave" aria-label="Fechar aviso"><X size={20} aria-hidden /></button>
        </div>
    )
}

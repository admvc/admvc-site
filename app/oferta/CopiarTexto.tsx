'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CopiarTexto({ rotulo, valor, mostrar }: { rotulo: string; valor: string; mostrar: string }) {
    const [copiado, setCopiado] = useState(false)
    async function copiar() {
        try {
            await navigator.clipboard.writeText(valor)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2500)
        } catch { /* sem permissão: a pessoa seleciona o texto à mão */ }
    }
    return (
        <div className="a-card space-y-2 p-4">
            <p className="text-[14px] font-semibold uppercase tracking-wide a-suave">{rotulo}</p>
            <p className="break-all text-[20px] font-bold select-all">{mostrar}</p>
            <button type="button" onClick={copiar} className="a-botao a-botao-principal w-full !min-h-[52px]">
                {copiado ? <><Check size={18} aria-hidden /> Copiado</> : <><Copy size={18} aria-hidden /> Copiar {rotulo}</>}
            </button>
        </div>
    )
}

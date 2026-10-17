'use client'

import { Printer } from 'lucide-react'

/** Botão "Imprimir / PDF" no estilo da app (some ao imprimir). */
export default function Imprimir({ texto = 'Imprimir / PDF' }: { texto?: string }) {
    return (
        <button type="button" onClick={() => window.print()} className="a-botao a-botao-secundario !min-h-[44px] print:hidden">
            <Printer size={18} aria-hidden /> {texto}
        </button>
    )
}

// components/BotaoImprimir.tsx
"use client" // Essencial para o onClick funcionar

import { Printer } from 'lucide-react'

export default function BotaoImprimir() {
    return (
        <button
            onClick={() => window.print()}
            className="bg-fg text-bg px-8 py-4 rounded-[1.2rem] font-black text-[11px] uppercase tracking-widest hover:bg-figueira transition-all flex items-center gap-3 shadow-xl active:scale-95 print:hidden"
        >
            <Printer size={16} strokeWidth={3} />
            Imprimir Relatório
        </button>
    )
}
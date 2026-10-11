'use client'

import { Printer } from 'lucide-react'

export default function BotaoExportPDF() {
    return (
        <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-bg2 border border-soft rounded-2xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-fg hover:border-figueira/30 transition-all"
        >
            <Printer size={14} />
            Exportar PDF
        </button>
    )
}

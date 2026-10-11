'use client'

import { FileText, Printer, Download } from 'lucide-react'

export default function BotaoRelatorio() {
    const handlePrint = () => {
        // Dispara a impressão do navegador
        window.print();
    };

    return (
        <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-bg border border-soft text-muted hover:text-figueira hover:border-figueira rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm"
        >
            <Printer size={14} />
            Gerar Extrato PDF
        </button>
    );
}
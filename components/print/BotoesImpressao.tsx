'use client'

import { useState, lazy, Suspense } from 'react'
import { Printer, CreditCard, List, Loader2, X } from 'lucide-react'

interface MembroData {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_1?: string | null
    id_city?: string | null
    status?: string | null
    church_role?: string | null
    data_admissao?: Date | string | null
}

// Lazy load do modal inteiro (que importa @react-pdf/renderer internamente)
const ModalPDF = lazy(() => import('./ModalPDF'))

export default function BotoesImpressao({ membros, igrejaName }: { membros: MembroData[]; igrejaName?: string }) {
    const [tipo, setTipo] = useState<'cartao' | 'lista' | null>(null)

    return (
        <>
            <div className="flex items-center gap-1.5">
                <button onClick={() => setTipo('cartao')}
                    className="flex items-center gap-1.5 bg-bg2 border border-soft text-muted px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all"
                    title="Imprimir cartoes">
                    <CreditCard size={12} /> Cartoes
                </button>
                <button onClick={() => setTipo('lista')}
                    className="flex items-center gap-1.5 bg-bg2 border border-soft text-muted px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all"
                    title="Imprimir lista">
                    <List size={12} /> Lista PDF
                </button>
            </div>

            {tipo && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-bg border border-soft rounded-2xl p-8 flex items-center gap-3">
                            <Loader2 size={20} className="animate-spin text-figueira" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-fg">A preparar...</span>
                        </div>
                    </div>
                }>
                    <ModalPDF tipo={tipo} membros={membros} igrejaName={igrejaName} onClose={() => setTipo(null)} />
                </Suspense>
            )}
        </>
    )
}

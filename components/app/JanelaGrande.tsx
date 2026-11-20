'use client'

// Janela por cima da página (o <dialog> do browser: Esc fecha, o foco fica dentro e volta ao botão que a abriu).
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function JanelaGrande({ titulo, onFechar, children, larga = false, folha = false }: { titulo: string; onFechar: () => void; children: React.ReactNode; larga?: boolean; folha?: boolean }) {
    const ref = useRef<HTMLDialogElement>(null)
    useEffect(() => {
        const d = ref.current
        if (d && !d.open) d.showModal()   // (ao desmontar, o <dialog> sai da página sozinho)
    }, [])
    return (
        <dialog ref={ref} aria-label={titulo} onClose={onFechar}
            onClick={(e) => { if (e.target === ref.current) onFechar() }}
            className={`app-novo overflow-hidden border p-0 backdrop:bg-black/70 ${folha ? 'fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85vh] w-full max-w-none rounded-t-[18px]' : 'm-auto max-h-[94vh] w-[min(96vw,1100px)] rounded-[18px]'}`}
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)', ...(folha ? {} : { maxWidth: larga ? 1100 : 760 }) }}>
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2" style={{ borderColor: 'var(--a-borda)' }}>
                <h2 className="text-[18px] font-bold">{titulo}</h2>
                <button type="button" onClick={onFechar} aria-label="Fechar" className="a-foco flex h-11 w-11 items-center justify-center rounded-full"><X size={22} aria-hidden /></button>
            </div>
            <div className={`overflow-auto p-4 ${folha ? 'max-h-[calc(85vh-60px)]' : 'max-h-[calc(94vh-60px)]'}`}>{children}</div>
        </dialog>
    )
}

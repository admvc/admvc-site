'use client'

// Bloco fechado (<details>): o conteúdo só se monta quando se abre pela primeira vez (e fica montado depois).
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Gaveta({ titulo, resumo, children }: { titulo: string; resumo?: string; children: React.ReactNode }) {
    const [visto, setVisto] = useState(false)
    return (
        <details className="a-card group overflow-hidden" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setVisto(true) }}>
            <summary className="a-foco flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold">{titulo}</span>
                    {resumo && <span className="block truncate text-[14px] a-suave">{resumo}</span>}
                </span>
                <ChevronDown size={20} className="shrink-0 a-suave transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-3 border-t p-4" style={{ borderColor: 'var(--a-borda)' }}>{visto ? children : null}</div>
        </details>
    )
}

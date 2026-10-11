'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PERIODOS = [
    { label: '1 Mes', value: '1' },
    { label: '3 Meses', value: '3' },
    { label: '6 Meses', value: '6' },
]

export default function ObreirosPeriodoSelector() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const periodoAtual = searchParams.get('periodo') || '3'

    function selecionar(valor: string) {
        const params = new URLSearchParams(searchParams.toString())
        params.set('periodo', valor)
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex gap-2">
            {PERIODOS.map((p) => (
                <button
                    key={p.value}
                    onClick={() => selecionar(p.value)}
                    className={`flex-1 h-12 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 ${
                        periodoAtual === p.value
                            ? 'bg-figueira text-white shadow-lg'
                            : 'bg-bg2 border border-soft text-muted hover:text-fg'
                    }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { Users, ChevronDown, ChevronUp } from 'lucide-react'
import { obterLimitesFilhos } from '@/actions/cantina-local-actions'
import ExtratoCantinaLocal from './ExtratoCantinaLocal'

interface Familiar {
    id: number
    first_name: string
    last_name: string
    limite_diario: number | null
    limite_semanal: number | null
}

export default function ConsumoFilhos() {
    const [filhos, setFilhos] = useState<Familiar[]>([])
    const [loading, setLoading] = useState(true)
    const [filhoAberto, setFilhoAberto] = useState<number | null>(null)

    useEffect(() => {
        async function carregar() {
            const data = await obterLimitesFilhos()
            setFilhos(data)
            setLoading(false)
        }
        carregar()
    }, [])

    if (loading || filhos.length === 0) return null

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
                <Users size={16} className="text-figueira" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Consumo da Familia</span>
            </div>

            <div className="space-y-2">
                {filhos.map(f => (
                    <div key={f.id} className="bg-bg border border-soft rounded-xl overflow-hidden">
                        <button
                            onClick={() => setFilhoAberto(filhoAberto === f.id ? null : f.id)}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-soft/20 transition-all"
                        >
                            <span className="text-[10px] font-black uppercase text-fg">{f.first_name} {f.last_name}</span>
                            {filhoAberto === f.id
                                ? <ChevronUp size={12} className="text-muted" />
                                : <ChevronDown size={12} className="text-muted" />
                            }
                        </button>
                        {filhoAberto === f.id && (
                            <div className="px-4 pb-4 animate-in fade-in duration-200">
                                <ExtratoCantinaLocal membroId={f.id} nome={f.first_name} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

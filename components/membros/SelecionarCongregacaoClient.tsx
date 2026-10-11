'use client'

import { useState } from 'react'
import { selecionarCongregacao } from '@/actions/congregacao-actions'
import { Church, MapPin, Loader2, ArrowRight } from 'lucide-react'

interface Congregacao {
    id: number
    nome: string
    cidade: string | null
}

export default function SelecionarCongregacaoClient({
    congregacoes,
    igrejaName,
    adminNome
}: {
    congregacoes: Congregacao[]
    igrejaName: string
    adminNome: string
}) {
    const [loading, setLoading] = useState<number | null>(null)

    async function handleSelect(congId: number) {
        setLoading(congId)
        await selecionarCongregacao(congId)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
            <div className="max-w-lg w-full space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-16 h-16 bg-figueira/10 rounded-2xl flex items-center justify-center">
                        <Church size={32} className="text-figueira" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-figueira">
                            {igrejaName}
                        </p>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-fg mt-1">
                            Selecionar Congregacao
                        </h1>
                        <p className="text-xs text-muted mt-2">
                            Em qual congregacao deseja trabalhar nesta sessao?
                        </p>
                    </div>
                </div>

                {/* Lista de congregações */}
                <div className="space-y-3">
                    {congregacoes.map(cong => (
                        <button
                            key={cong.id}
                            onClick={() => handleSelect(cong.id)}
                            disabled={loading !== null}
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all text-left group ${
                                loading === cong.id
                                    ? 'bg-figueira/10 border-figueira'
                                    : 'bg-bg2 border-soft hover:border-figueira/50 hover:shadow-lg'
                            } ${loading !== null && loading !== cong.id ? 'opacity-40' : ''}`}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                loading === cong.id ? 'bg-figueira text-white' : 'bg-figueira/10 text-figueira group-hover:bg-figueira group-hover:text-white'
                            }`}>
                                {loading === cong.id
                                    ? <Loader2 size={20} className="animate-spin" />
                                    : <Church size={20} />
                                }
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-black uppercase tracking-tight text-fg truncate">
                                    {cong.nome}
                                </h3>
                                {cong.cidade && (
                                    <p className="text-[10px] font-bold text-muted flex items-center gap-1 mt-0.5">
                                        <MapPin size={10} /> {cong.cidade}
                                    </p>
                                )}
                            </div>
                            <ArrowRight size={16} className="text-muted group-hover:text-figueira transition-colors shrink-0" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { Calendar, Wallet2, Clock, Users, Eye, EyeOff, ChevronDown } from 'lucide-react'

interface Props {
    escalasEsteMes: number
    contribuicaoAno: number
    membroDesde: Date | null
    presencaGrupos: number | null
}

export default function EstatisticasPessoais({ escalasEsteMes, contribuicaoAno, membroDesde, presencaGrupos }: Props) {
    const [visivel, setVisivel] = useState(false)

    const tempoMembro = membroDesde ? (() => {
        const diff = Date.now() - new Date(membroDesde).getTime()
        const anos = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
        const meses = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000))
        return anos > 0 ? `${anos}a ${meses}m` : `${meses} meses`
    })() : null

    const stats = [
        { label: 'Escalas este mes', value: String(escalasEsteMes), icon: Calendar },
        { label: 'Contribuido este ano', value: `${contribuicaoAno.toFixed(0)}€`, icon: Wallet2 },
        ...(tempoMembro ? [{ label: 'Membro ha', value: tempoMembro, icon: Clock }] : []),
        ...(presencaGrupos !== null ? [{ label: 'Presenca grupos', value: `${presencaGrupos}%`, icon: Users }] : []),
    ]

    return (
        <details className="group">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between py-1">
                <h3 className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    As Minhas Estatisticas
                </h3>
                <ChevronDown size={12} className="text-muted group-open:rotate-180 transition-transform" />
            </summary>
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-200">
                <div className="flex justify-end mb-1">
                    <button
                        onClick={() => setVisivel(!visivel)}
                        className="text-[8px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-1"
                    >
                        {visivel ? <EyeOff size={10} /> : <Eye size={10} />}
                        {visivel ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>
                {stats.map((s, i) => (
                    <div key={i} className="flex items-center justify-between bg-bg border border-soft rounded-xl px-3 py-2">
                        <span className="text-[9px] font-bold text-muted flex items-center gap-2">
                            <s.icon size={11} className="text-figueira" /> {s.label}
                        </span>
                        <span className={`text-[11px] font-black text-fg transition-all ${!visivel ? 'blur-sm select-none' : ''}`}>
                            {s.value}
                        </span>
                    </div>
                ))}
            </div>
        </details>
    )
}

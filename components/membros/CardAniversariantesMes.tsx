'use client'

import { useState } from 'react'
import { Cake, ChevronRight, X } from 'lucide-react'
import Image from 'next/image'

interface Aniversariante {
    id: number
    first_name: string
    last_name: string
    avatar_file?: string | null
    birthdate: Date | string
}

interface Props {
    aniversariantes: Aniversariante[]
}

export default function CardAniversariantesMes({ aniversariantes }: Props) {
    const [expandido, setExpandido] = useState(false)

    if (aniversariantes.length === 0) return null

    const hoje = new Date()
    const diaHoje = hoje.getDate()

    const lista = aniversariantes
        .map(m => ({
            ...m,
            birthdate: new Date(m.birthdate),
        }))
        .sort((a, b) => a.birthdate.getDate() - b.birthdate.getDate())

    const isHoje = (data: Date) => data.getDate() === diaHoje
    const diasRestantes = (data: Date) => {
        const diff = data.getDate() - diaHoje
        return diff < 0 ? 0 : diff
    }

    const visiveis = expandido ? lista : lista.slice(0, 3)
    const aniversariantesHoje = lista.filter(m => isHoje(m.birthdate))

    return (
        <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
            {/* HEADER */}
            <div className={`px-5 py-4 flex items-center justify-between ${aniversariantesHoje.length > 0 ? 'bg-figueira/5 border-b border-figueira/15' : 'border-b border-soft'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${aniversariantesHoje.length > 0 ? 'bg-figueira text-white' : 'bg-soft text-muted'}`}>
                        <Cake size={15} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-fg leading-none">
                            Aniversários
                        </p>
                        <p className="text-[8px] font-bold uppercase tracking-widest text-muted mt-0.5">
                            {hoje.toLocaleDateString('pt-PT', { month: 'long' })} · {lista.length} membro{lista.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {aniversariantesHoje.length > 0 && (
                    <span className="text-[7px] font-black uppercase tracking-widest bg-figueira text-white px-2.5 py-1 rounded-lg animate-pulse">
                        🎂 Hoje!
                    </span>
                )}
            </div>

            {/* LISTA */}
            <div className="divide-y divide-soft/50">
                {visiveis.map(m => {
                    const hoje_ = isHoje(m.birthdate)
                    const dias = diasRestantes(m.birthdate)
                    const iniciais = `${m.first_name[0]}${m.last_name[0]}`

                    return (
                        <div key={m.id} className={`flex items-center gap-3 px-5 py-3 ${hoje_ ? 'bg-figueira/5' : ''}`}>
                            {/* AVATAR */}
                            <div className="w-8 h-8 rounded-xl overflow-hidden bg-bg border border-soft shrink-0 flex items-center justify-center">
                                {m.avatar_file
                                    ? <Image src={m.avatar_file} alt={m.first_name} width={32} height={32} className="object-cover w-full h-full" />
                                    : <span className="text-[9px] font-black text-muted uppercase">{iniciais}</span>
                                }
                            </div>

                            {/* NOME */}
                            <div className="flex-1 min-w-0">
                                <p className={`text-[11px] font-black uppercase italic tracking-tight truncate leading-none ${hoje_ ? 'text-figueira' : 'text-fg'}`}>
                                    {m.first_name} {m.last_name}
                                </p>
                                <p className="text-[8px] font-bold uppercase tracking-widest text-muted mt-0.5">
                                    {m.birthdate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                </p>
                            </div>

                            {/* BADGE */}
                            {hoje_ ? (
                                <span className="text-[8px] shrink-0">🎂</span>
                            ) : (
                                <span className="text-[7px] font-black uppercase tracking-widest text-muted shrink-0">
                                    {dias === 1 ? 'Amanhã' : `${dias}d`}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* VER MAIS */}
            {lista.length > 3 && (
                <button
                    onClick={() => setExpandido(!expandido)}
                    className="w-full py-3 text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira hover:bg-soft/30 transition-all flex items-center justify-center gap-1.5 border-t border-soft"
                >
                    {expandido ? 'Ver menos' : `+${lista.length - 3} mais`}
                    <ChevronRight size={10} className={`transition-transform ${expandido ? 'rotate-90' : ''}`} />
                </button>
            )}
        </div>
    )
}
'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, X, Loader2 } from 'lucide-react'
import { listarAgendasPublicas } from '@/actions/agenda-actions'
import AgendarClient from '@/components/membros/AgendarClient'

interface Props {
    aberto: boolean
    onClose: () => void
}

export default function ModalAgendaPastoral({ aberto, onClose }: Props) {
    const [agendas, setAgendas] = useState<any[] | null>(null)
    const [membro, setMembro] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        if (aberto && agendas === null) {
            setLoading(true)
            listarAgendasPublicas().then(res => {
                if (res.ok) {
                    setAgendas(res.agendas || [])
                    setMembro(res.membro)
                } else {
                    setErro(res.error || 'Erro ao carregar agendas.')
                }
                setLoading(false)
            })
        }
    }, [aberto, agendas])

    if (!aberto) return null

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4"
            onClick={onClose}
        >
            <div
                className="bg-bg w-full max-w-md rounded-2xl border border-soft shadow-2xl animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Agenda Pastoral</h3>
                            <p className="text-[8px] font-bold text-muted uppercase tracking-widest">Marcar reuniao</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Conteudo */}
                <div className="overflow-y-auto flex-1 px-5 py-4">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 size={24} className="animate-spin text-figueira" />
                        </div>
                    )}

                    {erro && (
                        <div className="text-center py-8 space-y-2">
                            <Calendar size={28} className="mx-auto text-muted/20" />
                            <p className="text-xs font-black uppercase tracking-widest text-muted">{erro}</p>
                        </div>
                    )}

                    {!loading && !erro && agendas !== null && membro && (
                        <AgendarClient agendas={agendas} membro={membro} />
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

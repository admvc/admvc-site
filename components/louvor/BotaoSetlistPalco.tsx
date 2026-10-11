'use client'
// components/louvor/BotaoSetlistPalco.tsx
// Coloca junto ao ModalRepertorio na dashboard do membro
// Uso: <BotaoSetlistPalco eventoId={esc.evento.id} totalMusicas={esc.evento.repertorio?.length || 0} />

import { Maximize2, Music2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
    eventoId: number
    totalMusicas: number
}

export default function BotaoSetlistPalco({ eventoId, totalMusicas }: Props) {
    if (totalMusicas === 0) return null

    return (
        <Link
            href={`/louvor/setlist/${eventoId}`}
            className="group relative w-full overflow-hidden rounded-2xl border border-soft bg-bg2 p-1 transition-all hover:border-figueira/40 hover:shadow-xl hover:shadow-figueira/5 active:scale-[0.98]"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-figueira/0 via-figueira/5 to-figueira/0 opacity-0 transition-opacity group-hover:opacity-100" />

            <div className="relative flex items-center justify-between bg-bg rounded-[1.75rem] p-3 sm:p-4 border border-transparent group-hover:border-soft/50 transition-all">
                <div className="flex items-center gap-4">
                    {/* Ícone */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-inner transition-all group-hover:bg-figueira group-hover:rotate-3 shrink-0">
                        <Music2 size={20} strokeWidth={2.5} />
                    </div>

                    <div className="text-left">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.15em] text-muted group-hover:text-figueira transition-colors">
                            Modo Palco
                        </h4>
                        <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">
                            Abrir Setlist
                        </h3>
                        <p className="text-[8px] font-bold text-muted/60 mt-0.5">
                            {totalMusicas} música{totalMusicas !== 1 ? 's' : ''} · ecrã completo
                        </p>
                    </div>
                </div>

                {/* Ícone de fullscreen */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/10 text-muted transition-all group-hover:bg-figueira group-hover:text-white shadow-sm shrink-0">
                    <Maximize2 size={16} strokeWidth={2.5} />
                </div>
            </div>
        </Link>
    )
}
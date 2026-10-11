'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
    titulo: string
    icon: React.ReactNode
    badge?: React.ReactNode
    defaultOpen?: boolean
    children: React.ReactNode
    headerExtra?: React.ReactNode
    headerClassName?: string
}

export default function SeccaoColapsavel({
    titulo, icon, badge, defaultOpen = false, children, headerExtra, headerClassName = ''
}: Props) {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <section className={`bg-bg2 border border-soft rounded-2xl overflow-hidden ${headerClassName}`}>
            <div
                className="flex items-center justify-between px-5 py-4 border-b border-soft cursor-pointer select-none hover:bg-soft/5 transition-colors"
                onClick={() => setOpen(o => !o)}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {icon}
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">{titulo}</h2>
                    {badge}
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {headerExtra}
                    <button
                        onClick={() => setOpen(o => !o)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-soft/50 text-muted hover:bg-soft hover:text-fg transition-all"
                    >
                        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>
            {open && children}
        </section>
    )
}

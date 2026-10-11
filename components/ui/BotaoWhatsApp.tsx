'use client'

import { useState } from 'react'
import { Phone, ChevronDown, MessageSquare } from 'lucide-react'
import { WHATSAPP_TEMPLATES, buildWhatsAppUrl, type WhatsAppTemplate } from '@/lib/whatsapp-templates'

interface Props {
    telefone: string
    vars: Record<string, string>
    categoria?: string
    className?: string
    compact?: boolean
}

export default function BotaoWhatsApp({ telefone, vars, categoria, className = '', compact = false }: Props) {
    const [aberto, setAberto] = useState(false)

    if (!telefone) return null

    const templates = categoria
        ? WHATSAPP_TEMPLATES.filter(t => t.categoria === categoria)
        : WHATSAPP_TEMPLATES

    const directUrl = `https://wa.me/${telefone.replace(/\D/g, '')}`

    if (templates.length === 0) {
        return (
            <a href={directUrl} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest ${className}`}>
                <Phone size={12} /> WhatsApp
            </a>
        )
    }

    return (
        <div className="relative">
            <button
                onClick={() => setAberto(!aberto)}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-green-500/10 text-green-600 border border-green-500/20 hover:bg-green-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest ${compact ? 'p-2' : 'px-3 py-2'} ${className}`}
            >
                <Phone size={12} />
                {!compact && <>WhatsApp <ChevronDown size={10} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} /></>}
            </button>

            {aberto && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
                    <div className="absolute right-0 top-full mt-1 w-56 bg-bg border border-soft rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                        <a href={directUrl} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)}
                            className="flex items-center gap-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-fg hover:bg-soft/30 transition-colors border-b border-soft">
                            <Phone size={11} className="text-green-500" /> Mensagem livre
                        </a>
                        {templates.map(t => {
                            const msg = t.buildMessage(vars)
                            const url = buildWhatsAppUrl(telefone, msg)
                            return (
                                <a key={t.id} href={url} target="_blank" rel="noopener noreferrer" onClick={() => setAberto(false)}
                                    className="flex items-center gap-2 px-3 py-2.5 text-[9px] font-bold uppercase tracking-widest text-fg hover:bg-soft/30 transition-colors">
                                    <MessageSquare size={11} className="text-figueira" /> {t.label}
                                </a>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

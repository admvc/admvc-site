'use client'

import { useState } from 'react'
import { X, CalendarCheck } from 'lucide-react'

export default function AvisoEscalaVazia() {
    const [visivel, setVisivel] = useState(true);

    if (!visivel) return null;

    return (
        <div className="col-span-full flex items-center justify-between py-4 px-6 border-2 border-dashed border-soft rounded-2xl bg-bg2/50 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-soft rounded-xl text-muted">
                    <CalendarCheck size={16} />
                </div>
                <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">
                    Estás livre de escalas por enquanto.
                </p>
            </div>
            
            <button 
                onClick={() => setVisivel(false)} 
                className="p-2 text-muted hover:text-fg hover:bg-soft rounded-xl transition-all"
                title="Ocultar aviso"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    )
}
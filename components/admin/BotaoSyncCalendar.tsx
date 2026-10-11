'use client'

import { useState } from 'react'
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react'
import { sincronizarCalendarAction } from '@/actions/agenda-actions'

export default function BotaoSyncCalendar({ credenciaisConfiguradas }: { credenciaisConfiguradas: boolean }) {
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<string | null>(null)

    async function handleSync() {
        setLoading(true)
        setResultado(null)
        const res = await sincronizarCalendarAction()
        setLoading(false)

        if (res.ok) {
            setResultado(`${res.criados} criados, ${res.erros} erros`)
        } else {
            setResultado(res.error || 'Erro ao sincronizar')
        }

        setTimeout(() => setResultado(null), 6000)
    }

    if (!credenciaisConfiguradas) {
        return (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-1.5">
                <AlertTriangle size={12} className="text-orange-500 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-orange-500">
                    Google Calendar: GOOGLE_CALENDAR_CREDENTIALS não configurado
                </span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleSync}
                disabled={loading}
                className="flex items-center gap-1.5 bg-bg border border-soft rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira hover:border-figueira/30 transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync Google Calendar
            </button>

            {resultado && (
                <span className={`text-[9px] font-bold uppercase tracking-widest ${resultado.includes('erros') && !resultado.startsWith('0') ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {resultado}
                </span>
            )}
        </div>
    )
}

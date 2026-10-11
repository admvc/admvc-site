'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function MembrosError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('[ERRO MEMBROS]', error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle size={32} className="text-red-500" />
                </div>

                <div>
                    <h1 className="text-xl font-black italic uppercase tracking-tighter text-fg">
                        Algo correu mal
                    </h1>
                    <p className="text-sm text-muted mt-2">
                        Não foi possível carregar esta página. Tente novamente.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-figueira text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
                    >
                        <RotateCcw size={14} /> Tentar novamente
                    </button>
                    <Link
                        href="/membros/dashboard"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-bg2 border border-soft text-fg text-xs font-black uppercase tracking-widest hover:border-figueira transition-all active:scale-95"
                    >
                        <LayoutDashboard size={14} /> Painel
                    </Link>
                </div>
            </div>
        </div>
    )
}

'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        // Não mostrar se já foi instalado ou se já descartou nesta sessão
        if (window.matchMedia('(display-mode: standalone)').matches) return
        if (sessionStorage.getItem('pwa-dismissed')) return

        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }

        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    if (!deferredPrompt || dismissed) return null

    const handleInstall = async () => {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
        setDismissed(true)
    }

    const handleDismiss = () => {
        setDismissed(true)
        sessionStorage.setItem('pwa-dismissed', '1')
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-md mx-auto bg-bg2 border border-soft rounded-2xl p-4 shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-figueira/20 flex items-center justify-center shrink-0">
                    <Download size={18} className="text-figueira" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-fg">Instalar ADMVC</p>
                    <p className="text-[9px] text-muted">Acesso rapido a partir do ecra inicial.</p>
                </div>
                <button
                    onClick={handleInstall}
                    className="shrink-0 px-4 py-2 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                >
                    Instalar
                </button>
                <button
                    onClick={handleDismiss}
                    className="shrink-0 p-1.5 text-muted hover:text-fg transition-colors"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    )
}

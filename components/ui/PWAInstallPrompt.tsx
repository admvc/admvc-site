'use client'

// Aviso "Instalar ADMVC": so dentro da app (nunca nas paginas publicas, onde
// tapava o botao das boas-vindas) e so a partir da 3.a visita. Fechado, volta
// passados 30 dias.

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const PUBLICAS = ['/boasvindas', '/membros/login', '/membros/recuperar', '/membros/nova-senha', '/doar', '/privacidade', '/super-admin']
const VISITAS_MINIMAS = 3
const PAUSA_MS = 30 * 24 * 60 * 60 * 1000

function guardado(chave: string) {
    try { return localStorage.getItem(chave) } catch { return null }
}
function guardar(chave: string, valor: string) {
    try { localStorage.setItem(chave, valor) } catch { /* sem armazenamento */ }
}

/** Conta uma visita por sessao do browser e devolve o total. */
function contarVisita() {
    let n = Number(guardado('pwa-visitas')) || 0
    try {
        if (!sessionStorage.getItem('pwa-contada')) {
            sessionStorage.setItem('pwa-contada', '1')
            n += 1
            guardar('pwa-visitas', String(n))
        }
    } catch { /* sem armazenamento */ }
    return n
}

export default function PWAInstallPrompt() {
    const pathname = usePathname()
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [dismissed, setDismissed] = useState(false)
    const publica = pathname === '/' || PUBLICAS.some((p) => pathname?.startsWith(p))

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    useEffect(() => {
        if (publica) return
        if (window.matchMedia('(display-mode: standalone)').matches) { setDismissed(true); return }
        const fechadoEm = Number(guardado('pwa-fechado-em')) || 0
        if (contarVisita() < VISITAS_MINIMAS || Date.now() - fechadoEm < PAUSA_MS) setDismissed(true)
    }, [publica])

    if (publica || !deferredPrompt || dismissed) return null

    const handleInstall = async () => {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
        setDismissed(true)
    }

    const handleDismiss = () => {
        setDismissed(true)
        guardar('pwa-fechado-em', String(Date.now()))
    }

    return (
        <div className="app-novo fixed inset-x-4 z-40 bottom-[calc(76px+env(safe-area-inset-bottom))] md:bottom-4" style={{ background: 'transparent' }}>
            <div className="a-card mx-auto flex max-w-md items-center gap-3 p-3 shadow-lg">
                <Download size={24} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold">Instalar a app</p>
                    <p className="text-[15px] a-suave">Abre mais depressa, a partir do ecrã principal.</p>
                </div>
                <button onClick={handleInstall} className="a-botao a-botao-principal shrink-0 !min-h-[44px]">Instalar</button>
                <button onClick={handleDismiss} className="a-botao shrink-0 !min-h-[44px] !px-2" aria-label="Fechar">
                    <X size={20} aria-hidden />
                </button>
            </div>
        </div>
    )
}

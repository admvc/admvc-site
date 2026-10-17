'use client'

// "Receber avisos no telemovel": pede autorizacao e regista o telemovel para
// as notificacoes (nova escala, vespera e dia do culto). So aparece enquanto
// nao estiver ligado. No iPhone so funciona com a app instalada no ecra.

import { useEffect, useState } from 'react'
import { BellRing, Loader2 } from 'lucide-react'
import CartaoFechavel from './CartaoFechavel'

function chaveParaBytes(base64: string): Uint8Array {
    const pad = '='.repeat((4 - (base64.length % 4)) % 4)
    const bin = window.atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

type Estado = 'a-ver' | 'pode' | 'a-ligar' | 'ligado' | 'bloqueado' | 'instalar-iphone' | 'sem-suporte'

export default function AtivarNotificacoes() {
    const [estado, setEstado] = useState<Estado>('a-ver')
    const [erro, setErro] = useState<string | null>(null)
    const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    useEffect(() => {
        const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent)
        const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            setEstado(iphone && !instalada ? 'instalar-iphone' : 'sem-suporte')
            return
        }
        if (!chave) { setEstado('sem-suporte'); return }
        if (Notification.permission === 'denied') { setEstado('bloqueado'); return }
        navigator.serviceWorker.ready
            .then((reg) => reg.pushManager.getSubscription())
            .then((sub) => {
                setEstado(sub ? 'ligado' : 'pode')
                // Já ligado neste aparelho: volta a dizer ao servidor (só guarda um aparelho por
                // membro e apaga os que expiram — sem isto o aviso podia deixar de chegar)
                if (sub) fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) }).catch(() => {})
            })
            .catch(() => setEstado('pode'))
    }, [chave])

    async function ligar() {
        setErro(null)
        setEstado('a-ligar')
        try {
            const permissao = await Notification.requestPermission()
            if (permissao !== 'granted') { setEstado(permissao === 'denied' ? 'bloqueado' : 'pode'); return }
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveParaBytes(chave!).buffer as ArrayBuffer })
            const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub.toJSON()) })
            if (!r.ok) throw new Error()
            setEstado('ligado')
        } catch {
            setErro('Não foi possível ligar os avisos. Tente outra vez.')
            setEstado('pode')
        }
    }

    if (estado === 'a-ver' || estado === 'ligado' || estado === 'sem-suporte') return null

    return (
        <CartaoFechavel id="ativar-avisos" titulo="Receber avisos no telemóvel">
        <section className="a-card flex flex-wrap items-center gap-3 p-4 pr-20" aria-labelledby="avisos-telemovel">
            <BellRing size={24} style={{ color: 'var(--a-destaque)' }} aria-hidden />
            <div className="min-w-0 flex-1">
                <p id="avisos-telemovel" className="text-[16px] font-bold">Receber avisos no telemóvel</p>
                <p className="text-[15px] a-suave">
                    {estado === 'bloqueado'
                        ? 'Os avisos estão bloqueados. Ligue-os nas definições do telemóvel (Notificações) para esta app.'
                        : estado === 'instalar-iphone'
                            ? 'No iPhone, primeiro instale a app: Partilhar → "Adicionar ao ecrã principal". Depois abra-a por aí.'
                            : 'Quando for escalado, na véspera e no dia do culto.'}
                </p>
                {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
            </div>
            {(estado === 'pode' || estado === 'a-ligar') && (
                <button type="button" className="a-botao a-botao-principal !min-h-[44px]" disabled={estado === 'a-ligar'} onClick={ligar}>
                    {estado === 'a-ligar' && <Loader2 size={18} className="animate-spin" aria-hidden />} Ligar avisos
                </button>
            )}
        </section>
        </CartaoFechavel>
    )
}

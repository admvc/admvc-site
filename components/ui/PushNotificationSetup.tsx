'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing, Loader2, Check } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushNotificationSetup() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'no-key'>('idle')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setStatus('no-key')
      return
    }
    // Verificar se ja tem subscription activa
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setStatus('granted')
        else if (Notification.permission === 'denied') setStatus('denied')
      })
    })
  }, [])

  async function subscribe() {
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) { setStatus('no-key'); return }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      setStatus(res.ok ? 'granted' : 'idle')
    } catch (err) {
      console.error('[PUSH]', err)
      setStatus('idle')
    }
  }

  if (status === 'unsupported' || status === 'no-key') return null
  if (status === 'granted') return null

  if (status === 'denied') {
    return (
      <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-lg bg-red-500/10 text-red-400 text-[7px] font-black uppercase tracking-widest" title="Notificacoes bloqueadas pelo browser">
        <Bell size={12} /> Bloqueado
      </div>
    )
  }

  return (
    <button onClick={subscribe} disabled={status === 'loading'} title="Activar alertas no telemovel"
      className="h-9 px-3 flex items-center gap-1.5 rounded-lg bg-orange-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all animate-pulse disabled:animate-none active:scale-95">
      {status === 'loading' ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
      {status === 'loading' ? 'A activar...' : 'Activar Alertas'}
    </button>
  )
}

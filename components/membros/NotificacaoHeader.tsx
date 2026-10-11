'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, BellRing, X, Heart, MessageSquare, Hash, Users, ArrowRight, UserCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

interface Props {
    avisos?: any[]
    alertasAcolhimento?: any[]
}

export default function NotificacaoHeader({ avisos = [], alertasAcolhimento = [] }: Props) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [flash, setFlash] = useState(false)

    useEffect(() => setMounted(true), [])

    // Detectar novos não lidos
    useEffect(() => {
        if (!mounted) return
        const totalItems = avisos.length + alertasAcolhimento.length
        if (totalItems === 0) return

        const lastReadTime = localStorage.getItem('mural_last_read')
        let newestTime = 0

        if (avisos.length > 0 && avisos[0].createdAt) {
            newestTime = Math.max(newestTime, new Date(avisos[0].createdAt).getTime())
        }
        if (alertasAcolhimento.length > 0 && alertasAcolhimento[0].data_ultima_visita) {
            newestTime = Math.max(newestTime, new Date(alertasAcolhimento[0].data_ultima_visita).getTime())
        }

        if (!lastReadTime || newestTime > Number(lastReadTime)) {
            setHasUnread(true)
            // Flash de alerta para visitantes novos
            if (alertasAcolhimento.some(a => a.status === 'NOVO')) {
                setFlash(true)
                setTimeout(() => setFlash(false), 5000)
            }
        }
    }, [avisos, alertasAcolhimento, mounted])

    // Auto-refresh a cada 30 segundos para detectar novos visitantes
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh()
        }, 30000)
        return () => clearInterval(interval)
    }, [router])

    const handleToggle = useCallback(() => {
        const next = !open
        setOpen(next)
        if (next) {
            let newestTime = 0
            if (avisos.length > 0 && avisos[0].createdAt) {
                newestTime = Math.max(newestTime, new Date(avisos[0].createdAt).getTime())
            }
            if (alertasAcolhimento.length > 0 && alertasAcolhimento[0].data_ultima_visita) {
                newestTime = Math.max(newestTime, new Date(alertasAcolhimento[0].data_ultima_visita).getTime())
            }
            if (newestTime > 0) localStorage.setItem('mural_last_read', newestTime.toString())
            setHasUnread(false)
            setFlash(false)
        }
    }, [open, avisos, alertasAcolhimento])

    // ── Push Notification ──
    const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'no-key'>('idle')

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPushStatus('unsupported'); return }
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) { setPushStatus('no-key'); return }
        navigator.serviceWorker.ready.then(reg => {
            reg.pushManager.getSubscription().then(sub => {
                if (sub) setPushStatus('granted')
                else if (Notification.permission === 'denied') setPushStatus('denied')
            })
        })
    }, [])

    function urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
        const rawData = window.atob(base64)
        const outputArray = new Uint8Array(rawData.length)
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
        return outputArray
    }

    async function subscribePush() {
        setPushStatus('loading')
        try {
            const permission = await Notification.requestPermission()
            if (permission !== 'granted') { setPushStatus('denied'); return }
            const registration = await navigator.serviceWorker.ready
            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidPublicKey) { setPushStatus('no-key'); return }
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
            })
            const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) })
            setPushStatus(res.ok ? 'granted' : 'idle')
        } catch (err) {
            console.error('[PUSH]', err)
            setPushStatus('idle')
        }
    }

    const showPushBanner = pushStatus === 'idle' || pushStatus === 'denied' || pushStatus === 'loading'

    if (!mounted) return null

    const totalAlertas = avisos.length + alertasAcolhimento.length
    const novosVisitantes = alertasAcolhimento.filter(a => a.status === 'NOVO').length

    const formatDate = (dateString: string | Date | undefined | null) => {
        if (!dateString) return '—'
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return '—'
        return new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
    }

    return (
        <div className="relative">
            {/* BOTÃO BELL */}
            <button
                onClick={handleToggle}
                title="Notificacoes"
                className={`relative h-12 w-12 flex items-center justify-center rounded-2xl transition-all shadow-sm ${
                    flash
                        ? 'bg-orange-500 text-white animate-pulse'
                        : open
                            ? 'bg-fg text-bg'
                            : 'bg-bg2 border border-soft text-muted hover:text-fg hover:border-figueira/30'
                }`}
            >
                <Bell size={18} strokeWidth={2.5} />
                {hasUnread && !open && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-bg2 text-[7px] font-black text-white items-center justify-center">
                            {totalAlertas > 9 ? '9+' : totalAlertas}
                        </span>
                    </span>
                )}
            </button>

            {/* BANNER DE ALERTA URGENTE — visitante novo */}
            {flash && novosVisitantes > 0 && !open && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-orange-500 text-white p-3 rounded-xl shadow-xl animate-in slide-in-from-top-2 duration-300 z-50">
                    <div className="flex items-center gap-2">
                        <Heart size={14} className="shrink-0" />
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">
                            {novosVisitantes} novo{novosVisitantes > 1 ? 's' : ''} visitante{novosVisitantes > 1 ? 's' : ''}!
                        </p>
                    </div>
                </div>
            )}

            {/* DROPDOWN */}
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-[340px] bg-bg2 border border-soft rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">

                        <div className="px-4 py-3 border-b border-soft flex items-center justify-between bg-bg">
                            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                <Bell size={13} className="text-figueira" /> Notificacoes
                            </h4>
                            <button onClick={() => setOpen(false)} className="text-muted hover:text-fg p-1 rounded-lg">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2 space-y-2">

                            {/* BANNER ACTIVAR ALERTAS */}
                            {showPushBanner && (
                                <button onClick={subscribePush} disabled={pushStatus === 'loading'}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                                        pushStatus === 'denied'
                                            ? 'bg-red-500/10 border border-red-500/20'
                                            : 'bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                        pushStatus === 'denied' ? 'bg-red-500/20' : 'bg-orange-500/20'
                                    }`}>
                                        {pushStatus === 'loading'
                                            ? <Loader2 size={14} className="text-orange-500 animate-spin" />
                                            : <BellRing size={14} className={pushStatus === 'denied' ? 'text-red-400' : 'text-orange-500'} />
                                        }
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${pushStatus === 'denied' ? 'text-red-400' : 'text-orange-500'}`}>
                                            {pushStatus === 'denied' ? 'Alertas Bloqueados' : pushStatus === 'loading' ? 'A activar...' : 'Activar Alertas'}
                                        </p>
                                        <p className="text-[8px] font-bold text-muted">
                                            {pushStatus === 'denied' ? 'Desbloqueie nas definicoes do browser' : 'Receba notificacoes no telemovel'}
                                        </p>
                                    </div>
                                </button>
                            )}

                            {/* ALERTAS ACOLHIMENTO */}
                            {alertasAcolhimento.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500 px-2 pt-1 flex items-center gap-1">
                                        <Users size={10} /> Acolhimento
                                    </p>
                                    {alertasAcolhimento.map(a => (
                                        <Link key={`a-${a.id}`} href="/departamentos/acolhimento/dashboard" onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                                <Heart size={12} className="text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black uppercase text-fg truncate">{a.nome}</p>
                                                <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{formatDate(a.data_ultima_visita)}</p>
                                            </div>
                                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${a.status === 'NOVO' ? 'bg-orange-500 text-white' : 'bg-soft text-muted'}`}>
                                                {a.status}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {/* AVISOS MURAL */}
                            {avisos.length > 0 && (
                                <div className="space-y-1">
                                    {alertasAcolhimento.length > 0 && <div className="h-px bg-soft mx-2 my-1" />}
                                    <p className="text-[8px] font-black uppercase tracking-widest text-figueira px-2 pt-1 flex items-center gap-1">
                                        <MessageSquare size={10} /> Mural
                                    </p>
                                    {avisos.map(msg => (
                                        <Link key={msg.id} href="/membros/mural" onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-bg border border-soft hover:border-figueira/20 transition-colors">
                                            {msg.autor?.avatar_file ? (
                                                <Image src={msg.autor.avatar_file} alt="" width={28} height={28} className="rounded-lg object-cover border border-soft shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 rounded-lg bg-fg flex items-center justify-center text-bg shrink-0">
                                                    <UserCircle size={12} />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-bold text-fg truncate">{msg.mensagem || msg.texto}</p>
                                                <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                                                    {msg.autor?.first_name} · {formatDate(msg.createdAt)}
                                                </p>
                                            </div>
                                            <span className="text-[7px] font-bold bg-figueira/10 text-figueira px-1.5 py-0.5 rounded border border-figueira/20 shrink-0 truncate max-w-[60px]">
                                                {msg.departamento?.nome || msg.grupo?.nome || 'Geral'}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {totalAlertas === 0 && (
                                <div className="py-8 text-center">
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Sem notificacoes</p>
                                </div>
                            )}
                        </div>

                        {avisos.length > 0 && (
                            <div className="p-2 border-t border-soft">
                                <Link href="/membros/mural" onClick={() => setOpen(false)}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors">
                                    Ver todo o mural <ArrowRight size={11} />
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

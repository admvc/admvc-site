'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Wifi, WifiOff, Volume2, VolumeX, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface Props {
    ip: string
    port: number
}

const CANAIS = Array.from({ length: 32 }, (_, i) => ({
    id: `ch/${String(i + 1).padStart(2, '0')}`,
    label: `CH ${i + 1}`,
    tipo: 'channel' as const,
}))

const MIX_BUS = Array.from({ length: 16 }, (_, i) => ({
    id: `bus/${String(i + 1).padStart(2, '0')}`,
    label: `Bus ${i + 1}`,
    tipo: 'bus' as const,
}))

const MASTERS = [
    { id: 'main/st', label: 'Main L/R', tipo: 'master' as const },
    { id: 'main/m', label: 'Mono/C', tipo: 'master' as const },
]

type Fader = {
    id: string
    label: string
    syncLabel?: string
    tipo: 'channel' | 'bus' | 'master'
    value: number
    muted: boolean
}

export default function X32Client({ ip, port }: Props) {
    const [proxyUrl, setProxyUrl] = useState('ws://localhost:8080')
    const [connected, setConnected] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [faders, setFaders] = useState<Fader[]>([])
    const [vista, setVista] = useState<'channels' | 'bus' | 'master'>('channels')
    const [visiveisCh, setVisiveisCh] = useState(8)
    const [offsetCh, setOffsetCh] = useState(0)
    const wsRef = useRef<WebSocket | null>(null)

    useEffect(() => {
        const all = [...CANAIS, ...MIX_BUS, ...MASTERS].map(c => ({
            ...c, value: 0.75, muted: false
        }))
        setFaders(all)
    }, [])

    const connect = useCallback(async () => {
        if (!ip) return
        setConnecting(true)

        try {
            const ws = new WebSocket(proxyUrl)
            ws.onopen = () => {
                setConnected(true)
                setConnecting(false)
                wsRef.current = ws
                ws.send(JSON.stringify({ type: 'subscribe', target: ip, port }))
            }
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    if (msg.type === 'fader') {
                        setFaders(prev => prev.map(f =>
                            f.id === msg.channel ? { ...f, value: msg.value } : f
                        ))
                    }
                    if (msg.type === 'mute') {
                        setFaders(prev => prev.map(f =>
                            f.id === msg.channel ? { ...f, muted: msg.muted } : f
                        ))
                    }
                    if (msg.type === 'label') {
                        setFaders(prev => prev.map(f =>
                            f.id === msg.channel ? { ...f, syncLabel: msg.name || undefined } : f
                        ))
                    }
                } catch { }
            }
            ws.onclose = () => { setConnected(false); wsRef.current = null }
            ws.onerror = () => { setConnected(false); setConnecting(false) }
        } catch {
            setConnecting(false)
        }
    }, [ip, port, proxyUrl])

    const disconnect = () => {
        wsRef.current?.close()
        setConnected(false)
    }

    const sendFader = (channelId: string, value: number) => {
        setFaders(prev => prev.map(f => f.id === channelId ? { ...f, value } : f))
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'fader',
                channel: channelId,
                value,
                osc: `/${channelId}/mix/fader`
            }))
        }
    }

    const sendMute = (channelId: string) => {
        const fader = faders.find(f => f.id === channelId)
        if (!fader) return
        const newMuted = !fader.muted
        setFaders(prev => prev.map(f => f.id === channelId ? { ...f, muted: newMuted } : f))
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'mute',
                channel: channelId,
                muted: newMuted,
                osc: `/${channelId}/mix/on`
            }))
        }
    }

    if (!ip) {
        return (
            <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center space-y-4">
                <WifiOff size={32} className="mx-auto text-muted/30" />
                <p className="text-sm font-black uppercase tracking-widest text-muted">Mesa nao configurada</p>
                <p className="text-xs text-muted/60">Configure o IP nas <Link href="/admin/midia" className="text-figueira underline">configuracoes de midia</Link>.</p>
            </div>
        )
    }

    const fadersVista = vista === 'channels'
        ? faders.filter(f => f.tipo === 'channel').slice(offsetCh, offsetCh + visiveisCh)
        : vista === 'bus'
            ? faders.filter(f => f.tipo === 'bus')
            : faders.filter(f => f.tipo === 'master')

    return (
        <div className="space-y-4">
            {/* BARRA DE CONEXÃO — compacta */}
            {!connected ? (
                <div className="bg-bg2 border border-soft rounded-2xl px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-soft text-muted flex items-center justify-center shrink-0">
                        <WifiOff size={14} />
                    </div>
                    <input type="text" value={proxyUrl} onChange={e => setProxyUrl(e.target.value)}
                        placeholder="ws://localhost:8080"
                        className="flex-1 min-w-0 bg-bg border border-soft rounded-lg px-3 py-1.5 text-[10px] font-mono text-fg outline-none focus:border-figueira" />
                    <button onClick={connect} disabled={connecting}
                        className="px-3 py-1.5 rounded-lg bg-figueira text-white text-[8px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                        {connecting ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                        Conectar
                    </button>
                </div>
            ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                            Conectado — {ip}:{port}
                        </span>
                    </div>
                    <button onClick={disconnect}
                        className="text-[8px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors">
                        Desligar
                    </button>
                </div>
            )}

            {/* TABS */}
            <div className="flex gap-1.5">
                {[
                    { id: 'channels' as const, label: 'Canais', count: 32 },
                    { id: 'bus' as const, label: 'Mix Bus', count: 16 },
                    { id: 'master' as const, label: 'Master', count: 2 },
                ].map(t => (
                    <button key={t.id} onClick={() => { setVista(t.id); setOffsetCh(0) }}
                        className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${vista === t.id ? 'bg-fg text-bg' : 'text-muted hover:bg-soft/30'}`}>
                        {t.label} <span className="opacity-50 ml-1">{t.count}</span>
                    </button>
                ))}
            </div>

            {/* PAGINAÇÃO */}
            {vista === 'channels' && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setOffsetCh(Math.max(0, offsetCh - visiveisCh))} disabled={offsetCh === 0}
                        className="px-3 py-1.5 rounded-lg bg-bg2 border border-soft text-[9px] font-black uppercase text-muted disabled:opacity-30">
                        ←
                    </button>
                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                        CH {offsetCh + 1}-{Math.min(offsetCh + visiveisCh, 32)}
                    </span>
                    <button onClick={() => setOffsetCh(Math.min(32 - visiveisCh, offsetCh + visiveisCh))} disabled={offsetCh + visiveisCh >= 32}
                        className="px-3 py-1.5 rounded-lg bg-bg2 border border-soft text-[9px] font-black uppercase text-muted disabled:opacity-30">
                        →
                    </button>
                    <select value={visiveisCh} onChange={e => { setVisiveisCh(Number(e.target.value)); setOffsetCh(0) }}
                        className="ml-auto bg-bg2 border border-soft rounded-lg px-2 py-1.5 text-[9px] font-bold text-muted outline-none">
                        <option value={8}>8</option>
                        <option value={16}>16</option>
                        <option value={32}>32</option>
                    </select>
                </div>
            )}

            {/* FADERS */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 overflow-x-auto">
                <div className="flex gap-3 min-w-min">
                    {fadersVista.map(fader => {
                        const displayLabel = fader.syncLabel || fader.label
                        return (
                            <div key={fader.id} className="flex flex-col items-center gap-2 w-16 shrink-0">
                                <span className="text-[8px] font-black text-muted uppercase tracking-widest">
                                    {Math.round(fader.value * 100)}%
                                </span>

                                <div className="relative h-40 w-8 bg-bg border border-soft rounded-lg overflow-hidden">
                                    <div className="absolute bottom-0 left-0 right-0 transition-all duration-100 rounded-b-lg"
                                        style={{
                                            height: `${fader.value * 100}%`,
                                            backgroundColor: fader.muted ? '#ef4444' : fader.value > 0.85 ? '#ef4444' : fader.value > 0.6 ? '#f59e0b' : '#22c55e',
                                            opacity: fader.muted ? 0.3 : 0.6,
                                        }} />
                                    <input type="range" min="0" max="1" step="0.01" value={fader.value}
                                        onChange={e => sendFader(fader.id, Number(e.target.value))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
                                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }} />
                                </div>

                                <button onClick={() => sendMute(fader.id)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-[7px] font-black ${fader.muted ? 'bg-red-500 text-white' : 'bg-bg border border-soft text-muted hover:border-red-500/30'}`}>
                                    {fader.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                </button>

                                <span className="text-[7px] font-black uppercase tracking-widest text-muted text-center leading-tight w-16 truncate" title={displayLabel}>
                                    {displayLabel}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* INFO */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 text-[9px] text-muted/60 space-y-1">
                <p className="font-black uppercase tracking-widest text-muted text-[8px]">Como conectar:</p>
                <p>1. Descarregue e execute o proxy no PC da igreja (mesma rede que o X32)</p>
                <p>2. Clique "Conectar" com o endereco do proxy (default: ws://localhost:8080)</p>
                <p>3. Os nomes dos canais, faders e mutes sincronizam automaticamente</p>
            </div>
        </div>
    )
}

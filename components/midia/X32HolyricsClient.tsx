'use client'

import { useState, useEffect } from 'react'
import {
    Volume2, VolumeX, Headphones, Speaker, Radio, Sliders,
    Lightbulb, Sun, Moon, Sparkles, Zap, Power, Star,
    Music, Heart, Eye, Flame, CloudLightning, Sunrise, Mic, Church,
    WifiOff, Loader2, Settings,
    ChevronDown, ChevronUp, TerminalSquare,
    type LucideIcon
} from 'lucide-react'
import Link from 'next/link'
import type { X32Scene } from '@/actions/midia-actions'

const ICON_MAP: Record<string, LucideIcon> = {
    volume2: Volume2, volumex: VolumeX, headphones: Headphones,
    speaker: Speaker, radio: Radio, sliders: Sliders,
    mic: Mic, music: Music, church: Church, zap: Zap,
    power: Power, star: Star, heart: Heart, lightbulb: Lightbulb,
    sun: Sun, moon: Moon, sparkles: Sparkles, eye: Eye,
    flame: Flame, lightning: CloudLightning, sunrise: Sunrise,
}

type LogItem = {
    id: number
    time: string
    message: string
    type: 'info' | 'success' | 'error' | 'request'
}

interface Props {
    holyricsUrl: string
    holyricsToken: string
    scenes: X32Scene[]
}

export default function X32HolyricsClient({ holyricsUrl, holyricsToken, scenes }: Props) {
    const [status, setStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle')
    const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({})
    const [enviando, setEnviando] = useState<string | null>(null)
    const [logs, setLogs] = useState<LogItem[]>([])
    const [isTerminalOpen, setIsTerminalOpen] = useState(false)

    const baseUrl = holyricsUrl?.replace(/\/$/, '') || ''

    const addLog = (message: string, type: LogItem['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [{ id: Date.now() + Math.random(), time, message, type }, ...prev].slice(0, 30))
    }

    useEffect(() => {
        if (!baseUrl || !holyricsToken) {
            addLog('Holyrics nao configurado. Configure em Admin > Midia.', 'error')
            return
        }
        const connect = async () => {
            setStatus('testing')
            try {
                addLog(`A verificar Holyrics em ${baseUrl}...`, 'request')
                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), 4000)
                const res = await fetch(`${baseUrl}/api/GetMediaPlaylist?token=${holyricsToken}`, { signal: controller.signal })
                clearTimeout(timeout)
                if (res.ok) {
                    setStatus('connected')
                    addLog('Holyrics conectado — pronto para controlar mesa de som', 'success')
                } else {
                    setStatus('error')
                    addLog(`Holyrics respondeu com HTTP ${res.status}`, 'error')
                }
            } catch (err: any) {
                setStatus('error')
                addLog(`Falha na conexao: ${err.name === 'AbortError' ? 'Timeout (4s)' : err.message}`, 'error')
            }
        }
        connect()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const executeAction = async (endpoint: string, actionId: string, label: string) => {
        if (!actionId) { addLog(`[ERRO] ID vazio para "${label}"`, 'error'); return false }
        const ep = endpoint || 'FavoriteAction'
        const url = `${baseUrl}/api/${ep}?token=${holyricsToken}`
        addLog(`[POST] ${ep} → ${actionId} (${label})`, 'request')
        try {
            const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: actionId }) })
            if (res.ok) { const text = await res.text(); addLog(`[OK] ${label} → ${text.substring(0, 80)}`, 'success'); return true }
            else { addLog(`[ERRO HTTP ${res.status}] ${label}`, 'error'); return false }
        } catch (err: any) { addLog(`[ERRO] ${label}: ${err.message}`, 'error'); return false }
    }

    const handleClick = async (scene: X32Scene) => {
        if (status !== 'connected') { addLog('[BLOQUEADO] Holyrics nao conectado', 'error'); return }
        setEnviando(scene.id)
        if (scene.tipo === 'push') {
            await executeAction(scene.endpoint, scene.scriptOn, scene.nome)
        } else {
            const isOn = toggleStates[scene.id] || false
            const actionId = isOn ? (scene.scriptOff || '') : scene.scriptOn
            const ok = await executeAction(scene.endpoint, actionId, `${scene.nome} ${isOn ? 'OFF' : 'ON'}`)
            if (ok) setToggleStates(prev => ({ ...prev, [scene.id]: !isOn }))
        }
        setEnviando(null)
    }

    const isDisabled = status !== 'connected'

    const corClasses: Record<string, { idle: string; active: string }> = {
        blue:    { idle: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white', active: 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/30' },
        purple:  { idle: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500 hover:text-white', active: 'bg-purple-500 text-white border-purple-500 shadow-lg shadow-purple-500/30' },
        amber:   { idle: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-white', active: 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30' },
        indigo:  { idle: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500 hover:text-white', active: 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30' },
        emerald: { idle: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white', active: 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30' },
        red:     { idle: 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white', active: 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30' },
        pink:    { idle: 'bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500 hover:text-white', active: 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/30' },
        cyan:    { idle: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500 hover:text-white', active: 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/30' },
    }

    if (!holyricsUrl) {
        return (
            <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center space-y-4">
                <WifiOff size={32} className="mx-auto text-muted/30" />
                <p className="text-sm font-black uppercase tracking-widest text-muted">Holyrics nao configurado</p>
                <p className="text-xs text-muted/60">Configure o Holyrics nas <Link href="/admin/midia" className="text-figueira underline">configuracoes de midia</Link>.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : status === 'testing' ? 'bg-soft text-muted' : 'bg-red-500/10 text-red-400'}`}>
                        {status === 'testing' ? <Loader2 size={18} className="animate-spin" /> : <Sliders size={18} />}
                    </div>
                    <div>
                        <p className="text-sm font-black text-fg uppercase tracking-widest">Mesa de Som</p>
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                            {status === 'connected' ? 'Conectado via Holyrics' : status === 'testing' ? 'A conectar...' : 'Desconectado'}
                        </p>
                    </div>
                </div>
                <Link href="/admin/midia" className="text-[8px] font-bold uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-1">
                    <Settings size={10} /> Config
                </Link>
            </div>

            {scenes.length > 0 ? (
                <div className={`grid grid-cols-2 sm:grid-cols-3 gap-3 transition-all ${isDisabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    {scenes.map(scene => {
                        const Icon = ICON_MAP[scene.icone] || Volume2
                        const isOn = scene.tipo === 'toggle' && toggleStates[scene.id]
                        const corConfig = corClasses[scene.cor] || corClasses.blue
                        return (
                            <button key={scene.id} onClick={() => handleClick(scene)} disabled={enviando !== null}
                                className={`p-5 rounded-2xl border-2 transition-all active:scale-95 text-left space-y-2 ${isOn ? corConfig.active : corConfig.idle}`}>
                                <div className="flex items-center justify-between">
                                    <Icon size={20} />
                                    {enviando === scene.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : scene.tipo === 'toggle' ? (
                                        <span className="text-[7px] font-black uppercase tracking-widest opacity-60">{isOn ? 'ON' : 'OFF'}</span>
                                    ) : (
                                        <span className="text-[7px] font-black uppercase tracking-widest opacity-40">PUSH</span>
                                    )}
                                </div>
                                <p className="text-sm font-black uppercase tracking-widest">{scene.nome || 'Sem nome'}</p>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-bg2 border border-soft rounded-2xl p-6 text-center space-y-2">
                    <Sliders size={24} className="mx-auto text-muted/30" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum preset configurado</p>
                    <p className="text-[9px] text-muted/60">Configure os presets em <Link href="/admin/midia" className="text-figueira underline">Admin &gt; Midia</Link>.</p>
                </div>
            )}

            <div className="bg-black/95 rounded-2xl shadow-inner flex flex-col overflow-hidden border border-white/10 shrink-0 transition-all duration-300">
                <button onClick={() => setIsTerminalOpen(!isTerminalOpen)}
                    className="bg-white/5 hover:bg-white/10 p-3 flex items-center justify-between w-full transition-colors active:bg-white/15">
                    <div className="flex items-center gap-2">
                        <TerminalSquare size={14} className="text-white/60" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Terminal {logs.length > 0 && `(${logs.length})`}</span>
                    </div>
                    {isTerminalOpen ? <ChevronDown size={14} className="text-white/60" /> : <ChevronUp size={14} className="text-white/60" />}
                </button>
                {isTerminalOpen && (
                    <div className="p-3 h-40 overflow-y-auto font-mono text-[9px] space-y-1.5 bg-black/50 scrollbar-hide">
                        {logs.length === 0 ? (
                            <p className="text-white/30 text-center italic mt-10">A aguardar comandos...</p>
                        ) : logs.map(log => (
                            <div key={log.id} className="flex gap-2 leading-relaxed border-b border-white/5 pb-1">
                                <span className="text-white/30 shrink-0">[{log.time}]</span>
                                <span className={`break-all ${log.type === 'request' ? 'text-blue-400' : log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400 font-bold' : 'text-white/60'}`}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

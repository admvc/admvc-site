'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    MonitorPlay, CheckCircle2, XCircle, Loader2,
    ChevronDown, ChevronUp, TerminalSquare, Wifi, Trash2
} from 'lucide-react'

type LogEntry = {
    id: number
    time: string
    message: string
    type: 'info' | 'success' | 'error' | 'request'
}

interface Props {
    holyricsUrl?: string | null
    holyricsToken?: string | null
}

export default function HolyricsLogPanel({ holyricsUrl, holyricsToken }: Props) {
    const [open, setOpen] = useState(false)
    const [status, setStatus] = useState<'idle' | 'checking' | 'online' | 'offline'>('idle')
    const [logs, setLogs] = useState<LogEntry[]>([])
    const ip = holyricsUrl || ''
    const token = holyricsToken || ''
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
        const time = new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setLogs(prev => [{ id: Date.now() + Math.random(), time, message, type }, ...prev].slice(0, 50))
    }, [])

    const checkConnection = useCallback(async (baseUrl: string, apiToken: string, silent = false) => {
        if (!baseUrl) return
        if (!silent) setStatus('checking')
        try {
            if (!silent) addLog(`A verificar ${baseUrl}...`, 'request')
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 4000)
            const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/GetMediaPlaylist?token=${apiToken}`, { signal: controller.signal })
            clearTimeout(timeout)

            if (res.ok) {
                setStatus('online')
                if (!silent) addLog('Holyrics online e acessivel', 'success')
            } else {
                setStatus('offline')
                addLog(`Holyrics respondeu com HTTP ${res.status}`, 'error')
            }
        } catch (err: any) {
            setStatus('offline')
            const msg = err.name === 'AbortError' ? 'Timeout (4s)' : err.message
            if (!silent) addLog(`Sem resposta: ${msg}`, 'error')
        }
    }, [addLog])

    // Initial check on mount
    useEffect(() => {
        if (ip) {
            checkConnection(ip, token)
        } else {
            addLog('Nenhuma configuracao Holyrics encontrada. Configure em Admin > Midia.', 'info')
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Periodic health check every 30s when panel is open
    useEffect(() => {
        if (open && ip) {
            intervalRef.current = setInterval(() => {
                checkConnection(ip, token, true)
            }, 30000)
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current)
        }
    }, [open, ip, token, checkConnection])

    const statusColor = status === 'online' ? 'bg-green-500' : status === 'offline' ? 'bg-red-500' : 'bg-soft'
    const statusLabel = status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : status === 'checking' ? 'A verificar...' : 'Sem config'

    return (
        <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-soft/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${statusColor} ${status === 'checking' ? 'animate-pulse' : ''}`} />
                    <MonitorPlay size={14} className="text-figueira" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-fg">Holyrics</h2>
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${status === 'online' ? 'bg-green-500/10 text-green-600' : status === 'offline' ? 'bg-red-500/10 text-red-500' : 'bg-soft text-muted'}`}>
                        {statusLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {logs.length > 0 && (
                        <span className="text-[8px] font-bold bg-soft px-2 py-0.5 rounded text-muted">{logs.length} logs</span>
                    )}
                    {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-soft animate-in slide-in-from-top-1 duration-200">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-5 py-2 border-b border-soft/50 bg-soft/5">
                        <div className="flex items-center gap-2">
                            <TerminalSquare size={12} className="text-muted" />
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted">
                                {ip ? ip.replace(/^https?:\/\//, '') : 'Nao configurado'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => checkConnection(ip, token)}
                                disabled={!ip || status === 'checking'}
                                className="text-[8px] font-bold uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-1 disabled:opacity-30"
                            >
                                {status === 'checking' ? <Loader2 size={10} className="animate-spin" /> : <Wifi size={10} />}
                                Testar
                            </button>
                            <button
                                onClick={() => setLogs([])}
                                className="text-[8px] font-bold uppercase tracking-widest text-muted hover:text-red-500 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={10} /> Limpar
                            </button>
                        </div>
                    </div>

                    {/* Log entries */}
                    <div className="bg-black/95 p-3 max-h-48 overflow-y-auto font-mono text-[9px] space-y-1 scrollbar-hide">
                        {logs.length === 0 ? (
                            <p className="text-white/30 text-center italic py-6">Sem logs</p>
                        ) : (
                            logs.map((log) => (
                                <div key={log.id} className="flex gap-2 leading-relaxed border-b border-white/5 pb-1">
                                    <span className="text-white/30 shrink-0">[{log.time}]</span>
                                    <span className={`break-all ${
                                        log.type === 'request' ? 'text-blue-400' :
                                        log.type === 'success' ? 'text-green-400' :
                                        log.type === 'error' ? 'text-red-400 font-bold' :
                                        'text-white/60'
                                    }`}>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </section>
    )
}

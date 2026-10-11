'use client'
// components/louvor/ModalRepertorio.tsx
// Actualizado: links de letra/cifra/áudio/vídeo, formulário manual completo,
// botão de editar links inline na lista

import { useState, useRef, useEffect, useTransition } from 'react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import {
    Music, Youtube, Save, ChevronRight, Hash, GripVertical, Trash2,
    Loader2, X, Plus, CheckCircle2, ListMusic, MonitorUp, Search,
    RefreshCcw, FileText, Guitar, Headphones, ExternalLink,
    Gauge, TerminalSquare, ChevronUp, ChevronDown, Link as LinkIcon
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    adicionarMusicaLocalAoEvento,
    removerMusicaDoRepertorio,
    atualizarOrdemRepertorio,
    sincronizarAcervoLocal,
    buscarMusicasLocalmente,
    adicionarMusicaManualAoEvento,
} from '@/actions/louvor-actions'
import Portal from '@/components/ui/Portal'
import ModalEditarLinksMusica from '@/components/louvor/ModalEditarLinksMusica'

type Musica = {
    id: string
    titulo: string
    artista?: string | null
    tom?: string | null
    bpm?: number | null
    link_video?: string | null
    link_letra?: string | null
    link_cifra?: string | null
    link_audio?: string | null
    holyrics_id?: string | null
}

type RepertorioItem = {
    id: string
    ordem: number
    tom_tocado: string
    musica: Musica
}

interface Props {
    eventoId: number
    repertorioInical: RepertorioItem[]
    podeEditar: boolean
}

// Botões de link com ícone e cor
function BotaoLink({ href, icon, label, cor }: { href: string; icon: React.ReactNode; label: string; cor: string }) {
    if (!href) return null
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all hover:opacity-80 active:scale-95 ${cor}`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </a>
    )
}

export default function ModalRepertorio({ eventoId, repertorioInical, podeEditar }: Props) {
    const confirmar = useConfirm()
    const toast = useToast()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [logsAbertos, setLogsAbertos] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [lista, setLista] = useState<RepertorioItem[]>([])

    // Estados Adicionar
    const [isAdding, setIsAdding] = useState(false)
    const [busca, setBusca] = useState('')
    const [resultados, setResultados] = useState<any[]>([])
    const [musicaSelecionada, setMusicaSelecionada] = useState<any | null>(null)
    const [tom, setTom] = useState('')
    const [erro, setErro] = useState('')

    // Estados Manual (expandido)
    const [isAddingManual, setIsAddingManual] = useState(false)
    const [tituloManual, setTituloManual] = useState('')
    const [artistaManual, setArtistaManual] = useState('')
    const [tomOriginalManual, setTomOriginalManual] = useState('')
    const [bpmManual, setBpmManual] = useState('')
    const [linkVideoManual, setLinkVideoManual] = useState('')
    const [linkLetraManual, setLinkLetraManual] = useState('')
    const [linkCifraManual, setLinkCifraManual] = useState('')
    const [linkAudioManual, setLinkAudioManual] = useState('')

    // Estados Holyrics
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncLogs, setSyncLogs] = useState<{ id: number; time: string; msg: string; type: string }[]>([])
    const [isSendingToHolyrics, setIsSendingToHolyrics] = useState(false)
    const [holyricsMsg, setHolyricsMsg] = useState({ text: '', type: '' })

    const dragItem = useRef<number | null>(null)
    const dragOverItem = useRef<number | null>(null)

    useEffect(() => {
        setLista([...repertorioInical].sort((a, b) => a.ordem - b.ordem))
    }, [repertorioInical])

    const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
        const time = new Date().toLocaleTimeString('pt-PT', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        setSyncLogs(prev => [...prev, { id: Date.now() + Math.random(), time, msg, type }])
    }

    // Actualiza a música na lista local após editar links (sem reload)
    const handleMusicaActualizada = (musicaId: string, musicaActualizada: Musica) => {
        setLista(prev => prev.map(item =>
            item.musica.id === musicaId
                ? { ...item, musica: { ...item.musica, ...musicaActualizada } }
                : item
        ))
    }

    // ── ADICIONAR MANUAL ──────────────────────────────────────────────────────
    const handleAddManual = async () => {
        if (!tituloManual.trim() || !tom.trim()) return setErro('Nome e tom são obrigatórios!')
        setErro('')
        startTransition(async () => {
            const res = await adicionarMusicaManualAoEvento(
                eventoId,
                tituloManual,
                artistaManual,
                tom,
                linkVideoManual || undefined,
                linkLetraManual || undefined,
                linkCifraManual || undefined,
                linkAudioManual || undefined,
                tomOriginalManual || undefined,
                bpmManual ? Number(bpmManual) : undefined,
            )
            if (res.success) {
                setTituloManual(''); setArtistaManual(''); setTom('')
                setTomOriginalManual(''); setBpmManual('')
                setLinkVideoManual(''); setLinkLetraManual('')
                setLinkCifraManual(''); setLinkAudioManual('')
                setIsAddingManual(false)
                router.refresh()
            } else {
                setErro(res.error || 'Erro ao adicionar música.')
            }
        })
    }

    // ── SYNC HOLYRICS (igual ao original) ────────────────────────────────────
    const handleSyncAcervo = async () => {
        const ip = localStorage.getItem('holyrics_ip')
        const token = localStorage.getItem('holyrics_token')
        if (!ip || !token) { toast('Conecte ao Holyrics primeiro no menu Ferramentas.', 'aviso'); return }
        if (!await confirmar({ mensagem: 'Sincronizar base com o Holyrics?', tipo: 'info' })) return

        setIsSyncing(true); setSyncLogs([])
        addLog('A conectar ao Holyrics...', 'info')

        try {
            const res = await fetch(`${ip.replace(/\/$/, '')}/api/SearchSong?token=${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: '', limit: 10000, size: 10000, max: 10000 })
            })
            const json = await res.json()
            let musicasParaSincronizar: any[] = []

            if (json.status === 'ok' && json.data) {
                musicasParaSincronizar = json.data

                if (musicasParaSincronizar.length === 50) {
                    addLog('Limite de 50. A iniciar varredura A-Z...', 'info')
                    const mapMusicas = new Map()
                    musicasParaSincronizar.forEach((m: any) => mapMusicas.set(m.id, m))
                    for (const letra of 'abcdefghijklmnopqrstuvwxyz'.split('')) {
                        const r = await fetch(`${ip.replace(/\/$/, '')}/api/SearchSong?token=${token}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: letra, title: true, limit: 1000 })
                        })
                        const j = await r.json()
                        if (j.status === 'ok' && j.data) j.data.forEach((m: any) => mapMusicas.set(m.id, m))
                    }
                    musicasParaSincronizar = Array.from(mapMusicas.values())
                }

                const total = musicasParaSincronizar.length
                addLog(`${total} músicas encontradas. A gravar...`, 'info')

                let totalInseridas = 0; let totalAtualizadas = 0
                const chunkSize = 100

                for (let i = 0; i < total; i += chunkSize) {
                    const chunk = musicasParaSincronizar.slice(i, i + chunkSize)
                    addLog(`Lote ${Math.floor(i / chunkSize) + 1}/${Math.ceil(total / chunkSize)}...`, 'info')
                    const syncRes = await sincronizarAcervoLocal(chunk)
                    if (syncRes.success) {
                        totalInseridas += syncRes.inseridas || 0
                        totalAtualizadas += syncRes.atualizadas || 0
                    } else throw new Error(syncRes.error)
                }

                addLog(`Concluído! ${totalInseridas} novas, ${totalAtualizadas} actualizadas.`, 'success')
            }
        } catch (error: any) {
            addLog(`Erro: ${error.message}`, 'error')
        } finally {
            setIsSyncing(false)
        }
    }

    // ── BUSCAR LOCAL ──────────────────────────────────────────────────────────
    const handleBuscarLocal = async () => {
        if (!busca.trim()) return
        startTransition(async () => {
            const res = await buscarMusicasLocalmente(busca)
            if (res.success && res.data) setResultados(res.data)
        })
    }

    const handleAdd = async () => {
        if (!musicaSelecionada || !tom.trim()) return setErro('Selecione uma música e informe o tom!')
        setErro('')
        startTransition(async () => {
            const res = await adicionarMusicaLocalAoEvento(eventoId, musicaSelecionada.id, tom)
            if (res.success) {
                setBusca(''); setResultados([]); setMusicaSelecionada(null); setTom(''); setIsAdding(false)
                router.refresh()
            } else {
                setErro(res.error || 'Erro ao adicionar música.')
            }
        })
    }

    const enviarParaHolyrics = async () => {
        if (lista.length === 0) return
        const ip = localStorage.getItem('holyrics_ip')
        const token = localStorage.getItem('holyrics_token')
        if (!ip || !token) { setHolyricsMsg({ text: '⚠️ Conecte ao Holyrics.', type: 'error' }); return }

        setIsSendingToHolyrics(true)
        const ids = lista.map(i => i.musica.holyrics_id).filter(Boolean)

        if (ids.length === 0) {
            setHolyricsMsg({ text: '⚠️ Músicas não vinculadas. Sincronize.', type: 'error' })
            setIsSendingToHolyrics(false); setTimeout(() => setHolyricsMsg({ text: '', type: '' }), 4000); return
        }

        try {
            const res = await fetch(`${ip.replace(/\/$/, '')}/api/AddSongsToPlaylist?token=${token}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            })
            setHolyricsMsg(res.ok
                ? { text: '✅ Enviado para o telão!', type: 'success' }
                : { text: '❌ Holyrics recusou o pedido.', type: 'error' })
        } catch {
            setHolyricsMsg({ text: '❌ Sem conexão com a Mídia.', type: 'error' })
        } finally {
            setIsSendingToHolyrics(false); setTimeout(() => setHolyricsMsg({ text: '', type: '' }), 5000)
        }
    }

    const handleDrop = async () => {
        if (dragItem.current === null || dragOverItem.current === null) return
        let _lista = [...lista]
        const dragged = _lista.splice(dragItem.current, 1)[0]
        _lista.splice(dragOverItem.current, 0, dragged)
        dragItem.current = null; dragOverItem.current = null
        setLista(_lista)
        const payload = _lista.map((item, i) => ({ id: item.id, ordem: i + 1 }))
        startTransition(async () => { await atualizarOrdemRepertorio(payload) })
    }

    const handleDelete = async (id: string) => {
        if (!await confirmar({ mensagem: 'Remover esta música?', tipo: 'perigo' })) return
        startTransition(async () => { await removerMusicaDoRepertorio(id); router.refresh() })
    }

    // Teclado de tons reutilizável
    const TecladoTons = ({ value, onChange, cor = 'figueira' }: { value: string; onChange: (v: string) => void; cor?: string }) => (
        <div className="bg-bg border border-soft p-1.5 rounded-2xl shadow-inner">
            <div className="grid grid-cols-6 gap-1 mb-1.5">
                {['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'].map(nota => {
                    const sel = value.replace('m', '') === nota
                    return (
                        <button key={nota} type="button"
                            onClick={() => onChange(nota + (value.endsWith('m') ? 'm' : ''))}
                            className={`py-2.5 text-xs font-black rounded-xl transition-all border
                                ${sel ? 'bg-figueira text-white border-figueira shadow-md scale-105 z-10' : 'bg-bg text-muted border-soft hover:border-figueira/40 hover:text-fg'}`}>
                            {nota}
                        </button>
                    )
                })}
            </div>
            <div className="flex gap-1.5 h-9">
                <button type="button"
                    onClick={() => onChange(value.endsWith('m') ? value.slice(0, -1) : value + 'm')}
                    className={`flex-1 text-[10px] font-black uppercase rounded-xl border transition-all
                        ${value.endsWith('m') ? 'bg-slate-800 text-white border-slate-800' : 'bg-bg text-muted border-soft hover:bg-slate-100 hover:text-slate-800'}`}>
                    Menor (m)
                </button>
                <input type="text" value={value}
                    onChange={e => { let v = e.target.value; if (v.endsWith('M')) v = v.slice(0, -1) + 'm'; onChange(v.charAt(0).toUpperCase() + v.slice(1)) }}
                    maxLength={7} placeholder="G/B, D/F#..."
                    className="flex-[1.5] bg-bg border border-soft rounded-xl px-3 text-sm font-black outline-none focus:border-figueira text-center" />
            </div>
        </div>
    )

    return (
        <>
            {/* BOTÃO TRIGGER */}
            <button onClick={() => setIsOpen(true)}
                className="group relative w-full overflow-hidden rounded-2xl border border-soft bg-bg2 p-1 transition-all hover:border-figueira/40 hover:shadow-xl hover:shadow-figueira/5 active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-r from-figueira/0 via-figueira/5 to-figueira/0 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="relative flex items-center justify-between bg-bg rounded-[1.75rem] p-3 sm:p-4 border border-transparent group-hover:border-soft/50 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-figueira/10 text-figueira shadow-inner transition-all group-hover:bg-figueira group-hover:text-white group-hover:rotate-6">
                                <ListMusic size={22} strokeWidth={2.5} />
                            </div>
                            {lista.length > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-fg text-[9px] font-black text-bg shadow-lg border-2 border-bg">
                                    {lista.length}
                                </span>
                            )}
                        </div>
                        <div className="text-left">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.15em] text-muted group-hover:text-figueira transition-colors">Setlist & Tons</h4>
                            <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">Repertório</h3>
                        </div>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft/30 text-muted transition-all group-hover:bg-figueira group-hover:text-white group-hover:translate-x-1 shadow-sm shrink-0">
                        <ChevronRight size={18} strokeWidth={3} />
                    </div>
                </div>
            </button>

            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden relative">

                            {holyricsMsg.text && (
                                <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl animate-in slide-in-from-top-4 flex items-center gap-2
                                    ${holyricsMsg.type === 'error' ? 'bg-red-500 text-white' : holyricsMsg.type === 'success' ? 'bg-green-500 text-white' : 'bg-blue-500 text-white'}`}>
                                    {holyricsMsg.text}
                                </div>
                            )}

                            {/* HEADER */}
                            <div className="flex items-center justify-between p-6 border-b border-soft bg-bg2 shrink-0">
                                <div className="flex items-center gap-3">
                                    <ListMusic size={22} className="text-figueira" />
                                    <div>
                                        <h2 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-none">Repertório</h2>
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Lista de músicas do culto</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)}
                                    className="w-10 h-10 bg-soft/20 rounded-full flex items-center justify-center text-muted hover:bg-red-500 hover:text-white transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">

                                {/* HOLYRICS SYNC */}
                                {podeEditar && (
                                    <div className="mb-4">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-soft/5 border border-soft rounded-2xl p-3">
                                            <div className="flex items-center gap-2 px-2">
                                                <MonitorUp size={14} className="text-muted" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Holyrics Sync</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button onClick={handleSyncAcervo} disabled={isSyncing}
                                                    className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-bg border border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:text-blue-500 transition-colors px-4 py-2.5 rounded-xl active:scale-95 disabled:opacity-50">
                                                    {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                                                    Sincronizar Base
                                                </button>
                                                {lista.length > 0 && (
                                                    <button onClick={enviarParaHolyrics} disabled={isSendingToHolyrics}
                                                        className="flex flex-1 sm:flex-none justify-center items-center gap-2 bg-bg border border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors px-4 py-2.5 rounded-xl active:scale-95 disabled:opacity-50">
                                                        {isSendingToHolyrics ? <Loader2 size={12} className="animate-spin" /> : <MonitorUp size={12} />}
                                                        Enviar P/ Telão
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {syncLogs.length > 0 && (
                                            <div className="mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setLogsAbertos(!logsAbertos)}
                                                    className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted hover:text-fg transition-colors px-1"
                                                >
                                                    <TerminalSquare size={11} />
                                                    Ver logs ({syncLogs.length})
                                                    {logsAbertos ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                                </button>
                                                {logsAbertos && (
                                                    <div className="mt-1.5 p-3 bg-black/90 rounded-xl h-28 overflow-y-auto font-mono text-[10px] space-y-1 scrollbar-hide animate-in slide-in-from-top-2">
                                                        {syncLogs.map(log => (
                                                            <div key={log.id} className="flex gap-2 border-b border-white/5 pb-1">
                                                                <span className="text-white/30 shrink-0">[{log.time}]</span>
                                                                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-blue-300'}>
                                                                    {log.msg}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* BOTÕES ADICIONAR */}
                                {podeEditar && (
                                    <div className="mb-4">
                                        {!isAdding && !isAddingManual ? (
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <button onClick={() => setIsAdding(true)}
                                                    className="flex-1 py-4 border-2 border-dashed border-soft hover:border-figueira/50 rounded-2xl flex items-center justify-center gap-2 text-muted hover:text-figueira transition-colors text-[10px] font-black uppercase tracking-widest bg-bg2">
                                                    <Search size={16} /> Buscar no Acervo
                                                </button>
                                                <button onClick={() => setIsAddingManual(true)}
                                                    className="flex-1 py-4 border-2 border-dashed border-soft hover:border-blue-500/50 rounded-2xl flex items-center justify-center gap-2 text-muted hover:text-blue-500 transition-colors text-[10px] font-black uppercase tracking-widest bg-bg2">
                                                    <Plus size={16} /> Nova (Manual)
                                                </button>
                                            </div>

                                        ) : isAdding ? (
                                            /* BUSCAR NO ACERVO */
                                            <div className="p-5 bg-bg2 border border-soft rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-[11px] font-black text-fg uppercase tracking-widest">Adicionar da Base</h4>
                                                    <button onClick={() => setIsAdding(false)} className="text-muted hover:text-red-500"><X size={16} /></button>
                                                </div>
                                                {!musicaSelecionada ? (
                                                    <>
                                                        <div className="flex gap-2">
                                                            <input type="text" value={busca}
                                                                onChange={e => setBusca(e.target.value)}
                                                                onKeyDown={e => e.key === 'Enter' && handleBuscarLocal()}
                                                                className="flex-1 bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-figueira"
                                                                placeholder="Pesquise por nome ou artista..." />
                                                            <button onClick={handleBuscarLocal} disabled={isPending || !busca}
                                                                className="bg-figueira text-white px-4 rounded-xl hover:bg-figueira/90 disabled:opacity-50">
                                                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                                            </button>
                                                        </div>
                                                        {resultados.length > 0 && (
                                                            <div className="max-h-40 overflow-y-auto bg-bg border border-soft rounded-xl p-1 shadow-inner">
                                                                {resultados.map(m => (
                                                                    <button key={m.id} onClick={() => setMusicaSelecionada(m)}
                                                                        className="w-full text-left p-3 hover:bg-soft/30 rounded-lg transition-colors flex justify-between items-center group">
                                                                        <div>
                                                                            <span className="text-xs font-black text-fg group-hover:text-figueira block">{m.titulo}</span>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                {m.artista && <span className="text-[9px] font-bold text-muted uppercase">{m.artista}</span>}
                                                                                {m.tom && <span className="text-[8px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">Tom: {m.tom}</span>}
                                                                                {/* Indicadores de links disponíveis */}
                                                                                <div className="flex gap-1">
                                                                                    {m.link_letra && <span className="w-2 h-2 rounded-full bg-blue-400" title="Tem letra" />}
                                                                                    {m.link_cifra && <span className="w-2 h-2 rounded-full bg-orange-400" title="Tem cifra" />}
                                                                                    {m.link_audio && <span className="w-2 h-2 rounded-full bg-green-400" title="Tem áudio" />}
                                                                                    {m.link_video && <span className="w-2 h-2 rounded-full bg-red-400" title="Tem vídeo" />}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="space-y-4 animate-in slide-in-from-right-2">
                                                        <div className="p-3 bg-soft/10 border border-soft rounded-xl flex justify-between items-center">
                                                            <div>
                                                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest">Selecionada</p>
                                                                <h4 className="text-sm font-black text-fg">{musicaSelecionada.titulo}</h4>
                                                                {musicaSelecionada.tom && (
                                                                    <p className="text-[9px] text-blue-500 font-bold uppercase mt-0.5">Tom original: {musicaSelecionada.tom}</p>
                                                                )}
                                                            </div>
                                                            <button onClick={() => setMusicaSelecionada(null)} className="text-[9px] text-figueira uppercase font-black underline">Trocar</button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                                                                <Hash size={12} className="text-figueira" /> Tom para este culto *
                                                            </label>
                                                            <TecladoTons value={tom} onChange={setTom} />
                                                        </div>
                                                        {erro && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{erro}</p>}
                                                        <button onClick={handleAdd} disabled={isPending || !tom}
                                                            className="w-full bg-figueira text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                                                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Adicionar à Escala
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                        ) : (
                                            /* FORMULÁRIO MANUAL COMPLETO */
                                            <div className="p-5 bg-bg2 border-2 border-blue-500/20 rounded-2xl space-y-4 animate-in slide-in-from-top-2">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                        <h4 className="text-[11px] font-black text-fg uppercase tracking-widest">Nova Música (Manual)</h4>
                                                    </div>
                                                    <button onClick={() => setIsAddingManual(false)} className="text-muted hover:text-red-500"><X size={16} /></button>
                                                </div>

                                                <p className="text-[9px] font-bold text-muted uppercase tracking-widest leading-relaxed">
                                                    Insere aqui e depois adiciona ao Holyrics — ao sincronizar o ID é ligado automaticamente.
                                                </p>

                                                {/* NOME + ARTISTA */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest">Titulo *</label>
                                                        <input value={tituloManual} onChange={e => setTituloManual(e.target.value)}
                                                            placeholder="Nome exacto da música"
                                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest">Artista</label>
                                                        <input value={artistaManual} onChange={e => setArtistaManual(e.target.value)}
                                                            placeholder="Banda / Artista"
                                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none" />
                                                    </div>
                                                </div>

                                                {/* TOM ORIGINAL + BPM */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                                                            <Hash size={9} /> Tom Original
                                                        </label>
                                                        <input value={tomOriginalManual} onChange={e => setTomOriginalManual(e.target.value)}
                                                            placeholder="Ex: G, Am, F#"
                                                            maxLength={5}
                                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                                                            <Gauge size={9} /> BPM
                                                        </label>
                                                        <input type="number" value={bpmManual} onChange={e => setBpmManual(e.target.value)}
                                                            placeholder="Ex: 72" min={40} max={240}
                                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none" />
                                                    </div>
                                                </div>

                                                {/* LINKS */}
                                                <div className="space-y-2.5 pt-2 border-t border-soft">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Links de Recursos (opcional)</p>
                                                    {[
                                                        { label: 'Letra', icon: <FileText size={10} />, value: linkLetraManual, set: setLinkLetraManual, placeholder: 'letras.mus.br/...', cor: 'focus:border-blue-500' },
                                                        { label: 'Cifra', icon: <Guitar size={10} />, value: linkCifraManual, set: setLinkCifraManual, placeholder: 'cifraclub.com.br/...', cor: 'focus:border-orange-500' },
                                                        { label: 'Audio', icon: <Headphones size={10} />, value: linkAudioManual, set: setLinkAudioManual, placeholder: 'open.spotify.com/...', cor: 'focus:border-green-500' },
                                                        { label: 'Video', icon: <Youtube size={10} />, value: linkVideoManual, set: setLinkVideoManual, placeholder: 'youtube.com/watch?v=...', cor: 'focus:border-red-500' },
                                                    ].map(campo => (
                                                        <div key={campo.label} className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted w-10 shrink-0 flex items-center gap-1">
                                                                {campo.icon} {campo.label}
                                                            </span>
                                                            <input type="url" value={campo.value} onChange={e => campo.set(e.target.value)}
                                                                placeholder={campo.placeholder}
                                                                className={`flex-1 bg-bg border border-soft rounded-xl px-3 py-2 text-[10px] font-bold outline-none ${campo.cor}`} />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* TOM PARA O CULTO */}
                                                <div className="space-y-2 pt-2 border-t border-soft">
                                                    <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1">
                                                        <Hash size={9} className="text-blue-500" /> Tom para este culto *
                                                    </label>
                                                    <TecladoTons value={tom} onChange={setTom} />
                                                </div>

                                                {erro && <p className="text-[10px] text-red-500 font-bold uppercase text-center">{erro}</p>}

                                                <button onClick={handleAddManual} disabled={isPending || !tituloManual || !tom}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Gravar e Adicionar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* LISTA DE MÚSICAS */}
                                {lista.length === 0 ? (
                                    <div className="py-10 text-center opacity-50">
                                        <Music size={32} className="mx-auto mb-3 text-muted" />
                                        <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">Nenhuma música na escala ainda.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 relative">
                                        {isPending && (
                                            <div className="absolute inset-0 bg-bg/50 backdrop-blur-[1px] z-10 rounded-2xl flex items-center justify-center">
                                                <Loader2 size={24} className="animate-spin text-figueira" />
                                            </div>
                                        )}
                                        {lista.map((item, index) => {
                                            const m = item.musica
                                            const temLinks = m.link_letra || m.link_cifra || m.link_audio || m.link_video
                                            return (
                                                <div key={item.id}
                                                    draggable={podeEditar}
                                                    onDragStart={() => (dragItem.current = index)}
                                                    onDragEnter={() => (dragOverItem.current = index)}
                                                    onDragEnd={handleDrop}
                                                    onDragOver={e => e.preventDefault()}
                                                    className={`group bg-bg border border-soft rounded-2xl shadow-sm transition-all hover:border-figueira/30
                                                        ${podeEditar ? 'cursor-grab active:cursor-grabbing' : ''}`}>

                                                    {/* LINHA PRINCIPAL */}
                                                    <div className="flex items-center justify-between p-3 sm:p-4">
                                                        <div className="flex items-center gap-3 truncate">
                                                            {podeEditar && <div className="text-muted/30 group-hover:text-muted hidden sm:block"><GripVertical size={18} /></div>}
                                                            <span className="text-[10px] font-black text-muted bg-soft w-7 h-7 flex items-center justify-center rounded-lg shrink-0">{index + 1}</span>
                                                            <div className="truncate">
                                                                <h4 className="text-xs sm:text-sm font-black text-fg uppercase italic tracking-tight truncate group-hover:text-figueira transition-colors">
                                                                    {m.titulo}
                                                                </h4>
                                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                    <span className="text-[9px] font-black text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                                        <Hash size={9} /> {item.tom_tocado}
                                                                    </span>
                                                                    {m.tom && m.tom !== item.tom_tocado && (
                                                                        <span className="text-[8px] font-bold text-muted">orig: {m.tom}</span>
                                                                    )}
                                                                    {m.bpm && (
                                                                        <span className="text-[8px] font-bold text-muted flex items-center gap-0.5">
                                                                            <Gauge size={8} /> {m.bpm} bpm
                                                                        </span>
                                                                    )}
                                                                    {m.artista && (
                                                                        <span className="text-[8px] font-medium text-muted hidden sm:inline">{m.artista}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* ACÇÕES */}
                                                        <div className="flex items-center gap-1 shrink-0 pl-2">
                                                            {podeEditar && (
                                                                <ModalEditarLinksMusica
                                                                    musica={m}
                                                                    onSucesso={actualizada => handleMusicaActualizada(m.id, actualizada)}
                                                                />
                                                            )}
                                                            {podeEditar && (
                                                                <button onClick={() => handleDelete(item.id)}
                                                                    className="p-2 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* LINHA DE LINKS — só aparece se houver pelo menos 1 link */}
                                                    {temLinks && (
                                                        <div className="flex items-center gap-1.5 px-4 pb-3 flex-wrap">
                                                            <BotaoLink href={m.link_letra || ''} icon={<FileText size={9} />} label="Letra"
                                                                cor="bg-blue-500/10 text-blue-700 border border-blue-500/20 hover:bg-blue-500 hover:text-white" />
                                                            <BotaoLink href={m.link_cifra || ''} icon={<Guitar size={9} />} label="Cifra"
                                                                cor="bg-orange-500/10 text-orange-700 border border-orange-500/20 hover:bg-orange-500 hover:text-white" />
                                                            <BotaoLink href={m.link_audio || ''} icon={<Headphones size={9} />} label="Audio"
                                                                cor="bg-green-500/10 text-green-700 border border-green-500/20 hover:bg-green-500 hover:text-white" />
                                                            <BotaoLink href={m.link_video || ''} icon={<Youtube size={9} />} label="Video"
                                                                cor="bg-red-500/10 text-red-700 border border-red-500/20 hover:bg-red-500 hover:text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    )
}
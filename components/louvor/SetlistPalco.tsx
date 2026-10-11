'use client'
// components/louvor/SetlistPalco.tsx
// Modo palco — fullscreen no telemóvel, dark, navegação por swipe e setas

import { useState, useEffect, useRef, useTransition } from 'react'
import {
    ChevronLeft, ChevronRight, X, FileText, Guitar,
    Headphones, Youtube, Music, Hash, Gauge,
    List, Maximize2, ArrowLeft, CheckCircle2, Home, Download, Loader2, RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/ConfirmDialog'

import CifraViewer from './CifraViewer'
import CifraEditor from './CifraEditor'
import { importarCifraDeUrlAction } from '@/actions/cifra-actions'

interface Musica {
    id: string
    titulo: string
    artista?: string | null
    tom?: string | null
    bpm?: number | null
    link_letra?: string | null
    link_cifra?: string | null
    link_audio?: string | null
    link_video?: string | null
    cifra_interna?: string | null
}

interface ItemRepertorio {
    id: string
    ordem: number
    tom_tocado: string
    musica: Musica
}

interface Evento {
    id: number
    nome: string
    data: string
    repertorio: ItemRepertorio[]
}

interface Props {
    evento: Evento
}

// Botão de recurso grande — pensado para toque rápido no palco
function BotaoRecurso({
    href, icon, label, cor, sublabel
}: {
    href: string
    icon: React.ReactNode
    label: string
    cor: string
    sublabel?: string
}) {
    const [tocado, setTocado] = useState(false)

    if (!href) return null

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onTouchStart={() => setTocado(true)}
            onTouchEnd={() => setTimeout(() => setTocado(false), 300)}
            className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-3 transition-all active:scale-95 select-none
                ${tocado ? 'scale-95 opacity-80' : ''}
                ${cor}`}
        >
            <div className="text-2xl">{icon}</div>
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">{label}</span>
            {sublabel && <span className="text-[7px] opacity-60 font-medium">{sublabel}</span>}
        </a>
    )
}

export default function SetlistPalco({ evento }: Props) {
    const toast = useToast()
    const router = useRouter()
    const [isRefreshing, startRefresh] = useTransition()
    const [indexActual, setIndexActual] = useState(0)
    const [mostrarLista, setMostrarLista] = useState(false)
    const [marcadas, setMarcadas] = useState<Set<string>>(new Set())
    const [cifraAberta, setCifraAberta] = useState(false)
    const [editorAberto, setEditorAberto] = useState(false)
    const [importandoUrl, setImportandoUrl] = useState(false)
    const [cifrasEditadas, setCifrasEditadas] = useState<Record<string, string>>({})
    const [fontScale, setFontScale] = useState(1)

    // Swipe
    const touchStartX = useRef<number | null>(null)
    const touchStartY = useRef<number | null>(null)

    // Pinch-to-zoom
    const initialPinchDistance = useRef<number | null>(null)
    const initialScale = useRef<number>(1)

    const lista = evento.repertorio
    const total = lista.length
    const item = lista[indexActual]
    const musicaBase = item?.musica
    // Aplica cifra editada localmente (sem precisar recarregar)
    const musica = musicaBase ? {
        ...musicaBase,
        cifra_interna: cifrasEditadas[musicaBase.id] ?? musicaBase.cifra_interna
    } : undefined

    // Mantém o ecrã acordado (Wake Lock API)
    useEffect(() => {
        let wakeLock: any = null
        const pedirWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen')
                }
            } catch { }
        }
        pedirWakeLock()
        return () => { wakeLock?.release?.() }
    }, [])

    // Navegação por teclado (desktop)
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') avancar()
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') recuar()
            if (e.key === 'Escape') setMostrarLista(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [indexActual])

    function avancar() {
        if (indexActual < total - 1) setIndexActual(i => i + 1)
    }

    function recuar() {
        if (indexActual > 0) setIndexActual(i => i - 1)
    }

    function marcarCantada(id: string) {
        setMarcadas(prev => {
            const novo = new Set(prev)
            if (novo.has(id)) novo.delete(id)
            else novo.add(id)
            return novo
        })
    }

    // Persistir fontScale
    useEffect(() => {
        const saved = localStorage.getItem('setlist_font_scale')
        if (saved) setFontScale(Number(saved))
    }, [])

    useEffect(() => {
        localStorage.setItem('setlist_font_scale', String(fontScale))
    }, [fontScale])

    function getPinchDistance(touches: React.TouchList) {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        )
    }

    // Touch handlers — swipe (1 dedo) + pinch-to-zoom (2 dedos)
    function onTouchStart(e: React.TouchEvent) {
        if (e.touches.length === 2) {
            initialPinchDistance.current = getPinchDistance(e.touches)
            initialScale.current = fontScale
        } else if (e.touches.length === 1) {
            touchStartX.current = e.touches[0].clientX
            touchStartY.current = e.touches[0].clientY
        }
    }

    function onTouchMove(e: React.TouchEvent) {
        if (e.touches.length === 2 && initialPinchDistance.current !== null) {
            const currentDistance = getPinchDistance(e.touches)
            const ratio = currentDistance / initialPinchDistance.current
            const newScale = Math.min(2.5, Math.max(0.6, initialScale.current * ratio))
            setFontScale(Math.round(newScale * 100) / 100)
        }
    }

    function onTouchEnd(e: React.TouchEvent) {
        if (initialPinchDistance.current !== null) {
            initialPinchDistance.current = null
            return
        }
        if (touchStartX.current === null || touchStartY.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        const dy = e.changedTouches[0].clientY - touchStartY.current

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            if (dx < 0) avancar()
            else recuar()
        }
        touchStartX.current = null
        touchStartY.current = null
    }

    const dataFormatada = new Intl.DateTimeFormat('pt-PT', {
        weekday: 'long', day: '2-digit', month: 'long'
    }).format(new Date(evento.data))

    const temLinks = musica?.link_letra || musica?.link_cifra || musica?.link_audio || musica?.link_video || musica?.cifra_interna

    if (total === 0) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8 text-center">
                <Music size={48} className="text-white/20 mb-4" />
                <p className="text-lg font-black uppercase tracking-widest">Sem músicas na setlist</p>
                <Link href="/membros/dashboard" className="mt-6 text-white/40 text-sm underline">Voltar</Link>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 bg-black text-white flex flex-col overflow-hidden select-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ touchAction: 'pan-y' }}
        >
            {/* ── HEADER ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                    <button onClick={() => window.history.length > 1 ? window.history.back() : window.location.href = '/membros/dashboard'}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all active:scale-90">
                        <ArrowLeft size={18} />
                    </button>
                    <Link href="/membros/dashboard"
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all active:scale-90"
                        title="Home">
                        <Home size={16} />
                    </Link>
                    <button
                        onClick={() => startRefresh(() => { router.refresh(); toast('Setlist atualizada', 'sucesso') })}
                        disabled={isRefreshing}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all active:scale-90"
                        title="Atualizar setlist"
                    >
                        <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40">
                        {evento.nome}
                    </p>
                    <p className="text-[7px] text-white/25 uppercase tracking-widest capitalize mt-0.5">
                        {dataFormatada}
                    </p>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Zoom controls */}
                    <div className="flex items-center bg-white/10 rounded-full overflow-hidden">
                        <button onClick={() => setFontScale(s => Math.max(0.6, Math.round((s - 0.15) * 100) / 100))}
                            className="w-8 h-8 flex items-center justify-center text-white/60 active:scale-90 text-sm font-black">−</button>
                        <span className="text-[8px] font-black text-white/40 w-8 text-center">{Math.round(fontScale * 100)}%</span>
                        <button onClick={() => setFontScale(s => Math.min(2.5, Math.round((s + 0.15) * 100) / 100))}
                            className="w-8 h-8 flex items-center justify-center text-white/60 active:scale-90 text-sm font-black">+</button>
                    </div>
                    <button
                        onClick={() => setMostrarLista(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 transition-all active:scale-90 relative"
                    >
                        <List size={18} />
                        {marcadas.size > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full text-[7px] font-black flex items-center justify-center">
                                {marcadas.size}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── INDICADOR DE PROGRESSO ──────────────────────────────────── */}
            <div className="flex gap-1 px-5 pb-4 shrink-0">
                {lista.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setIndexActual(i)}
                        className={`flex-1 h-1 rounded-full transition-all duration-300
                            ${i === indexActual ? 'bg-white' : marcadas.has(lista[i].id) ? 'bg-emerald-500/60' : 'bg-white/15'}`}
                    />
                ))}
            </div>

            {/* ── CONTEÚDO PRINCIPAL ─────────────────────────────────────── */}
            <div className="flex-1 flex flex-col px-5 pb-4 overflow-hidden">

                {/* NÚMERO + TÍTULO */}
                <div className="flex-1 flex flex-col justify-center">
                    {/* Número */}
                    <div className="text-[80px] font-black leading-none text-white/5 mb-2 -ml-1">
                        {String(indexActual + 1).padStart(2, '0')}
                    </div>

                    {/* Título com setas de navegação */}
                    <div className="flex items-center gap-3 mb-2">
                        <button onClick={recuar} disabled={indexActual === 0}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white/60 disabled:opacity-10 active:scale-90 transition-all shrink-0">
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="flex-1 font-black uppercase italic tracking-tighter text-white leading-tight"
                            style={{ fontSize: `${Math.round(1.875 * fontScale * 16)}px` }}>
                            {musica?.titulo}
                        </h1>
                        <button onClick={avancar} disabled={indexActual === total - 1}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 text-white/60 disabled:opacity-10 active:scale-90 transition-all shrink-0">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Artista */}
                    {musica?.artista && (
                        <p className="font-black uppercase tracking-[0.2em] text-white/40 mb-4"
                            style={{ fontSize: `${Math.round(0.6875 * fontScale * 16)}px` }}>
                            {musica.artista}
                        </p>
                    )}

                    {/* Tom + BPM — destaque */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-3">
                            <Hash size={14} className="text-white/50" />
                            <span className="text-lg font-black text-white">{item.tom_tocado}</span>
                            {musica?.tom && musica.tom !== item.tom_tocado && (
                                <span className="text-[9px] text-white/40 font-bold">
                                    orig: {musica.tom}
                                </span>
                            )}
                        </div>

                        {musica?.bpm && (
                            <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-3">
                                <Gauge size={14} className="text-white/50" />
                                <span className="text-lg font-black text-white">{musica.bpm}</span>
                                <span className="text-[9px] text-white/40 font-bold">bpm</span>
                            </div>
                        )}
                    </div>

                    {/* CIFRA INTERNA — botão destaque */}
                    {musica?.cifra_interna && (
                        <div className="flex gap-2 mb-3">
                            <button
                                onClick={() => setCifraAberta(true)}
                                className="flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 active:scale-95 transition-all"
                            >
                                <Guitar size={20} />
                                <span className="text-sm font-black uppercase tracking-widest">Cifra ADMVC</span>
                            </button>
                            <button
                                onClick={() => setEditorAberto(true)}
                                className="w-12 flex items-center justify-center rounded-2xl bg-white/10 text-white/40 border border-white/10 active:scale-90 hover:text-white/70"
                                title="Editar cifra"
                            >
                                <FileText size={16} />
                            </button>
                        </div>
                    )}

                    {/* Botões criar/importar cifra (quando não tem cifra_interna) */}
                    {!musica?.cifra_interna && (
                        <div className="flex gap-2 mb-3">
                            {/* Importar automático do CifraClub (se tem link) */}
                            {musica?.link_cifra && (
                                <button
                                    onClick={async () => {
                                        if (!musica?.link_cifra || !musica?.id) return
                                        setImportandoUrl(true)
                                        const res = await importarCifraDeUrlAction(musica.id, musica.link_cifra)
                                        setImportandoUrl(false)
                                        if (res.ok && res.cifra) {
                                            setCifrasEditadas(prev => ({ ...prev, [musica.id]: res.cifra! }))
                                        } else {
                                            toast(res.error || 'Erro ao importar.', 'erro')
                                        }
                                    }}
                                    disabled={importandoUrl}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-orange-500/20 text-orange-300 border border-orange-500/30 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                                >
                                    {importandoUrl ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                    {importandoUrl ? 'A importar...' : 'Importar do CifraClub'}
                                </button>
                            )}
                            {/* Criar/editar manualmente */}
                            <button
                                onClick={() => setEditorAberto(true)}
                                className={`flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/5 text-white/30 border border-white/10 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest ${musica?.link_cifra ? 'px-4' : 'flex-1'}`}
                            >
                                <Guitar size={14} />
                                {musica?.link_cifra ? 'Manual' : 'Criar Cifra'}
                            </button>
                        </div>
                    )}

                    {/* BOTÕES DE RECURSOS EXTERNOS */}
                    {(musica?.link_letra || musica?.link_cifra || musica?.link_audio || musica?.link_video) && (
                        <div className={`grid gap-3 mb-4 ${[musica?.link_letra, musica?.link_cifra, musica?.link_audio, musica?.link_video].filter(Boolean).length === 4
                                ? 'grid-cols-4'
                                : [musica?.link_letra, musica?.link_cifra, musica?.link_audio, musica?.link_video].filter(Boolean).length === 3
                                    ? 'grid-cols-3'
                                    : 'grid-cols-2'
                            }`}>
                            {musica?.link_letra && (
                                <BotaoRecurso
                                    href={musica.link_letra}
                                    icon={<FileText size={22} />}
                                    label="Letra"
                                    sublabel="letras.mus.br"
                                    cor="bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                />
                            )}
                            {musica?.link_cifra && (
                                <BotaoRecurso
                                    href={musica.link_cifra}
                                    icon={<Guitar size={22} />}
                                    label="Cifra"
                                    sublabel="cifraclub"
                                    cor="bg-orange-500/20 text-orange-300 border border-orange-500/30"
                                />
                            )}
                            {musica?.link_audio && (
                                <BotaoRecurso
                                    href={musica.link_audio}
                                    icon={<Headphones size={22} />}
                                    label="Audio"
                                    sublabel="spotify"
                                    cor="bg-green-500/20 text-green-300 border border-green-500/30"
                                />
                            )}
                            {musica?.link_video && (
                                <BotaoRecurso
                                    href={musica.link_video}
                                    icon={<Youtube size={22} />}
                                    label="Video"
                                    sublabel="youtube"
                                    cor="bg-red-500/20 text-red-300 border border-red-500/30"
                                />
                            )}
                        </div>
                    )}

                    {/* MARCAR COMO CANTADA */}
                    <button
                        onClick={() => marcarCantada(item.id)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95
                            ${marcadas.has(item.id)
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-white/5 text-white/30 border border-white/10 hover:bg-white/10'}`}
                    >
                        <CheckCircle2 size={14} />
                        {marcadas.has(item.id) ? 'Cantada ✓' : 'Marcar como cantada'}
                    </button>
                </div>
            </div>

            {/* ── NAVEGAÇÃO ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-5 pb-safe pb-6 shrink-0">
                <button
                    onClick={recuar}
                    disabled={indexActual === 0}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/10 text-white disabled:opacity-20 hover:bg-white/20 transition-all active:scale-90"
                >
                    <ChevronLeft size={24} strokeWidth={2.5} />
                </button>

                {/* Contador central */}
                <div className="flex-1 text-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-white/30">
                        {indexActual + 1} <span className="text-white/15">/</span> {total}
                    </span>
                </div>

                <button
                    onClick={avancar}
                    disabled={indexActual === total - 1}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white text-black disabled:opacity-20 hover:opacity-90 transition-all active:scale-90 shadow-lg shadow-white/10"
                >
                    <ChevronRight size={24} strokeWidth={2.5} />
                </button>
            </div>

            {/* ── DRAWER: LISTA COMPLETA ─────────────────────────────────── */}
            {mostrarLista && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setMostrarLista(false)}
                    />

                    {/* Drawer */}
                    <div className="relative bg-zinc-900 border-t border-white/10 rounded-t-[2rem] max-h-[75vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2 shrink-0">
                            <div className="w-10 h-1 bg-white/20 rounded-full" />
                        </div>

                        {/* Header drawer */}
                        <div className="flex items-center justify-between px-6 pb-4 shrink-0">
                            <div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">
                                    Setlist
                                </h3>
                                <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold mt-0.5">
                                    {marcadas.size} de {total} cantadas
                                </p>
                            </div>
                            <button
                                onClick={() => setMostrarLista(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/60"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Lista */}
                        <div className="overflow-y-auto px-4 pb-8 space-y-2">
                            {lista.map((it, i) => {
                                const cantada = marcadas.has(it.id)
                                const actual = i === indexActual
                                return (
                                    <button
                                        key={it.id}
                                        onClick={() => { setIndexActual(i); setMostrarLista(false) }}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-98
                                            ${actual
                                                ? 'bg-white text-black'
                                                : cantada
                                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-white'
                                                    : 'bg-white/5 border border-white/5 text-white hover:bg-white/10'}`}
                                    >
                                        {/* Número */}
                                        <span className={`text-[10px] font-black w-6 text-center shrink-0
                                            ${actual ? 'text-black' : 'text-white/30'}`}>
                                            {String(i + 1).padStart(2, '0')}
                                        </span>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-black uppercase italic tracking-tight truncate
                                                ${actual ? 'text-black' : cantada ? 'text-white/50 line-through' : 'text-white'}`}>
                                                {it.musica.titulo}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[9px] font-black flex items-center gap-0.5
                                                    ${actual ? 'text-black/50' : 'text-white/30'}`}>
                                                    <Hash size={9} /> {it.tom_tocado}
                                                </span>
                                                {it.musica.artista && (
                                                    <span className={`text-[8px] font-medium truncate
                                                        ${actual ? 'text-black/40' : 'text-white/20'}`}>
                                                        {it.musica.artista}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ícones de links disponíveis */}
                                        <div className="flex gap-1 shrink-0">
                                            {it.musica.link_letra && <FileText size={11} className={actual ? 'text-black/40' : 'text-blue-400/60'} />}
                                            {it.musica.link_cifra && <Guitar size={11} className={actual ? 'text-black/40' : 'text-orange-400/60'} />}
                                            {it.musica.link_audio && <Headphones size={11} className={actual ? 'text-black/40' : 'text-green-400/60'} />}
                                            {it.musica.link_video && <Youtube size={11} className={actual ? 'text-black/40' : 'text-red-400/60'} />}
                                        </div>

                                        {cantada && !actual && (
                                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CIFRA VIEWER */}
            {cifraAberta && musica?.cifra_interna && (
                <CifraViewer
                    cifra={musica.cifra_interna}
                    titulo={musica.titulo}
                    artista={musica.artista}
                    tomOriginal={musica.tom}
                    tomTocado={item.tom_tocado}
                    onClose={() => setCifraAberta(false)}
                    onPrev={() => { if (indexActual > 0) setIndexActual(i => i - 1) }}
                    onNext={() => { if (indexActual < total - 1) setIndexActual(i => i + 1) }}
                    hasPrev={indexActual > 0}
                    hasNext={indexActual < total - 1}
                />
            )}

            {/* CIFRA EDITOR */}
            {editorAberto && musica && (
                <CifraEditor
                    musicaId={musica.id}
                    titulo={musica.titulo}
                    cifraAtual={musica.cifra_interna}
                    onClose={() => setEditorAberto(false)}
                    onSaved={(novaCifra) => {
                        setCifrasEditadas(prev => ({ ...prev, [musica.id]: novaCifra }))
                    }}
                />
            )}
        </div>
    )
}
'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link2, Loader2, CheckCircle2, Search, X, ChevronDown, Check } from 'lucide-react'
import { vincularLoyverseId } from '@/actions/loyverse-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    membroId: number
    membroNome: string
    clientesLoyverse: any[]
}

export default function BotaoVincularManual({ membroId, membroNome, clientesLoyverse }: Props) {
    const toast = useToast()
    const [popupAberto, setPopupAberto] = useState(false)
    const [dropdownAberto, setDropdownAberto] = useState(false)
    const [busca, setBusca] = useState('')
    const [loyverseIdSelecionado, setLoyverseIdSelecionado] = useState('')
    const [loyverseNomeSelecionado, setLoyverseNomeSelecionado] = useState('')
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [mounted, setMounted] = useState(false)

    const btnDropdownRef = useRef < HTMLButtonElement > (null)
    const dropdownRef = useRef < HTMLDivElement > (null)
    const inputRef = useRef < HTMLInputElement > (null)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })

    useEffect(() => { setMounted(true) }, [])

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node
            if (!btnDropdownRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
                setDropdownAberto(false)
                setBusca('')
            }
        }
        if (dropdownAberto) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [dropdownAberto])

    // Foca o input ao abrir dropdown
    useEffect(() => {
        if (dropdownAberto) setTimeout(() => inputRef.current?.focus(), 50)
    }, [dropdownAberto])

    // Recalcula posição
    const calcPos = () => {
        if (!btnDropdownRef.current) return
        const rect = btnDropdownRef.current.getBoundingClientRect()
        setDropdownPos({
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
            width: Math.max(rect.width, 300)
        })
    }

    useEffect(() => {
        if (!dropdownAberto) return
        const h = () => calcPos()
        window.addEventListener('scroll', h, true)
        window.addEventListener('resize', h)
        return () => { window.removeEventListener('scroll', h, true); window.removeEventListener('resize', h) }
    }, [dropdownAberto])

    const clientesFiltrados = useMemo(() => {
        if (!busca.trim()) return clientesLoyverse
        const t = busca.toLowerCase()
        return clientesLoyverse.filter(c =>
            c.name?.toLowerCase().includes(t) ||
            c.email?.toLowerCase().includes(t)
        )
    }, [busca, clientesLoyverse])

    const handleVincular = async () => {
        if (!loyverseIdSelecionado) return
        setLoading(true)
        const res = await vincularLoyverseId(membroId, loyverseIdSelecionado)
        if (res.sucesso) {
            setSucesso(true)
            setPopupAberto(false)
        } else {
            toast(res.erro || 'Erro ao vincular.', 'erro')
        }
        setLoading(false)
    }

    if (sucesso) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 shrink-0">
                <CheckCircle2 size={12} /> Vinculado
            </div>
        )
    }

    // ── DROPDOWN PORTAL ───────────────────────────────────────────────────────
    const dropdown = dropdownAberto && (
        <div
            ref={dropdownRef}
            className="bg-bg border border-soft rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}
        >
            <div className="p-2 border-b border-soft">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Pesquisar no Loyverse..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full bg-bg2 border border-soft rounded-xl pl-8 pr-8 py-2.5 text-sm font-medium text-fg focus:border-figueira outline-none transition-all placeholder:text-muted/50"
                    />
                    {busca && (
                        <button type="button" onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-56 overflow-y-auto">
                {clientesFiltrados.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum cliente encontrado</p>
                    </div>
                ) : (
                    clientesFiltrados.map((c: any) => {
                        const sel = c.id === loyverseIdSelecionado
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                    setLoyverseIdSelecionado(c.id)
                                    setLoyverseNomeSelecionado(c.name)
                                    setDropdownAberto(false)
                                    setBusca('')
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-soft/50 transition-colors ${sel ? 'bg-figueira/5' : ''}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black ${sel ? 'bg-figueira text-white' : 'bg-bg2 border border-soft text-muted'}`}>
                                    {c.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[11px] font-black uppercase truncate ${sel ? 'text-figueira' : 'text-fg'}`}>{c.name}</p>
                                    <p className="text-[9px] font-bold text-muted lowercase truncate">{c.email || '—'}</p>
                                </div>
                                {sel && <Check size={13} className="text-figueira shrink-0" />}
                            </button>
                        )
                    })
                )}
            </div>

            {busca && (
                <div className="px-4 py-2 border-t border-soft bg-bg2/50">
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">
                        {clientesFiltrados.length} resultado{clientesFiltrados.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    )

    return (
        <>
            <button
                onClick={() => setPopupAberto(true)}
                className="flex items-center gap-2 px-3 py-2 bg-bg border border-soft text-muted hover:border-figueira/40 hover:text-figueira rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0"
                title={`Vincular ${membroNome} manualmente`}
            >
                <Link2 size={12} /> Vincular
            </button>

            {/* POPUP DE CONFIRMAÇÃO */}
            {popupAberto && mounted && createPortal(
                <div
                    className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    style={{ zIndex: 9999 }}
                    onClick={() => setPopupAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-sm rounded-2xl border border-soft shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center">
                                    <Link2 size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                        Vincular Manualmente
                                    </h3>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                        {membroNome}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPopupAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* SELETOR LOYVERSE */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                    Selecionar cliente Loyverse
                                </label>
                                <button
                                    ref={btnDropdownRef}
                                    type="button"
                                    onClick={() => { calcPos(); setDropdownAberto(!dropdownAberto) }}
                                    className={`w-full h-11 px-4 bg-bg2 border rounded-2xl text-sm font-bold text-left flex items-center justify-between gap-3 transition-all
                                        ${dropdownAberto ? 'border-figueira ring-2 ring-figueira/10' : 'border-soft hover:border-figueira/40'}`}
                                >
                                    <span className={`truncate ${loyverseNomeSelecionado ? 'text-fg' : 'text-muted'}`}>
                                        {loyverseNomeSelecionado || 'Pesquisar cliente Loyverse...'}
                                    </span>
                                    <ChevronDown size={14} className={`text-muted shrink-0 transition-transform ${dropdownAberto ? 'rotate-180' : ''}`} />
                                </button>

                                {mounted && dropdown && createPortal(dropdown, document.body)}
                            </div>

                            {/* CONFIRMAÇÃO */}
                            {loyverseIdSelecionado && (
                                <div className="bg-figueira/5 border border-figueira/20 rounded-2xl px-4 py-3 animate-in fade-in duration-200">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">A vincular</p>
                                    <p className="text-[11px] font-black uppercase text-fg mt-1">
                                        {membroNome} <span className="text-muted font-medium">→</span> {loyverseNomeSelecionado}
                                    </p>
                                    <code className="text-[8px] font-mono text-figueira/70 mt-1 block truncate">{loyverseIdSelecionado}</code>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setPopupAberto(false); setLoyverseIdSelecionado(''); setLoyverseNomeSelecionado('') }}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:bg-soft transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleVincular}
                                    disabled={loading || !loyverseIdSelecionado}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-figueira text-white hover:bg-figueira/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {loading
                                        ? <><Loader2 size={13} className="animate-spin" /> A gravar...</>
                                        : <><Link2 size={13} /> Confirmar</>
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}
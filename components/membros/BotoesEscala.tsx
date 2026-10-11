'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, XCircle, CheckCircle2, Clock, X, AlertCircle } from 'lucide-react'
import { alternarConfirmacaoEscala } from '@/actions/membro-actions'
import { recusarEscala } from '@/actions/escalas-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    escalaIds: number[]
    confirmado: boolean
    motivoRecusa?: string | null
    colapsado?: boolean
}

export default function BotoesEscala({ escalaIds, confirmado, motivoRecusa, colapsado }: Props) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [popupAberto, setPopupAberto] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (popupAberto) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [popupAberto])

    // ── AÇÕES ─────────────────────────────────────────────────────────────────
    async function handleConfirmar() {
        setLoading(true)
        await alternarConfirmacaoEscala(escalaIds, true)
        setLoading(false)
        setPopupAberto(false)
    }

    async function handleCancelar() {
        if (!motivo.trim()) { toast('Indica o motivo do cancelamento.', 'aviso'); return }
        setLoading(true)
        await recusarEscala(escalaIds, motivo)
        setLoading(false)
        setPopupAberto(false)
        setMotivo('')
    }

    async function handleDesconfirmar() {
        setLoading(true)
        await alternarConfirmacaoEscala(escalaIds, false)
        setLoading(false)
        setPopupAberto(false)
        setMotivo('')
    }

    // ── POPUP ─────────────────────────────────────────────────────────────────
    // Modos do popup:
    // 'pendente'    → botão PENDENTE clicado → escolha entre Confirmar ou Cancelar
    // 'cancelar'    → quando confirmado e quer cancelar → pede motivo
    // 'reconfirmar' → quando cancelado e quer confirmar
    const [modoPopup, setModoPopup] = useState<'pendente' | 'cancelar' | 'reconfirmar'>('pendente')

    const abrirPopup = (modo: 'pendente' | 'cancelar' | 'reconfirmar') => {
        setModoPopup(modo)
        setMotivo('')
        setPopupAberto(true)
    }

    const popup = (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 9999 }}
            onClick={() => setPopupAberto(false)}
        >
            <div
                className="bg-bg w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-2xl border border-soft shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-soft">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center
                            ${modoPopup === 'pendente' ? 'bg-orange-500/10 text-orange-500' : ''}
                            ${modoPopup === 'cancelar' ? 'bg-red-500/10 text-red-500' : ''}
                            ${modoPopup === 'reconfirmar' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                        `}>
                            {modoPopup === 'pendente' && <AlertCircle size={18} />}
                            {modoPopup === 'cancelar' && <XCircle size={18} />}
                            {modoPopup === 'reconfirmar' && <CheckCircle2 size={18} />}
                        </div>
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">
                            {modoPopup === 'pendente' && 'A tua presença'}
                            {modoPopup === 'cancelar' && 'Cancelar presença'}
                            {modoPopup === 'reconfirmar' && 'Confirmar presença'}
                        </h3>
                    </div>
                    <button
                        onClick={() => setPopupAberto(false)}
                        className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                <div className="p-6 space-y-4">

                    {/* MODO: PENDENTE → escolher confirmar ou cancelar */}
                    {modoPopup === 'pendente' && (
                        <>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                                Vais estar presente neste evento? Confirma ou cancela a tua participação.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => { setModoPopup('cancelar') }}
                                    className="py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <XCircle size={13} /> Não Posso
                                </button>
                                <button
                                    onClick={handleConfirmar}
                                    disabled={loading}
                                    className="py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 shadow-md"
                                >
                                    {loading
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <><CheckCircle2 size={13} /> Confirmar</>
                                    }
                                </button>
                            </div>
                        </>
                    )}

                    {/* MODO: CANCELAR → pede motivo */}
                    {modoPopup === 'cancelar' && (
                        <>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                                Indica o motivo do cancelamento para que o líder seja informado.
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                    Motivo *
                                </label>
                                <textarea
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Ex: Estou de viagem nessa data..."
                                    rows={3}
                                    autoFocus
                                    className="w-full bg-bg2 border border-soft rounded-2xl px-4 py-3 text-sm font-medium text-fg focus:border-red-400 outline-none resize-none placeholder:text-muted/40 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => modoPopup === 'cancelar' && confirmado
                                        ? setPopupAberto(false)
                                        : setModoPopup('pendente')
                                    }
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:bg-soft transition-all"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={handleCancelar}
                                    disabled={loading || !motivo.trim()}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {loading
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <><Check size={13} /> Confirmar</>
                                    }
                                </button>
                            </div>
                        </>
                    )}

                    {/* MODO: RECONFIRMAR → quando estava cancelado e quer confirmar */}
                    {modoPopup === 'reconfirmar' && (
                        <>
                            <p className="text-[11px] text-muted font-medium leading-relaxed">
                                Queres confirmar a tua presença neste evento?
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setPopupAberto(false)}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:bg-soft transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmar}
                                    disabled={loading}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 shadow-md"
                                >
                                    {loading
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <><CheckCircle2 size={13} /> Confirmar</>
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    if (loading) {
        return (
            <div className="flex justify-center py-3">
                <Loader2 className="animate-spin text-figueira" size={16} />
            </div>
        )
    }

    return (
        <>
            {/* ── ESTADO: PENDENTE ─────────────────────────────────────────── */}
            {!confirmado && !motivoRecusa && (
                <button
                    onClick={() => abrirPopup('pendente')}
                    className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-orange-500 text-white hover:bg-orange-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                    <Clock size={14} /> Pendente
                </button>
            )}

            {/* ── ESTADO: CONFIRMADO ───────────────────────────────────────── */}
            {confirmado && (
                <button
                    onClick={() => abrirPopup('cancelar')}
                    className="group w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md
                        bg-emerald-500 text-white
                        hover:bg-red-500 hover:text-white"
                >
                    {/* Texto normal */}
                    <span className="flex items-center gap-2 group-hover:hidden">
                        <CheckCircle2 size={14} /> Confirmado
                    </span>
                    {/* Texto no hover */}
                    <span className="hidden items-center gap-2 group-hover:flex">
                        <XCircle size={14} /> Cancelar
                    </span>
                </button>
            )}

            {/* ── ESTADO: CANCELADO ────────────────────────────────────────── */}
            {!confirmado && motivoRecusa && (
                <div className="space-y-2">
                    <button
                        onClick={() => abrirPopup('reconfirmar')}
                        className="group w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md
                            bg-red-500 text-white
                            hover:bg-emerald-500 hover:text-white"
                    >
                        {/* Texto normal */}
                        <span className="flex items-center gap-2 group-hover:hidden">
                            <XCircle size={14} /> Cancelado
                        </span>
                        {/* Texto no hover */}
                        <span className="hidden items-center gap-2 group-hover:flex">
                            <CheckCircle2 size={14} /> Confirmar
                        </span>
                    </button>
                    {!colapsado && (
                        <p className="text-[8px] text-red-400/80 font-medium italic text-center line-clamp-1 px-1">
                            "{motivoRecusa}"
                        </p>
                    )}
                </div>
            )}

            {/* PORTAL DO POPUP */}
            {mounted && popupAberto && createPortal(popup, document.body)}
        </>
    )
}
'use client'

import { useState, useCallback, createContext, useContext, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X, CheckCircle2, Info, XCircle } from 'lucide-react'

interface ConfirmOptions {
    titulo?: string
    mensagem: string
    botaoConfirmar?: string
    botaoCancelar?: string
    tipo?: 'perigo' | 'aviso' | 'info'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
    const fn = useContext(ConfirmContext)
    if (!fn) throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
    return fn
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null)

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setState({ ...options, resolve })
        })
    }, [])

    const handleClose = (result: boolean) => {
        state?.resolve(result)
        setState(null)
    }

    const cores = {
        perigo: { icon: 'bg-red-500/10 text-red-500', btn: 'bg-red-500 hover:bg-red-600' },
        aviso: { icon: 'bg-orange-500/10 text-orange-500', btn: 'bg-orange-500 hover:bg-orange-600' },
        info: { icon: 'bg-figueira/10 text-figueira', btn: 'bg-figueira hover:brightness-110' },
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state && createPortal(
                <div
                    className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    style={{ zIndex: 99999 }}
                    onClick={() => handleClose(false)}
                >
                    <div
                        className="bg-bg w-full sm:max-w-sm rounded-t-[2rem] sm:rounded-2xl border border-soft shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-5 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cores[state.tipo || 'perigo'].icon}`}>
                                    <AlertTriangle size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">
                                    {state.titulo || 'Confirmação'}
                                </h3>
                            </div>
                            <button
                                onClick={() => handleClose(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <p className="text-[12px] text-muted font-medium leading-relaxed">
                                {state.mensagem}
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleClose(false)}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:bg-soft transition-all"
                                >
                                    {state.botaoCancelar || 'Cancelar'}
                                </button>
                                <button
                                    onClick={() => handleClose(true)}
                                    className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md ${cores[state.tipo || 'perigo'].btn}`}
                                >
                                    {state.botaoConfirmar || 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmContext.Provider>
    )
}

// ══════════════════════════════════════════════════════════════════════
// TOAST — notificações in-app (substitui alert())
// ══════════════════════════════════════════════════════════════════════

interface ToastItem {
    id: number
    mensagem: string
    tipo: 'sucesso' | 'erro' | 'aviso' | 'info'
}

type ToastFn = (mensagem: string, tipo?: ToastItem['tipo']) => void

const ToastContext = createContext<ToastFn | null>(null)

export function useToast(): ToastFn {
    const fn = useContext(ToastContext)
    if (!fn) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
    return fn
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const nextId = useRef(0)

    const toast = useCallback((mensagem: string, tipo: ToastItem['tipo'] = 'info') => {
        const id = nextId.current++
        setToasts(prev => [...prev, { id, mensagem, tipo }])
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id))
        }, 4000)
    }, [])

    const remover = (id: number) => setToasts(prev => prev.filter(t => t.id !== id))

    const icones = {
        sucesso: <CheckCircle2 size={16} />,
        erro: <XCircle size={16} />,
        aviso: <AlertTriangle size={16} />,
        info: <Info size={16} />,
    }

    const cores = {
        sucesso: 'bg-emerald-500 text-white',
        erro: 'bg-red-500 text-white',
        aviso: 'bg-orange-500 text-white',
        info: 'bg-fg text-bg',
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}
            {toasts.length > 0 && createPortal(
                <div className="fixed top-4 left-4 right-4 z-[99998] flex flex-col items-center gap-2 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
                    {toasts.map(t => (
                        <div
                            key={t.id}
                            className={`pointer-events-auto w-full max-w-sm flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl animate-in slide-in-from-top-4 fade-in duration-200 ${cores[t.tipo]}`}
                        >
                            <span className="shrink-0">{icones[t.tipo]}</span>
                            <p className="flex-1 text-[11px] font-bold leading-snug">{t.mensagem}</p>
                            <button onClick={() => remover(t.id)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

'use client'

import { useState, useTransition, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    X, Calendar, Clock, Users, Briefcase, Info,
    CheckCircle2, XCircle, Loader2, ChevronRight,
    Bell, AlertCircle
} from 'lucide-react'
import { confirmarEscala, recusarEscala } from '@/actions/escalas-actions'
import { useToast } from '@/components/ui/ConfirmDialog'
import { formatInTimeZone } from 'date-fns-tz'
import { pt } from 'date-fns/locale'

const TIMEZONE = 'Europe/Lisbon'

interface Props {
    escala: {
        ids: number[]
        confirmado: boolean
        funcao: string
        funcoes: string[]
        horario?: string | null
        evento: {
            id: number
            nome: string
            data: string | Date
            descricao?: string | null
        }
        departamento: {
            id: number
            nome: string
        }
    }
}

export default function ModalDetalhesEscala({ escala }: Props) {
    const router = useRouter()
    const toast = useToast()
    const [isPending, startTransition] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [modoRecusa, setModoRecusa] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [salvando, setSalvando] = useState(false)
    const [feedback, setFeedback] = useState<'confirmado' | 'recusado' | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (aberto) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [aberto])

    const dataEvento = new Date(escala.evento.data)
    const diasRestantes = Math.ceil((dataEvento.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    const isHoje = diasRestantes === 0
    const isUrgente = diasRestantes <= 3 && diasRestantes >= 0

    const handleConfirmar = async () => {
        setSalvando(true)
        try {
            const res = await confirmarEscala(escala.ids) as { sucesso: boolean; error?: string }
            if (res.sucesso) {
                setFeedback('confirmado')
                setTimeout(() => { setAberto(false); setFeedback(null); startTransition(() => router.refresh()) }, 1500)
            } else { toast(res.error || 'Erro ao confirmar.', 'erro') }
        } catch { toast('Erro de ligação.', 'erro') }
        finally { setSalvando(false) }
    }

    const handleRecusar = async () => {
        if (!motivo.trim()) { toast('Indica o motivo da recusa.', 'aviso'); return }
        setSalvando(true)
        try {
            const res = await recusarEscala(escala.ids, motivo) as { sucesso: boolean; error?: string }
            if (res.sucesso) {
                setFeedback('recusado')
                setTimeout(() => {
                    setAberto(false); setFeedback(null)
                    setModoRecusa(false); setMotivo('')
                    startTransition(() => router.refresh())
                }, 1500)
            } else { toast(res.error || 'Erro ao recusar.', 'erro') }
        } catch { toast('Erro de ligação.', 'erro') }
        finally { setSalvando(false) }
    }

    const fechar = () => { setAberto(false); setModoRecusa(false); setMotivo(''); setFeedback(null) }

    const modal = (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 9999 }}
            onClick={fechar}
        >
            <div
                className="bg-bg w-full max-w-md rounded-[2.5rem] border border-soft shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto relative"
                onClick={e => e.stopPropagation()}
            >
                {/* FEEDBACK */}
                {feedback && (
                    <div className={`absolute inset-0 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 z-10 animate-in zoom-in-95 duration-300 ${feedback === 'confirmado' ? 'bg-emerald-500/95' : 'bg-red-500/95'}`}>
                        {feedback === 'confirmado' ? <CheckCircle2 size={48} className="text-white" /> : <XCircle size={48} className="text-white" />}
                        <p className="text-white font-black uppercase tracking-widest text-sm">
                            {feedback === 'confirmado' ? 'Presença confirmada!' : 'Escala recusada'}
                        </p>
                    </div>
                )}

                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className={`rounded-2xl p-3 text-center shrink-0 min-w-[54px] ${isHoje ? 'bg-figueira text-white' : 'bg-fg text-bg'}`}>
                            <span className="block text-[7px] font-black uppercase opacity-70">
                                {formatInTimeZone(dataEvento, TIMEZONE, 'MMM', { locale: pt })}
                            </span>
                            <span className="block text-xl font-black italic leading-tight">
                                {formatInTimeZone(dataEvento, TIMEZONE, 'dd')}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-base font-black uppercase italic tracking-tighter text-fg leading-none">
                                {escala.evento.nome}
                            </h2>
                            <p className="text-[9px] font-bold text-figueira uppercase tracking-widest mt-1 bg-figueira/10 px-2 py-0.5 rounded-md inline-block border border-figueira/20">
                                {escala.departamento.nome}
                            </p>
                        </div>
                    </div>
                    <button onClick={fechar} className="w-8 h-8 flex items-center justify-center bg-bg border border-soft text-muted rounded-xl hover:bg-soft transition-all shrink-0 mt-1">
                        <X size={15} />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* ALERTA URGENTE */}
                    {isUrgente && !escala.confirmado && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${isHoje ? 'bg-red-500/8 border-red-500/20 text-red-600' : 'bg-orange-500/8 border-orange-500/20 text-orange-600'}`}>
                            <Bell size={14} className="shrink-0 animate-pulse" />
                            <p className="text-[9px] font-black uppercase tracking-widest">
                                {isHoje ? 'Evento hoje! Confirma a tua presença.' : `Faltam ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}. Confirma a tua presença.`}
                            </p>
                        </div>
                    )}

                    {/* DETALHES */}
                    <div className="space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Detalhes da Escala</p>
                        <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden divide-y divide-soft/60">
                            <DetalheRow icon={<Briefcase size={13} />} label="Função" value={escala.funcoes?.filter(Boolean).join(', ') || escala.funcao} />
                            <DetalheRow icon={<Calendar size={13} />} label="Data do Evento" value={formatInTimeZone(dataEvento, TIMEZONE, "EEEE, dd 'de' MMMM", { locale: pt })} />
                            <DetalheRow icon={<Clock size={13} />} label="Horário do Culto" value={formatInTimeZone(dataEvento, TIMEZONE, 'HH:mm')} />
                            {escala.horario && <DetalheRow icon={<Clock size={13} />} label="Chegar até às" value={escala.horario} destaque />}
                            <DetalheRow icon={<Users size={13} />} label="Departamento" value={escala.departamento.nome} />
                        </div>
                    </div>

                    {/* DESCRIÇÃO */}
                    {escala.evento.descricao && (
                        <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-1.5">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                <Info size={10} /> Sobre o evento
                            </p>
                            <p className="text-[11px] text-fg font-medium leading-relaxed">{escala.evento.descricao}</p>
                        </div>
                    )}

                    {/* ESTADO */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${escala.confirmado ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-orange-500/8 border-orange-500/20'}`}>
                        {escala.confirmado
                            ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            : <AlertCircle size={16} className="text-orange-500 shrink-0" />
                        }
                        <p className={`text-[9px] font-black uppercase tracking-widest ${escala.confirmado ? 'text-emerald-700' : 'text-orange-700'}`}>
                            {escala.confirmado ? 'Presença confirmada' : 'Aguarda a tua confirmação'}
                        </p>
                    </div>

                    {/* MODO RECUSA */}
                    {modoRecusa ? (
                        <div className="space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted">Motivo da recusa *</label>
                                <textarea
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Ex: Estou de viagem nessa data..."
                                    rows={3}
                                    autoFocus
                                    className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-sm font-medium text-fg focus:border-red-400 outline-none resize-none placeholder:text-muted/40 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => { setModoRecusa(false); setMotivo('') }}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:bg-soft transition-all">
                                    Cancelar
                                </button>
                                <button onClick={handleRecusar} disabled={salvando || !motivo.trim()}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
                                    {salvando ? <Loader2 size={13} className="animate-spin" /> : <><XCircle size={13} /> Confirmar Recusa</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {!escala.confirmado && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => setModoRecusa(true)}
                                        className="py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-bg2 border border-soft text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                                        <XCircle size={13} /> Não Posso
                                    </button>
                                    <button onClick={handleConfirmar} disabled={salvando}
                                        className="py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 shadow-md">
                                        {salvando ? <Loader2 size={13} className="animate-spin" /> : <><CheckCircle2 size={13} /> Confirmar</>}
                                    </button>
                                </div>
                            )}
                            {escala.confirmado && (
                                <button onClick={() => setModoRecusa(true)}
                                    className="w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border border-soft text-muted hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                                    <XCircle size={12} /> Cancelar Confirmação
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-soft text-muted hover:border-figueira/40 hover:text-figueira hover:bg-figueira/5 transition-all"
            >
                <Info size={12} /> Ver Detalhes
                <ChevronRight size={11} className="ml-auto" />
            </button>

            {/* ✅ Portal — renderiza no body, escapa de qualquer stacking context */}
            {mounted && aberto && createPortal(modal, document.body)}
        </>
    )
}

function DetalheRow({ icon, label, value, destaque }: {
    icon: React.ReactNode; label: string; value: string; destaque?: boolean
}) {
    return (
        <div className={`flex items-center gap-4 px-4 py-3 ${destaque ? 'bg-figueira/5' : ''}`}>
            <span className={`shrink-0 ${destaque ? 'text-figueira' : 'text-muted'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted">{label}</p>
                <p className={`text-[11px] font-black uppercase tracking-tight mt-0.5 ${destaque ? 'text-figueira' : 'text-fg'}`}>
                    {value}
                </p>
            </div>
        </div>
    )
}
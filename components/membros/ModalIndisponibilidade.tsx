'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    CalendarOff, X, Plus, Trash2, Loader2, Check,
    Calendar, CalendarRange, Clock, AlignLeft, ChevronDown
} from 'lucide-react'
import {
    buscarIndisponibilidades,
    criarIndisponibilidade,
    removerIndisponibilidade
} from '@/actions/escalas-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const TIPOS = [
    { valor: 'DIA_SEMANA', label: 'Dia fixo da semana', icon: <CalendarOff size={14} /> },
    { valor: 'DATA_ESPECIFICA', label: 'Data específica', icon: <Calendar size={14} /> },
    { valor: 'INTERVALO', label: 'Período / Férias', icon: <CalendarRange size={14} /> },
]

type Indisponibilidade = {
    id: number
    tipo: string
    dia_semana: number | null
    data_inicio: string | null
    data_fim: string | null
    hora_inicio: string | null
    hora_fim: string | null
    motivo: string | null
}

export default function ModalIndisponibilidade({ isMenuItem, trigger }: { isMenuItem?: boolean; trigger?: React.ReactNode }) {
    const router = useRouter()
    const toast = useToast()
    const [isPending, startTransition] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [lista, setLista] = useState<Indisponibilidade[]>([])
    const [loading, setLoading] = useState(false)
    const [adicionando, setAdicionando] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [removendoId, setRemovendoId] = useState<number | null>(null)

    // Form state
    const [tipo, setTipo] = useState('DIA_SEMANA')
    const [diaSemana, setDiaSemana] = useState('0')
    const [dataInicio, setDataInicio] = useState('')
    const [dataFim, setDataFim] = useState('')
    const [horaInicio, setHoraInicio] = useState('')
    const [horaFim, setHoraFim] = useState('')
    const [motivo, setMotivo] = useState('')
    const [diaInteiro, setDiaInteiro] = useState(true)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!aberto) return
        carregar()
    }, [aberto])

    async function carregar() {
        setLoading(true)
        const res = await buscarIndisponibilidades()
        if (res.sucesso) setLista(res.dados as Indisponibilidade[])
        setLoading(false)
    }

    const resetForm = () => {
        setTipo('DIA_SEMANA')
        setDiaSemana('0')
        setDataInicio('')
        setDataFim('')
        setHoraInicio('')
        setHoraFim('')
        setMotivo('')
        setDiaInteiro(true)
        setAdicionando(false)
    }

    async function handleSalvar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSalvando(true)
        const fd = new FormData(e.currentTarget)
        const res = await criarIndisponibilidade(fd)
        if (res.sucesso) {
            await carregar()
            resetForm()
            startTransition(() => router.refresh())
        } else {
            toast(res.error || 'Erro ao guardar.', 'erro')
        }
        setSalvando(false)
    }

    async function handleRemover(id: number) {
        setRemovendoId(id)
        const res = await removerIndisponibilidade(id)
        if (res.sucesso) {
            setLista(prev => prev.filter(i => i.id !== id))
            startTransition(() => router.refresh())
        } else {
            toast(res.error, 'erro')
        }
        setRemovendoId(null)
    }

    const labelIndisponibilidade = (ind: Indisponibilidade) => {
        if (ind.tipo === 'DIA_SEMANA') {
            const dia = DIAS_SEMANA[ind.dia_semana ?? 0]
            if (ind.hora_inicio && ind.hora_fim)
                return `${dia}s — ${ind.hora_inicio} às ${ind.hora_fim}`
            return `Todas as ${dia}s`
        }
        if (ind.tipo === 'DATA_ESPECIFICA' && ind.data_inicio) {
            const d = new Date(ind.data_inicio)
            const label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            if (ind.hora_inicio && ind.hora_fim)
                return `${label} — ${ind.hora_inicio} às ${ind.hora_fim}`
            return label
        }
        if (ind.tipo === 'INTERVALO' && ind.data_inicio && ind.data_fim) {
            const ini = new Date(ind.data_inicio).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
            const fim = new Date(ind.data_fim).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
            return `${ini} → ${fim}`
        }
        return '—'
    }

    const iconeTipo = (tipo: string) => {
        if (tipo === 'DIA_SEMANA') return <CalendarOff size={13} />
        if (tipo === 'DATA_ESPECIFICA') return <Calendar size={13} />
        return <CalendarRange size={13} />
    }

    const modal = (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 9999 }}
            onClick={() => { setAberto(false); resetForm() }}
        >
            <div
                className="bg-bg w-full max-w-lg rounded-[2.5rem] border border-soft shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                            <CalendarOff size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                Minhas Indisponibilidades
                            </h2>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                O líder será avisado ao tentar escalar-te
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setAberto(false); resetForm() }}
                        className="w-8 h-8 flex items-center justify-center bg-bg border border-soft text-muted hover:bg-soft rounded-xl transition-all"
                    >
                        <X size={15} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

                    {/* LISTA EXISTENTE */}
                    {loading ? (
                        <div className="flex items-center justify-center py-10 gap-2">
                            <Loader2 size={18} className="animate-spin text-figueira" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar...</span>
                        </div>
                    ) : lista.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Registadas ({lista.length})
                            </p>
                            {lista.map(ind => (
                                <div key={ind.id} className="flex items-center gap-3 bg-bg2 border border-soft rounded-2xl px-4 py-3 hover:border-orange-500/30 transition-all group">
                                    <div className="w-8 h-8 bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                                        {iconeTipo(ind.tipo)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg truncate leading-none">
                                            {labelIndisponibilidade(ind)}
                                        </p>
                                        {ind.motivo && (
                                            <p className="text-[9px] text-muted font-medium italic mt-0.5 truncate">
                                                {ind.motivo}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemover(ind.id)}
                                        disabled={removendoId === ind.id}
                                        className="w-7 h-7 flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                    >
                                        {removendoId === ind.id
                                            ? <Loader2 size={13} className="animate-spin" />
                                            : <Trash2 size={13} />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : !adicionando ? (
                        <div className="py-10 text-center border-2 border-dashed border-soft rounded-2xl">
                            <CalendarOff size={28} className="mx-auto text-muted/30 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                                Sem indisponibilidades registadas
                            </p>
                        </div>
                    ) : null}

                    {/* FORMULÁRIO DE ADIÇÃO */}
                    {adicionando ? (
                        <form onSubmit={handleSalvar} className="space-y-4 bg-bg2 border border-soft rounded-2xl p-5 animate-in slide-in-from-bottom-2 duration-200">
                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira flex items-center gap-2">
                                <Plus size={11} /> Nova Indisponibilidade
                            </p>

                            {/* TIPO */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted">Tipo</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {TIPOS.map(t => (
                                        <button
                                            key={t.valor}
                                            type="button"
                                            onClick={() => setTipo(t.valor)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all
                                                ${tipo === t.valor
                                                    ? 'bg-figueira/10 border-figueira/30 text-figueira'
                                                    : 'bg-bg border-soft text-muted hover:border-figueira/20'}`}
                                        >
                                            {t.icon}
                                            <span className="leading-tight text-center">{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <input type="hidden" name="tipo" value={tipo} />
                            </div>

                            {/* CAMPOS POR TIPO */}
                            {tipo === 'DIA_SEMANA' && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">Dia da Semana</label>
                                    <div className="relative">
                                        <select
                                            name="dia_semana"
                                            value={diaSemana}
                                            onChange={e => setDiaSemana(e.target.value)}
                                            required
                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none"
                                        >
                                            {DIAS_SEMANA.map((d, i) => (
                                                <option key={i} value={i}>{d}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {tipo === 'DATA_ESPECIFICA' && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">Data</label>
                                    <input
                                        type="date"
                                        name="data_inicio"
                                        value={dataInicio}
                                        onChange={e => setDataInicio(e.target.value)}
                                        required
                                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none"
                                    />
                                </div>
                            )}

                            {tipo === 'INTERVALO' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted">De</label>
                                        <input
                                            type="date"
                                            name="data_inicio"
                                            value={dataInicio}
                                            onChange={e => setDataInicio(e.target.value)}
                                            required
                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-muted">Até</label>
                                        <input
                                            type="date"
                                            name="data_fim"
                                            value={dataFim}
                                            onChange={e => setDataFim(e.target.value)}
                                            required
                                            min={dataInicio}
                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* DIA INTEIRO / HORÁRIO */}
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => { setDiaInteiro(!diaInteiro); if (!diaInteiro) { setHoraInicio(''); setHoraFim('') } }}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${diaInteiro ? 'bg-orange-500/10 border-orange-500/30 text-orange-600' : 'bg-bg border-soft text-muted'}`}
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} /> Dia inteiro
                                    </span>
                                    <div className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 ${diaInteiro ? 'bg-orange-500 justify-end' : 'bg-soft justify-start'}`}>
                                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                                    </div>
                                </button>

                                {!diaInteiro && (
                                    <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-200">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-muted uppercase tracking-widest">Das</label>
                                            <input
                                                type="time"
                                                name="hora_inicio"
                                                value={horaInicio}
                                                onChange={e => setHoraInicio(e.target.value)}
                                                required
                                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-bold text-muted uppercase tracking-widest">Até às</label>
                                            <input
                                                type="time"
                                                name="hora_fim"
                                                value={horaFim}
                                                onChange={e => setHoraFim(e.target.value)}
                                                required
                                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* MOTIVO */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                    <AlignLeft size={10} /> Motivo <span className="text-muted/50">(opcional)</span>
                                </label>
                                <input
                                    type="text"
                                    name="motivo"
                                    value={motivo}
                                    onChange={e => setMotivo(e.target.value)}
                                    placeholder="Ex: Escala de trabalho, Viagem..."
                                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-medium text-fg focus:border-figueira outline-none placeholder:text-muted/40 transition-all"
                                />
                            </div>

                            {/* BOTÕES */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg border border-soft text-muted hover:bg-soft transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-figueira text-white hover:bg-figueira/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
                                >
                                    {salvando
                                        ? <><Loader2 size={13} className="animate-spin" /> A guardar...</>
                                        : <><Check size={13} /> Guardar</>
                                    }
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            onClick={() => setAdicionando(true)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-soft text-muted hover:border-figueira/40 hover:text-figueira hover:bg-figueira/3 transition-all text-[9px] font-black uppercase tracking-widest"
                        >
                            <Plus size={13} /> Adicionar Indisponibilidade
                        </button>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            {trigger ? (
                <div onClick={() => setAberto(true)} className="cursor-pointer">
                    {trigger}
                </div>
            ) : isMenuItem ? (
                <button onClick={() => setAberto(true)}
                    className="text-[10px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 w-full text-left">
                    <CalendarOff size={13} className="text-orange-500" /> Indisponibilidade
                </button>
            ) : (
                <button onClick={() => setAberto(true)}
                    className="h-12 w-12 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-2xl hover:bg-orange-50 hover:text-orange-500 hover:border-orange-500/30 transition-all shadow-sm shrink-0"
                    title="Gerir indisponibilidades">
                    <CalendarOff size={18} />
                </button>
            )}

            {mounted && aberto && createPortal(modal, document.body)}
        </>
    )
}
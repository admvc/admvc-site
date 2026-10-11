"use client"

import { useState, useRef, useEffect, useMemo } from 'react'
import { useFormStatus } from 'react-dom'
import { criarEscalaAction } from '@/actions/escalas-actions'
import { verificarIndisponibilidade } from '@/actions/escalas-actions'
import { subMinutes } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'

const TIMEZONE = 'Europe/Lisbon'
import {
    Clock, CalendarDays, User, ShieldCheck, CheckCircle2,
    ChevronDown, Loader2, Zap, AlertTriangle, X
} from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function MontadorEscalas({ eventos, funcoesDisponiveis, membros, departamentoId, departamentos }: any) {
    const toast = useToast()
    const [deptoSelecionadoId, setDeptoSelecionadoId] = useState(departamentoId?.toString() || '')
    const [eventoId, setEventoId] = useState('')
    const [membroId, setMembroId] = useState('')
    const [funcaoId, setFuncaoId] = useState('')
    const [horarioEscala, setHorarioEscala] = useState('')
    const [sucesso, setSucesso] = useState(false)

    // ── ESTADO DE INDISPONIBILIDADE ───────────────────────────────────────────
    const [verificando, setVerificando] = useState(false)
    const [bloqueio, setBloqueio] = useState<{ bloqueado: boolean; motivo: string | null } | null>(null)

    const formRef = useRef<HTMLFormElement>(null)

    const handleEventoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const idSelecionado = e.target.value
        setEventoId(idSelecionado)
        setBloqueio(null)
        setMembroId('')
        const eventoSelecionado = eventos.find((ev: any) => ev.id.toString() === idSelecionado)
        if (eventoSelecionado?.data) {
            setHorarioEscala(formatInTimeZone(subMinutes(new Date(eventoSelecionado.data), 30), TIMEZONE, 'HH:mm'))
        } else {
            setHorarioEscala('')
        }
    }

    const handleMembroChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value
        setMembroId(id)
        setBloqueio(null)

        if (!id || !eventoId) return

        // Verifica indisponibilidade ao selecionar o membro
        const evento = eventos.find((ev: any) => ev.id.toString() === eventoId)
        if (!evento?.data) return

        setVerificando(true)
        const resultado = await verificarIndisponibilidade(Number(id), new Date(evento.data).toISOString())
        setBloqueio(resultado)
        setVerificando(false)
    }

    // Departamento seleccionado (fixo na gestao, escolhido no admin)
    const deptoActual = departamentos?.find((d: any) => d.id.toString() === deptoSelecionadoId)
    const deptoIdFinal = departamentoId || (deptoSelecionadoId ? Number(deptoSelecionadoId) : null)
    const deptoCongId = deptoActual?.congregacaoId || null

    // Filtrar eventos pela congregacao do departamento
    const eventosFiltrados = useMemo(() => {
        if (!deptoCongId) return eventos // departamento global -> todos os eventos
        return eventos.filter((ev: any) =>
            ev.congregacao_id === deptoCongId || ev.congregacao_id === null
        )
    }, [eventos, deptoCongId])

    // Funcoes do departamento seleccionado (admin page)
    const funcoesActuais = funcoesDisponiveis || deptoActual?.funcoes || []

    const membrosAptos = membros.filter((m: any) => {
        if (!funcaoId) return true
        return m.funcoesHabilitadas?.includes(Number(funcaoId))
    })

    useEffect(() => {
        if (sucesso) {
            const timer = setTimeout(() => setSucesso(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [sucesso])

    // Limpa bloqueio ao mudar evento ou função
    useEffect(() => {
        setBloqueio(null)
        setMembroId('')
    }, [eventoId, funcaoId])

    return (
        <div className="relative">
            <section className="relative animate-in fade-in duration-500">
                {sucesso && (
                    <div className="absolute -top-4 left-0 right-0 bg-emerald-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-top-4 duration-300 z-50 flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20">
                        <CheckCircle2 size={16} /> Voluntário Escalado!
                    </div>
                )}

                <form
                    ref={formRef}
                    action={async (fd) => {
                        // ✅ BLOQUEIA se houver indisponibilidade
                        if (bloqueio?.bloqueado) return

                        fd.append('evento_id', eventoId)
                        fd.append('departamento_id', String(deptoIdFinal))
                        fd.append('membro_id', membroId)
                        fd.append('funcao_id', funcaoId)
                        fd.append('horario', horarioEscala)

                        const res = await criarEscalaAction(fd)
                        if (res?.ok) {
                            setSucesso(true)
                            setMembroId('')
                            setFuncaoId('')
                            setBloqueio(null)
                        } else if (res?.error) {
                            toast(res.error, 'erro')
                        }
                    }}
                    className="space-y-5"
                >
                    <div className={`grid grid-cols-1 md:grid-cols-2 ${departamentos ? 'xl:grid-cols-5' : 'xl:grid-cols-4'} gap-3 md:gap-4`}>

                    {/* PASSO 0 — DEPARTAMENTO (apenas admin) */}
                    {departamentos && (
                        <div className="space-y-2 relative">
                            <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center shadow-sm">1</span>
                                <label className="text-[10px] font-black uppercase text-muted tracking-widest">Departamento</label>
                            </div>
                            <div className="relative">
                                <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-figueira" />
                                <select
                                    required
                                    value={deptoSelecionadoId}
                                    onChange={e => { setDeptoSelecionadoId(e.target.value); setEventoId(''); setFuncaoId(''); setMembroId('') }}
                                    className="w-full bg-bg border border-soft rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-8 md:pr-10 py-3 md:py-4 text-[11px] md:text-xs font-bold text-fg focus:border-figueira outline-none cursor-pointer appearance-none shadow-sm transition-all"
                                >
                                    <option value="">Selecionar Departamento...</option>
                                    {departamentos.map((d: any) => (
                                        <option key={d.id} value={d.id}>{d.nome}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* PASSO 1 — EVENTO (filtrado por congregacao do departamento) */}
                    <div className={`space-y-2 relative transition-all duration-300 ${departamentos && !deptoSelecionadoId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center shadow-sm">{departamentos ? '2' : '1'}</span>
                            <label className="text-[10px] font-black uppercase text-muted tracking-widest">Evento</label>
                        </div>
                        <div className="relative">
                            <CalendarDays size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-figueira" />
                            <select
                                required
                                value={eventoId}
                                onChange={handleEventoChange}
                                className="w-full bg-bg border border-soft rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-8 md:pr-10 py-3 md:py-4 text-[11px] md:text-xs font-bold text-fg focus:border-figueira outline-none cursor-pointer appearance-none shadow-sm transition-all"
                            >
                                <option value="">Selecionar Culto/Evento...</option>
                                {eventosFiltrados.map((ev: any) => (
                                    <option key={ev.id} value={ev.id}>
                                        {formatInTimeZone(new Date(ev.data), TIMEZONE, 'dd/MM (HH:mm)')} • {ev.nome}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* FUNÇÃO */}
                    <div className={`space-y-2 transition-all duration-300 ${!eventoId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center shadow-sm">{departamentos ? '3' : '2'}</span>
                            <label className="text-[10px] font-black uppercase text-muted tracking-widest">Funcao</label>
                        </div>
                        <div className="relative">
                            <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-figueira" />
                            <select
                                required
                                value={funcaoId}
                                onChange={e => { setFuncaoId(e.target.value); setMembroId('') }}
                                className="w-full bg-bg border border-soft rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-8 md:pr-10 py-3 md:py-4 text-[11px] md:text-xs font-bold text-fg focus:border-figueira outline-none cursor-pointer appearance-none shadow-sm transition-all"
                            >
                                <option value="">Selecionar Cargo...</option>
                                {funcoesActuais.map((f: any) => (
                                    <option key={f.id} value={f.id}>{f.nome}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>
                    </div>

                    {/* PASSO 3 — MEMBRO */}
                    <div className={`space-y-2 transition-all duration-300 ${!funcaoId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center shadow-sm">{departamentos ? '4' : '3'}</span>
                            <label className="text-[10px] font-black uppercase text-muted tracking-widest flex items-center gap-2">
                                Membro
                                {funcaoId && (
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] ${membrosAptos.length > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>
                                        {membrosAptos.length} Apto(s)
                                    </span>
                                )}
                            </label>
                        </div>
                        <div className="relative">
                            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-figueira" />
                            <select
                                required
                                value={membroId}
                                onChange={handleMembroChange}
                                className="w-full bg-bg border border-soft rounded-xl md:rounded-2xl pl-10 md:pl-12 pr-8 md:pr-10 py-3 md:py-4 text-[11px] md:text-xs font-bold text-fg focus:border-figueira outline-none cursor-pointer appearance-none shadow-sm transition-all"
                            >
                                <option value="">
                                    {funcaoId
                                        ? membrosAptos.length > 0 ? 'Selecionar Voluntário...' : 'Nenhum membro habilitado'
                                        : 'Aguardando cargo...'
                                    }
                                </option>
                                {membrosAptos.map((m: any) => (
                                    <option key={m.id} value={m.id}>
                                        {m.first_name} {m.last_name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            {verificando && (
                                <Loader2 size={14} className="absolute right-10 top-1/2 -translate-y-1/2 text-figueira animate-spin" />
                            )}
                        </div>

                        {/* ✅ AVISO DE BLOQUEIO */}
                        {bloqueio?.bloqueado && (
                            <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/25 rounded-2xl px-4 py-3 animate-in slide-in-from-top-2 duration-200">
                                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-600 leading-none">
                                        Membro indisponível
                                    </p>
                                    <p className="text-[9px] text-red-500/80 font-medium mt-1">
                                        {bloqueio.motivo || 'Este membro registou indisponibilidade para este período.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setBloqueio(null); setMembroId('') }}
                                    className="text-red-400 hover:text-red-600 shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}

                        {/* ✅ CONFIRMAÇÃO DE DISPONÍVEL */}
                        {membroId && bloqueio && !bloqueio.bloqueado && !verificando && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/8 border border-emerald-500/20 rounded-xl animate-in fade-in duration-200">
                                <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                    Disponível para este evento
                                </p>
                            </div>
                        )}
                    </div>

                    {/* HORÁRIO */}
                    <div className={`space-y-2 transition-all duration-300 ${!membroId ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center shadow-sm">{departamentos ? '5' : '4'}</span>
                            <label className="text-[10px] font-black uppercase text-muted tracking-widest">Horario</label>
                        </div>
                        <div className="flex items-center justify-between bg-figueira/5 border border-figueira/20 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl">
                            <label className="text-[10px] font-black uppercase text-figueira tracking-widest flex items-center gap-2">
                                <Clock size={14} /> Chegada
                            </label>
                            <input
                                type="time"
                                required
                                value={horarioEscala}
                                onChange={e => setHorarioEscala(e.target.value)}
                                className="bg-transparent text-figueira font-black text-sm outline-none w-[70px] text-right"
                            />
                        </div>
                    </div>

                    </div>{/* fecha grid */}

                    {/* BOTÃO */}
                    <div className="pt-4 mt-4 border-t border-soft/50">
                        <BotaoSubmit
                            ativo={!!(eventoId && membroId && funcaoId && horarioEscala)}
                            bloqueado={bloqueio?.bloqueado ?? false}
                            verificando={verificando}
                        />
                    </div>
                </form>
            </section>
        </div>
    )
}

function BotaoSubmit({
    ativo,
    bloqueado,
    verificando
}: {
    ativo: boolean
    bloqueado: boolean
    verificando: boolean
}) {
    const { pending } = useFormStatus()
    const desativado = pending || !ativo || bloqueado || verificando

    return (
        <button
            type="submit"
            disabled={desativado}
            className={`w-full flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] transition-all shadow-md
                ${pending || verificando ? 'bg-soft text-muted cursor-wait shadow-none' :
                    bloqueado ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed shadow-none' :
                        ativo ? 'bg-fg text-bg hover:bg-figueira hover:text-white active:scale-95 shadow-figueira/20 hover:shadow-xl' :
                            'bg-soft text-muted/40 cursor-not-allowed shadow-none'}`}
        >
            {pending ? (
                <><Loader2 size={16} className="animate-spin" /> Processando...</>
            ) : verificando ? (
                <><Loader2 size={16} className="animate-spin" /> A verificar disponibilidade...</>
            ) : bloqueado ? (
                <><AlertTriangle size={16} /> Membro Indisponível</>
            ) : (
                <><CheckCircle2 size={16} /> Confirmar Escala</>
            )}
        </button>
    )
}
'use client'

import { useState } from 'react'
import {
    Calendar, Clock, Coffee, BookOpen, Users, Utensils,
    CalendarDays, Send, Loader2, CheckCircle2, User
} from 'lucide-react'
import Image from 'next/image'
import { pedirAgendamentoAction } from '@/actions/agenda-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

const CATEGORIAS = [
    { id: 'CAFE', label: 'Cafe com Pastor', icon: Coffee, cor: 'amber' },
    { id: 'PERMANECER', label: 'Permanecer', icon: BookOpen, cor: 'emerald' },
    { id: 'DISCIPULADO', label: 'Discipulado', icon: Users, cor: 'blue' },
    { id: 'MESA', label: 'A Mesa', icon: Utensils, cor: 'orange' },
    { id: 'OUTRO', label: 'Outro', icon: CalendarDays, cor: 'gray' },
]

const CORES: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    gray: 'bg-soft text-muted border-soft',
}

const CORES_ACTIVE: Record<string, string> = {
    amber: 'bg-amber-500 text-white border-amber-500',
    emerald: 'bg-emerald-500 text-white border-emerald-500',
    blue: 'bg-blue-500 text-white border-blue-500',
    orange: 'bg-orange-500 text-white border-orange-500',
    gray: 'bg-fg text-bg border-fg',
}

export default function AgendarClient({ agendas, membro }: { agendas: any[]; membro: any }) {
    const toast = useToast()
    const [agendaSelecionada, setAgendaSelecionada] = useState<number | null>(null)
    const [categoria, setCategoria] = useState('')
    const [data, setData] = useState('')
    const [horaInicio, setHoraInicio] = useState('10:00')
    const [horaFim, setHoraFim] = useState('10:30')
    const [titulo, setTitulo] = useState('')
    const [observacoes, setObservacoes] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [enviado, setEnviado] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!agendaSelecionada || !categoria || !data || !titulo) return

        setEnviando(true)
        const res = await pedirAgendamentoAction({
            agenda_id: agendaSelecionada,
            titulo,
            categoria,
            data,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            observacoes,
            membro_id: membro.id,
        })
        setEnviando(false)

        if (res.ok) {
            setEnviado(true)
        } else {
            toast(res.error || 'Erro ao enviar pedido.', 'erro')
        }
    }

    if (enviado) {
        return (
            <div className="text-center py-16 space-y-4 animate-in fade-in">
                <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-fg">Pedido Enviado!</h2>
                <p className="text-sm text-muted">O pastor sera notificado e confirmara o agendamento.</p>
                <button onClick={() => { setEnviado(false); setCategoria(''); setTitulo(''); setData('') }}
                    className="px-6 py-3 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all">
                    Novo Pedido
                </button>
            </div>
        )
    }

    // Data minima: amanha
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataMin = amanha.toISOString().split('T')[0]

    return (
        <>
            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Agendar</h1>
                <p className="text-xs text-muted">Pede uma reuniao com o pastor ou lider.</p>
            </header>

            {agendas.length === 0 ? (
                <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center space-y-3">
                    <Calendar size={32} className="mx-auto text-muted/20" />
                    <p className="text-sm font-black uppercase tracking-widest text-muted">Nenhuma agenda disponivel</p>
                    <p className="text-xs text-muted/60">Nao existem agendas publicas de momento.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* PASSO 1: Escolher agenda/pastor */}
                    <section className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center">1</span>
                            Com quem?
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {agendas.map((a: any) => (
                                <button key={a.id} type="button" onClick={() => setAgendaSelecionada(a.id)}
                                    className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-95 ${agendaSelecionada === a.id ? 'border-figueira bg-figueira/5' : 'border-soft bg-bg2 hover:border-figueira/30'}`}>
                                    <div className="flex items-center gap-3">
                                        {a.dono?.avatar_file ? (
                                            <Image src={a.dono.avatar_file} alt="" width={40} height={40} className="rounded-xl object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-soft flex items-center justify-center">
                                                <User size={16} className="text-muted" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-black uppercase tracking-tight text-fg">{a.nome}</p>
                                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                                {a.dono?.first_name} {a.dono?.last_name}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* PASSO 2: Tipo de reuniao */}
                    <section className={`space-y-3 transition-all ${!agendaSelecionada ? 'opacity-30 pointer-events-none' : ''}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center">2</span>
                            Que tipo de reuniao?
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIAS.map(c => {
                                const Icon = c.icon
                                const active = categoria === c.id
                                return (
                                    <button key={c.id} type="button" onClick={() => setCategoria(c.id)}
                                        className={`px-4 py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 ${active ? CORES_ACTIVE[c.cor] : CORES[c.cor]}`}>
                                        <Icon size={13} /> {c.label}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    {/* PASSO 3: Data e hora */}
                    <section className={`space-y-3 transition-all ${!categoria ? 'opacity-30 pointer-events-none' : ''}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center">3</span>
                            Quando?
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Data</label>
                                <input type="date" value={data} onChange={e => setData(e.target.value)} min={dataMin} required
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Inicio</label>
                                <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fim</label>
                                <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} required
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none" />
                            </div>
                        </div>
                    </section>

                    {/* PASSO 4: Assunto */}
                    <section className={`space-y-3 transition-all ${!data ? 'opacity-30 pointer-events-none' : ''}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-figueira text-white text-[9px] font-black flex items-center justify-center">4</span>
                            Assunto
                        </p>
                        <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required
                            placeholder="Breve descricao do motivo..."
                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted/30" />
                        <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                            placeholder="Observacoes adicionais (opcional)"
                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none resize-none placeholder:text-muted/30" />
                    </section>

                    {/* ENVIAR */}
                    <button type="submit" disabled={enviando || !agendaSelecionada || !categoria || !data || !titulo}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-fg text-bg text-[10px] font-black uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-40 shadow-sm active:scale-95">
                        {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        {enviando ? 'A enviar...' : 'Pedir Agendamento'}
                    </button>
                </form>
            )}
        </>
    )
}

'use client'

import { useState } from 'react'
import { CalendarDays, Users, X, MapPin, Clock, Info, ChevronRight, Share2 } from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'

const TZ = 'Europe/Lisbon'

export default function WidgetAgendaUnificada({
    eventosIgreja = [],
    gruposMembro = [],
    isAdmin
}: any) {
    const [eventoSelecionado, setEventoSelecionado] = useState<any | null>(null)
    const [verTodos, setVerTodos] = useState(false)

    const todosEventos = [
        ...eventosIgreja.map((e: any) => ({
            id: `igreja-${e.id}`,
            titulo: e.nome,
            data: new Date(e.data),
            tipo: 'IGREJA',
            descricao: e.descricao || 'Sem informações adicionais.',
            local: e.local || 'Instalações da Igreja',
        })),
        ...gruposMembro.map((g: any) => ({
            id: `grupo-${g.id}`,
            titulo: g.nome,
            data: g.createdAt ? new Date(g.createdAt) : new Date(),
            tipo: 'GRUPO',
            descricao: g.descricao || 'Reunião regular do grupo.',
            local: g.endereco ? `${g.bairro}, ${g.cidade}` : 'Local habitual',
        }))
    ].sort((a, b) => a.data.getTime() - b.data.getTime())

    const limite = verTodos ? todosEventos.length : 4
    const eventosVisiveis = todosEventos.slice(0, limite)

    const formatData = (data: Date) => {
        const hoje = new Date()
        const amanha = new Date(hoje)
        amanha.setDate(amanha.getDate() + 1)

        const mesmodia = (a: Date, b: Date) =>
            a.getDate() === b.getDate() &&
            a.getMonth() === b.getMonth() &&
            a.getFullYear() === b.getFullYear()

        if (mesmodia(data, hoje)) return 'Hoje'
        if (mesmodia(data, amanha)) return 'Amanhã'
        return formatInTimeZone(data, TZ, 'dd MMM')
    }

    const diasRestantes = (data: Date) => {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const diff = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        return diff
    }

    return (
        <>
            <div className="space-y-2">
                {eventosVisiveis.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-soft rounded-2xl">
                        <p className="text-xs font-black text-muted uppercase tracking-widest italic">
                            Nenhum evento programado.
                        </p>
                    </div>
                ) : (
                    eventosVisiveis.map(item => {
                        const dias = diasRestantes(item.data)
                        const isHoje = dias === 0
                        const isProximo = dias <= 3

                        return (
                            <button
                                key={item.id}
                                onClick={() => setEventoSelecionado(item)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left group hover:border-figueira/30 active:scale-[0.99]
                                    ${isHoje ? 'bg-figueira/5 border-figueira/20' : 'bg-bg border-soft'}`}
                            >
                                {/* DATA PILL */}
                                <div className={`shrink-0 w-12 text-center rounded-xl py-2 ${isHoje ? 'bg-figueira text-white' : 'bg-bg2 border border-soft text-fg'}`}>
                                    <span className="block text-[9px] font-black uppercase opacity-70 leading-none">
                                        {formatInTimeZone(item.data, TZ, 'MMM')}
                                    </span>
                                    <span className="block text-base font-black italic leading-tight">
                                        {formatInTimeZone(item.data, TZ, 'dd')}
                                    </span>
                                </div>

                                {/* TÍTULO E HORA */}
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-black uppercase italic tracking-tight truncate leading-none ${isHoje ? 'text-figueira' : 'text-fg group-hover:text-figueira transition-colors'}`}>
                                        {item.titulo}
                                    </p>
                                    <p className="text-xs font-bold text-muted uppercase tracking-widest mt-1">
                                        {formatData(item.data)} · {formatInTimeZone(item.data, TZ, 'HH:mm')}
                                    </p>
                                </div>

                                {/* BADGE */}
                                <div className="shrink-0 flex items-center gap-2">
                                    {isHoje && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-figueira text-white px-2.5 py-1 rounded-lg">
                                            Hoje
                                        </span>
                                    )}
                                    {!isHoje && isProximo && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-600 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                                            {dias}d
                                        </span>
                                    )}
                                    <span className={`hidden sm:block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${item.tipo === 'IGREJA' ? 'bg-figueira/5 text-figueira border-figueira/20' : 'bg-soft text-muted border-soft/50'}`}>
                                        {item.tipo === 'IGREJA' ? 'Igreja' : 'Grupo'}
                                    </span>
                                    <ChevronRight size={12} className="text-muted/40 group-hover:text-figueira transition-colors" />
                                </div>
                            </button>
                        )
                    })
                )}

                {todosEventos.length > 4 && (
                    <button
                        onClick={() => setVerTodos(!verTodos)}
                        className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center justify-center gap-1.5"
                    >
                        {verTodos ? 'Ver menos' : `Ver mais ${todosEventos.length - 4} eventos`}
                        <ChevronRight size={11} className={`transition-transform ${verTodos ? 'rotate-90' : ''}`} />
                    </button>
                )}
            </div>

            {/* MODAL DE DETALHES */}
            {eventoSelecionado && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setEventoSelecionado(null)}
                >
                    <div
                        className="bg-bg2 border border-soft p-6 md:p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setEventoSelecionado(null)}
                            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                        >
                            <X size={15} strokeWidth={3} />
                        </button>

                        <div className="space-y-5 mt-1">
                            <div className="flex items-center gap-4 border-b border-soft pb-5">
                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${eventoSelecionado.tipo === 'IGREJA' ? 'bg-figueira/10 text-figueira' : 'bg-fg text-bg'}`}>
                                    {eventoSelecionado.tipo === 'IGREJA' ? <CalendarDays size={20} /> : <Users size={20} />}
                                </div>
                                <div className="pr-8">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest border inline-block mb-1.5 ${eventoSelecionado.tipo === 'IGREJA' ? 'text-figueira bg-figueira/5 border-figueira/20' : 'text-muted bg-soft border-soft/50'}`}>
                                        {eventoSelecionado.tipo === 'IGREJA' ? 'Evento da Igreja' : 'Reunião de Grupo'}
                                    </span>
                                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-tight">
                                        {eventoSelecionado.titulo}
                                    </h3>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <Clock size={14} className="text-muted shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted">Data e Hora</p>
                                        <p className="text-sm font-bold text-fg mt-0.5">
                                            {formatInTimeZone(eventoSelecionado.data, TZ, "EEEE, dd 'de' MMMM 'de' yyyy")}
                                            <span className="text-figueira block">
                                                às {formatInTimeZone(eventoSelecionado.data, TZ, 'HH:mm')}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <MapPin size={14} className="text-muted shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted">Local</p>
                                        <p className="text-sm font-bold text-fg mt-0.5">{eventoSelecionado.local}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 bg-bg border border-soft p-4 rounded-2xl">
                                    <Info size={14} className="text-figueira shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-muted">Detalhes</p>
                                        <p className="text-xs font-medium text-fg mt-1 leading-relaxed">{eventoSelecionado.descricao}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                {typeof navigator !== 'undefined' && 'share' in navigator && (
                                    <button
                                        onClick={() => {
                                            const dataStr = formatInTimeZone(eventoSelecionado.data, TZ, "EEEE, dd 'de' MMMM")
                                            const horaStr = formatInTimeZone(eventoSelecionado.data, TZ, 'HH:mm')
                                            navigator.share({
                                                title: eventoSelecionado.titulo,
                                                text: `${eventoSelecionado.titulo}\n${dataStr} as ${horaStr}\n${eventoSelecionado.local}`,
                                            }).catch(() => {})
                                        }}
                                        className="px-4 py-3.5 bg-bg border border-soft text-muted rounded-2xl text-xs font-black uppercase tracking-widest hover:border-figueira/30 hover:text-figueira transition-all active:scale-95 flex items-center gap-2"
                                    >
                                        <Share2 size={13} /> Partilhar
                                    </button>
                                )}
                                <button
                                    onClick={() => setEventoSelecionado(null)}
                                    className="flex-1 py-3.5 bg-fg text-bg rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-figueira transition-all active:scale-95"
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
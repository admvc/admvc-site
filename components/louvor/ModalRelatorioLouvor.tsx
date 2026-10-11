'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Music, X, Loader2, ChevronLeft, ChevronRight, Calendar, Users, MicVocal } from 'lucide-react'
import { buscarRelatorioLouvorAction } from '@/actions/louvor-actions'

const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type EventoLouvor = {
    id: number
    nome: string
    data: string
    musicas: { titulo: string; artista: string | null; tomOriginal: string | null; tomTocado: string }[]
    equipa: { nome: string; funcao: string }[]
}

export default function ModalRelatorioLouvor() {
    const [aberto, setAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [eventos, setEventos] = useState<EventoLouvor[]>([])

    const hoje = new Date()
    const [mes, setMes] = useState(hoje.getMonth() + 1)
    const [ano, setAno] = useState(hoje.getFullYear())

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (aberto) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [aberto])

    useEffect(() => {
        if (!aberto) return
        const fetch = async () => {
            setLoading(true)
            const res = await buscarRelatorioLouvorAction(mes, ano)
            if (res.ok) setEventos(res.eventos)
            setLoading(false)
        }
        fetch()
    }, [aberto, mes, ano])

    const mesAnterior = () => {
        if (mes === 1) { setMes(12); setAno(ano - 1) }
        else setMes(mes - 1)
    }
    const mesSeguinte = () => {
        if (mes === 12) { setMes(1); setAno(ano + 1) }
        else setMes(mes + 1)
    }

    // Contagens
    const totalMusicas = eventos.reduce((acc, ev) => acc + ev.musicas.length, 0)
    const musicasUnicas = new Set(eventos.flatMap(ev => ev.musicas.map(m => m.titulo))).size

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setAberto(false)}>
            <div className="bg-bg w-full max-w-lg rounded-[2.5rem] border border-soft shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}>

                {/* HEADER */}
                <div className="flex items-center justify-between p-5 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                            <Music size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">Relatorio Louvor</h2>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">Musicas, equipa e tons</p>
                        </div>
                    </div>
                    <button onClick={() => setAberto(false)} className="w-8 h-8 flex items-center justify-center bg-bg border border-soft text-muted hover:bg-soft rounded-xl transition-all shrink-0">
                        <X size={15} />
                    </button>
                </div>

                {/* FILTRO MÊS */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-soft shrink-0">
                    <button onClick={mesAnterior} className="p-1.5 rounded-lg hover:bg-soft transition-colors text-muted">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-black uppercase tracking-widest text-fg">{MESES[mes - 1]} {ano}</span>
                    <button onClick={mesSeguinte} className="p-1.5 rounded-lg hover:bg-soft transition-colors text-muted">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* RESUMO */}
                {!loading && eventos.length > 0 && (
                    <div className="flex gap-3 px-5 py-3 border-b border-soft shrink-0">
                        <span className="text-[8px] font-black uppercase tracking-widest bg-figueira/10 text-figueira px-2 py-1 rounded border border-figueira/20">
                            {eventos.length} cultos
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 px-2 py-1 rounded border border-blue-500/20">
                            {musicasUnicas} musicas
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest bg-soft text-muted px-2 py-1 rounded border border-soft">
                            {totalMusicas} execucoes
                        </span>
                    </div>
                )}

                {/* LISTA */}
                <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 gap-2">
                            <Loader2 size={18} className="animate-spin text-figueira" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar...</span>
                        </div>
                    ) : eventos.length > 0 ? (
                        eventos.map(ev => (
                            <details key={ev.id} className="bg-bg2 border border-soft rounded-2xl overflow-hidden group/ev">
                                <summary className="flex items-center gap-3 p-3 cursor-pointer list-none select-none hover:bg-soft/10 transition-colors">
                                    <div className="w-10 h-10 rounded-xl bg-fg text-bg flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[6px] font-black uppercase opacity-70">{new Date(ev.data).toLocaleDateString('pt-PT', { month: 'short' })}</span>
                                        <span className="text-sm font-black italic leading-none">{new Date(ev.data).toLocaleDateString('pt-PT', { day: '2-digit' })}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg truncate">{ev.nome}</p>
                                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{ev.musicas.length} musicas · {ev.equipa.length} membros</p>
                                    </div>
                                </summary>

                                <div className="px-3 pb-3 space-y-3 border-t border-soft pt-3 animate-in fade-in duration-200">
                                    {/* MÚSICAS */}
                                    <div className="space-y-1.5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1"><Music size={9} /> Repertorio</p>
                                        {ev.musicas.map((m, i) => (
                                            <div key={i} className="flex items-center justify-between bg-bg border border-soft rounded-xl px-3 py-2">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-fg truncate">{m.titulo}</p>
                                                    {m.artista && <p className="text-[8px] text-muted font-medium truncate">{m.artista}</p>}
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                    {m.tomOriginal && m.tomOriginal !== m.tomTocado && (
                                                        <span className="text-[7px] font-bold text-muted line-through">{m.tomOriginal}</span>
                                                    )}
                                                    <span className="text-[8px] font-black bg-figueira/10 text-figueira px-1.5 py-0.5 rounded border border-figueira/20">
                                                        {m.tomTocado}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* EQUIPA */}
                                    {ev.equipa.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1"><Users size={9} /> Equipa</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {ev.equipa.map((e, i) => (
                                                    <span key={i} className="text-[8px] font-bold bg-bg border border-soft px-2 py-1 rounded-lg text-fg">
                                                        {e.nome} <span className="text-muted">({e.funcao})</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </details>
                        ))
                    ) : (
                        <div className="text-center py-12">
                            <Music size={28} className="mx-auto text-muted/30 mb-3" />
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhum repertorio neste periodo.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            <button onClick={() => setAberto(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 w-full text-left">
                <MicVocal size={13} className="text-figueira" /> Relatorio Louvor
            </button>
            {mounted && aberto && createPortal(modal, document.body)}
        </>
    )
}

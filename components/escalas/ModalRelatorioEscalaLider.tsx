'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
    BarChart2, X, Loader2, CheckCircle2, XCircle, Clock,
    AlertTriangle, Users, Printer, MessageCircle, ChevronLeft,
    ChevronRight, Award, TrendingUp, Calendar, Filter
} from 'lucide-react'
import { buscarRelatorioEscalasDepartamentoAction } from '@/actions/escalas-actions'

interface Props {
    departamentoId: number
    departamentoNome: string
    equipaDoDepartamento: {
        membro: {
            id: number
            first_name: string
            last_name: string
            avatar_file?: string | null
        }
    }[]
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function ModalRelatorioEscalaLider({
    departamentoId,
    departamentoNome,
    equipaDoDepartamento
}: Props) {
    const [aberto, setAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [escalas, setEscalas] = useState<any[]>([])
    const [modo, setModo] = useState<'membros' | 'calendario'>('membros')
    const printRef = useRef<HTMLDivElement>(null)

    const hoje = new Date()
    const [mes, setMes] = useState(hoje.getMonth())       // 0-11
    const [ano, setAno] = useState(hoje.getFullYear())

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!aberto) return
        fetchDados()
    }, [aberto, mes, ano])

    async function fetchDados() {
        setLoading(true)
        const res = await buscarRelatorioEscalasDepartamentoAction(departamentoId, mes + 1, ano)
        if (res.sucesso) setEscalas(res.escalas)
        setLoading(false)
    }

    const navMes = (dir: 1 | -1) => {
        setMes(prev => {
            let m = prev + dir
            if (m > 11) { setAno(a => a + 1); return 0 }
            if (m < 0) { setAno(a => a - 1); return 11 }
            return m
        })
    }

    // ── PROCESSAMENTO ─────────────────────────────────────────────────────────
    const statsPorMembro = equipaDoDepartamento.map(({ membro }) => {
        const escalasMembro = escalas.filter(e => e.membro_id === membro.id)
        const confirmados = escalasMembro.filter(e => e.confirmado).length
        const indisponiveis = escalasMembro.filter(e => !e.confirmado && e.motivo_recusa).length
        const pendentes = escalasMembro.filter(e => !e.confirmado && !e.motivo_recusa).length
        const total = escalasMembro.length
        const taxa = total > 0 ? Math.round((confirmados / total) * 100) : 0

        // Dias desde a última escala no histórico geral (não filtrado por mês)
        const ultimaEscala = escalasMembro.length > 0
            ? new Date(escalasMembro.sort((a, b) =>
                new Date(b.evento.data).getTime() - new Date(a.evento.data).getTime()
            )[0].evento.data)
            : null

        return { membro, total, confirmados, indisponiveis, pendentes, taxa, ultimaEscala, escalas: escalasMembro }
    }).sort((a, b) => b.total - a.total)

    const totalGeral = escalas.length
    const totalConfirmados = escalas.filter(e => e.confirmado).length
    const totalIndisponiveis = escalas.filter(e => !e.confirmado && e.motivo_recusa).length
    const taxaGeral = totalGeral > 0 ? Math.round((totalConfirmados / totalGeral) * 100) : 0
    const membrosInativos = statsPorMembro.filter(s => s.total === 0)

    // Calendário
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    const primeiroDia = new Date(ano, mes, 1).getDay()
    const diasComEscalas = new Map<number, any[]>()
    escalas.forEach(esc => {
        const dia = new Date(esc.evento.data).getDate()
        if (!diasComEscalas.has(dia)) diasComEscalas.set(dia, [])
        diasComEscalas.get(dia)!.push(esc)
    })

    // ── IMPRESSÃO ─────────────────────────────────────────────────────────────
    const handleImprimir = () => {
        const conteudo = printRef.current?.innerHTML
        if (!conteudo) return
        const janela = window.open('', '_blank')
        if (!janela) return
        janela.document.write(`
            <!DOCTYPE html><html><head>
            <title>Relatório Escalas — ${departamentoNome} — ${MESES[mes]} ${ano}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
                h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
                h2 { font-size: 14px; font-weight: 900; text-transform: uppercase; margin: 16px 0 8px; }
                .subtitle { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; }
                .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
                .kpi { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
                .kpi-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; }
                .kpi-value { font-size: 24px; font-weight: 900; font-style: italic; margin-top: 4px; }
                .membro { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 8px; display: flex; align-items: center; gap: 16px; }
                .membro-nome { font-size: 12px; font-weight: 900; text-transform: uppercase; flex: 1; }
                .membro-stats { display: flex; gap: 12px; font-size: 10px; }
                .stat { display: flex; align-items: center; gap: 4px; }
                .bar { height: 6px; border-radius: 3px; margin-top: 4px; }
                .alerta { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px; margin-bottom: 16px; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase; }
                .badge-green { background: #d1fae5; color: #065f46; }
                .badge-red { background: #fee2e2; color: #991b1b; }
                .badge-orange { background: #fff7ed; color: #9a3412; }
                @media print { body { padding: 0; } }
            </style>
            </head><body>${conteudo}</body></html>
        `)
        janela.document.close()
        janela.focus()
        setTimeout(() => { janela.print(); janela.close() }, 300)
    }

    // ── WHATSAPP ──────────────────────────────────────────────────────────────
    const handleWhatsApp = () => {
        let texto = `📊 *RELATÓRIO DE ESCALAS — ${departamentoNome.toUpperCase()}*\n`
        texto += `📅 _${MESES[mes]} ${ano}_\n\n`
        texto += `🔢 *Resumo do Período*\n`
        texto += `• Total de escalas: ${totalGeral}\n`
        texto += `• Confirmações: ${totalConfirmados} (${taxaGeral}%)\n`
        texto += `• Indisponibilidades: ${totalIndisponiveis}\n\n`

        if (membrosInativos.length > 0) {
            texto += `⚠️ *Sem escalas este mês:*\n`
            membrosInativos.forEach(s => {
                texto += `• ${s.membro.first_name} ${s.membro.last_name}\n`
            })
            texto += '\n'
        }

        texto += `👥 *Por Membro:*\n`
        statsPorMembro.filter(s => s.total > 0).forEach(s => {
            texto += `• ${s.membro.first_name} ${s.membro.last_name} — ${s.total} escala${s.total !== 1 ? 's' : ''} | ${s.taxa}% confirmação\n`
        })

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
    }

    // ── CONTEÚDO DO MODAL ─────────────────────────────────────────────────────
    const modal = (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 9999 }}
            onClick={() => setAberto(false)}
        >
            <div
                className="bg-bg w-full sm:max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-soft shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 p-6 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                            <BarChart2 size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-black uppercase italic tracking-tighter text-fg leading-none">
                                Relatório Estratégico
                            </h2>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">
                                {departamentoNome} · {MESES[mes]} {ano}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleImprimir}
                            className="h-9 px-3 flex items-center gap-1.5 bg-bg border border-soft text-muted hover:text-fg hover:bg-soft rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            title="Imprimir relatório"
                        >
                            <Printer size={13} /> Imprimir
                        </button>
                        <button
                            onClick={handleWhatsApp}
                            className="h-9 px-3 flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                            title="Partilhar via WhatsApp"
                        >
                            <MessageCircle size={13} /> WhatsApp
                        </button>
                        <button
                            onClick={() => setAberto(false)}
                            className="w-9 h-9 flex items-center justify-center bg-bg border border-soft text-muted hover:bg-soft rounded-xl transition-all"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* FILTROS + MODO */}
                <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-soft shrink-0 bg-bg2/50">
                    {/* NAV MÊS */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => navMes(-1)} className="w-8 h-8 flex items-center justify-center bg-bg border border-soft rounded-xl hover:bg-soft transition-all">
                            <ChevronLeft size={14} className="text-muted" />
                        </button>
                        <span className="text-sm font-black uppercase italic tracking-tighter text-fg min-w-[140px] text-center">
                            {MESES[mes]} {ano}
                        </span>
                        <button onClick={() => navMes(1)} className="w-8 h-8 flex items-center justify-center bg-bg border border-soft rounded-xl hover:bg-soft transition-all">
                            <ChevronRight size={14} className="text-muted" />
                        </button>
                    </div>

                    <div className="flex-1" />

                    {/* TOGGLE MODO */}
                    <div className="flex bg-bg border border-soft p-1 rounded-xl gap-1">
                        <TabBtn label="Por Membro" icon={<Users size={12} />} ativo={modo === 'membros'} onClick={() => setModo('membros')} />
                        <TabBtn label="Calendário" icon={<Calendar size={12} />} ativo={modo === 'calendario'} onClick={() => setModo('calendario')} />
                    </div>
                </div>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 size={24} className="animate-spin text-figueira" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar dados...</p>
                        </div>
                    ) : (
                        <div ref={printRef}>

                            {/* TÍTULO PARA IMPRESSÃO */}
                            <div className="hidden print:block mb-6">
                                <h1>Relatório de Escalas — {departamentoNome}</h1>
                                <p className="subtitle">{MESES[mes]} {ano}</p>
                            </div>

                            {/* KPIs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 kpis">
                                <KpiCard label="Total escalas" value={totalGeral} cor="blue" icon={<BarChart2 size={14} />} />
                                <KpiCard label="Confirmações" value={totalConfirmados} cor="emerald" icon={<CheckCircle2 size={14} />} />
                                <KpiCard label="Indisponibilidades" value={totalIndisponiveis} cor="red" icon={<XCircle size={14} />} />
                                <KpiCard
                                    label="Taxa confirmação"
                                    value={`${taxaGeral}%`}
                                    cor={taxaGeral >= 70 ? 'emerald' : taxaGeral >= 40 ? 'orange' : 'red'}
                                    icon={<TrendingUp size={14} />}
                                />
                            </div>

                            {/* ALERTA INATIVOS */}
                            {membrosInativos.length > 0 && (
                                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 mb-5 alerta">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-700">
                                            {membrosInativos.length} membro{membrosInativos.length !== 1 ? 's' : ''} sem escalas em {MESES[mes]}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {membrosInativos.map(s => (
                                            <span key={s.membro.id} className="text-[8px] font-black uppercase tracking-widest bg-bg border border-orange-500/20 text-orange-700 px-2.5 py-1 rounded-lg">
                                                {s.membro.first_name} {s.membro.last_name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── MODO: POR MEMBRO ─────────────────────────── */}
                            {modo === 'membros' && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    {statsPorMembro.length === 0 ? (
                                        <div className="py-12 text-center border-2 border-dashed border-soft rounded-2xl">
                                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">
                                                Nenhuma escala em {MESES[mes]} {ano}
                                            </p>
                                        </div>
                                    ) : (
                                        statsPorMembro.map((stats, idx) => (
                                            <div key={stats.membro.id} className={`bg-bg2 border rounded-2xl p-4 membro ${stats.total === 0 ? 'border-orange-500/15 opacity-60' : 'border-soft'}`}>
                                                <div className="flex items-center gap-4">

                                                    {/* RANK + AVATAR */}
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm
                                                        ${idx === 0 && stats.total > 0 ? 'bg-figueira text-white' : 'bg-bg border border-soft text-muted'}`}>
                                                        {idx === 0 && stats.total > 0
                                                            ? <Award size={16} />
                                                            : `${stats.membro.first_name[0]}${stats.membro.last_name[0]}`
                                                        }
                                                    </div>

                                                    {/* NOME + BARRA */}
                                                    <div className="flex-1 min-w-0 membro-nome">
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <p className="text-[11px] font-black uppercase text-fg truncate leading-none">
                                                                {stats.membro.first_name} {stats.membro.last_name}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 shrink-0 membro-stats">
                                                                {stats.confirmados > 0 && (
                                                                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-lg flex items-center gap-1 badge badge-green">
                                                                        <CheckCircle2 size={9} /> {stats.confirmados}
                                                                    </span>
                                                                )}
                                                                {stats.indisponiveis > 0 && (
                                                                    <span className="text-[8px] font-black text-red-500 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded-lg flex items-center gap-1 badge badge-red">
                                                                        <XCircle size={9} /> {stats.indisponiveis}
                                                                    </span>
                                                                )}
                                                                {stats.pendentes > 0 && (
                                                                    <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 border border-orange-500/15 px-2 py-0.5 rounded-lg flex items-center gap-1 badge badge-orange">
                                                                        <Clock size={9} /> {stats.pendentes}
                                                                    </span>
                                                                )}
                                                                <span className="text-[8px] font-black text-muted bg-soft px-2 py-0.5 rounded-lg">
                                                                    {stats.total} escala{stats.total !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* BARRA DE PROGRESSO */}
                                                        {stats.total > 0 && (
                                                            <div className="h-2 bg-soft rounded-full overflow-hidden bar">
                                                                <div className="h-full flex">
                                                                    {stats.confirmados > 0 && (
                                                                        <div
                                                                            className="bg-emerald-500 h-full transition-all duration-700"
                                                                            style={{ width: `${(stats.confirmados / stats.total) * 100}%` }}
                                                                        />
                                                                    )}
                                                                    {stats.indisponiveis > 0 && (
                                                                        <div
                                                                            className="bg-red-400 h-full transition-all duration-700"
                                                                            style={{ width: `${(stats.indisponiveis / stats.total) * 100}%` }}
                                                                        />
                                                                    )}
                                                                    {stats.pendentes > 0 && (
                                                                        <div
                                                                            className="bg-orange-400 h-full transition-all duration-700"
                                                                            style={{ width: `${(stats.pendentes / stats.total) * 100}%` }}
                                                                        />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* EVENTOS DO MÊS */}
                                                {stats.escalas.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-soft/50">
                                                        {stats.escalas.map(esc => (
                                                            <div
                                                                key={esc.id}
                                                                title={`${esc.evento.nome} — ${esc.funcao}`}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[8px] font-black uppercase tracking-wide border
                                                                    ${esc.confirmado ? 'bg-emerald-500/8 border-emerald-500/15 text-emerald-700'
                                                                        : esc.motivo_recusa ? 'bg-red-500/8 border-red-500/15 text-red-600'
                                                                            : 'bg-orange-500/8 border-orange-500/15 text-orange-700'}`}
                                                            >
                                                                {esc.confirmado ? <CheckCircle2 size={9} /> : esc.motivo_recusa ? <XCircle size={9} /> : <Clock size={9} />}
                                                                {new Date(esc.evento.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* ── MODO: CALENDÁRIO ─────────────────────────── */}
                            {modo === 'calendario' && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                                        {/* DIAS DA SEMANA */}
                                        <div className="grid grid-cols-7 border-b border-soft bg-bg2">
                                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                                <div key={d} className="py-3 text-center text-[8px] font-black uppercase tracking-widest text-muted">
                                                    {d}
                                                </div>
                                            ))}
                                        </div>

                                        {/* GRID */}
                                        <div className="grid grid-cols-7">
                                            {Array.from({ length: primeiroDia }).map((_, i) => (
                                                <div key={`v-${i}`} className="border-b border-r border-soft/30 min-h-[70px]" />
                                            ))}
                                            {Array.from({ length: diasNoMes }).map((_, i) => {
                                                const dia = i + 1
                                                const esc = diasComEscalas.get(dia) || []
                                                const temEsc = esc.length > 0
                                                const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear()
                                                const conf = esc.filter(e => e.confirmado).length
                                                const canc = esc.filter(e => !e.confirmado && e.motivo_recusa).length
                                                const pend = esc.filter(e => !e.confirmado && !e.motivo_recusa).length

                                                return (
                                                    <div key={dia} className={`border-b border-r border-soft/30 min-h-[70px] p-1.5 flex flex-col gap-1
                                                        ${isHoje ? 'bg-figueira/5' : temEsc ? 'bg-blue-500/3' : ''}`}>
                                                        <span className={`text-[10px] font-black leading-none self-start px-1.5 py-0.5 rounded-lg
                                                            ${isHoje ? 'bg-figueira text-white' : 'text-muted'}`}>
                                                            {dia}
                                                        </span>
                                                        {temEsc && (
                                                            <div className="space-y-0.5">
                                                                <p className="text-[7px] font-black text-blue-600 leading-tight line-clamp-1 hidden sm:block">
                                                                    {esc[0].evento.nome}
                                                                </p>
                                                                <div className="flex gap-0.5 flex-wrap">
                                                                    {conf > 0 && <Pill count={conf} cor="emerald" icon={<CheckCircle2 size={7} />} />}
                                                                    {pend > 0 && <Pill count={pend} cor="orange" icon={<Clock size={7} />} />}
                                                                    {canc > 0 && <Pill count={canc} cor="red" icon={<XCircle size={7} />} />}
                                                                </div>
                                                                <div className="flex flex-wrap gap-0.5 mt-0.5">
                                                                    {esc.slice(0, 5).map(e => (
                                                                        <div
                                                                            key={e.id}
                                                                            title={`${e.membro?.first_name || ''}`}
                                                                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black
                                                                                ${e.confirmado ? 'bg-emerald-500 text-white' : e.motivo_recusa ? 'bg-red-400 text-white' : 'bg-orange-400 text-white'}`}
                                                                        >
                                                                            {e.membro?.first_name?.[0] || '?'}
                                                                        </div>
                                                                    ))}
                                                                    {esc.length > 5 && (
                                                                        <div className="w-4 h-4 rounded-full bg-soft flex items-center justify-center text-[6px] font-black text-muted">
                                                                            +{esc.length - 5}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* LEGENDA */}
                                    <div className="flex items-center gap-4 justify-center">
                                        {[
                                            { cor: 'bg-emerald-500', label: 'Confirmado' },
                                            { cor: 'bg-orange-400', label: 'Pendente' },
                                            { cor: 'bg-red-400', label: 'Indisponivel' },
                                        ].map(({ cor, label }) => (
                                            <div key={label} className="flex items-center gap-1.5">
                                                <div className={`w-3 h-3 rounded-full ${cor}`} />
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-muted">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="px-4 py-2.5 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all flex items-center gap-2 active:scale-95 shadow-sm shrink-0"
            >
                <BarChart2 size={13} /> Relatorio
            </button>

            {mounted && aberto && createPortal(modal, document.body)}
        </>
    )
}

// ── AUXILIARES ────────────────────────────────────────────────────────────────
function TabBtn({ label, icon, ativo, onClick }: { label: string; icon: React.ReactNode; ativo: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all
                ${ativo ? 'bg-bg2 shadow-sm text-fg' : 'text-muted hover:text-fg'}`}
        >
            {icon} {label}
        </button>
    )
}

function KpiCard({ label, value, cor, icon }: { label: string; value: any; cor: string; icon: React.ReactNode }) {
    const cores: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-500/8 border-blue-500/15',
        emerald: 'text-emerald-600 bg-emerald-500/8 border-emerald-500/15',
        red: 'text-red-500 bg-red-500/8 border-red-500/15',
        orange: 'text-orange-600 bg-orange-500/8 border-orange-500/15',
    }
    return (
        <div className={`p-4 rounded-2xl border kpi ${cores[cor] || cores.blue} space-y-2`}>
            <div className="flex items-center gap-1.5 opacity-80">{icon}<span className="text-[8px] font-black uppercase tracking-widest kpi-label">{label}</span></div>
            <p className="text-2xl font-black italic tracking-tighter leading-none kpi-value">{value}</p>
        </div>
    )
}

function Pill({ count, cor, icon }: { count: number; cor: 'emerald' | 'orange' | 'red'; icon: React.ReactNode }) {
    const styles = {
        emerald: 'bg-emerald-500/15 text-emerald-700',
        orange: 'bg-orange-500/15 text-orange-700',
        red: 'bg-red-500/15 text-red-700',
    }
    return (
        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${styles[cor]}`}>
            {icon} {count}
        </span>
    )
}
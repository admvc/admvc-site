'use client'

import { useState, useMemo } from 'react'
import {
    BarChart2, Calendar, ChevronLeft, ChevronRight,
    CheckCircle2, XCircle, Clock, AlertTriangle,
    Users, TrendingUp, Award, User
} from 'lucide-react'

interface EscalaHistorico {
    id: number
    confirmado: boolean
    motivo_recusa: string | null
    funcao: string
    horario: string | null
    membro: {
        id: number
        first_name: string
        last_name: string
        avatar_file: string | null
    }
    evento: {
        id: number
        nome: string
        data: string
    }
}

interface Props {
    escalas: EscalaHistorico[]
    equipaDoDepartamento: {
        membro: {
            id: number
            first_name: string
            last_name: string
            avatar_file: string | null
        }
    }[]
}

type Modo = 'calendario' | 'timeline'
type MesAno = { mes: number; ano: number }

export default function RelatorioEscalasDepartamento({ escalas, equipaDoDepartamento }: Props) {
    const hoje = new Date()
    const [modo, setModo] = useState<Modo>('calendario')
    const [mesAtual, setMesAtual] = useState<MesAno>({
        mes: hoje.getMonth(),
        ano: hoje.getFullYear()
    })

    // ── PROCESSAMENTO DE DADOS ────────────────────────────────────────────────
    const statsPorMembro = useMemo(() => {
        const map = new Map<number, {
            membro: Props['equipaDoDepartamento'][0]['membro']
            total: number
            confirmados: number
            indisponiveis: number
            pendentes: number
            ultimaEscala: Date | null
            semanasSemEscalar: number
            escalas: EscalaHistorico[]
        }>()

        // Inicializa todos os membros da equipa
        equipaDoDepartamento.forEach(({ membro }) => {
            map.set(membro.id, {
                membro,
                total: 0,
                confirmados: 0,
                indisponiveis: 0,
                pendentes: 0,
                ultimaEscala: null,
                semanasSemEscalar: 0,
                escalas: []
            })
        })

        // Popula com dados reais
        escalas.forEach(esc => {
            const stats = map.get(esc.membro.id)
            if (!stats) return
            stats.total++
            stats.escalas.push(esc)
            const dataEvento = new Date(esc.evento.data)
            if (!stats.ultimaEscala || dataEvento > stats.ultimaEscala) {
                stats.ultimaEscala = dataEvento
            }
            if (esc.confirmado) stats.confirmados++
            else if (esc.motivo_recusa) stats.indisponiveis++
            else stats.pendentes++
        })

        // Calcula semanas sem escalar
        map.forEach(stats => {
            if (stats.ultimaEscala) {
                const diff = hoje.getTime() - stats.ultimaEscala.getTime()
                stats.semanasSemEscalar = Math.floor(diff / (1000 * 60 * 60 * 24 * 7))
            } else {
                stats.semanasSemEscalar = 99
            }
        })

        return Array.from(map.values()).sort((a, b) => b.total - a.total)
    }, [escalas, equipaDoDepartamento])

    // Escalas do mês atual
    const escalasMes = useMemo(() => {
        return escalas.filter(esc => {
            const d = new Date(esc.evento.data)
            return d.getMonth() === mesAtual.mes && d.getFullYear() === mesAtual.ano
        })
    }, [escalas, mesAtual])

    // Dias do mês com escalas
    const diasComEscalas = useMemo(() => {
        const map = new Map<number, EscalaHistorico[]>()
        escalasMes.forEach(esc => {
            const dia = new Date(esc.evento.data).getDate()
            if (!map.has(dia)) map.set(dia, [])
            map.get(dia)!.push(esc)
        })
        return map
    }, [escalasMes])

    const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

    const diasNoMes = new Date(mesAtual.ano, mesAtual.mes + 1, 0).getDate()
    const primeiroDiaSemana = new Date(mesAtual.ano, mesAtual.mes, 1).getDay()

    const navMes = (dir: 1 | -1) => {
        setMesAtual(prev => {
            let m = prev.mes + dir
            let a = prev.ano
            if (m > 11) { m = 0; a++ }
            if (m < 0) { m = 11; a-- }
            return { mes: m, ano: a }
        })
    }

    // Alertas: membros sem escalas há mais de 3 semanas
    const alertasSemEscala = statsPorMembro.filter(s => s.semanasSemEscalar >= 3)

    return (
        <div className="space-y-6">

            {/* ── HEADER DO RELATÓRIO ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <BarChart2 size={16} className="text-figueira" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">
                        Relatório Estratégico
                    </h2>
                </div>

                {/* TOGGLE DE MODO */}
                <div className="flex bg-bg2 border border-soft p-1 rounded-2xl gap-1">
                    <ModoBtn
                        label="Calendário"
                        icon={<Calendar size={13} />}
                        ativo={modo === 'calendario'}
                        onClick={() => setModo('calendario')}
                    />
                    <ModoBtn
                        label="Por Membro"
                        icon={<Users size={13} />}
                        ativo={modo === 'timeline'}
                        onClick={() => setModo('timeline')}
                    />
                </div>
            </div>

            {/* ── ALERTAS DE SOBRECARGA / INATIVIDADE ─────────────────────── */}
            {alertasSemEscala.length > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-orange-500 shrink-0" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-orange-700">
                            {alertasSemEscala.length} membro{alertasSemEscala.length !== 1 ? 's' : ''} sem ser escalado há 3+ semanas
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {alertasSemEscala.map(s => (
                            <div key={s.membro.id} className="flex items-center gap-2 bg-bg border border-orange-500/20 px-3 py-1.5 rounded-xl">
                                <div className="w-5 h-5 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-black text-orange-600">
                                        {s.membro.first_name[0]}
                                    </span>
                                </div>
                                <span className="text-[9px] font-black uppercase text-fg">
                                    {s.membro.first_name} {s.membro.last_name}
                                </span>
                                <span className="text-[8px] font-bold text-orange-500">
                                    {s.semanasSemEscalar === 99 ? 'nunca' : `${s.semanasSemEscalar}sem`}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MODO: CALENDÁRIO ─────────────────────────────────────────── */}
            {modo === 'calendario' && (
                <div className="space-y-4 animate-in fade-in duration-200">

                    {/* NAV DO MÊS */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navMes(-1)}
                            className="w-9 h-9 flex items-center justify-center bg-bg2 border border-soft rounded-xl hover:bg-soft transition-all"
                        >
                            <ChevronLeft size={15} className="text-muted" />
                        </button>
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">
                            {nomesMeses[mesAtual.mes]} {mesAtual.ano}
                        </h3>
                        <button
                            onClick={() => navMes(1)}
                            className="w-9 h-9 flex items-center justify-center bg-bg2 border border-soft rounded-xl hover:bg-soft transition-all"
                        >
                            <ChevronRight size={15} className="text-muted" />
                        </button>
                    </div>

                    {/* GRID DO CALENDÁRIO */}
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        {/* CABEÇALHO DIAS DA SEMANA */}
                        <div className="grid grid-cols-7 border-b border-soft">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                                <div key={d} className="py-2.5 text-center text-[8px] font-black uppercase tracking-widest text-muted">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* DIAS */}
                        <div className="grid grid-cols-7">
                            {/* Espaços vazios antes do dia 1 */}
                            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                                <div key={`empty-${i}`} className="border-b border-r border-soft/40 aspect-square sm:aspect-auto sm:min-h-[80px]" />
                            ))}

                            {Array.from({ length: diasNoMes }).map((_, i) => {
                                const dia = i + 1
                                const escalasNoDia = diasComEscalas.get(dia) || []
                                const temEscalas = escalasNoDia.length > 0
                                const isHoje = dia === hoje.getDate() &&
                                    mesAtual.mes === hoje.getMonth() &&
                                    mesAtual.ano === hoje.getFullYear()

                                const confirmados = escalasNoDia.filter(e => e.confirmado).length
                                const indisponiveis = escalasNoDia.filter(e => !e.confirmado && e.motivo_recusa).length
                                const pendentes = escalasNoDia.filter(e => !e.confirmado && !e.motivo_recusa).length

                                return (
                                    <div
                                        key={dia}
                                        className={`border-b border-r border-soft/40 p-1.5 sm:min-h-[80px] flex flex-col gap-1 transition-all
                                            ${isHoje ? 'bg-figueira/5' : temEscalas ? 'bg-blue-500/3 hover:bg-blue-500/5' : 'hover:bg-soft/20'}`}
                                    >
                                        {/* NÚMERO DO DIA */}
                                        <span className={`text-[10px] font-black self-start leading-none px-1.5 py-0.5 rounded-lg
                                            ${isHoje ? 'bg-figueira text-white' : 'text-muted'}`}>
                                            {dia}
                                        </span>

                                        {/* INDICADORES */}
                                        {temEscalas && (
                                            <div className="space-y-0.5">
                                                {/* Evento nome */}
                                                <p className="text-[7px] font-black uppercase text-blue-600 leading-tight line-clamp-1 hidden sm:block">
                                                    {escalasNoDia[0].evento.nome}
                                                </p>

                                                {/* Pills de estado */}
                                                <div className="flex flex-wrap gap-0.5">
                                                    {confirmados > 0 && (
                                                        <span className="text-[7px] font-black bg-emerald-500/15 text-emerald-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                            <CheckCircle2 size={8} /> {confirmados}
                                                        </span>
                                                    )}
                                                    {pendentes > 0 && (
                                                        <span className="text-[7px] font-black bg-orange-500/15 text-orange-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                            <Clock size={8} /> {pendentes}
                                                        </span>
                                                    )}
                                                    {indisponiveis > 0 && (
                                                        <span className="text-[7px] font-black bg-red-500/15 text-red-700 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                            <XCircle size={8} /> {indisponiveis}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Avatars dos membros escalados */}
                                                <div className="hidden sm:flex flex-wrap gap-0.5 mt-0.5">
                                                    {escalasNoDia.slice(0, 4).map(esc => (
                                                        <div
                                                            key={esc.id}
                                                            title={`${esc.membro.first_name} ${esc.membro.last_name}`}
                                                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[6px] font-black
                                                                ${esc.confirmado ? 'bg-emerald-500 text-white' : esc.motivo_recusa ? 'bg-red-400 text-white' : 'bg-orange-400 text-white'}`}
                                                        >
                                                            {esc.membro.first_name[0]}
                                                        </div>
                                                    ))}
                                                    {escalasNoDia.length > 4 && (
                                                        <div className="w-4 h-4 rounded-full bg-soft flex items-center justify-center text-[6px] font-black text-muted">
                                                            +{escalasNoDia.length - 4}
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

                    {/* RESUMO DO MÊS */}
                    {escalasMes.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            <ResumoCard
                                label="Escalados este mês"
                                value={escalasMes.length}
                                cor="blue"
                                icon={<Users size={14} />}
                            />
                            <ResumoCard
                                label="Confirmações"
                                value={escalasMes.filter(e => e.confirmado).length}
                                cor="emerald"
                                icon={<CheckCircle2 size={14} />}
                            />
                            <ResumoCard
                                label="Indisponibilidades"
                                value={escalasMes.filter(e => e.motivo_recusa).length}
                                cor="red"
                                icon={<XCircle size={14} />}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* ── MODO: POR MEMBRO ─────────────────────────────────────────── */}
            {modo === 'timeline' && (
                <div className="space-y-3 animate-in fade-in duration-200">

                    {/* KPIs GERAIS */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
                        <ResumoCard label="Total membros" value={statsPorMembro.length} cor="blue" icon={<Users size={14} />} />
                        <ResumoCard label="Total escalas" value={escalas.length} cor="figueira" icon={<BarChart2 size={14} />} />
                        <ResumoCard
                            label="Taxa confirmação"
                            value={`${escalas.length > 0 ? Math.round((escalas.filter(e => e.confirmado).length / escalas.length) * 100) : 0}%`}
                            cor="emerald"
                            icon={<TrendingUp size={14} />}
                        />
                        <ResumoCard
                            label="Sem escalar 3sem+"
                            value={alertasSemEscala.length}
                            cor={alertasSemEscala.length > 0 ? 'orange' : 'emerald'}
                            icon={<AlertTriangle size={14} />}
                        />
                    </div>

                    {statsPorMembro.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-soft rounded-2xl">
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Sem dados de escalas disponíveis.</p>
                        </div>
                    ) : (
                        statsPorMembro.map((stats, idx) => {
                            const taxaConfirmacao = stats.total > 0
                                ? Math.round((stats.confirmados / stats.total) * 100)
                                : 0
                            const taxaIndisponibilidade = stats.total > 0
                                ? Math.round((stats.indisponiveis / stats.total) * 100)
                                : 0
                            const isAlerta = stats.semanasSemEscalar >= 3

                            // Últimas 8 escalas para mini-timeline
                            const ultimasEscalas = [...stats.escalas]
                                .sort((a, b) => new Date(b.evento.data).getTime() - new Date(a.evento.data).getTime())
                                .slice(0, 8)

                            return (
                                <div
                                    key={stats.membro.id}
                                    className={`bg-bg2 border rounded-2xl p-5 transition-all
                                        ${isAlerta ? 'border-orange-500/20 bg-orange-500/3' : 'border-soft'}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                                        {/* AVATAR + NOME */}
                                        <div className="flex items-center gap-3 sm:w-48 shrink-0">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm
                                                ${idx === 0 ? 'bg-figueira text-white' : 'bg-bg border border-soft text-muted'}`}>
                                                {idx === 0
                                                    ? <Award size={16} />
                                                    : `${stats.membro.first_name[0]}${stats.membro.last_name[0]}`
                                                }
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black uppercase text-fg truncate leading-none">
                                                    {stats.membro.first_name} {stats.membro.last_name}
                                                </p>
                                                {isAlerta && (
                                                    <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                                        <AlertTriangle size={9} />
                                                        {stats.semanasSemEscalar === 99 ? 'Nunca escalado' : `${stats.semanasSemEscalar} sem. inativo`}
                                                    </p>
                                                )}
                                                {!isAlerta && stats.ultimaEscala && (
                                                    <p className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                                        Ult. {stats.ultimaEscala.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* MÉTRICAS */}
                                        <div className="flex-1 space-y-3">
                                            {/* BARRAS DE PROGRESSO */}
                                            <div className="space-y-2">
                                                {/* Confirmações */}
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                                                            <CheckCircle2 size={9} className="text-emerald-500" /> Confirmações
                                                        </span>
                                                        <span className="text-[8px] font-black text-emerald-600">{stats.confirmados}/{stats.total} ({taxaConfirmacao}%)</span>
                                                    </div>
                                                    <div className="h-1.5 bg-soft rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                                                            style={{ width: `${taxaConfirmacao}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Indisponibilidades */}
                                                {stats.indisponiveis > 0 && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1">
                                                                <XCircle size={9} className="text-red-400" /> Indisponibilidades
                                                            </span>
                                                            <span className="text-[8px] font-black text-red-500">{stats.indisponiveis}/{stats.total} ({taxaIndisponibilidade}%)</span>
                                                        </div>
                                                        <div className="h-1.5 bg-soft rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-red-400 rounded-full transition-all duration-700"
                                                                style={{ width: `${taxaIndisponibilidade}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* MINI TIMELINE — últimas escalas */}
                                            {ultimasEscalas.length > 0 && (
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">
                                                        Histórico recente
                                                    </p>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {ultimasEscalas.map(esc => {
                                                            const data = new Date(esc.evento.data)
                                                            const isFutura = data > hoje
                                                            return (
                                                                <div
                                                                    key={esc.id}
                                                                    title={`${esc.evento.nome} — ${data.toLocaleDateString('pt-PT')}`}
                                                                    className={`flex flex-col items-center gap-0.5 group cursor-default`}
                                                                >
                                                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all group-hover:scale-110
                                                                        ${esc.confirmado
                                                                            ? 'bg-emerald-500 text-white'
                                                                            : esc.motivo_recusa
                                                                                ? 'bg-red-400 text-white'
                                                                                : isFutura
                                                                                    ? 'bg-blue-400 text-white'
                                                                                    : 'bg-orange-400 text-white'
                                                                        }`}>
                                                                        {esc.confirmado
                                                                            ? <CheckCircle2 size={10} />
                                                                            : esc.motivo_recusa
                                                                                ? <XCircle size={10} />
                                                                                : <Clock size={10} />
                                                                        }
                                                                    </div>
                                                                    <span className="text-[6px] font-black text-muted uppercase">
                                                                        {data.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* TOTAL BADGE */}
                                        <div className={`shrink-0 text-center px-4 py-3 rounded-2xl border
                                            ${idx === 0 ? 'bg-figueira/10 border-figueira/20' : 'bg-bg border-soft'}`}>
                                            <p className={`text-2xl font-black italic leading-none ${idx === 0 ? 'text-figueira' : 'text-fg'}`}>
                                                {stats.total}
                                            </p>
                                            <p className="text-[7px] font-black uppercase tracking-widest text-muted mt-1">escalas</p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}

// ── COMPONENTES AUXILIARES ────────────────────────────────────────────────────
function ModoBtn({ label, icon, ativo, onClick }: {
    label: string; icon: React.ReactNode; ativo: boolean; onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                ${ativo ? 'bg-bg shadow-sm text-fg' : 'text-muted hover:text-fg'}`}
        >
            {icon} {label}
        </button>
    )
}

function ResumoCard({ label, value, cor, icon }: {
    label: string; value: any; cor: string; icon: React.ReactNode
}) {
    const cores: Record<string, string> = {
        blue: 'text-blue-600 bg-blue-500/8 border-blue-500/15',
        emerald: 'text-emerald-600 bg-emerald-500/8 border-emerald-500/15',
        red: 'text-red-500 bg-red-500/8 border-red-500/15',
        orange: 'text-orange-600 bg-orange-500/8 border-orange-500/15',
        figueira: 'text-figueira bg-figueira/8 border-figueira/15',
    }
    return (
        <div className={`p-4 rounded-2xl border ${cores[cor] || cores.blue} space-y-2`}>
            <div className="flex items-center gap-1.5 opacity-80">{icon}<span className="text-[8px] font-black uppercase tracking-widest">{label}</span></div>
            <p className="text-xl font-black italic tracking-tighter leading-none">{value}</p>
        </div>
    )
}
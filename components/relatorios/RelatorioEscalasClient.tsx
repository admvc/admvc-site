'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, Calendar, Users, CheckCircle2, XCircle,
    Clock, ChevronLeft, ChevronRight, Filter, BarChart3
} from 'lucide-react'

interface MembroStats {
    membro: { id: number; first_name: string; last_name: string; avatar_file: string | null }
    total: number
    confirmadas: number
    recusadas: number
    pendentes: number
    funcoes: Record<string, number>
    departamentos: Record<string, number>
    datas: string[]
}

interface Props {
    dados: MembroStats[]
    departamentos: { id: number; nome: string }[]
    mes: number
    ano: number
    deptoFiltro?: number
    totalEscalas: number
}

const MESES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function RelatorioContent({ dados, departamentos, mes, ano, deptoFiltro, totalEscalas }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    function navegar(params: Record<string, string | undefined>) {
        const sp = new URLSearchParams(searchParams.toString())
        Object.entries(params).forEach(([k, v]) => {
            if (v === undefined) sp.delete(k)
            else sp.set(k, v)
        })
        const qs = sp.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    function mesAnterior() {
        const m = mes === 1 ? 12 : mes - 1
        const a = mes === 1 ? ano - 1 : ano
        navegar({ mes: String(m), ano: String(a) })
    }

    function mesSeguinte() {
        const m = mes === 12 ? 1 : mes + 1
        const a = mes === 12 ? ano + 1 : ano
        navegar({ mes: String(m), ano: String(a) })
    }

    const totalConfirmadas = dados.reduce((s, d) => s + d.confirmadas, 0)
    const totalIndisponiveis = dados.reduce((s, d) => s + d.recusadas, 0)
    const totalPendentes = dados.reduce((s, d) => s + d.pendentes, 0)
    const taxaConfirmacao = totalEscalas > 0 ? Math.round((totalConfirmadas / totalEscalas) * 100) : 0
    const mediaEscalasPorMembro = dados.length > 0 ? (totalEscalas / dados.length).toFixed(1) : '0'

    // Membros sem escalas neste período (nunca escalados)
    const membrosAtivos = dados.filter(d => d.total > 0).length
    const membrosInativos = dados.filter(d => d.total === 0).length

    return (
        <>
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <Link href="/admin/relatorios" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted hover:text-figueira transition-all mb-2">
                        <ArrowLeft size={12} /> Relatorios
                    </Link>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Escalas por Membro</h1>
                    <p className="text-xs text-muted">Participacao, funcoes e disponibilidade de cada voluntario.</p>
                </div>
            </header>

            {/* NAVEGACAO MES + FILTRO DEPTO */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={mesAnterior} className="p-2 bg-bg2 border border-soft rounded-xl hover:bg-soft transition-all">
                        <ChevronLeft size={16} className="text-muted" />
                    </button>
                    <div className="text-center min-w-[160px]">
                        <p className="text-sm font-black uppercase tracking-widest text-fg">{MESES[mes - 1]}</p>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest">{ano}</p>
                    </div>
                    <button onClick={mesSeguinte} className="p-2 bg-bg2 border border-soft rounded-xl hover:bg-soft transition-all">
                        <ChevronRight size={16} className="text-muted" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-muted" />
                    <select
                        value={deptoFiltro ?? ''}
                        onChange={(e) => navegar({ departamento: e.target.value || undefined })}
                        className="bg-bg2 border border-soft rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fg appearance-none cursor-pointer pr-7"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                            backgroundPosition: 'right 0.5rem center',
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: '1.2em 1.2em',
                        }}
                    >
                        <option value="">Todos os Departamentos</option>
                        {departamentos.map(d => (
                            <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <Kpi label="Voluntarios" value={dados.length} icon={<Users size={13} />} />
                <Kpi label="Total Escalas" value={totalEscalas} icon={<Calendar size={13} />} />
                <Kpi label="Confirmadas" value={totalConfirmadas} icon={<CheckCircle2 size={13} />} cor="emerald" />
                <Kpi label="Indisponiveis" value={totalIndisponiveis} icon={<XCircle size={13} />} cor={totalIndisponiveis > 0 ? 'red' : 'emerald'} />
                <Kpi label="Taxa Confirm." value={`${taxaConfirmacao}%`} icon={<BarChart3 size={13} />} cor={taxaConfirmacao >= 80 ? 'emerald' : taxaConfirmacao >= 50 ? 'orange' : 'red'} />
                <Kpi label="Media/Membro" value={mediaEscalasPorMembro} icon={<Clock size={13} />} />
            </div>

            {/* LISTA DE MEMBROS */}
            {dados.length === 0 ? (
                <div className="py-16 text-center bg-bg2 border border-soft rounded-2xl">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhuma escala encontrada neste periodo.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {dados.map((d) => {
                        const taxa = d.total > 0 ? Math.round((d.confirmadas / d.total) * 100) : 0
                        const funcoesList = Object.entries(d.funcoes).sort((a, b) => b[1] - a[1])
                        const deptosList = Object.entries(d.departamentos).sort((a, b) => b[1] - a[1])

                        // Calcular frequência (quantas semanas distintas)
                        const semanasDistintas = new Set(d.datas.map(dt => {
                            const date = new Date(dt)
                            const startOfYear = new Date(date.getFullYear(), 0, 1)
                            return Math.ceil(((date.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
                        })).size

                        return (
                            <details key={d.membro.id} className="bg-bg2 border border-soft rounded-2xl overflow-hidden group/m">
                                {/* RESUMO */}
                                <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none select-none hover:bg-soft/10 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-soft border border-soft flex items-center justify-center shrink-0 overflow-hidden">
                                        {d.membro.avatar_file ? (
                                            <img src={d.membro.avatar_file} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-black text-muted">{d.membro.first_name[0]}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg truncate">
                                            {d.membro.first_name} {d.membro.last_name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] font-bold text-muted uppercase tracking-widest">{d.total} escalas</span>
                                            {funcoesList.length > 0 && (
                                                <span className="text-[7px] font-bold bg-bg border border-soft px-1.5 py-0.5 rounded text-muted">
                                                    {funcoesList[0][0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className={`text-[9px] font-black px-2 py-1 rounded-lg ${
                                            taxa >= 80 ? 'bg-emerald-500/10 text-emerald-600' :
                                            taxa >= 50 ? 'bg-orange-500/10 text-orange-600' :
                                            'bg-red-500/10 text-red-500'
                                        }`}>
                                            {taxa}%
                                        </div>
                                    </div>
                                </summary>

                                {/* DETALHES EXPANDIDOS */}
                                <div className="px-4 pb-4 border-t border-soft pt-3 space-y-3 animate-in fade-in duration-200">
                                    {/* BARRA DE PROGRESSO */}
                                    <div className="flex h-2 rounded-full overflow-hidden bg-soft">
                                        {d.confirmadas > 0 && <div className="bg-emerald-500" style={{ width: `${(d.confirmadas / d.total) * 100}%` }} />}
                                        {d.pendentes > 0 && <div className="bg-orange-400" style={{ width: `${(d.pendentes / d.total) * 100}%` }} />}
                                        {d.recusadas > 0 && <div className="bg-red-400" style={{ width: `${(d.recusadas / d.total) * 100}%` }} />}
                                    </div>

                                    {/* STATS EM LINHA */}
                                    <div className="flex flex-wrap gap-2">
                                        <StatPill label="Confirmadas" value={d.confirmadas} cor="emerald" />
                                        <StatPill label="Pendentes" value={d.pendentes} cor="orange" />
                                        <StatPill label="Indisponiveis" value={d.recusadas} cor="red" />
                                        <StatPill label="Semanas ativas" value={semanasDistintas} cor="blue" />
                                    </div>

                                    {/* FUNÇÕES DETALHADAS */}
                                    {funcoesList.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Funcoes desempenhadas</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {funcoesList.map(([funcao, count]) => (
                                                    <span key={funcao} className="text-[8px] font-bold bg-bg border border-soft px-2 py-1 rounded-lg text-fg">
                                                        {funcao} <span className="text-figueira font-black">&times;{count}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* DEPARTAMENTOS */}
                                    {!deptoFiltro && deptosList.length > 0 && (
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Departamentos</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {deptosList.map(([depto, count]) => (
                                                    <span key={depto} className="text-[7px] font-bold bg-figueira/10 text-figueira px-2 py-0.5 rounded border border-figueira/20">
                                                        {depto} ({count})
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* DATAS DOS EVENTOS */}
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Datas escalado</p>
                                        <div className="flex flex-wrap gap-1">
                                            {d.datas.map((dt, i) => {
                                                const date = new Date(dt)
                                                return (
                                                    <span key={i} className="text-[7px] font-bold bg-bg border border-soft px-1.5 py-0.5 rounded text-muted">
                                                        {date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </details>
                        )
                    })}
                </div>
            )}
        </>
    )
}

export default function RelatorioEscalasClient(props: Props) {
    return (
        <Suspense fallback={<div className="animate-pulse h-64 bg-bg2 rounded-2xl" />}>
            <RelatorioContent {...props} />
        </Suspense>
    )
}

function Kpi({ label, value, icon, cor }: { label: string; value: any; icon: React.ReactNode; cor?: string }) {
    const cores: Record<string, string> = {
        emerald: 'text-emerald-600 bg-emerald-500/8 border-emerald-500/15',
        orange: 'text-orange-600 bg-orange-500/8 border-orange-500/15',
        red: 'text-red-500 bg-red-500/8 border-red-500/15',
    }
    return (
        <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${cor ? cores[cor] : 'bg-bg2 border-soft text-fg'}`}>
            <div className="flex items-center justify-between">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <div className="opacity-40">{icon}</div>
            </div>
            <p className="text-xl font-black italic tracking-tighter leading-none">{value}</p>
        </div>
    )
}

function StatPill({ label, value, cor }: { label: string; value: number; cor: string }) {
    if (value === 0) return null
    const cores: Record<string, string> = {
        emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        orange: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    }
    return (
        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${cores[cor] || ''}`}>
            {value} {label}
        </span>
    )
}

'use client'

import { useState } from 'react'
import {
    HeartHandshake, Target, Ticket, ChevronDown,
    EyeOff, Eye, Trophy, CalendarDays, CheckCircle2,
    TrendingUp, Clock
} from 'lucide-react'

interface Props {
    objetivos: any[]
    numerosRifa: any[]
    contribuicoes?: any[]
}

export default function PainelFinanceiroMembro({
    objetivos = [],
    numerosRifa = [],
    contribuicoes = []
}: Props) {

    // ── AGRUPAMENTOS ─────────────────────────────────────────────────────────
    const rifasAgrupadas = numerosRifa.reduce((acc: any, curr: any) => {
        if (!acc[curr.rifa_id]) {
            acc[curr.rifa_id] = { rifa: curr.rifa, numeros: [], dataCompra: curr.createdAt }
        }
        acc[curr.rifa_id].numeros.push(curr.numero)
        return acc
    }, {})
    const rifasList = Object.values(rifasAgrupadas) as any[]

    const contribuicoesAgrupadas = contribuicoes.reduce((acc: any, curr: any) => {
        const data = new Date(curr.data || curr.createdAt)
        const raw = data.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
        const chave = raw.charAt(0).toUpperCase() + raw.slice(1).replace(' de ', ' ')
        if (!acc[chave]) acc[chave] = []
        acc[chave].push(curr)
        return acc
    }, {})

    const euro = (v: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

    const totalContribuicoes = contribuicoes.reduce((s: number, c: any) => s + (c.valor || 0), 0)

    if (objetivos.length === 0 && rifasList.length === 0 && contribuicoes.length === 0) return null

    return (
        <div className="space-y-8">

            {/* ── RESUMO RÁPIDO ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    label="Total Contribuído"
                    value={euro(totalContribuicoes)}
                    icon={<HeartHandshake size={14} />}
                    color="text-emerald-600"
                    bg="bg-emerald-500/8"
                />
                <StatCard
                    label="Carnês Ativos"
                    value={objetivos.filter(o => {
                        const pago = o.lancamentos?.reduce((s: number, l: any) => s + l.valor_pago, 0) || 0
                        return pago < o.valor_mensal * o.parcelas_total
                    }).length}
                    icon={<Target size={14} />}
                    color="text-blue-600"
                    bg="bg-blue-500/8"
                />
                <StatCard
                    label="Rifas"
                    value={rifasList.length}
                    icon={<Ticket size={14} />}
                    color="text-figueira"
                    bg="bg-figueira/8"
                />
                <StatCard
                    label="Meses Registados"
                    value={Object.keys(contribuicoesAgrupadas).length}
                    icon={<CalendarDays size={14} />}
                    color="text-purple-600"
                    bg="bg-purple-500/8"
                />
            </div>

            {/* ── GRID PRINCIPAL ────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-2 gap-6">

                {/* DÍZIMOS E OFERTAS */}
                <div className="space-y-3">
                    <SectionLabel icon={<HeartHandshake size={12} />} label="Dízimos e Ofertas" />
                    {Object.keys(contribuicoesAgrupadas).length === 0 ? (
                        <Empty label="Nenhuma contribuição registada" />
                    ) : (
                        <div className="space-y-2">
                            {Object.entries(contribuicoesAgrupadas).map(([mes, lista]: [string, any]) => (
                                <GrupoContribuicao key={mes} mes={mes} lista={lista} euro={euro} />
                            ))}
                        </div>
                    )}
                </div>

                {/* CARNÊS + RIFAS */}
                <div className="space-y-6">
                    {objetivos.length > 0 && (
                        <div className="space-y-3">
                            <SectionLabel icon={<Target size={12} />} label="Meus Carnês" />
                            <div className="space-y-2">
                                {objetivos.map(obj => (
                                    <CarneItem key={obj.id} obj={obj} euro={euro} />
                                ))}
                            </div>
                        </div>
                    )}

                    {rifasList.length > 0 && (
                        <div className="space-y-3">
                            <SectionLabel icon={<Ticket size={12} />} label="Minhas Rifas" />
                            <div className="space-y-2">
                                {rifasList.map((item: any, idx: number) => (
                                    <RifaItem key={idx} item={item} euro={euro} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg }: any) {
    return (
        <div className={`${bg} rounded-2xl p-4 border border-soft space-y-2`}>
            <div className={`${color} flex items-center gap-1.5`}>
                {icon}
                <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
            </div>
            <p className={`text-xl font-black italic tracking-tighter ${color}`}>{value}</p>
        </div>
    )
}

// ── SECTION LABEL ─────────────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex items-center gap-2 pb-1">
            <span className="text-muted">{icon}</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted">{label}</span>
            <div className="flex-1 h-px bg-soft" />
        </div>
    )
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
function Empty({ label }: { label: string }) {
    return (
        <div className="py-8 border-2 border-dashed border-soft rounded-2xl text-center">
            <p className="text-[9px] font-black text-muted uppercase tracking-widest">{label}</p>
        </div>
    )
}

// ── GRUPO DE CONTRIBUIÇÕES ────────────────────────────────────────────────────
function GrupoContribuicao({ mes, lista, euro }: { mes: string; lista: any[]; euro: (v: number) => string }) {
    const [aberto, setAberto] = useState(false)
    const [mostrar, setMostrar] = useState(false)
    const total = lista.reduce((s: number, c: any) => s + (c.valor || 0), 0)

    return (
        <div className={`bg-bg2 border rounded-2xl overflow-hidden transition-all ${aberto ? 'border-emerald-500/20' : 'border-soft hover:border-soft/80'}`}>
            <button
                onClick={() => setAberto(!aberto)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-soft/20 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${aberto ? 'bg-emerald-500' : 'bg-soft'}`} />
                    <div className="text-left">
                        <p className="text-[11px] font-black uppercase tracking-tight text-fg">{mes}</p>
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{lista.length} registo{lista.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-black italic text-fg">
                            {mostrar ? euro(total) : '••••••'}
                        </p>
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setMostrar(!mostrar) }}
                            className="text-muted hover:text-fg transition-colors p-1"
                        >
                            {mostrar ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                    </div>
                    <ChevronDown size={13} className={`text-muted transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {aberto && (
                <div className="border-t border-soft px-5 py-3 space-y-2 animate-in slide-in-from-top-2 duration-200 bg-bg/50">
                    {lista.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-soft/40 last:border-0">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <HeartHandshake size={12} className="text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-fg">{c.tipo}</p>
                                    <p className="text-[8px] font-bold text-muted uppercase tracking-widest flex items-center gap-1">
                                        <CalendarDays size={8} />
                                        {new Date(c.data || c.createdAt).toLocaleDateString('pt-PT')}
                                    </p>
                                </div>
                            </div>
                            <p className="text-sm font-black text-fg">
                                {mostrar ? euro(c.valor) : '•••'}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── CARNÊ ─────────────────────────────────────────────────────────────────────
function CarneItem({ obj, euro }: { obj: any; euro: (v: number) => string }) {
    const [aberto, setAberto] = useState(false)

    const validos = obj.lancamentos?.filter((l: any) => l.forma_pagamento !== 'MBWAY') || []
    const pendentes = obj.lancamentos?.filter((l: any) => l.forma_pagamento === 'MBWAY') || []
    const totalPago = validos.reduce((s: number, l: any) => s + l.valor_pago, 0)
    const pendente = pendentes.reduce((s: number, l: any) => s + l.valor_pago, 0)
    const meta = obj.valor_mensal * obj.parcelas_total
    const pct = Math.min((totalPago / meta) * 100, 100)
    const parcelas = Math.floor(totalPago / obj.valor_mensal)
    const concluido = pct >= 100
    const ultimaData = obj.lancamentos?.[0]
        ? new Date(obj.lancamentos[0].data_recebimento).toLocaleDateString('pt-PT')
        : null

    return (
        <div className={`bg-bg2 border rounded-2xl overflow-hidden transition-all ${concluido ? 'border-emerald-500/20' : aberto ? 'border-blue-500/20' : 'border-soft hover:border-soft/80'}`}>
            {/* BARRA DE PROGRESSO TOPO */}
            <div className="h-0.5 bg-soft">
                <div
                    className={`h-full transition-all duration-700 ${concluido ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            <button
                onClick={() => setAberto(!aberto)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-soft/20 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${concluido ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black uppercase tracking-tight text-fg">{obj.nome}</p>
                            {concluido && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                        </div>
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                            {parcelas}/{obj.parcelas_total} parcelas · Vence dia {obj.data_pagamento}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-[9px] font-black text-fg">{Math.round(pct)}%</p>
                        <p className="text-[8px] text-muted font-bold">{euro(totalPago)}</p>
                    </div>
                    <ChevronDown size={13} className={`text-muted transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {aberto && (
                <div className="border-t border-soft px-5 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 bg-bg/50">
                    {/* PROGRESSO DETALHADO */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted">Progresso</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-fg">{euro(totalPago)} / {euro(meta)}</span>
                        </div>
                        <div className="h-2 bg-soft rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${concluido ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-bg border border-soft rounded-xl p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Valor Mensal</p>
                            <p className="text-sm font-black text-fg mt-1">{euro(obj.valor_mensal)}</p>
                        </div>
                        <div className="bg-bg border border-soft rounded-xl p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Parcelas</p>
                            <p className="text-sm font-black text-fg mt-1">{parcelas} <span className="text-muted text-[10px]">de {obj.parcelas_total}</span></p>
                        </div>
                    </div>

                    {pendente > 0 && (
                        <div className="flex items-center gap-3 bg-orange-500/5 border border-orange-500/15 rounded-xl px-4 py-3">
                            <Clock size={13} className="text-orange-500 shrink-0" />
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-orange-600">{euro(pendente)} em validação</p>
                                <p className="text-[8px] text-muted font-bold uppercase tracking-widest">A aguardar confirmação do tesoureiro</p>
                            </div>
                        </div>
                    )}

                    {ultimaData && (
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest flex items-center gap-1.5">
                            <CalendarDays size={10} /> Último pagamento: {ultimaData}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ── RIFA ──────────────────────────────────────────────────────────────────────
function RifaItem({ item, euro }: { item: any; euro: (v: number) => string }) {
    const [aberto, setAberto] = useState(false)

    const valorTotal = item.numeros.length * (item.rifa?.valor_numero || 0)
    const dataCompra = new Date(item.dataCompra).toLocaleDateString('pt-PT')
    const numeroVencedor = item.rifa?.numero_sorteado
    const vencedor = numeroVencedor && item.numeros.includes(numeroVencedor)
    const encerrada = item.rifa?.status === 'FINALIZADA'

    return (
        <div className={`bg-bg2 border rounded-2xl overflow-hidden transition-all
            ${vencedor ? 'border-figueira/30 bg-figueira/3' : encerrada ? 'border-soft opacity-70' : 'border-soft hover:border-soft/80'}`}>
            <button
                onClick={() => setAberto(!aberto)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-soft/20 transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${vencedor ? 'bg-figueira' : encerrada ? 'bg-soft' : 'bg-orange-400'}`} />
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <p className="text-[11px] font-black uppercase tracking-tight text-fg">{item.rifa?.nome || 'Rifa'}</p>
                            {vencedor && <Trophy size={12} className="text-figueira shrink-0" />}
                        </div>
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                            {item.numeros.length} número{item.numeros.length !== 1 ? 's' : ''} · {euro(valorTotal)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {vencedor && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-figueira text-white px-2 py-1 rounded-lg">
                            Vencedor
                        </span>
                    )}
                    {encerrada && !vencedor && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-soft text-muted px-2 py-1 rounded-lg">
                            Encerrada
                        </span>
                    )}
                    <ChevronDown size={13} className={`text-muted transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {aberto && (
                <div className="border-t border-soft px-5 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200 bg-bg/50">
                    {vencedor && (
                        <div className="flex items-center gap-3 bg-figueira/8 border border-figueira/15 rounded-xl px-4 py-3">
                            <Trophy size={16} className="text-figueira shrink-0" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-figueira">Parabéns!</p>
                                <p className="text-[9px] text-fg font-bold uppercase">O teu número <span className="font-black text-figueira">#{numeroVencedor}</span> foi sorteado.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">
                            Meus números ({item.numeros.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {item.numeros.sort((a: number, b: number) => a - b).map((num: number) => (
                                <span key={num} className={`text-[9px] font-black px-2.5 py-1 rounded-lg border
                                    ${num === numeroVencedor
                                        ? 'bg-figueira text-white border-figueira'
                                        : 'bg-bg border-soft text-muted'}`}>
                                    #{num}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-bg border border-soft rounded-xl p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Prémio</p>
                            <p className="text-[10px] font-black text-fg mt-1">{item.rifa?.premio || '—'}</p>
                        </div>
                        <div className="bg-bg border border-soft rounded-xl p-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Data de Compra</p>
                            <p className="text-[10px] font-black text-fg mt-1">{dataCompra}</p>
                        </div>
                    </div>

                    {encerrada && !vencedor && numeroVencedor && (
                        <p className="text-[8px] font-bold text-center text-muted uppercase tracking-widest pt-1">
                            Número sorteado: <span className="font-black text-fg">#{numeroVencedor}</span>
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
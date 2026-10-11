import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Clock, BarChart3, ShoppingCart } from 'lucide-react'
import FormAbrirTurno from '@/components/cantina/FormAbrirTurno'
import FormFecharTurno from '@/components/cantina/FormFecharTurno'

export const dynamic = 'force-dynamic'

export default async function TurnosPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const db = await getDb()

    // ── Check permission: admin, cantina leader, or cantina member ───
    const admin = isAdminCheck(session.role)
    let temPermissao = admin

    if (!temPermissao) {
        const lideraCantina = await db.departamento.findFirst({
            where: {
                lider_id: session.membroId,
                nome: { contains: 'Cantina', mode: 'insensitive' },
            },
        })
        if (lideraCantina) temPermissao = true
    }

    if (!temPermissao) {
        const integranteCantina = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: session.membroId,
                departamento: { nome: { contains: 'Cantina', mode: 'insensitive' } },
            },
        })
        if (integranteCantina) temPermissao = true
    }

    if (!temPermissao) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa da Cantina.')
    }

    // ── Current open shift for this user ─────────────────────────────
    const turnoAberto = await db.turnoCantina.findFirst({
        where: {
            operador_id: session.membroId,
            status: 'ABERTO',
        },
        include: {
            operador: { select: { first_name: true, last_name: true } },
        },
    })

    // ── Stats for open shift ─────────────────────────────────────────
    let turnoStats = { count: 0, total: 0, totalDinheiro: 0 }
    if (turnoAberto) {
        const transacoes = await db.transacaoCantina.findMany({
            where: { turno_id: turnoAberto.id, tipo: 'CONSUMO' },
        })
        turnoStats.count = transacoes.length
        turnoStats.total = transacoes.reduce((s, t) => s + Math.abs(t.valor), 0)
        turnoStats.totalDinheiro = transacoes
            .filter((t) => t.forma_pagamento === 'DINHEIRO')
            .reduce((s, t) => s + Math.abs(t.valor), 0)
    }

    // ── Recent closed shifts ─────────────────────────────────────────
    const turnosFechados = await db.turnoCantina.findMany({
        where: { status: 'FECHADO' },
        include: {
            operador: { select: { first_name: true, last_name: true } },
            _count: { select: { transacoes: true } },
        },
        orderBy: { fecho_em: 'desc' },
        take: 20,
    })

    // ── Format helpers ───────────────────────────────────────────────
    const fmt = (v: number) => v.toFixed(2).replace('.', ',')
    const fmtTime = (d: Date) => {
        const hours = String(d.getHours()).padStart(2, '0')
        const mins = String(d.getMinutes()).padStart(2, '0')
        return `${hours}:${mins}`
    }
    const fmtDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        return `${day}/${month}`
    }
    const fmtDuration = (start: Date, end: Date) => {
        const diffMs = end.getTime() - start.getTime()
        const hours = Math.floor(diffMs / 3600000)
        const mins = Math.floor((diffMs % 3600000) / 60000)
        return `${hours}h${String(mins).padStart(2, '0')}`
    }

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-28">
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                        Gestao de Turnos
                    </h1>
                    <p className="text-xs text-muted">Abrir, fechar e consultar historico de turnos da cantina.</p>
                </div>
                <Link
                    href="/cantina/dashboard"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <BarChart3 size={14} className="text-figueira" /> Dashboard
                </Link>
            </header>

            {/* ── CURRENT SHIFT BANNER ────────────────────────────────── */}
            <section className="space-y-4">
                {turnoAberto ? (
                    <>
                        {/* Active shift banner */}
                        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                <div>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-green-400">
                                        Turno Aberto
                                    </h2>
                                    <p className="text-[10px] md:text-xs font-bold text-green-400/70 mt-0.5">
                                        Desde {fmtTime(turnoAberto.abertura_em)} &middot;{' '}
                                        {turnoAberto.operador.first_name} {turnoAberto.operador.last_name || ''}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-bg/50 rounded-xl p-3 space-y-0.5">
                                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Vendas</p>
                                    <p className="text-xl font-black text-fg">{turnoStats.count}</p>
                                </div>
                                <div className="bg-bg/50 rounded-xl p-3 space-y-0.5">
                                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Total</p>
                                    <p className="text-xl font-black text-fg">{fmt(turnoStats.total)} EUR</p>
                                </div>
                                <div className="bg-bg/50 rounded-xl p-3 space-y-0.5">
                                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Caixa Inicial</p>
                                    <p className="text-xl font-black text-fg">{fmt(turnoAberto.valor_inicial)} EUR</p>
                                </div>
                            </div>
                        </div>

                        {/* Close shift form */}
                        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
                            <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">
                                Fechar Turno
                            </h3>
                            <FormFecharTurno
                                turnoId={turnoAberto.id}
                                valorInicial={turnoAberto.valor_inicial}
                                totalDinheiro={turnoStats.totalDinheiro}
                                totalVendas={turnoStats.total}
                                vendasCount={turnoStats.count}
                            />
                        </div>
                    </>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <Clock size={20} className="text-muted" />
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest text-fg">
                                    Nenhum Turno Aberto
                                </h2>
                                <p className="text-[10px] md:text-xs font-bold text-muted mt-0.5">
                                    Abra um turno para comecar a registar vendas.
                                </p>
                            </div>
                        </div>
                        <FormAbrirTurno />
                    </div>
                )}
            </section>

            {/* ── SHIFT HISTORY ────────────────────────────────────────── */}
            <section className="space-y-4 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <Clock size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Historico de Turnos
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    {turnosFechados.length === 0 ? (
                        <p className="text-sm text-muted text-center py-8">Nenhum turno fechado.</p>
                    ) : (
                        <>
                            {/* Desktop header */}
                            <div className="hidden lg:grid grid-cols-[80px_1fr_80px_70px_100px_100px_80px] gap-4 px-6 py-3 border-b border-soft">
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Data</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Operador</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Duracao</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Vendas</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Total</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">Diferenca</p>
                                <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-center">Status</p>
                            </div>

                            {turnosFechados.map((turno) => {
                                const dif = turno.diferenca ?? 0
                                const difColor =
                                    dif === 0
                                        ? 'text-green-400'
                                        : dif < 0
                                        ? 'text-red-400'
                                        : 'text-orange-400'

                                return (
                                    <div
                                        key={turno.id}
                                        className="lg:grid lg:grid-cols-[80px_1fr_80px_70px_100px_100px_80px] gap-4 px-6 py-4 border-b border-soft last:border-b-0 items-center"
                                    >
                                        {/* Date */}
                                        <p className="text-xs font-bold text-muted">
                                            {turno.fecho_em ? fmtDate(turno.fecho_em) : '-'}
                                        </p>

                                        {/* Operator */}
                                        <p className="text-sm font-bold text-fg">
                                            {turno.operador.first_name} {turno.operador.last_name || ''}
                                        </p>

                                        {/* Duration */}
                                        <p className="text-xs font-bold text-muted">
                                            {turno.fecho_em
                                                ? fmtDuration(turno.abertura_em, turno.fecho_em)
                                                : '-'}
                                        </p>

                                        {/* Sales count */}
                                        <p className="text-sm font-black text-fg text-right">
                                            {turno._count.transacoes}
                                        </p>

                                        {/* Total */}
                                        <p className="text-sm font-black text-fg text-right">
                                            {turno.valor_final_esperado != null
                                                ? fmt(turno.valor_final_esperado - turno.valor_inicial)
                                                : '-'}{' '}
                                            EUR
                                        </p>

                                        {/* Diferenca */}
                                        <p className={`text-sm font-black text-right ${difColor}`}>
                                            {dif > 0 ? '+' : ''}
                                            {fmt(dif)} EUR
                                        </p>

                                        {/* Status badge */}
                                        <div className="flex lg:justify-center mt-2 lg:mt-0">
                                            <span className="inline-flex items-center gap-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg px-2.5 py-1 text-[9px] md:text-[11px] font-black uppercase tracking-widest">
                                                Fechado
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </>
                    )}
                </div>
            </section>

            {/* ── LINKS ──────────────────────────────────────────────── */}
            <section className="flex flex-wrap gap-2 pt-6 border-t border-soft">
                <Link
                    href="/cantina/pos"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    <ShoppingCart size={14} className="text-figueira" /> Ponto de Venda
                </Link>
                <Link
                    href="/cantina"
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-figueira/50 transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest text-fg"
                >
                    Cantina
                </Link>
            </section>
        </main>
    )
}

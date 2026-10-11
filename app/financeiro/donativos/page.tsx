import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Heart, Clock, CheckCircle2, TrendingUp, AlertCircle, ExternalLink } from 'lucide-react'
import BotaoConfirmarDonativo from '@/components/financeiro/BotaoConfirmarDonativo'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatData = (d: Date) =>
    new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export default async function DonativosDashboard() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado')
    }

    const now = new Date()
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
    const inicioAno = new Date(now.getFullYear(), 0, 1)

    const [pendentes, confirmadosMes, confirmadosAno, recentes] = await Promise.all([
        db.donativoOnline.findMany({
            where: { status: 'PENDENTE' },
            orderBy: { criado_em: 'desc' },
            include: { fundo: { select: { nome: true } } }
        }),
        db.donativoOnline.findMany({
            where: { status: 'CONFIRMADO', confirmado_em: { gte: inicioMes } },
            select: { valor: true }
        }),
        db.donativoOnline.findMany({
            where: { status: 'CONFIRMADO', confirmado_em: { gte: inicioAno } },
            select: { valor: true }
        }),
        db.donativoOnline.findMany({
            where: { status: 'CONFIRMADO' },
            orderBy: { confirmado_em: 'desc' },
            take: 20,
            include: { fundo: { select: { nome: true } } }
        })
    ])

    const totalMes = confirmadosMes.reduce((s, d) => s + d.valor, 0)
    const totalAno = confirmadosAno.reduce((s, d) => s + d.valor, 0)

    return (
        <div className="pt-16 md:pt-8 pb-28 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Heart size={20} className="text-figueira" />
                    <h1 className="text-base font-black uppercase tracking-widest text-fg">Donativos Online</h1>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} className="text-amber-400" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Pendentes</p>
                    </div>
                    <p className="text-2xl font-black text-amber-400">{pendentes.length}</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-green-400" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Este Mes</p>
                    </div>
                    <p className="text-2xl font-black text-green-400">{euro(totalMes)}</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-figueira" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Este Ano</p>
                    </div>
                    <p className="text-2xl font-black text-figueira">{euro(totalAno)}</p>
                </div>
            </div>

            {/* Pendentes */}
            {pendentes.length > 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={14} className="text-amber-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-fg">Donativos Pendentes</h2>
                    </div>
                    <div className="space-y-3">
                        {pendentes.map(d => (
                            <div key={d.id} className="bg-bg border border-soft rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-fg">{d.anonimo ? 'Anonimo' : d.nome_doador}</span>
                                        <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{d.forma_pagamento}</span>
                                        {d.recorrente && <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">Recorrente</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                                        <span>{euro(d.valor)}</span>
                                        {d.fundo && <span>Fundo: {d.fundo.nome}</span>}
                                        <span>{formatData(d.criado_em)}</span>
                                    </div>
                                    {d.referencia && <p className="text-[10px] text-muted font-mono mt-1">Ref: {d.referencia}</p>}
                                    {d.mensagem && <p className="text-xs text-muted mt-1 italic">&quot;{d.mensagem}&quot;</p>}
                                </div>
                                <BotaoConfirmarDonativo donativoId={d.id} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {pendentes.length === 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center">
                    <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                    <p className="text-xs text-muted font-bold uppercase tracking-widest">Nenhum donativo pendente</p>
                </div>
            )}

            {/* Recentes confirmados */}
            {recentes.length > 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-fg">Recentes Confirmados</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[8px] font-black uppercase tracking-widest text-muted border-b border-soft">
                                    <th className="py-2 pr-4">Doador</th>
                                    <th className="py-2 pr-4">Valor</th>
                                    <th className="py-2 pr-4">Fundo</th>
                                    <th className="py-2 pr-4">Metodo</th>
                                    <th className="py-2">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentes.map(d => (
                                    <tr key={d.id} className="border-b border-soft/50 last:border-0">
                                        <td className="py-2.5 pr-4 text-xs font-semibold text-fg">{d.anonimo ? 'Anonimo' : d.nome_doador}</td>
                                        <td className="py-2.5 pr-4 text-xs font-bold text-green-400">{euro(d.valor)}</td>
                                        <td className="py-2.5 pr-4 text-xs text-muted">{d.fundo?.nome || 'Geral'}</td>
                                        <td className="py-2.5 pr-4 text-xs text-muted">{d.forma_pagamento}</td>
                                        <td className="py-2.5 text-xs text-muted">{d.confirmado_em ? formatData(d.confirmado_em) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

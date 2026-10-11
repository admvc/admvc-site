import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import FormCarregarSaldo from '@/components/cantina/FormCarregarSaldo'
import Link from 'next/link'
import { ArrowLeft, Wallet2, Clock, CheckCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CarregarSaldoPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = await getDb()

    // Buscar saldo atual
    const saldoRecord = await db.saldoCantina.findUnique({
        where: { membro_id: session.membroId },
    })
    const saldo = saldoRecord?.saldo || 0

    // Buscar pedidos de recarga pendentes
    const pedidosPendentes = await db.pedidoSaldoCantina.findMany({
        where: {
            membro_id: session.membroId,
            status: 'PENDENTE',
        },
        orderBy: { createdAt: 'desc' },
    })

    // Buscar ultimos pedidos aprovados (para historico)
    const pedidosRecentes = await db.pedidoSaldoCantina.findMany({
        where: {
            membro_id: session.membroId,
            status: { not: 'PENDENTE' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
    })

    return (
        <main className="max-w-4xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-28 animate-in fade-in duration-700">
            <header className="space-y-4">
                <Link
                    href="/cantina/menu-local"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors"
                >
                    <ArrowLeft size={12} /> Voltar ao Menu
                </Link>
                <div className="text-center space-y-2 pb-6 border-b border-soft">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <Wallet2 size={14} /> Carregar Saldo
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Carregar <span className="text-muted/20">saldo.</span>
                    </h1>
                </div>
            </header>

            {/* Saldo atual */}
            <div className="bg-bg2 border border-soft rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Wallet2 size={20} className="text-figueira" />
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted block">Saldo Atual</span>
                        <span className="text-2xl font-black italic text-figueira">{saldo.toFixed(2)}€</span>
                    </div>
                </div>
            </div>

            {/* Formulario de recarga */}
            <FormCarregarSaldo />

            {/* Pedidos pendentes */}
            {pedidosPendentes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                        <Clock size={12} /> Pedidos Pendentes
                    </h2>
                    <div className="space-y-2">
                        {pedidosPendentes.map(p => (
                            <div key={p.id} className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-fg">{p.valor.toFixed(2)}€</p>
                                    <p className="text-[10px] text-muted">
                                        {p.forma_pagamento} · {p.createdAt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Pendente</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Historico recente */}
            {pedidosRecentes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                        <CheckCircle size={12} /> Historico
                    </h2>
                    <div className="space-y-2">
                        {pedidosRecentes.map(p => (
                            <div key={p.id} className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-black text-fg">{p.valor.toFixed(2)}€</p>
                                    <p className="text-[10px] text-muted">
                                        {p.forma_pagamento} · {p.createdAt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${
                                    p.status === 'APROVADO' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                    {p.status === 'APROVADO' ? 'Aprovado' : p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}

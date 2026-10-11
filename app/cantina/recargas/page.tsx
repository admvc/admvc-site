import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import BotaoAprovarRecarga from '@/components/cantina/BotaoAprovarRecarga'
import { ArrowLeft, Wallet2, User, Clock } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RecargasPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = await getDb()

    // Acesso: admin OU lider/integrante da cantina
    if (!isAdmin(session.role)) {
        const membroCantina = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: session.membroId,
                departamento: { nome: { contains: 'cantina', mode: 'insensitive' } },
            },
        })
        const liderCantina = await db.departamento.findFirst({
            where: {
                lider_id: session.membroId,
                nome: { contains: 'cantina', mode: 'insensitive' },
            },
        })
        if (!membroCantina && !liderCantina) {
            redirect('/cantina/menu-local')
        }
    }

    // Pedidos pendentes
    const pedidosPendentes = await db.pedidoSaldoCantina.findMany({
        where: { status: 'PENDENTE' },
        include: {
            membro: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { createdAt: 'asc' },
    })

    // Pedidos recentes aprovados/rejeitados
    const pedidosRecentes = await db.pedidoSaldoCantina.findMany({
        where: { status: { not: 'PENDENTE' } },
        include: {
            membro: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
    })

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 pb-28 animate-in fade-in duration-700">
            <header className="space-y-4">
                <Link
                    href="/cantina/dashboard"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors"
                >
                    <ArrowLeft size={12} /> Voltar
                </Link>
                <div className="text-center space-y-2 pb-6 border-b border-soft">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <Wallet2 size={14} /> Gestao de Recargas
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Recargas <span className="text-muted/20">pendentes.</span>
                    </h1>
                </div>
            </header>

            {/* Pendentes */}
            {pedidosPendentes.length === 0 ? (
                <div className="py-20 text-center">
                    <Wallet2 size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum pedido de recarga pendente</p>
                </div>
            ) : (
                <section className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                        <Clock size={12} /> Pendentes ({pedidosPendentes.length})
                    </h2>
                    <div className="space-y-3">
                        {pedidosPendentes.map(p => (
                            <div key={p.id} className="bg-bg2 border border-soft rounded-2xl p-5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <User size={16} className="text-figueira shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-black uppercase text-fg truncate">
                                            {p.membro.first_name} {p.membro.last_name}
                                        </p>
                                        <p className="text-[10px] text-muted">
                                            {p.forma_pagamento} · {p.createdAt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-black italic text-figueira">{p.valor.toFixed(2)}€</span>
                                    <BotaoAprovarRecarga pedidoId={p.id} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Historico */}
            {pedidosRecentes.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-black uppercase tracking-widest text-muted">Historico Recente</h2>
                    <div className="space-y-2">
                        {pedidosRecentes.map(p => (
                            <div key={p.id} className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between opacity-60">
                                <div className="flex items-center gap-3">
                                    <User size={14} className="text-muted" />
                                    <div>
                                        <p className="text-xs font-bold text-fg">
                                            {p.membro.first_name} {p.membro.last_name}
                                        </p>
                                        <p className="text-[10px] text-muted">
                                            {p.forma_pagamento} · {p.createdAt.toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-fg">{p.valor.toFixed(2)}€</span>
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                                        p.status === 'APROVADO' ? 'text-emerald-400' : 'text-red-400'
                                    }`}>
                                        {p.status === 'APROVADO' ? 'Aprovado' : p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}

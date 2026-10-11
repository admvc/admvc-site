import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import BotaoEntregue from '@/components/cantina/BotaoEntregue'
import BotaoCancelarEncomenda from '@/components/cantina/BotaoCancelarEncomenda'
import { ClipboardList, Package, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EncomendasPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    if (!isAdmin(session.role) && session.role !== 'FINANCE' && session.role !== 'MANAGER') {
        redirect('/cantina/menu-local')
    }

    const db = await getDb()

    // Hoje e amanha
    const agora = new Date()
    const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    const fimAmanha = new Date(inicioDia)
    fimAmanha.setDate(fimAmanha.getDate() + 2)

    // Buscar encomendas confirmadas para hoje/amanha
    const encomendas = await db.preEncomendaCantina.findMany({
        where: {
            status: { in: ['CONFIRMADA', 'ENTREGUE'] },
            evento: {
                data: { gte: inicioDia, lt: fimAmanha },
            },
        },
        include: {
            membro: { select: { id: true, first_name: true, last_name: true } },
            evento: { select: { id: true, nome: true, data: true } },
            itens: {
                include: { produto: { select: { nome: true } } },
            },
        },
        orderBy: { criado_em: 'asc' },
    })

    // Agrupar por evento
    const porEvento = new Map<number, {
        evento: { id: number; nome: string; data: Date }
        encomendas: typeof encomendas
    }>()

    for (const enc of encomendas) {
        if (!porEvento.has(enc.evento_id)) {
            porEvento.set(enc.evento_id, { evento: enc.evento, encomendas: [] })
        }
        porEvento.get(enc.evento_id)!.encomendas.push(enc)
    }

    // Calcular totais agregados por produto por evento
    function calcularTotaisProdutos(encs: typeof encomendas) {
        const totais = new Map<string, number>()
        for (const enc of encs) {
            if (enc.status !== 'CONFIRMADA') continue
            for (const item of enc.itens) {
                const nome = item.produto.nome
                totais.set(nome, (totais.get(nome) || 0) + item.quantidade)
            }
        }
        return Array.from(totais.entries()).sort((a, b) => b[1] - a[1])
    }

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 pb-28 animate-in fade-in duration-700">
            <header className="text-center space-y-4 pb-8 border-b border-soft">
                <span className="text-figueira font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                    <ClipboardList size={14} /> Gestao de Encomendas
                </span>
                <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Encomendas <span className="text-muted/20">do dia.</span>
                </h1>
            </header>

            {porEvento.size === 0 && (
                <div className="py-20 text-center">
                    <Package size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">Nenhuma encomenda para hoje ou amanha</p>
                </div>
            )}

            {Array.from(porEvento.values()).map(({ evento, encomendas: encs }) => {
                const totaisProdutos = calcularTotaisProdutos(encs)
                const totalConfirmadas = encs.filter(e => e.status === 'CONFIRMADA').length
                const totalEntregues = encs.filter(e => e.status === 'ENTREGUE').length

                return (
                    <section key={evento.id} className="space-y-6">
                        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-widest text-fg">{evento.nome}</h2>
                                    <p className="text-xs text-muted capitalize">
                                        {evento.data.toLocaleDateString('pt-PT', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                        })}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">
                                        {totalConfirmadas} pendente{totalConfirmadas !== 1 ? 's' : ''} / {totalEntregues} entregue{totalEntregues !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Totais agregados por produto */}
                            {totaisProdutos.length > 0 && (
                                <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-4">
                                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-figueira mb-2">Resumo Total</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {totaisProdutos.map(([nome, qtd]) => (
                                            <span key={nome} className="bg-bg border border-soft rounded-xl px-3 py-1 text-xs font-bold text-fg">
                                                {qtd}x {nome}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lista de encomendas */}
                        <div className="space-y-3">
                            {encs.map(enc => (
                                <div
                                    key={enc.id}
                                    className={`bg-bg2 border rounded-2xl p-5 space-y-3 transition-all ${
                                        enc.status === 'ENTREGUE' ? 'border-emerald-500/20 opacity-60' : 'border-soft'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-figueira" />
                                            <span className="text-sm font-black uppercase text-fg">
                                                {enc.membro.first_name} {enc.membro.last_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {enc.status === 'ENTREGUE' ? (
                                                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-emerald-400">
                                                    Entregue
                                                </span>
                                            ) : (
                                                <>
                                                    <BotaoEntregue encomendaId={enc.id} />
                                                    <BotaoCancelarEncomenda encomendaId={enc.id} />
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {enc.itens.map(item => (
                                            <span key={item.id} className="bg-bg border border-soft rounded-lg px-2 py-1 text-[10px] md:text-xs font-bold text-muted">
                                                {item.quantidade}x {item.produto.nome}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-soft">
                                        <span className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                                            #{enc.id} - {enc.criado_em.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-sm font-black italic text-figueira">{enc.total.toFixed(2)}€</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )
            })}
        </main>
    )
}

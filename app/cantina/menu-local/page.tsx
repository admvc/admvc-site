// app/cantina/menu-local/page.tsx
// Menu publico da cantina — le produtos da base de dados local
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Coffee, Package, ShoppingCart, ChevronDown } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MenuLocalPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = await getDb()

    const sevenDaysFromNow = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)

    const [produtos, categorias, proximosEventos] = await Promise.all([
        db.produtoCantina.findMany({
            where: {
                disponivel: true,
                OR: [
                    { controla_stock: false },
                    { stock: { gt: 0 } },
                ],
            },
            include: { categoria: true },
            orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
        }),
        db.categoriaCantina.findMany({
            where: { ativa: true },
            orderBy: { ordem: 'asc' },
        }),
        db.evento.findMany({
            where: { data: { gte: new Date(), lte: sevenDaysFromNow } },
            orderBy: { data: 'asc' },
            take: 10,
            select: { id: true, nome: true, data: true, cardapio: { select: { id: true } } },
        }),
    ])

    // Agrupar por categoria
    const porCategoria = categorias.map(cat => ({
        ...cat,
        produtos: produtos.filter(p => p.categoria_id === cat.id),
    }))
    const semCategoria = produtos.filter(p => !p.categoria_id)

    return (
        <main className="max-w-6xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10 pb-28 md:pb-24 animate-in fade-in duration-700">
            <header className="text-center space-y-3 md:space-y-4 pb-5 md:pb-8 border-b border-soft">
                <span className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                    <Coffee size={14} /> Menu Cantina
                </span>
                <h1 className="text-2xl md:text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    O que temos <span className="text-muted/20">hoje.</span>
                </h1>
            </header>

            {/* PRE-ENCOMENDAS — colapsado por defeito */}
            {proximosEventos.length > 0 && (
                <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden p-5 flex items-center justify-between hover:bg-soft/20 transition-all">
                        <span className="text-sm font-black uppercase tracking-widest text-figueira flex items-center gap-2">
                            <ShoppingCart size={14} /> Encomendar para o Proximo Evento
                        </span>
                        <span className="text-[9px] font-black text-muted bg-soft px-2 py-0.5 rounded-lg flex items-center gap-1">
                            {proximosEventos.length} evento{proximosEventos.length !== 1 ? 's' : ''}
                            <ChevronDown size={10} className="group-open:rotate-180 transition-transform" />
                        </span>
                    </summary>
                    <div className="px-5 pb-5">
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {proximosEventos.map(ev => {
                                const data = new Date(ev.data)
                                const dia = data.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                                const hora = data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                                const temCardapio = ev.cardapio !== null
                                return (
                                    <Link key={ev.id} href={`/cantina/encomendar/${ev.id}`}
                                        className="shrink-0 w-48 bg-bg border border-soft rounded-2xl p-4 hover:border-figueira/30 transition-all space-y-2">
                                        <p className="text-xs font-black uppercase text-fg truncate">{ev.nome}</p>
                                        <p className="text-[10px] text-muted">{dia} · {hora}</p>
                                        {temCardapio && (
                                            <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-figueira/10 text-figueira border border-figueira/20 px-2 py-0.5 rounded-lg">
                                                Cardapio disponivel
                                            </span>
                                        )}
                                        <p className="text-[9px] font-black uppercase tracking-widest text-figueira">Encomendar →</p>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                </details>
            )}

            {porCategoria.filter(c => c.produtos.length > 0).map(cat => (
                <section key={cat.id} className="space-y-4">
                    <h2 className="text-lg font-black uppercase tracking-widest text-fg flex items-center gap-3">
                        <Package size={16} className="text-figueira" /> {cat.nome}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cat.produtos.map(p => (
                            <div key={p.id} className="bg-bg2 border border-soft rounded-2xl p-5 space-y-2 hover:border-figueira/20 transition-all">
                                {p.imagem_url && (
                                    <div className="w-full h-24 rounded-xl bg-soft overflow-hidden mb-2">
                                        <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                                    </div>
                                )}
                                <h3 className="text-sm font-black uppercase text-fg leading-tight">{p.nome}</h3>
                                <p className="text-lg font-black italic text-figueira">{p.preco.toFixed(2)}€</p>
                                {p.controla_stock && (
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
                                        {p.stock > 0 ? `${p.stock} disponivel` : 'Esgotado'}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            {semCategoria.length > 0 && (
                <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase tracking-widest text-fg">Outros</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {semCategoria.map(p => (
                            <div key={p.id} className="bg-bg2 border border-soft rounded-2xl p-5 space-y-2">
                                <h3 className="text-sm font-black uppercase text-fg leading-tight">{p.nome}</h3>
                                <p className="text-lg font-black italic text-figueira">{p.preco.toFixed(2)}€</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {produtos.length === 0 && (
                <div className="py-20 text-center">
                    <Coffee size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum produto disponivel de momento</p>
                </div>
            )}
        </main>
    )
}

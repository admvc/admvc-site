import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { Package, AlertTriangle, Tag } from 'lucide-react'
import BotaoToggleProduto from '@/components/cantina/BotaoToggleProduto'
import BotaoEliminarCategoria from '@/components/cantina/BotaoEliminarCategoria'
import BotaoEliminarProduto from '@/components/cantina/BotaoEliminarProduto'
import InputStock from '@/components/cantina/InputStock'
import FormAdicionarCategoria from '@/components/cantina/FormAdicionarCategoria'
import FormAdicionarProduto from '@/components/cantina/FormAdicionarProduto'
import FormEditarProduto from '@/components/cantina/FormEditarProduto'
import BotaoImportarLoyverse from '@/components/cantina/BotaoImportarLoyverse'

export const dynamic = 'force-dynamic'

export default async function ProdutosPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')
    if (!isAdmin(session.role)) redirect('/membros/dashboard?error=Acesso restrito')

    const db = await getDb()

    const [produtos, categorias] = await Promise.all([
        db.produtoCantina.findMany({
            include: { categoria: true },
            orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
        }),
        db.categoriaCantina.findMany({
            orderBy: { ordem: 'asc' },
        }),
    ])

    // Stats
    const totalProdutos = produtos.length
    const totalCategorias = categorias.length
    const alertasStock = produtos.filter(
        (p) => p.controla_stock && p.stock <= p.stock_minimo
    ).length

    // Serialize for client components
    const categoriasSimples = categorias.map((c) => ({
        id: c.id,
        nome: c.nome,
    }))

    const produtosSerializados = produtos.map((p) => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        custo: (p as any).custo ?? null,
        categoria_id: p.categoria_id,
        stock: p.stock,
        stock_minimo: p.stock_minimo,
        controla_stock: p.controla_stock,
        disponivel: p.disponivel,
        imagem_url: p.imagem_url,
        promocoes: (p.promocoes as { quantidade: number; preco_total: number }[] | null) ?? null,
    }))

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-28">
            {/* ── HEADER ─────────────────────────────────────────────── */}
            <header className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg">
                            Gestao de Produtos
                        </h1>
                        <p className="text-xs text-muted">
                            Gerir categorias, produtos e stock da cantina.
                        </p>
                    </div>
                    <BotaoImportarLoyverse />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                            Total Produtos
                        </p>
                        <p className="text-3xl font-black text-fg">{totalProdutos}</p>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-1">
                        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                            Categorias
                        </p>
                        <p className="text-3xl font-black text-fg">{totalCategorias}</p>
                    </div>
                    <div
                        className={`bg-bg2 border rounded-2xl p-5 space-y-1 ${
                            alertasStock > 0
                                ? 'border-orange-500/30 bg-orange-500/5'
                                : 'border-soft'
                        }`}
                    >
                        <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                            {alertasStock > 0 && (
                                <AlertTriangle size={10} className="text-orange-500" />
                            )}
                            Stock Baixo
                        </p>
                        <p
                            className={`text-3xl font-black ${
                                alertasStock > 0 ? 'text-orange-500' : 'text-fg'
                            }`}
                        >
                            {alertasStock}
                        </p>
                    </div>
                </div>
            </header>

            {/* ── CATEGORIAS ─────────────────────────────────────────── */}
            <section className="space-y-6 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <Package size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Categorias
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                </div>

                {/* Categories list */}
                {categorias.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {categorias.map((cat) => (
                            <div
                                key={cat.id}
                                className="flex items-center gap-2 bg-bg2 border border-soft rounded-2xl px-4 py-2.5"
                            >
                                <span className="text-sm font-bold text-fg">{cat.nome}</span>
                                <span className="text-[9px] md:text-[11px] font-black text-muted">
                                    ({produtos.filter((p) => p.categoria_id === cat.id).length})
                                </span>
                                <BotaoEliminarCategoria categoriaId={cat.id} />
                            </div>
                        ))}
                    </div>
                )}

                {/* Add category form */}
                <div className="bg-bg2 border border-soft rounded-2xl p-6">
                    <FormAdicionarCategoria />
                </div>
            </section>

            {/* ── PRODUTOS TABLE ──────────────────────────────────────── */}
            <section className="space-y-6 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <Package size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Produtos
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                </div>

                {produtos.length === 0 ? (
                    <div className="bg-bg2 border border-soft rounded-2xl p-10 text-center">
                        <Package size={32} className="mx-auto text-muted2 mb-3" />
                        <p className="text-sm font-bold text-muted">
                            Nenhum produto criado. Adicione o primeiro produto abaixo.
                        </p>
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        {/* Desktop table header */}
                        <div className="hidden md:grid grid-cols-[1fr_100px_70px_90px_90px_auto_auto_auto] gap-4 px-6 py-3 border-b border-soft">
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                                Produto
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                                Categoria
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-right">
                                Preco
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-center">
                                Stock
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-center">
                                Status
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-center">
                                Promos
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted text-center">
                                Acoes
                            </p>
                            <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted" />
                        </div>

                        {/* Product rows */}
                        {produtos.map((produto, idx) => {
                            const lowStock =
                                produto.controla_stock &&
                                produto.stock <= produto.stock_minimo
                            const promocoes = (produto.promocoes as { quantidade: number; preco_total: number }[] | null) ?? []
                            const produtoSerial = produtosSerializados[idx]

                            return (
                                <div
                                    key={produto.id}
                                    className={`md:grid md:grid-cols-[1fr_100px_70px_90px_90px_auto_auto_auto] gap-4 px-6 py-4 border-b border-soft last:border-b-0 items-center ${
                                        lowStock ? 'bg-orange-500/5' : ''
                                    }`}
                                >
                                    {/* Nome */}
                                    <div className="flex items-center gap-3">
                                        {lowStock && (
                                            <AlertTriangle
                                                size={14}
                                                className="text-orange-500 shrink-0"
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-bold text-fg">
                                                {produto.nome}
                                            </p>
                                            <p className="text-[10px] text-muted2 md:hidden">
                                                {produto.categoria?.nome || 'Sem categoria'} &middot;{' '}
                                                {produto.preco.toFixed(2)} EUR
                                            </p>
                                        </div>
                                    </div>

                                    {/* Categoria (desktop) */}
                                    <p className="hidden md:block text-xs text-muted font-bold truncate">
                                        {produto.categoria?.nome || '-'}
                                    </p>

                                    {/* Preco (desktop) */}
                                    <p className="hidden md:block text-sm font-black text-fg text-right">
                                        {produto.preco.toFixed(2)}
                                    </p>

                                    {/* Stock */}
                                    <div className="flex md:justify-center mt-2 md:mt-0">
                                        {produto.controla_stock ? (
                                            <InputStock
                                                produtoId={produto.id}
                                                stockAtual={produto.stock}
                                            />
                                        ) : (
                                            <span className="text-xs text-muted2 font-bold">
                                                --
                                            </span>
                                        )}
                                    </div>

                                    {/* Status toggle */}
                                    <div className="flex md:justify-center mt-2 md:mt-0">
                                        <BotaoToggleProduto
                                            produtoId={produto.id}
                                            disponivel={produto.disponivel}
                                        />
                                    </div>

                                    {/* Promotions badges */}
                                    <div className="flex flex-wrap gap-1 mt-2 md:mt-0 md:justify-center">
                                        {promocoes.length > 0 ? (
                                            promocoes.map((promo, i) => (
                                                <span
                                                    key={i}
                                                    className="inline-flex items-center gap-0.5 bg-figueira/10 text-figueira border border-figueira/20 rounded-lg px-2 py-0.5 text-[10px] md:text-xs font-black"
                                                >
                                                    <Tag size={8} />
                                                    {promo.quantidade}&rarr;{promo.preco_total.toFixed(0)}&euro;
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-[10px] md:text-xs text-muted2 font-bold">--</span>
                                        )}
                                    </div>

                                    {/* Edit + Delete */}
                                    <div className="flex items-center gap-2 mt-2 md:mt-0">
                                        <FormEditarProduto
                                            produto={produtoSerial}
                                            categorias={categoriasSimples}
                                        />
                                        <BotaoEliminarProduto produtoId={produto.id} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* ── ADD PRODUCT FORM ────────────────────────────────────── */}
            <section className="space-y-6 pt-6 border-t border-soft">
                <div className="flex items-center gap-4">
                    <Package size={20} className="text-figueira" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                        Novo Produto
                    </h2>
                    <div className="h-[1px] flex-1 bg-soft" />
                </div>

                <div className="bg-bg2 border border-soft rounded-2xl p-6">
                    <FormAdicionarProduto categorias={categoriasSimples} />
                </div>
            </section>
        </main>
    )
}

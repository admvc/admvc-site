'use client'

import { useState, useMemo } from 'react'
import { ShoppingCart, Plus, Minus, Trash2, Loader2, CheckCircle, XCircle, Wallet2 } from 'lucide-react'
import { criarPreEncomenda } from '@/actions/encomenda-actions'

interface Produto {
    id: number
    nome: string
    preco: number
    stock: number
    controla_stock: boolean
    categoria: { nome: string } | null
}

interface CartItem {
    produtoId: number
    nome: string
    preco: number
    quantidade: number
    stock: number
    controla_stock: boolean
}

interface Props {
    eventoId: number
    eventoNome: string
    eventoData: string
    produtos: Produto[]
    saldo: number
}

export default function FormEncomendar({ eventoId, eventoNome, eventoData, produtos, saldo }: Props) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ success?: boolean; total?: number; error?: string } | null>(null)

    const total = useMemo(() => cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0), [cart])
    const saldoRestante = saldo - total

    // Agrupar produtos por categoria
    const categorias = useMemo(() => {
        const cats = new Map<string, Produto[]>()
        for (const p of produtos) {
            const catNome = p.categoria?.nome || 'Outros'
            if (!cats.has(catNome)) cats.set(catNome, [])
            cats.get(catNome)!.push(p)
        }
        return Array.from(cats.entries())
    }, [produtos])

    function addToCart(produto: Produto) {
        setResultado(null)
        setCart(prev => {
            const existing = prev.find(i => i.produtoId === produto.id)
            if (existing) {
                if (produto.controla_stock && existing.quantidade >= produto.stock) return prev
                return prev.map(i =>
                    i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
                )
            }
            return [...prev, {
                produtoId: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: 1,
                stock: produto.stock,
                controla_stock: produto.controla_stock,
            }]
        })
    }

    function updateQuantidade(produtoId: number, delta: number) {
        setCart(prev => {
            return prev
                .map(i => {
                    if (i.produtoId !== produtoId) return i
                    const novaQtd = i.quantidade + delta
                    if (novaQtd <= 0) return null
                    if (i.controla_stock && novaQtd > i.stock) return i
                    return { ...i, quantidade: novaQtd }
                })
                .filter(Boolean) as CartItem[]
        })
    }

    function removeFromCart(produtoId: number) {
        setCart(prev => prev.filter(i => i.produtoId !== produtoId))
    }

    async function handleSubmit() {
        if (cart.length === 0) return
        if (saldoRestante < 0) return

        setLoading(true)
        setResultado(null)

        try {
            const itens = cart.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade }))
            const res = await criarPreEncomenda(eventoId, itens, true)

            if (res.error) {
                setResultado({ error: res.error })
            } else {
                setResultado({ success: true, total: res.total })
                setCart([])
            }
        } catch {
            setResultado({ error: 'Erro inesperado. Tente novamente.' })
        } finally {
            setLoading(false)
        }
    }

    // Resultado de sucesso
    if (resultado?.success) {
        return (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
                <CheckCircle size={48} className="mx-auto text-emerald-400" />
                <h2 className="text-xl font-black uppercase text-fg">Encomenda Confirmada!</h2>
                <p className="text-sm text-muted">
                    A sua encomenda de <span className="text-figueira font-bold">{resultado.total?.toFixed(2)}€</span> para{' '}
                    <span className="font-bold text-fg">{eventoNome}</span> foi registada com sucesso.
                </p>
                <p className="text-[10px] text-muted uppercase tracking-widest">O saldo foi debitado da sua conta.</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Saldo */}
            <div className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet2 size={16} className="text-figueira" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">Saldo Disponivel</span>
                </div>
                <span className="text-lg font-black italic text-figueira">{saldo.toFixed(2)}€</span>
            </div>

            {/* Erro */}
            {resultado?.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                    <XCircle size={16} className="text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{resultado.error}</p>
                </div>
            )}

            {/* Produtos por categoria */}
            {categorias.map(([catNome, prods]) => (
                <section key={catNome} className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted">{catNome}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {prods.map(p => {
                            const inCart = cart.find(i => i.produtoId === p.id)
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => addToCart(p)}
                                    className={`bg-bg2 border rounded-2xl p-4 text-left space-y-1 transition-all hover:border-figueira/30 ${
                                        inCart ? 'border-figueira/40 ring-1 ring-figueira/20' : 'border-soft'
                                    }`}
                                >
                                    <h4 className="text-sm font-black uppercase text-fg leading-tight">{p.nome}</h4>
                                    <p className="text-lg font-black italic text-figueira">{p.preco.toFixed(2)}€</p>
                                    {inCart && (
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-figueira">
                                            {inCart.quantidade}x no carrinho
                                        </p>
                                    )}
                                    {p.controla_stock && (
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted">
                                            {p.stock} disponivel
                                        </p>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </section>
            ))}

            {/* Carrinho */}
            {cart.length > 0 && (
                <section className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4 sticky bottom-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                        <ShoppingCart size={14} className="text-figueira" /> Carrinho
                    </h3>

                    <div className="space-y-3">
                        {cart.map(item => (
                            <div key={item.produtoId} className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-fg truncate">{item.nome}</p>
                                    <p className="text-xs text-muted">{(item.preco * item.quantidade).toFixed(2)}€</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuantidade(item.produtoId, -1)}
                                        className="w-7 h-7 rounded-lg bg-bg border border-soft flex items-center justify-center hover:border-figueira/30 transition-all"
                                    >
                                        <Minus size={12} className="text-fg" />
                                    </button>
                                    <span className="text-sm font-black text-fg w-6 text-center">{item.quantidade}</span>
                                    <button
                                        onClick={() => updateQuantidade(item.produtoId, 1)}
                                        className="w-7 h-7 rounded-lg bg-bg border border-soft flex items-center justify-center hover:border-figueira/30 transition-all"
                                    >
                                        <Plus size={12} className="text-fg" />
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.produtoId)}
                                        className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 transition-all"
                                    >
                                        <Trash2 size={12} className="text-red-400" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-soft pt-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Total</span>
                            <span className="text-xl font-black italic text-figueira">{total.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted">Saldo apos encomenda</span>
                            <span className={`text-sm font-bold ${saldoRestante >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {saldoRestante.toFixed(2)}€
                            </span>
                        </div>
                    </div>

                    {saldoRestante < 0 && (
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                            Saldo insuficiente para esta encomenda.
                        </p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading || saldoRestante < 0 || cart.length === 0}
                        className="w-full py-3 bg-figueira text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <ShoppingCart size={14} />
                        )}
                        {loading ? 'A processar...' : 'Confirmar Encomenda'}
                    </button>
                </section>
            )}

            {produtos.length === 0 && (
                <div className="py-20 text-center">
                    <ShoppingCart size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum produto disponivel de momento</p>
                </div>
            )}
        </div>
    )
}

'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2, Tag, X } from 'lucide-react'
import { criarProduto } from '@/actions/cantina-local-actions'

interface Promocao {
    quantidade: number
    preco_total: number
}

interface Categoria {
    id: number
    nome: string
}

interface Props {
    categorias: Categoria[]
}

export default function FormAdicionarProduto({ categorias }: Props) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [controlaStock, setControlaStock] = useState(true)
    const [promocoes, setPromocoes] = useState<Promocao[]>([])
    const [novaQtd, setNovaQtd] = useState('')
    const [novoPreco, setNovoPreco] = useState('')
    const formRef = useRef<HTMLFormElement>(null)

    function adicionarPromocao() {
        const qtd = Number(novaQtd)
        const preco = Number(novoPreco)
        if (qtd < 2 || preco <= 0) return
        if (promocoes.some((p) => p.quantidade === qtd)) return
        setPromocoes([...promocoes, { quantidade: qtd, preco_total: preco }])
        setNovaQtd('')
        setNovoPreco('')
    }

    function removerPromocao(idx: number) {
        setPromocoes(promocoes.filter((_, i) => i !== idx))
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setErro('')
        formData.set('controla_stock', controlaStock ? 'true' : 'false')
        formData.set('promocoes', JSON.stringify(promocoes.length > 0 ? promocoes : null))
        const res = await criarProduto(formData)
        if (res?.error) {
            setErro(res.error)
        } else {
            formRef.current?.reset()
            setControlaStock(true)
            setPromocoes([])
        }
        setLoading(false)
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Nome */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Nome do Produto
                    </label>
                    <input
                        type="text"
                        name="nome"
                        required
                        placeholder="Ex: Cafe, Bolo..."
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Preco */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Preco (EUR)
                    </label>
                    <input
                        type="number"
                        name="preco"
                        required
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Categoria */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Categoria
                    </label>
                    <select
                        name="categoria_id"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                    >
                        <option value="">Sem categoria</option>
                        {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.nome}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Custo de aquisicao */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Custo de Aquisicao (EUR)
                    </label>
                    <input
                        type="number"
                        name="custo"
                        min="0"
                        step="0.01"
                        placeholder="Opcional"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Stock Inicial
                    </label>
                    <input
                        type="number"
                        name="stock"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Stock Minimo */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Stock Minimo (Alerta)
                    </label>
                    <input
                        type="number"
                        name="stock_minimo"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Controla Stock */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Controla Stock
                    </label>
                    <div
                        onClick={() => setControlaStock(!controlaStock)}
                        className="flex items-center gap-3 bg-bg border border-soft rounded-2xl p-4 cursor-pointer hover:border-figueira/50 transition-all"
                    >
                        <div
                            className={`w-10 h-5 rounded-full transition-all relative ${
                                controlaStock ? 'bg-figueira' : 'bg-soft'
                            }`}
                        >
                            <div
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                                    controlaStock ? 'left-5' : 'left-0.5'
                                }`}
                            />
                        </div>
                        <span className="text-sm font-bold text-fg">
                            {controlaStock ? 'Sim' : 'Nao'}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── PROMOCOES ───────────────────────────────────────── */}
            <div className="space-y-3 pt-4 border-t border-soft">
                <div className="flex items-center gap-2">
                    <Tag size={14} className="text-figueira" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Promocoes
                    </p>
                </div>

                {/* Existing promotions */}
                {promocoes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {promocoes.map((promo, idx) => (
                            <span
                                key={idx}
                                className="flex items-center gap-1.5 bg-figueira/10 text-figueira border border-figueira/20 rounded-xl px-3 py-1.5 text-xs font-bold"
                            >
                                {promo.quantidade} por {promo.preco_total.toFixed(2)}&euro;
                                <button
                                    type="button"
                                    onClick={() => removerPromocao(idx)}
                                    className="hover:text-red-500 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Add promotion */}
                <div className="flex items-end gap-2">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                            Quantidade
                        </label>
                        <input
                            type="number"
                            min="2"
                            step="1"
                            value={novaQtd}
                            onChange={(e) => setNovaQtd(e.target.value)}
                            placeholder="2"
                            className="w-24 bg-bg border border-soft rounded-2xl p-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                            Preco Total (EUR)
                        </label>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={novoPreco}
                            onChange={(e) => setNovoPreco(e.target.value)}
                            placeholder="5.00"
                            className="w-32 bg-bg border border-soft rounded-2xl p-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={adicionarPromocao}
                        className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-figueira/10 text-figueira border border-figueira/20 text-[9px] font-black uppercase tracking-widest hover:bg-figueira/20 transition-all active:scale-95"
                    >
                        <Plus size={12} />
                        Adicionar
                    </button>
                </div>
            </div>

            {erro && (
                <p className="text-red-500 text-sm font-bold bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                    {erro}
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-figueira text-bg px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Criar Produto
            </button>
        </form>
    )
}

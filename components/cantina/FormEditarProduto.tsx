'use client'

import { useState } from 'react'
import { Pencil, X, Loader2, Tag, Plus } from 'lucide-react'
import { atualizarProduto } from '@/actions/cantina-local-actions'

interface Promocao {
    quantidade: number
    preco_total: number
}

interface Produto {
    id: number
    nome: string
    preco: number
    custo: number | null
    categoria_id: number | null
    stock: number
    stock_minimo: number
    controla_stock: boolean
    disponivel: boolean
    imagem_url: string | null
    promocoes: Promocao[] | null
}

interface Categoria {
    id: number
    nome: string
}

interface Props {
    produto: Produto
    categorias: Categoria[]
}

export default function FormEditarProduto({ produto, categorias }: Props) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [controlaStock, setControlaStock] = useState(produto.controla_stock)
    const [disponivel, setDisponivel] = useState(produto.disponivel)
    const [promocoes, setPromocoes] = useState<Promocao[]>(produto.promocoes || [])
    const [novaQtd, setNovaQtd] = useState('')
    const [novoPreco, setNovoPreco] = useState('')

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
        formData.set('disponivel', disponivel ? 'true' : 'false')
        formData.set('promocoes', JSON.stringify(promocoes.length > 0 ? promocoes : null))
        const res = await atualizarProduto(produto.id, formData)
        if (res?.error) {
            setErro(res.error)
        } else {
            setOpen(false)
        }
        setLoading(false)
    }

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-figueira/10 text-figueira border border-figueira/20 hover:bg-figueira/20 transition-all active:scale-95"
                title="Editar produto"
            >
                <Pencil size={12} />
                Editar
            </button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setOpen(false)}
            />

            {/* Modal */}
            <div className="relative bg-bg2 border border-soft rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-fg">
                        Editar Produto
                    </h3>
                    <button
                        onClick={() => setOpen(false)}
                        className="p-2 rounded-xl bg-bg border border-soft hover:border-figueira/50 transition-all"
                    >
                        <X size={16} className="text-muted" />
                    </button>
                </div>

                <form action={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Nome */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Nome do Produto
                            </label>
                            <input
                                type="text"
                                name="nome"
                                required
                                defaultValue={produto.nome}
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
                                defaultValue={produto.preco}
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
                                defaultValue={produto.categoria_id ?? ''}
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
                                defaultValue={produto.custo ?? ''}
                                placeholder="Opcional"
                                className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                            />
                        </div>

                        {/* Stock */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Stock
                            </label>
                            <input
                                type="number"
                                name="stock"
                                min="0"
                                defaultValue={produto.stock}
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
                                defaultValue={produto.stock_minimo}
                                className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                            />
                        </div>

                        {/* Imagem URL */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Imagem URL
                            </label>
                            <input
                                type="text"
                                name="imagem_url"
                                defaultValue={produto.imagem_url ?? ''}
                                placeholder="https://..."
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

                        {/* Disponivel */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Disponivel
                            </label>
                            <div
                                onClick={() => setDisponivel(!disponivel)}
                                className="flex items-center gap-3 bg-bg border border-soft rounded-2xl p-4 cursor-pointer hover:border-figueira/50 transition-all"
                            >
                                <div
                                    className={`w-10 h-5 rounded-full transition-all relative ${
                                        disponivel ? 'bg-green-500' : 'bg-soft'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                                            disponivel ? 'left-5' : 'left-0.5'
                                        }`}
                                    />
                                </div>
                                <span className="text-sm font-bold text-fg">
                                    {disponivel ? 'Sim' : 'Nao'}
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
                        <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                            <div className="space-y-1 flex-1">
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
                                    className="w-full sm:w-24 bg-bg border border-soft rounded-2xl p-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                                />
                            </div>
                            <div className="space-y-1 flex-1">
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
                                    className="w-full sm:w-32 bg-bg border border-soft rounded-2xl p-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={adicionarPromocao}
                                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-figueira/10 text-figueira border border-figueira/20 text-[9px] font-black uppercase tracking-widest hover:bg-figueira/20 transition-all active:scale-95"
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

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-figueira text-bg px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Pencil size={14} />
                            )}
                            Guardar Alteracoes
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest text-muted bg-bg border border-soft hover:border-figueira/50 transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, XCircle, UtensilsCrossed, Calendar, Trash2 } from 'lucide-react'
import { salvarCardapio, removerCardapio } from '@/actions/cardapio-actions'

interface Evento {
    id: number
    nome: string
    data: string
    cardapio: {
        id: number
        produtoIds: number[]
        itens: { id: number; nome: string; preco: number }[]
    } | null
}

interface Produto {
    id: number
    nome: string
    preco: number
    categoria: string
}

interface Props {
    eventos: Evento[]
    produtos: Produto[]
}

export default function FormCardapio({ eventos, produtos }: Props) {
    const [eventoSelecionado, setEventoSelecionado] = useState<number | null>(null)
    const [produtosSelecionados, setProdutosSelecionados] = useState<number[]>([])
    const [quantidades, setQuantidades] = useState<Record<number, number | undefined>>({})
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ success?: boolean; error?: string } | null>(null)

    const evento = eventos.find(e => e.id === eventoSelecionado)

    function selecionarEvento(eventoId: number) {
        setEventoSelecionado(eventoId)
        setResultado(null)
        const ev = eventos.find(e => e.id === eventoId)
        if (ev?.cardapio) {
            setProdutosSelecionados(ev.cardapio.produtoIds)
            // Restaurar quantidades se existirem
            setQuantidades({})
        } else {
            setProdutosSelecionados([])
            setQuantidades({})
        }
    }

    function toggleProduto(produtoId: number) {
        setProdutosSelecionados(prev =>
            prev.includes(produtoId)
                ? prev.filter(id => id !== produtoId)
                : [...prev, produtoId]
        )
        if (produtosSelecionados.includes(produtoId)) {
            setQuantidades(prev => {
                const next = { ...prev }
                delete next[produtoId]
                return next
            })
        }
    }

    function setQuantidade(produtoId: number, valor: string) {
        const num = valor === '' ? undefined : parseInt(valor, 10)
        setQuantidades(prev => ({ ...prev, [produtoId]: num }))
    }

    async function handleSalvar() {
        if (!eventoSelecionado || produtosSelecionados.length === 0) return

        setLoading(true)
        setResultado(null)

        try {
            const itens = produtosSelecionados.map(pid => ({
                produtoId: pid,
                quantidade: quantidades[pid],
            }))
            const res = await salvarCardapio(eventoSelecionado, itens)
            if (res.error) {
                setResultado({ error: res.error })
            } else {
                setResultado({ success: true })
            }
        } catch {
            setResultado({ error: 'Erro inesperado.' })
        } finally {
            setLoading(false)
        }
    }

    async function handleRemover() {
        if (!eventoSelecionado) return

        setLoading(true)
        setResultado(null)

        try {
            const res = await removerCardapio(eventoSelecionado)
            if (res.error) {
                setResultado({ error: res.error })
            } else {
                setProdutosSelecionados([])
                setResultado({ success: true })
            }
        } catch {
            setResultado({ error: 'Erro inesperado.' })
        } finally {
            setLoading(false)
        }
    }

    // Agrupar produtos por categoria
    const categorias = new Map<string, Produto[]>()
    for (const p of produtos) {
        if (!categorias.has(p.categoria)) categorias.set(p.categoria, [])
        categorias.get(p.categoria)!.push(p)
    }

    return (
        <div className="space-y-8">
            {/* Selecionar evento */}
            <section className="space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Calendar size={12} /> Selecionar Evento
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {eventos.map(ev => {
                        const data = new Date(ev.data)
                        const dia = data.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                        const hora = data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                        return (
                            <button
                                key={ev.id}
                                onClick={() => selecionarEvento(ev.id)}
                                className={`bg-bg2 border rounded-2xl p-4 text-left space-y-1 transition-all ${
                                    eventoSelecionado === ev.id
                                        ? 'border-figueira/40 ring-1 ring-figueira/20'
                                        : 'border-soft hover:border-figueira/20'
                                }`}
                            >
                                <p className="text-sm font-black uppercase text-fg truncate">{ev.nome}</p>
                                <p className="text-[10px] text-muted">{dia} · {hora}</p>
                                {ev.cardapio ? (
                                    <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-figueira/10 text-figueira border border-figueira/20 px-2 py-0.5 rounded-lg">
                                        Cardapio definido ({ev.cardapio.itens.length} itens)
                                    </span>
                                ) : (
                                    <span className="inline-block text-[8px] font-black uppercase tracking-widest text-muted">
                                        Sem cardapio
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </section>

            {eventos.length === 0 && (
                <div className="py-20 text-center">
                    <Calendar size={32} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum evento nos proximos 30 dias</p>
                </div>
            )}

            {/* Selecionar produtos */}
            {evento && (
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                            <UtensilsCrossed size={12} className="text-figueira" /> Produtos para {evento.nome}
                        </h2>
                        <span className="text-[10px] font-bold text-muted">
                            {produtosSelecionados.length} selecionado{produtosSelecionados.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {/* Resultado */}
                    {resultado?.success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
                            <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                            <p className="text-xs text-emerald-400 font-bold">Cardapio guardado com sucesso!</p>
                        </div>
                    )}
                    {resultado?.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                            <XCircle size={16} className="text-red-400 shrink-0" />
                            <p className="text-xs text-red-400">{resultado.error}</p>
                        </div>
                    )}

                    {Array.from(categorias.entries()).map(([catNome, prods]) => (
                        <div key={catNome} className="space-y-2">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted">{catNome}</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                                {prods.map(p => {
                                    const selecionado = produtosSelecionados.includes(p.id)
                                    return (
                                        <div key={p.id} className="space-y-1">
                                            <button
                                                onClick={() => toggleProduto(p.id)}
                                                className={`w-full bg-bg2 border rounded-xl p-3 text-left transition-all ${
                                                    selecionado
                                                        ? 'border-figueira/40 ring-1 ring-figueira/20'
                                                        : 'border-soft hover:border-figueira/20'
                                                }`}
                                            >
                                                <p className="text-xs font-bold text-fg truncate">{p.nome}</p>
                                                <p className="text-sm font-black italic text-figueira">{p.preco.toFixed(2)}&euro;</p>
                                            </button>
                                            {selecionado && (
                                                <input
                                                    type="number"
                                                    min="1"
                                                    placeholder="Qtd. disponivel (sem limite)"
                                                    value={quantidades[p.id] ?? ''}
                                                    onChange={(e) => setQuantidade(p.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="w-full bg-bg border border-soft rounded-lg px-2 py-1.5 text-[10px] font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Acoes */}
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={handleSalvar}
                            disabled={loading || produtosSelecionados.length === 0}
                            className="flex-1 py-3 bg-figueira text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                            {loading ? 'A guardar...' : 'Guardar Cardapio'}
                        </button>
                        {evento.cardapio && (
                            <button
                                onClick={handleRemover}
                                disabled={loading}
                                className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-40 flex items-center gap-2"
                            >
                                <Trash2 size={14} />
                                Remover
                            </button>
                        )}
                    </div>
                </section>
            )}
        </div>
    )
}

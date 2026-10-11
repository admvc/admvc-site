'use client'

import { useState, useEffect, useRef } from 'react'
import { Coffee, Maximize, Star, ZoomIn, ZoomOut, LayoutGrid, Play } from 'lucide-react'

interface Produto {
    id: number
    nome: string
    preco: number
    imagem_url: string | null
    promocoes: any
    categoria: { id: number; nome: string } | null
}

interface Props {
    produtos: Produto[]
    categorias: { id: number; nome: string }[]
}

// CSS para animacao de marquee infinito
const marqueeStyles = `
@keyframes marquee-left {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
}
@keyframes marquee-right {
    0% { transform: translateX(-50%); }
    100% { transform: translateX(0); }
}
.animate-marquee-left {
    animation: marquee-left var(--marquee-duration, 60s) linear infinite;
}
.animate-marquee-right {
    animation: marquee-right var(--marquee-duration, 60s) linear infinite;
}
.animate-marquee-left:hover,
.animate-marquee-right:hover {
    animation-play-state: paused;
}
`

type Modo = 'marquee' | 'grid'
type Tamanho = 'normal' | 'grande' | 'extra'

export default function CantinaTV({ produtos, categorias }: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [modo, setModo] = useState<Modo>('marquee')
    const [tamanho, setTamanho] = useState<Tamanho>('grande')
    const containerRef = useRef<HTMLDivElement>(null)

    // Produtos com promocao = destaques
    const destaques = produtos.filter(p => p.promocoes && Array.isArray(p.promocoes) && (p.promocoes as any[]).length > 0)
    const produtosDestaque = destaques.length > 0
        ? destaques
        : [...produtos].sort((a, b) => b.preco - a.preco).slice(0, 6)

    // Dividir produtos em duas linhas
    const metade = Math.ceil(produtos.length / 2)
    const linha1 = produtos.slice(0, metade)
    const linha2 = produtos.slice(metade)

    // Velocidade baseada na quantidade (mais produtos = mais tempo)
    const duracaoBase = Math.max(30, produtos.length * 3)

    // Tamanhos dos cards
    const cardSizes = {
        normal: { w: 'w-48', h: 'h-32', img: 'h-20', text: 'text-xs', preco: 'text-lg', p: 'p-3' },
        grande: { w: 'w-64', h: 'h-44', img: 'h-28', text: 'text-sm', preco: 'text-2xl', p: 'p-4' },
        extra: { w: 'w-80', h: 'h-56', img: 'h-36', text: 'text-base', preco: 'text-3xl', p: 'p-5' },
    }
    const sz = cardSizes[tamanho]

    // Ciclar tamanho
    function ciclarTamanho() {
        setTamanho(prev => prev === 'normal' ? 'grande' : prev === 'grande' ? 'extra' : 'normal')
    }

    // Fullscreen
    async function toggleFullscreen() {
        if (!containerRef.current) return
        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen()
            setIsFullscreen(true)
        } else {
            await document.exitFullscreen()
            setIsFullscreen(false)
        }
    }

    useEffect(() => {
        function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
        document.addEventListener('fullscreenchange', onFsChange)
        return () => document.removeEventListener('fullscreenchange', onFsChange)
    }, [])

    // Auto-reload a cada 5 minutos
    useEffect(() => {
        const reload = setInterval(() => window.location.reload(), 5 * 60 * 1000)
        return () => clearInterval(reload)
    }, [])

    // Render de um card de produto
    function CardProduto({ p }: { p: Produto }) {
        const temPromocao = p.promocoes && Array.isArray(p.promocoes) && (p.promocoes as any[]).length > 0
        const promo = temPromocao ? (p.promocoes as any[])[0] : null

        return (
            <div className={`${sz.w} shrink-0 rounded-2xl ${sz.p} space-y-2 transition-all ${
                temPromocao
                    ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30'
                    : 'bg-[#161616] border border-white/8'
            }`}>
                {p.imagem_url ? (
                    <div className={`w-full ${sz.img} rounded-xl overflow-hidden bg-black/50`}>
                        <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                    </div>
                ) : (
                    <div className={`w-full ${sz.img} rounded-xl bg-white/5 flex items-center justify-center`}>
                        <Coffee size={tamanho === 'extra' ? 40 : tamanho === 'grande' ? 32 : 24} className="text-white/10" />
                    </div>
                )}
                <h3 className={`${sz.text} font-black uppercase text-white leading-tight truncate`}>{p.nome}</h3>
                <div className="flex items-end gap-2">
                    <p className={`${sz.preco} font-black italic text-figueira`}>{p.preco.toFixed(2)}€</p>
                    {promo && (
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-amber-500 text-black mb-1 shrink-0">
                            {promo.quantidade}x {promo.preco_total?.toFixed(2)}€
                        </span>
                    )}
                </div>
            </div>
        )
    }

    // Render de uma linha marquee
    function LinhaMarquee({ items, direcao }: { items: Produto[]; direcao: 'left' | 'right' }) {
        if (items.length === 0) return null
        // Duplicar items para loop infinito seamless
        const duplicados = [...items, ...items]

        return (
            <div className="overflow-hidden w-full">
                <div
                    className={direcao === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'}
                    style={{ '--marquee-duration': `${duracaoBase}s`, display: 'flex', gap: '16px', width: 'max-content' } as any}
                >
                    {duplicados.map((p, idx) => (
                        <CardProduto key={`${p.id}-${idx}`} p={p} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: marqueeStyles }} />
            <div ref={containerRef} className="fixed inset-0 z-[99999] w-screen h-screen bg-[#0a0a0a] text-white overflow-hidden flex flex-col select-none cursor-default">

                {/* ── HEADER ─────────────────────────────── */}
                <div className="bg-[#111] border-b border-white/5 px-8 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-figueira flex items-center justify-center">
                            <Coffee size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-[0.2em]">Cantina</h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-figueira">Menu do Dia</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tamanho */}
                        <button
                            onClick={ciclarTamanho}
                            className="h-10 px-3 flex items-center gap-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all text-xs font-black uppercase tracking-widest"
                            title="Alterar tamanho"
                        >
                            {tamanho === 'extra' ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                            <span className="hidden sm:inline">{tamanho === 'normal' ? 'P' : tamanho === 'grande' ? 'M' : 'G'}</span>
                        </button>

                        {/* Modo */}
                        <button
                            onClick={() => setModo(prev => prev === 'marquee' ? 'grid' : 'marquee')}
                            className={`h-10 px-3 flex items-center gap-2 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                                modo === 'marquee' ? 'bg-figueira text-white' : 'bg-white/10 hover:bg-white/20'
                            }`}
                            title={modo === 'marquee' ? 'Modo grelha' : 'Modo scroll'}
                        >
                            {modo === 'marquee' ? <Play size={16} /> : <LayoutGrid size={16} />}
                            <span className="hidden sm:inline">{modo === 'marquee' ? 'Scroll' : 'Grelha'}</span>
                        </button>

                        {/* Fullscreen */}
                        <button
                            onClick={toggleFullscreen}
                            className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl hover:bg-figueira transition-all"
                            title="Tela cheia"
                        >
                            <Maximize size={18} />
                        </button>
                    </div>
                </div>

                {/* ── CONTEUDO PRINCIPAL ───────────────────── */}
                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                    {modo === 'marquee' ? (
                        /* ── MODO MARQUEE: 2 LINHAS EM DIRECOES OPOSTAS ── */
                        <div className="space-y-4 py-6">
                            <LinhaMarquee items={linha1} direcao="left" />
                            {linha2.length > 0 && (
                                <LinhaMarquee items={linha2} direcao="right" />
                            )}
                        </div>
                    ) : (
                        /* ── MODO GRID: SCROLL VERTICAL ────────────────── */
                        <div className="overflow-y-auto h-full px-8 py-6">
                            {categorias.length > 0 ? (
                                categorias
                                    .map(cat => ({ ...cat, prods: produtos.filter(p => p.categoria?.id === cat.id) }))
                                    .filter(c => c.prods.length > 0)
                                    .map(cat => (
                                        <div key={cat.id} className="mb-8">
                                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-figueira mb-4 border-b border-white/10 pb-2">
                                                {cat.nome}
                                            </h2>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                                {cat.prods.map(p => (
                                                    <div key={p.id} className="w-full">
                                                        <CardProduto p={p} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {produtos.map(p => (
                                        <div key={p.id} className="w-full">
                                            <CardProduto p={p} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {produtos.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-4">
                                <Coffee size={64} className="mx-auto text-white/10" />
                                <p className="text-lg font-black uppercase tracking-widest text-white/20">Nenhum produto disponivel</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── BARRA INFERIOR — DESTAQUES ──────────── */}
                {produtosDestaque.length > 0 && (
                    <div className="bg-[#111] border-t border-white/5 px-6 py-3 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <Star size={12} className="text-amber-500" />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500">
                                {destaques.length > 0 ? 'Promocoes' : 'Destaques'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                            {produtosDestaque.map(p => {
                                const temPromocao = p.promocoes && Array.isArray(p.promocoes) && (p.promocoes as any[]).length > 0
                                const promo = temPromocao ? (p.promocoes as any[])[0] : null

                                return (
                                    <div
                                        key={p.id}
                                        className="flex items-center gap-3 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl px-4 py-2.5 shrink-0 min-w-[220px]"
                                    >
                                        {p.imagem_url && (
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/50 shrink-0">
                                                <img src={p.imagem_url} alt={p.nome} className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h4 className="text-xs font-black uppercase text-white truncate">{p.nome}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-base font-black italic text-figueira">{p.preco.toFixed(2)}€</span>
                                                {promo && (
                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-black">
                                                        {promo.quantidade}x {promo.preco_total?.toFixed(2)}€
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

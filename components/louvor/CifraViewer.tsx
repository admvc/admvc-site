'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Plus, Minus, Play, Pause, Hash, ChevronLeft, ChevronRight } from 'lucide-react'
import { parseCifra, transporCifra, calcularSemitons, notaRaiz, importarCifraClub, TONS_DISPONIVEIS } from '@/lib/cifra'

type Modo = 'separado' | 'junto' | 'letra'

const MODOS: { valor: Modo; texto: string }[] = [
    { valor: 'separado', texto: 'Cifra por cima' },
    { valor: 'junto', texto: 'Cifra junta' },
    { valor: 'letra', texto: 'Só letra' },
]

// O que vem entre [ ] e e acorde (G, F#m7, C/E, Bb7(9)…); o resto ([Refrão]) e nome de parte
const E_ACORDE = /^[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M|º|°|\+|-|\d|\(|\)|#|b|\/[A-G]?[#b]?)*$/
// Linhas que so fazem sentido com acordes: "Intro:", "Solo:", tablaturas
const SO_MUSICA = /^\s*(?:intro|introdução|solo|final|ponte|interlúdio|interludio|riff|base|dedilhado)?\s*:?\s*[\d x()|.-]*$/i
const TABLATURA = /^\s*[A-Ga-g]?\|[-\d|hpbrx\/\~ ]+$/

/** A letra sem acordes, com os nomes das partes; linhas so de musica saem e brancos seguidos ficam um. */
function soLetra(linhas: { tipo: 'texto' | 'acorde'; valor: string }[][]) {
    const out: { parte?: string; texto?: string }[] = []
    for (const segs of linhas) {
        const partes = segs.filter(s => s.tipo === 'acorde' && !E_ACORDE.test(s.valor.trim()))
        const temAcordes = segs.some(s => s.tipo === 'acorde' && E_ACORDE.test(s.valor.trim()))
        const texto = segs.filter(s => s.tipo === 'texto').map(s => s.valor).join('').replace(/\s{2,}/g, ' ').trim()
        if (partes.length) { out.push({ parte: partes.map(p => p.valor.trim()).join(' ') }); if (!texto) continue }
        if (TABLATURA.test(texto) || (temAcordes && SO_MUSICA.test(texto))) continue
        if (!texto) { if (out.length && out[out.length - 1].texto !== undefined) out.push({}); continue }
        out.push({ texto })
    }
    // Partes sem letra (Intro, Solo…) saem
    return out.filter((l, i) => {
        if (l.parte === undefined) return true
        const seguinte = out.slice(i + 1).find(x => x.parte !== undefined || x.texto !== undefined)
        return seguinte?.texto !== undefined
    })
}

interface Props {
    cifra: string
    titulo: string
    artista?: string | null
    tomOriginal?: string | null
    tomTocado?: string
    onClose: () => void
    onPrev?: () => void
    onNext?: () => void
    hasPrev?: boolean
    hasNext?: boolean
}

export default function CifraViewer({ cifra, titulo, artista, tomOriginal, tomTocado, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
    const [semitons, setSemitons] = useState(() => {
        if (tomOriginal && tomTocado) return calcularSemitons(tomOriginal, tomTocado)
        return 0
    })
    const [scrolling, setScrolling] = useState(false)
    const [velocidade, setVelocidade] = useState(0.8)
    const scrollWasActive = useRef(false)
    const [fontSize, setFontSize] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cifra_font_size')
            return saved ? Number(saved) : 14
        }
        return 14
    })
    const [modo, setModo] = useState<Modo>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('cifra_modo')
            if (saved === 'separado' || saved === 'junto' || saved === 'letra') return saved
            // escolha antiga (so dois modos)
            if (localStorage.getItem('cifra_modo_separado') === 'false') return 'junto'
        }
        return 'separado'
    })
    const scrollRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number | null>(null)

    // Pinch-to-zoom
    const initialPinchDistance = useRef<number | null>(null)
    const initialFontSize = useRef<number>(14)

    // Persistir fontSize e modo
    useEffect(() => { localStorage.setItem('cifra_font_size', String(fontSize)) }, [fontSize])
    useEffect(() => { localStorage.setItem('cifra_modo', modo) }, [modo])

    // Reset semitons quando a cifra muda (navegacao entre musicas)
    useEffect(() => {
        if (tomOriginal && tomTocado) setSemitons(calcularSemitons(tomOriginal, tomTocado))
        else setSemitons(0)
        // Scroll to top
        if (scrollRef.current) scrollRef.current.scrollTop = 0
    }, [cifra, tomOriginal, tomTocado])

    // Pinch helpers
    function getPinchDistance(touches: React.TouchList) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY)
    }

    // Se a cifra não tem brackets, converter primeiro
    const cifraNormalizada = cifra.includes('[') ? cifra : importarCifraClub(cifra)
    const cifraTransposta = transporCifra(cifraNormalizada, semitons)
    const { linhas } = parseCifra(cifraTransposta)

    // Tom base: extrair nota raiz do prop ou do primeiro acorde da cifra
    const tomBase = (() => {
        if (tomOriginal) return notaRaiz(tomOriginal)
        if (tomTocado) return notaRaiz(tomTocado)
        const match = cifra.match(/\[([A-G][#b]?[^[\]]*)\]/)
        return match ? notaRaiz(match[1]) : null
    })()

    // Tom actual (transposto)
    const tomAtual = (() => {
        if (!tomBase) {
            if (semitons === 0) return null
            return `${semitons > 0 ? '+' : ''}${semitons}`
        }
        const idx = TONS_DISPONIVEIS.indexOf(tomBase)
        if (idx === -1) return tomBase
        return TONS_DISPONIVEIS[((idx + semitons) % 12 + 12) % 12]
    })()

    // Wake Lock — manter ecrã ligado enquanto vê cifra
    useEffect(() => {
        let wakeLock: any = null
        const pedirWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen')
                }
            } catch { }
        }
        pedirWakeLock()
        return () => { wakeLock?.release?.() }
    }, [])

    // Auto-scroll. A posicao conta-se com casas decimais (posRef): o browser
    // arredonda scrollTop a pixeis inteiros, e somar menos de 1 px por imagem
    // (velocidades baixas) nao movia nada. Pelo tempo decorrido, para a
    // velocidade ser igual a 60 ou 120 imagens/s: 1.0x = 30 px por segundo.
    const posRef = useRef(0)
    const ultimoRef = useRef<number | null>(null)
    const scroll = useCallback((agora: number) => {
        const el = scrollRef.current
        if (!el || !scrolling) return
        // Se a pessoa rolou a mao, continua dali
        if (Math.abs(el.scrollTop - posRef.current) > 2) posRef.current = el.scrollTop
        const dt = ultimoRef.current === null ? 0 : Math.min(100, agora - ultimoRef.current)
        ultimoRef.current = agora
        posRef.current = Math.min(posRef.current + velocidade * 30 * (dt / 1000), el.scrollHeight - el.clientHeight)
        el.scrollTop = posRef.current
        rafRef.current = requestAnimationFrame(scroll)
    }, [scrolling, velocidade])

    useEffect(() => {
        if (scrolling) {
            if (scrollRef.current) posRef.current = scrollRef.current.scrollTop
            ultimoRef.current = null
            rafRef.current = requestAnimationFrame(scroll)
        }
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
    }, [scrolling, scroll])

    // Keyboard
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === ' ') { e.preventDefault(); setScrolling(s => !s) }
            if (e.key === 'ArrowUp') setSemitons(s => s - 1)
            if (e.key === 'ArrowDown') setSemitons(s => s + 1)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return (
        <div className="manter-escuro fixed inset-0 z-[200] bg-black text-white flex flex-col">
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 border-b border-white/10">
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white/60 hover:bg-white/20 active:scale-90">
                    <ArrowLeft size={16} />
                </button>

                <div className="flex items-center flex-1 mx-2 gap-1.5">
                    {onPrev && (
                        <button onClick={onPrev} disabled={!hasPrev}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 disabled:opacity-15 active:scale-90 shrink-0">
                            <ChevronLeft size={16} />
                        </button>
                    )}
                    <div className="text-center flex-1 min-w-0">
                        <p className="text-xs font-black uppercase tracking-tighter truncate">{titulo}</p>
                        {artista && <p className="text-[8px] text-white/40 uppercase tracking-widest truncate">{artista}</p>}
                    </div>
                    {onNext && (
                        <button onClick={onNext} disabled={!hasNext}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 disabled:opacity-15 active:scale-90 shrink-0">
                            <ChevronRight size={16} />
                        </button>
                    )}
                </div>

                <div className={`flex items-center gap-1.5 ${modo === 'letra' ? 'invisible' : ''}`}>
                    {tomAtual && (
                        <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-2.5 py-1.5">
                            <Hash size={11} className="text-white/50" />
                            <span className="text-xs font-black text-emerald-400">{tomAtual}</span>
                            {semitons !== 0 && tomBase && (
                                <span className="text-[8px] text-white/30 font-bold">({tomBase})</span>
                            )}
                        </div>
                    )}
                    {!tomAtual && semitons !== 0 && (
                        <div className="flex items-center gap-1 bg-white/10 rounded-xl px-2.5 py-1.5">
                            <span className="text-[9px] font-black text-white/50">{semitons > 0 ? `+${semitons}` : semitons}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* MODO: tres botoes sempre a vista */}
            <div role="radiogroup" aria-label="Como ver" className="flex gap-1 px-4 py-2 shrink-0 border-b border-white/5">
                {MODOS.map(m => (
                    <button key={m.valor} role="radio" aria-checked={modo === m.valor} onClick={() => setModo(m.valor)}
                        className={`flex-1 min-h-[40px] rounded-lg text-[13px] font-semibold active:scale-95 ${modo === m.valor ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                        {m.texto}
                    </button>
                ))}
            </div>

            {/* TOOLBAR */}
            <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-white/5 bg-white/5">
                {/* Transpor (sem acordes, nao serve) */}
                <div className={`flex items-center gap-1 ${modo === 'letra' ? 'invisible' : ''}`}>
                    <button onClick={() => setSemitons(s => s - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:scale-90">
                        <Minus size={14} />
                    </button>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40 w-8 text-center">
                        {semitons > 0 ? `+${semitons}` : semitons}
                    </span>
                    <button onClick={() => setSemitons(s => s + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white/20 active:scale-90">
                        <Plus size={14} />
                    </button>
                </div>

                {/* Auto-scroll com +/- velocidade */}
                <div className="flex items-center gap-1">
                    {scrolling && (
                        <>
                            <button onClick={() => setVelocidade(v => Math.max(0.3, Math.round((v - 0.3) * 10) / 10))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 active:scale-90 text-xs font-black">−</button>
                            <span className="text-[8px] font-black text-white/40 w-8 text-center">{velocidade.toFixed(1)}x</span>
                            <button onClick={() => setVelocidade(v => Math.min(5, Math.round((v + 0.3) * 10) / 10))}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/60 active:scale-90 text-xs font-black">+</button>
                        </>
                    )}
                    <button onClick={() => setScrolling(s => !s)}
                        className={`h-8 px-3 flex items-center justify-center gap-1.5 rounded-xl active:scale-90 text-[8px] font-black uppercase tracking-widest ${scrolling ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                        {scrolling ? <Pause size={12} /> : <Play size={12} />}
                        {scrolling ? 'Parar' : 'Scroll'}
                    </button>
                </div>
            </div>

            {/* CIFRA — 1 dedo pausa scroll, 2 dedos zoom */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar"
                onTouchStart={(e) => {
                    if (e.touches.length === 2) {
                        initialPinchDistance.current = getPinchDistance(e.touches)
                        initialFontSize.current = fontSize
                    } else if (e.touches.length === 1) {
                        if (scrolling) { scrollWasActive.current = true; setScrolling(false) } else { scrollWasActive.current = false }
                    }
                }}
                onTouchMove={(e) => {
                    if (e.touches.length === 2 && initialPinchDistance.current !== null) {
                        const currentDistance = getPinchDistance(e.touches)
                        const ratio = currentDistance / initialPinchDistance.current
                        setFontSize(Math.min(32, Math.max(8, Math.round(initialFontSize.current * ratio))))
                    }
                }}
                onTouchEnd={() => {
                    if (initialPinchDistance.current !== null) { initialPinchDistance.current = null; return }
                    if (scrollWasActive.current) { setScrolling(true); scrollWasActive.current = false }
                }}>
                {modo === 'letra' ? (
                    /* SO LETRA: letra corrida, maior e com mais espaco, para ler de longe */
                    <div className="max-w-2xl mx-auto" style={{ fontSize: fontSize + 6, lineHeight: 1.6 }}>
                        {soLetra(linhas).map((l, i) =>
                            l.parte !== undefined ? (
                                <p key={i} className="mt-6 mb-1 text-emerald-400 font-bold" style={{ fontSize: fontSize + 2 }}>{l.parte}</p>
                            ) : l.texto !== undefined ? (
                                <p key={i} className="text-white">{l.texto}</p>
                            ) : (
                                <div key={i} className="h-[1em]" />
                            )
                        )}
                        <div className="h-[60vh]" />
                    </div>
                ) : (
                <div className="max-w-2xl mx-auto font-mono whitespace-pre-wrap" style={{ fontSize }}>
                    {modo === 'separado' ? (
                        /* MODO SEPARADO: acordes numa linha, letra na outra */
                        linhas.map((segs, i) => {
                            if (segs.length === 0) return <br key={i} />
                            const temAcordes = segs.some(s => s.tipo === 'acorde')
                            if (!temAcordes) {
                                return (
                                    <div key={i} className="text-white/80 leading-relaxed min-h-[1.4em]">
                                        {segs.map((s, j) => <span key={j}>{s.valor}</span>)}
                                    </div>
                                )
                            }
                            // Construir linha de acordes e linha de letra separadas
                            let acordeLine = ''
                            let letraLine = ''
                            for (const seg of segs) {
                                if (seg.tipo === 'acorde') {
                                    // Preencher espaços na letra até à posição actual
                                    while (acordeLine.length > letraLine.length) letraLine += ' '
                                    while (letraLine.length > acordeLine.length) acordeLine += ' '
                                    acordeLine += seg.valor
                                } else {
                                    // Preencher espaços nos acordes até à posição actual
                                    while (letraLine.length > acordeLine.length) acordeLine += ' '
                                    letraLine += seg.valor
                                }
                            }
                            return (
                                <div key={i} className="mb-1">
                                    <div className="text-emerald-400 font-black leading-tight" style={{ fontSize: fontSize + 1 }}>
                                        {acordeLine || '\u00A0'}
                                    </div>
                                    <div className="text-white/80 leading-relaxed">
                                        {letraLine || '\u00A0'}
                                    </div>
                                </div>
                            )
                        })
                    ) : (
                        /* MODO INLINE: acordes na mesma linha da letra */
                        linhas.map((segs, i) => (
                            <div key={i} className="min-h-[1.6em] leading-relaxed">
                                {segs.length === 0 && <br />}
                                {segs.map((seg, j) => (
                                    seg.tipo === 'acorde' ? (
                                        <span key={j} className="text-emerald-400 font-black" style={{ fontSize: fontSize + 2 }}>
                                            {seg.valor}
                                        </span>
                                    ) : (
                                        <span key={j} className="text-white/80">{seg.valor}</span>
                                    )
                                ))}
                            </div>
                        ))
                    )}
                    <div className="h-[60vh]" />
                </div>
                )}
            </div>
        </div>
    )
}

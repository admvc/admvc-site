'use client'

// TODO: Implementar pagamento dividido (parte creditos + parte dinheiro)
// Requer: modelo PagamentoTransacao, UI multi-payment

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
    ShoppingCart, Plus, Minus, Trash2, Search, User, CreditCard,
    Loader2, CheckCircle, XCircle, Maximize2, Minimize2,
    Wallet2, Banknote, Smartphone, X, RefreshCw, QrCode, HandCoins, Clock
} from 'lucide-react'
import { registarVenda, obterSaldoMembro, buscarMembroPorQr } from '@/actions/cantina-local-actions'
import { criarFiado } from '@/actions/fiado-actions'

interface Produto {
    id: number
    nome: string
    preco: number
    stock: number
    controla_stock: boolean
    promocoes: Array<{ quantidade: number; preco_total: number }> | null
    categoria: { id: number; nome: string } | null
}

interface Categoria { id: number; nome: string }
interface Membro { id: number; first_name: string; last_name: string }
interface CartItem {
    produtoId: number; nome: string; preco: number
    quantidade: number; stock: number; controla_stock: boolean
    promocoes: Array<{ quantidade: number; preco_total: number }> | null
}

type FormaPagamento = 'CREDITOS' | 'DINHEIRO' | 'MBWAY' | 'TRANSFERENCIA' | 'FIADO'
const PAYMENT_OPTIONS: { value: FormaPagamento; label: string; icon: typeof CreditCard }[] = [
    { value: 'CREDITOS', label: 'Creditos Cantina', icon: Wallet2 },
    { value: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
    { value: 'MBWAY', label: 'MBWay', icon: Smartphone },
    { value: 'TRANSFERENCIA', label: 'Transferencia', icon: CreditCard },
    { value: 'FIADO', label: 'Fiado', icon: HandCoins },
]

function calcItemTotal(item: CartItem): number {
    const promos = item.promocoes
    if (!promos || promos.length === 0) return item.preco * item.quantidade
    const sorted = [...promos].sort((a, b) => b.quantidade - a.quantidade)
    let remaining = item.quantidade
    let total = 0
    for (const p of sorted) {
        if (p.quantidade <= 0) continue
        const times = Math.floor(remaining / p.quantidade)
        total += times * p.preco_total
        remaining -= times * p.quantidade
    }
    total += remaining * item.preco
    return total
}

function bestPromoLabel(promos: CartItem['promocoes']): string | null {
    if (!promos || promos.length === 0) return null
    const best = promos.reduce((a, b) => (a.quantidade < b.quantidade ? a : b))
    return `${best.quantidade} por ${best.preco_total.toFixed(2)}\u20ac`
}

interface Props { produtos: Produto[]; categorias: Categoria[]; membros: Membro[]; turnoId?: number | null }

export default function POSClient({ produtos, categorias, membros, turnoId = null }: Props) {
    // Wake Lock — manter ecra ligado enquanto o POS esta aberto
    const wakeLockRef = useRef<WakeLockSentinel | null>(null)
    useEffect(() => {
        async function requestWakeLock() {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen')
                }
            } catch { /* browser may deny */ }
        }
        requestWakeLock()
        const handleVisibility = () => { if (document.visibilityState === 'visible') requestWakeLock() }
        document.addEventListener('visibilitychange', handleVisibility)
        return () => {
            wakeLockRef.current?.release()
            document.removeEventListener('visibilitychange', handleVisibility)
        }
    }, [])

    const [cart, setCart] = useState<CartItem[]>([])
    const [receipt, setReceipt] = useState<{itens: CartItem[], total: number, formaPagamento: string, membro: string | null, saldoRestante: number | null} | null>(null)
    const [qrOpen, setQrOpen] = useState(false)
    const [scannerFallback, setScannerFallback] = useState(false) // fallback para modo foto se camera live falhar
    const scannerRef = useRef<any>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    // Detectar iOS/iPadOS (Safari em PWA nao suporta getUserMedia de forma fiavel)
    const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)
    const [selectedMembro, setSelectedMembro] = useState<Membro | null>(null)
    const [membroBusca, setMembroBusca] = useState('')
    const [membroDropdownOpen, setMembroDropdownOpen] = useState(false)
    const [saldo, setSaldo] = useState<number | null>(null)
    const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [loadingSaldo, setLoadingSaldo] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('CREDITOS')
    const [dividido, setDividido] = useState(false)
    const [pagamentosDivididos, setPagamentosDivididos] = useState<Record<FormaPagamento, number>>({
        CREDITOS: 0, DINHEIRO: 0, MBWAY: 0, TRANSFERENCIA: 0, FIADO: 0
    })
    const [fullscreen, setFullscreen] = useState(false)
    const [sheetOpen, setSheetOpen] = useState(false)

    const total = cart.reduce((sum, item) => sum + calcItemTotal(item), 0)
    const cartCount = cart.reduce((sum, i) => sum + i.quantidade, 0)

    // Sincronizar carrinho com localStorage para o visor do cliente
    useEffect(() => {
        try {
            localStorage.setItem('pos_cart', JSON.stringify({ cart, total, membro: selectedMembro ? `${selectedMembro.first_name} ${selectedMembro.last_name}` : null }))
        } catch {}
    }, [cart, total, selectedMembro])

    const somaDividido = Object.values(pagamentosDivididos).reduce((s, v) => s + v, 0)
    const valorCreditos = dividido ? pagamentosDivididos.CREDITOS : (formaPagamento === 'CREDITOS' ? total : 0)
    const saldoRestante = saldo !== null ? saldo - valorCreditos : null
    const isCreditos = !dividido && formaPagamento === 'CREDITOS'
    const isFiado = !dividido && formaPagamento === 'FIADO'
    const canConfirm = cart.length > 0 && !loading &&
        (!dividido ? (
            (!isCreditos || !selectedMembro || saldoRestante === null || saldoRestante >= 0) &&
            (!!selectedMembro || (!isCreditos && !isFiado))
        ) : (
            Math.abs(somaDividido - total) < 0.01 &&
            (pagamentosDivididos.CREDITOS === 0 || (!!selectedMembro && saldoRestante !== null && saldoRestante >= 0)) &&
            (pagamentosDivididos.FIADO === 0 || !!selectedMembro)
        ))

    const produtosFiltrados = categoriaAtiva
        ? produtos.filter(p => p.categoria?.id === categoriaAtiva) : produtos

    const membrosFiltrados = useMemo(() => {
        if (!membroBusca.trim()) return membros.slice(0, 8)
        const q = membroBusca.toLowerCase()
        return membros.filter(m => `${m.first_name} ${m.last_name}`.toLowerCase().includes(q)).slice(0, 8)
    }, [membroBusca, membros])

    const toggleFullscreen = useCallback(() => {
        document.body.classList.toggle('pos-fullscreen')
        setFullscreen(f => !f)
    }, [])

    // Cleanup: remover pos-fullscreen ao sair da pagina
    useEffect(() => {
        return () => { document.body.classList.remove('pos-fullscreen') }
    }, [])

    async function selecionarMembro(membro: Membro) {
        setSelectedMembro(membro); setMembroBusca(''); setMembroDropdownOpen(false); setLoadingSaldo(true)
        try { setSaldo(await obterSaldoMembro(membro.id)) } catch { setSaldo(0) } finally { setLoadingSaldo(false) }
    }

    // Processar texto do QR descodificado
    const processarQr = async (decodedText: string) => {
        const qrNormalizado = decodedText.trim()
        console.log('[POS] QR lido:', qrNormalizado)
        if (!qrNormalizado.startsWith('ADMVC-')) {
            setFeedback({ type: 'error', msg: `QR invalido: "${qrNormalizado}". Esperado formato ADMVC-...` })
            return
        }
        const membro = await buscarMembroPorQr(qrNormalizado)
        if (membro) await selecionarMembro(membro)
        else setFeedback({ type: 'error', msg: `Membro nao encontrado para QR: ${qrNormalizado}` })
    }

    // Scanner live (Android e desktop)
    const startScanner = async () => {
        try {
            const { Html5Qrcode } = await import('html5-qrcode')

            // Esperar que o div esteja no DOM
            const readerEl = document.getElementById('qr-reader')
            if (!readerEl) {
                console.error('[POS] Div qr-reader nao encontrado no DOM')
                return
            }

            const scanner = new Html5Qrcode("qr-reader")
            scannerRef.current = scanner

            // Calcular tamanho do qrbox dinamicamente (60% do viewport width, max 250)
            const vw = Math.min(window.innerWidth - 40, 350)
            const qrboxSize = Math.min(Math.floor(vw * 0.6), 250)

            console.log('[POS] A iniciar scanner, qrbox:', qrboxSize)

            await scanner.start(
                { facingMode: "environment" },
                {
                    fps: 15,
                    qrbox: { width: qrboxSize, height: qrboxSize },
                    aspectRatio: 1,
                    disableFlip: false,
                },
                async (decodedText) => {
                    await scanner.stop()
                    scannerRef.current = null
                    setQrOpen(false)
                    await processarQr(decodedText)
                },
                () => {} // erro silencioso por frame
            )

            console.log('[POS] Scanner iniciado com sucesso')
        } catch (err: any) {
            console.error('[POS] Erro ao iniciar camera:', err)
            setQrOpen(false)

            // Fallback automatico para modo foto se camera live nao funcionar
            console.log('[POS] A mudar para modo foto (fallback)')
            setScannerFallback(true)
            setTimeout(() => fileInputRef.current?.click(), 200)
        }
    }

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop() } catch {}
            scannerRef.current = null
        }
        setQrOpen(false)
    }

    // Fallback: tirar foto e descodificar QR da imagem (iOS + fallback quando camera live falha)
    const handleQrPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const { Html5Qrcode } = await import('html5-qrcode')
            const scanner = new Html5Qrcode("qr-reader-foto")
            const decodedText = await scanner.scanFile(file, false)
            console.log('[POS] QR foto lido:', decodedText)
            await processarQr(decodedText)
        } catch {
            setFeedback({ type: 'error', msg: 'QR Code nao reconhecido. Tente novamente com melhor iluminacao.' })
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    function addToCart(produto: Produto) {
        setCart(prev => {
            const existing = prev.find(i => i.produtoId === produto.id)
            if (existing) {
                if (produto.controla_stock && existing.quantidade >= produto.stock) return prev
                return prev.map(i => i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i)
            }
            if (produto.controla_stock && produto.stock <= 0) return prev
            return [...prev, {
                produtoId: produto.id, nome: produto.nome, preco: produto.preco,
                quantidade: 1, stock: produto.stock, controla_stock: produto.controla_stock,
                promocoes: produto.promocoes,
            }]
        })
    }

    function updateQty(produtoId: number, delta: number) {
        setCart(prev => prev.map(item => {
            if (item.produtoId !== produtoId) return item
            const nq = item.quantidade + delta
            if (nq <= 0 || (item.controla_stock && nq > item.stock)) return item
            return { ...item, quantidade: nq }
        }))
    }

    function removeItem(id: number) { setCart(prev => prev.filter(i => i.produtoId !== id)) }

    async function confirmarVenda() {
        if (!canConfirm) return
        setLoading(true); setFeedback(null)
        try {
            const itens = cart.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade }))
            const membroId = selectedMembro?.id || null

            // Preparar pagamentos
            let pagamento: string | { forma: string; valor: number }[]
            if (dividido) {
                pagamento = Object.entries(pagamentosDivididos)
                    .filter(([, v]) => v > 0)
                    .map(([forma, valor]) => ({ forma, valor }))
            } else {
                pagamento = formaPagamento
            }

            const result = await registarVenda(membroId, itens, pagamento, turnoId)
            if (result?.error) { setFeedback({ type: 'error', msg: result.error }) }
            else {
                // If FIADO, create fiado record
                const temFiado = dividido ? pagamentosDivididos.FIADO > 0 : formaPagamento === 'FIADO'
                const valorFiado = dividido ? pagamentosDivididos.FIADO : total
                if (temFiado && membroId) {
                    const descricaoItens = cart.map(i => `${i.quantidade}x ${i.nome}`).join(', ')
                    await criarFiado(membroId, valorFiado, descricaoItens)
                }

                const saldoAtual = selectedMembro ? (await obterSaldoMembro(selectedMembro.id)) : null
                setReceipt({
                    itens: [...cart],
                    total,
                    formaPagamento: dividido ? 'MISTO' : formaPagamento,
                    membro: selectedMembro ? `${selectedMembro.first_name} ${selectedMembro.last_name}` : null,
                    saldoRestante: saldoAtual,
                })
                setTimeout(() => setReceipt(null), 5000)
                setFeedback({ type: 'success', msg: 'Venda registada com sucesso!' })
                setCart([])
                setSelectedMembro(null)
                setSaldo(null)
            }
        } catch { setFeedback({ type: 'error', msg: 'Erro ao registar venda.' }) }
        finally { setLoading(false); setTimeout(() => setFeedback(null), 4000) }
    }

    // ── Shared sub-components ──────────────────────────────────────────────
    const MemberSelector = (
        <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                <User size={12} /> Membro
            </label>
            <div className="relative flex gap-1.5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                    <input
                        type="text"
                        placeholder={selectedMembro ? `${selectedMembro.first_name} ${selectedMembro.last_name}` : 'Pesquisar membro...'}
                        value={membroBusca}
                        onChange={e => { setMembroBusca(e.target.value); setMembroDropdownOpen(true) }}
                        onFocus={() => setMembroDropdownOpen(true)}
                        className="w-full bg-bg border border-soft rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-fg outline-none focus:border-figueira transition-colors"
                    />
                </div>
                {/* Botao QR: iOS usa foto, Android/desktop tentam camera live */}
                {isIOS ? (
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 rounded-xl border transition-all bg-bg border-soft text-muted hover:border-figueira hover:text-figueira" title="Scan QR (foto)">
                        <QrCode size={16} />
                    </button>
                ) : (
                    <button onClick={() => {
                        if (qrOpen) { stopScanner() }
                        else {
                            setScannerFallback(false) // resetar fallback para tentar camera live
                            setQrOpen(true)
                            setTimeout(() => startScanner(), 150)
                        }
                    }} className={`px-3 rounded-xl border transition-all ${qrOpen ? 'bg-figueira text-bg border-figueira' : 'bg-bg border-soft text-muted hover:border-figueira hover:text-figueira'}`} title="Scan QR (camera)">
                        <QrCode size={16} />
                    </button>
                )}
                {/* Input foto sempre disponivel (fallback + iOS) */}
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleQrPhoto} className="hidden" />
                <div id="qr-reader-foto" className="hidden" />
                {membroDropdownOpen && membrosFiltrados.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-bg2 border border-soft rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {membrosFiltrados.map(m => (
                            <button key={m.id} onClick={() => selecionarMembro(m)}
                                className="w-full text-left px-4 py-2.5 text-xs font-bold text-fg hover:bg-soft/30 transition-colors first:rounded-t-xl last:rounded-b-xl">
                                {m.first_name} {m.last_name}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {qrOpen && !isIOS && !scannerFallback && (
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted text-center">Aponte a camera para o QR Code do membro</p>
                    <div id="qr-reader" className="rounded-xl overflow-hidden border border-soft" style={{ width: '100%', maxWidth: 350, margin: '0 auto' }} />
                    <div className="flex gap-2">
                        <button onClick={stopScanner}
                            className="flex-1 px-3 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest">
                            Fechar
                        </button>
                        <button onClick={() => { stopScanner(); setScannerFallback(true); setTimeout(() => fileInputRef.current?.click(), 200) }}
                            className="flex-1 px-3 py-2 bg-soft border border-soft text-muted rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-fg">
                            Tirar Foto
                        </button>
                    </div>
                </div>
            )}
            {selectedMembro && (
                <div className="flex items-center justify-between bg-bg rounded-xl px-3 py-2 border border-soft">
                    <span className="text-[10px] font-bold text-fg">{selectedMembro.first_name} {selectedMembro.last_name}</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black text-figueira">
                            {loadingSaldo ? <Loader2 size={12} className="animate-spin" /> : `${(saldo ?? 0).toFixed(2)}\u20ac`}
                        </span>
                        <button
                            onClick={async () => {
                                if (!selectedMembro) return
                                setLoadingSaldo(true)
                                try { setSaldo(await obterSaldoMembro(selectedMembro.id)) } catch { setSaldo(0) } finally { setLoadingSaldo(false) }
                            }}
                            disabled={loadingSaldo}
                            className="text-muted hover:text-figueira transition-colors disabled:opacity-50"
                            title="Consultar saldo"
                        >
                            <RefreshCw size={11} className={loadingSaldo ? 'animate-spin' : ''} />
                        </button>
                        <button
                            onClick={() => { setSelectedMembro(null); setSaldo(null) }}
                            className="text-muted hover:text-red-400 transition-colors"
                            title="Limpar membro"
                        >
                            <X size={11} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )

    const CartItems = (
        <div className="space-y-2 max-h-[35vh] overflow-y-auto">
            {cart.length === 0 ? (
                <p className="text-xs text-muted text-center py-6">Carrinho vazio</p>
            ) : cart.map(item => (
                <div key={item.produtoId} className="flex items-center gap-2 bg-bg rounded-xl px-3 py-2 border border-soft">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-fg truncate">{item.nome}</p>
                        {item.promocoes && item.quantidade >= (item.promocoes[0]?.quantidade ?? Infinity) && (
                            <p className="text-[9px] font-black text-emerald-400">Promo aplicada</p>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item.produtoId, -1)} className="w-6 h-6 rounded-lg bg-soft/30 flex items-center justify-center text-muted hover:text-fg"><Minus size={12} /></button>
                        <span className="text-[11px] font-black text-fg w-6 text-center">{item.quantidade}</span>
                        <button onClick={() => updateQty(item.produtoId, 1)} className="w-6 h-6 rounded-lg bg-soft/30 flex items-center justify-center text-muted hover:text-fg"><Plus size={12} /></button>
                    </div>
                    <span className="text-[11px] font-black text-figueira w-14 text-right">{calcItemTotal(item).toFixed(2)}&euro;</span>
                    <button onClick={() => removeItem(item.produtoId)} className="text-muted hover:text-red-400 ml-1"><Trash2 size={13} /></button>
                </div>
            ))}
        </div>
    )

    const PaymentSelector = (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted">Pagamento</label>
                <button
                    onClick={() => {
                        setDividido(!dividido)
                        if (!dividido) {
                            setPagamentosDivididos({ CREDITOS: 0, DINHEIRO: 0, MBWAY: 0, TRANSFERENCIA: 0, FIADO: 0 })
                        }
                    }}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${dividido ? 'bg-figueira text-bg' : 'text-figueira hover:bg-figueira/10'}`}
                >
                    {dividido ? 'Pagamento Unico' : 'Dividir'}
                </button>
            </div>

            {!dividido ? (
                <div className="grid grid-cols-2 gap-1.5">
                    {PAYMENT_OPTIONS.map(opt => {
                        const Icon = opt.icon
                        return (
                            <button key={opt.value} onClick={() => setFormaPagamento(opt.value)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${formaPagamento === opt.value ? 'bg-figueira text-bg' : 'bg-bg border border-soft text-muted hover:border-figueira'}`}>
                                <Icon size={12} /> {opt.label}
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="space-y-1.5 bg-bg rounded-xl border border-soft p-3">
                    {PAYMENT_OPTIONS.filter(o => o.value !== 'FIADO' || selectedMembro).map(opt => {
                        const Icon = opt.icon
                        const val = pagamentosDivididos[opt.value]
                        return (
                            <div key={opt.value} className="flex items-center gap-2">
                                <Icon size={12} className="text-muted shrink-0" />
                                <span className="text-[9px] font-bold text-muted w-20 truncate">{opt.label}</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={val || ''}
                                    onChange={e => setPagamentosDivididos(prev => ({ ...prev, [opt.value]: Number(e.target.value) || 0 }))}
                                    placeholder="0.00"
                                    className="flex-1 bg-bg2 border border-soft rounded-lg px-2 py-1.5 text-xs font-bold text-fg focus:border-figueira outline-none text-right"
                                />
                                <span className="text-[10px] text-muted">€</span>
                            </div>
                        )
                    })}
                    <div className={`flex justify-between pt-2 border-t border-soft text-[10px] font-black ${Math.abs(somaDividido - total) < 0.01 ? 'text-emerald-500' : 'text-red-400'}`}>
                        <span>Soma</span>
                        <span>{somaDividido.toFixed(2)}€ / {total.toFixed(2)}€</span>
                    </div>
                </div>
            )}
        </div>
    )

    const TotalsAndConfirm = (
        <>
            {cart.length > 0 && (
                <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted font-bold">Total</span>
                        <span className="font-black text-fg">{total.toFixed(2)}&euro;</span>
                    </div>
                    {isCreditos && selectedMembro && saldo !== null && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted font-bold">Saldo restante</span>
                            <span className={`font-black ${saldoRestante !== null && saldoRestante < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {saldoRestante !== null ? `${saldoRestante.toFixed(2)}\u20ac` : '\u2014'}
                            </span>
                        </div>
                    )}
                </div>
            )}
            <button onClick={confirmarVenda} disabled={!canConfirm}
                className="w-full bg-figueira text-bg font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={14} className="animate-spin" /> A processar...</> : <><CreditCard size={14} /> Confirmar Venda</>}
            </button>
        </>
    )

    // ── Render ──────────────────────────────────────────────────────────────
    if (!turnoId) {
        return (
            <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex items-center justify-center p-6">
                <div className="text-center space-y-4 max-w-sm">
                    <Clock size={48} className="mx-auto text-amber-500" />
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Turno Nao Aberto</h2>
                    <p className="text-sm text-white/60">Precisa abrir um turno antes de registar vendas.</p>
                    <a href="/cantina/turnos" className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all">
                        <Clock size={14} /> Abrir Turno
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-bg p-3 lg:p-6">
            {/* Feedback toast */}
            {feedback && (
                <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg ${feedback.type === 'success' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`}>
                    {feedback.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {feedback.msg}
                </div>
            )}

            {/* Receipt overlay */}
            {receipt && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-bg2 border border-soft rounded-2xl p-8 max-w-sm w-full space-y-4 animate-in zoom-in duration-300">
                        <div className="text-center space-y-2">
                            <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                            <h2 className="text-lg font-black uppercase tracking-tighter text-fg">Venda Confirmada</h2>
                        </div>
                        <div className="border-t border-b border-soft py-3 space-y-1">
                            {receipt.itens.map((item, i) => (
                                <div key={i} className="flex justify-between text-[11px]">
                                    <span className="text-fg">{item.quantidade}x {item.nome}</span>
                                    <span className="text-muted font-bold">{(item.preco * item.quantidade).toFixed(2)}&euro;</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-sm font-black">
                            <span className="text-fg">Total</span>
                            <span className="text-figueira">{receipt.total.toFixed(2)}&euro;</span>
                        </div>
                        <div className="text-[10px] text-muted space-y-1">
                            <p>Pagamento: {receipt.formaPagamento}</p>
                            {receipt.membro && <p>Cliente: {receipt.membro}</p>}
                            {receipt.saldoRestante !== null && <p>Saldo restante: {receipt.saldoRestante.toFixed(2)}&euro;</p>}
                        </div>
                        <button onClick={() => { setReceipt(null); setSheetOpen(false) }} className="w-full bg-figueira text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
                            Nova Venda
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 max-w-[1600px] mx-auto">
                {/* ── Products ───────────────────────────────────────────── */}
                <div className="flex-1 lg:w-2/3 space-y-3 lg:space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <CreditCard size={20} className="text-figueira" />
                            <h1 className="text-base lg:text-lg font-black uppercase tracking-widest text-fg">Ponto de Venda</h1>
                        </div>
                        <button onClick={toggleFullscreen}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-bg2 border border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:border-figueira hover:text-figueira transition-all">
                            {fullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                            <span className="hidden sm:inline">Modo Caixa</span>
                        </button>
                    </div>

                    {fullscreen && (
                        <div className="flex items-center gap-2 bg-figueira/10 border border-figueira/20 rounded-xl px-3 py-1.5">
                            <Maximize2 size={11} className="text-figueira" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-figueira">Modo Caixa ativo</span>
                        </div>
                    )}

                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1.5 lg:gap-2">
                        <button onClick={() => setCategoriaAtiva(null)}
                            className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${!categoriaAtiva ? 'bg-fg text-bg shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-fg'}`}>
                            Todos
                        </button>
                        {categorias.map(cat => (
                            <button key={cat.id} onClick={() => setCategoriaAtiva(cat.id)}
                                className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all ${categoriaAtiva === cat.id ? 'bg-figueira text-bg shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-figueira'}`}>
                                {cat.nome}
                            </button>
                        ))}
                    </div>

                    {/* Product grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-3 pb-24 lg:pb-0">
                        {produtosFiltrados.map(produto => {
                            const inCart = cart.find(i => i.produtoId === produto.id)
                            const esgotado = produto.controla_stock && produto.stock <= 0
                            const promoLabel = bestPromoLabel(produto.promocoes)
                            return (
                                <button key={produto.id} onClick={() => !esgotado && addToCart(produto)} disabled={esgotado}
                                    className={`relative bg-bg2 border rounded-2xl p-3 lg:p-4 text-left transition-all ${esgotado ? 'border-soft opacity-40 cursor-not-allowed' : 'border-soft hover:border-figueira hover:shadow-lg cursor-pointer active:scale-[0.97]'} ${inCart ? 'border-figueira/50 ring-1 ring-figueira/20' : ''}`}>
                                    {inCart && (
                                        <span className="absolute top-2 right-2 bg-figueira text-bg text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                                            {inCart.quantidade}
                                        </span>
                                    )}
                                    <p className="text-[11px] lg:text-xs font-bold text-fg truncate">{produto.nome}</p>
                                    <p className="text-sm font-black text-figueira mt-0.5 lg:mt-1">{produto.preco.toFixed(2)}&euro;</p>
                                    {promoLabel && (
                                        <span className="inline-block mt-1 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[8px] lg:text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-lg">
                                            {promoLabel}
                                        </span>
                                    )}
                                    {produto.controla_stock && (
                                        <p className={`text-[8px] lg:text-[9px] font-bold uppercase tracking-widest mt-1 ${produto.stock <= 3 ? 'text-red-400' : 'text-muted'}`}>
                                            Stock: {produto.stock}
                                        </p>
                                    )}
                                </button>
                            )
                        })}
                        {produtosFiltrados.length === 0 && (
                            <div className="col-span-full py-12 text-center text-muted text-xs">Nenhum produto disponivel nesta categoria.</div>
                        )}
                    </div>
                </div>

                {/* ── Desktop Cart (hidden on mobile) ────────────────────── */}
                <div className="hidden lg:block lg:w-1/3 lg:max-w-[400px]">
                    <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4 sticky top-6">
                        {MemberSelector}
                        <div className="border-t border-soft" />
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5"><ShoppingCart size={12} /> Carrinho</span>
                            {cartCount > 0 && <span className="text-[9px] font-black text-figueira bg-figueira/10 px-2 py-0.5 rounded-full">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>}
                        </div>
                        {CartItems}
                        <div className="border-t border-soft" />
                        {PaymentSelector}
                        <div className="border-t border-soft" />
                        {TotalsAndConfirm}
                    </div>
                </div>
            </div>

            {/* ── Mobile FAB (visible on mobile only) ────────────────────── */}
            <button onClick={() => setSheetOpen(true)}
                className="lg:hidden fixed bottom-5 right-5 z-40 bg-figueira text-bg rounded-2xl px-5 py-3.5 flex items-center gap-2 shadow-xl shadow-figueira/20 active:scale-95 transition-transform">
                <ShoppingCart size={18} />
                {cartCount > 0 && (
                    <span className="bg-bg text-figueira text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{cartCount}</span>
                )}
                <span className="text-xs font-black">{total.toFixed(2)}&euro;</span>
            </button>

            {/* ── Mobile Bottom Sheet ────────────────────────────────────── */}
            {sheetOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetOpen(false)} />
                    <div className="relative bg-bg2 rounded-2xl border border-soft max-h-[90vh] w-full max-w-md flex flex-col animate-in zoom-in-95 duration-300 shadow-2xl">
                        <div className="flex items-center justify-between px-5 pt-5 pb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                <ShoppingCart size={14} className="text-figueira" /> Carrinho
                            </span>
                            <button onClick={() => setSheetOpen(false)} className="w-8 h-8 rounded-xl bg-soft/30 flex items-center justify-center text-muted hover:text-fg">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
                            {MemberSelector}
                            <div className="border-t border-soft" />
                            {CartItems}
                            <div className="border-t border-soft" />
                            {PaymentSelector}
                            <div className="border-t border-soft" />
                            {TotalsAndConfirm}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

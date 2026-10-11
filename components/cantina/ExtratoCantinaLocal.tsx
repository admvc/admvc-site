'use client'

import { useState, useEffect } from 'react'
import { Receipt, ChevronDown, ChevronUp, ShoppingCart, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react'
import { obterExtratoMembro } from '@/actions/cantina-local-actions'

interface ItemTransacao {
    produto: { nome: string }
    quantidade: number
    preco_unitario: number
}

interface Transacao {
    id: number
    tipo: string
    valor: number
    saldo_apos: number
    descricao: string | null
    forma_pagamento: string
    criado_em: string | Date
    itens: ItemTransacao[]
}

export default function ExtratoCantinaLocal({ membroId, nome }: { membroId: number; nome?: string }) {
    const [transacoes, setTransacoes] = useState<Transacao[]>([])
    const [loading, setLoading] = useState(true)
    const [aberto, setAberto] = useState(false)

    useEffect(() => {
        async function carregar() {
            const data = await obterExtratoMembro(membroId, 30) as Transacao[]
            setTransacoes(data)
            setLoading(false)
        }
        carregar()
    }, [membroId])

    if (loading) return null
    if (transacoes.length === 0 && !nome) return null

    const icone = (tipo: string) => {
        if (tipo === 'RECARGA') return <ArrowUp size={12} className="text-emerald-500" />
        if (tipo === 'ESTORNO') return <RotateCcw size={12} className="text-blue-400" />
        return <ArrowDown size={12} className="text-red-400" />
    }

    const corValor = (tipo: string) => {
        if (tipo === 'RECARGA' || tipo === 'ESTORNO') return 'text-emerald-500'
        return 'text-red-400'
    }

    function gerarTextoWhatsApp(t: Transacao) {
        const data = new Date(t.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        let texto = `*Recibo Cantina ADMVC*\n📅 ${data}\n\n`
        if (t.itens.length > 0) {
            t.itens.forEach(i => { texto += `• ${i.quantidade}x ${i.produto.nome} — ${(i.preco_unitario * i.quantidade).toFixed(2)}€\n` })
            texto += `\n*Total: ${Math.abs(t.valor).toFixed(2)}€*`
        } else {
            texto += `${t.tipo}: ${Math.abs(t.valor).toFixed(2)}€`
            if (t.descricao) texto += `\n${t.descricao}`
        }
        texto += `\nPagamento: ${t.forma_pagamento}`
        texto += `\nSaldo apos: ${t.saldo_apos.toFixed(2)}€`
        return encodeURIComponent(texto)
    }

    return (
        <div className="space-y-2">
            <button
                onClick={() => setAberto(!aberto)}
                className="w-full flex items-center justify-between py-2"
            >
                <span className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <Receipt size={12} /> {nome ? `Consumos de ${nome}` : 'Extrato Cantina'} ({transacoes.length})
                </span>
                {aberto ? <ChevronUp size={12} className="text-muted" /> : <ChevronDown size={12} className="text-muted" />}
            </button>

            {aberto && (
                <div className="space-y-2 animate-in fade-in duration-200 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {transacoes.map(t => {
                        const data = new Date(t.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        return (
                            <div key={t.id} className="bg-bg border border-soft rounded-xl px-4 py-3 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {icone(t.tipo)}
                                        <span className="text-[10px] font-bold text-fg">{t.descricao || t.tipo}</span>
                                    </div>
                                    <span className={`text-[11px] font-black ${corValor(t.tipo)}`}>
                                        {t.valor > 0 ? '+' : ''}{t.valor.toFixed(2)}€
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-muted">{data} · {t.forma_pagamento}</span>
                                    <a
                                        href={`https://wa.me/?text=${gerarTextoWhatsApp(t)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[8px] font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors"
                                    >
                                        WhatsApp
                                    </a>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

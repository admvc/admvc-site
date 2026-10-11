'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Receipt, X, ShoppingBag, Loader2, Coffee, ChevronDown, HandPlatter } from 'lucide-react'
import { getHistoricoComprasLoyverse } from '@/actions/financeiro-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalHistoricoCantina({ loyverseId }: { loyverseId: string }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recibos, setRecibos] = useState<any[]>([])
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    const abrirHistorico = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!loyverseId) {
            toast("A sua conta ainda não está ligada à Cantina.", 'aviso')
            return
        }

        setIsOpen(true)
        if (recibos.length === 0) fetchDados()
    }

    const fetchDados = async () => {
        setLoading(true)
        const res = await getHistoricoComprasLoyverse(loyverseId)
        if (res.receipts) {
            // Removemos os recibos com valor 0 ou nulo (que geralmente são recargas, não consumos)
            const apenasConsumos = res.receipts.filter((r: any) => r.total_money > 0)
            setRecibos(apenasConsumos)
        }
        setLoading(false)
    }

    const euro = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Math.abs(v))

    // ========================================================================
    // AGRUPAMENTO INTELIGENTE POR MÊS E ANO
    // ========================================================================
    const recibosAgrupados = useMemo(() => {
        if (!recibos.length) return {}

        const grupos: { [key: string]: { recibos: any[], total: number } } = {}

        // Ordena os recibos do mais recente para o mais antigo
        const recibosOrdenados = [...recibos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        recibosOrdenados.forEach((recibo) => {
            const data = new Date(recibo.created_at)

            // Cria a chave "Março 2026"
            const mesAnoCru = data.toLocaleString('pt-PT', { month: 'long', year: 'numeric' })
            const mesAno = mesAnoCru.charAt(0).toUpperCase() + mesAnoCru.slice(1).replace(' de ', ' ')

            if (!grupos[mesAno]) {
                grupos[mesAno] = { recibos: [], total: 0 }
            }
            grupos[mesAno].recibos.push(recibo)
            grupos[mesAno].total += Math.abs(recibo.total_money || 0)
        })

        return grupos
    }, [recibos])

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
        >
            <div
                className="bg-bg w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="p-6 md:p-8 border-b border-soft flex justify-between items-center bg-bg2 relative shrink-0">
                    <div className="space-y-1">
                        <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2">
                            <Coffee size={12} /> O meu consumo
                        </span>
                        <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                            Extrato <span className="text-muted/20">Cantina.</span>
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-3 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>
                </div>

                {/* CORPO DO EXTRATO */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide relative bg-bg">
                    {loading && recibos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 size={32} className="animate-spin text-figueira" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">A comunicar com a Cantina...</p>
                        </div>
                    ) : recibos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <ShoppingBag size={48} className="mb-4" />
                            <h4 className="text-sm font-black uppercase tracking-widest text-fg">Sem Histórico</h4>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mt-2 text-center">
                                Ainda não realizou consumos<br />na cantina da igreja.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-10">
                            {Object.entries(recibosAgrupados).map(([mesAno, dados]) => (
                                <div key={mesAno} className="space-y-4 relative">

                                    {/* CABEÇALHO DO MÊS (Estilo Extrato Bancário) */}
                                    <div className="sticky top-0 -mx-2 px-2 py-3 bg-bg/95 backdrop-blur-sm z-10 flex justify-between items-end border-b-2 border-soft/50">
                                        <h4 className="text-[11px] font-black uppercase text-fg tracking-[0.2em]">
                                            {mesAno}
                                        </h4>
                                        <div className="text-right">
                                            <span className="text-[8px] font-black uppercase text-muted tracking-widest block leading-none mb-1">Total do Mês</span>
                                            <span className="text-sm text-figueira valor-dinheiro italic font-black leading-none">{euro(dados.total)}</span>
                                        </div>
                                    </div>

                                    {/* LISTA DE COMPRAS DO MÊS */}
                                    <div className="grid gap-3">
                                        {dados.recibos.map((r) => (
                                            <ReciboItem key={r.id} recibo={r} euro={euro} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-6 bg-soft/30 border-t border-soft text-center shrink-0">
                    <p className="text-[9px] font-bold text-muted uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                        <HandPlatter size={12} className="text-figueira" /> Bom apetite, ADMVC
                    </p>
                </div>
            </div>
        </div>
    )

    return (
        <>
            {/* 👇 BOTÃO ATUALIZADO PARA O ESTILO "APP FINANCEIRA" 👇 */}
            <button
                type="button"
                onClick={abrirHistorico}
                className="flex flex-col items-center gap-2 group/btn w-full cursor-pointer"
            >
                <div className="w-12 h-12 bg-white/5 text-white/70 rounded-[1rem] flex items-center justify-center group-hover/btn:bg-white/20 group-hover/btn:text-white transition-all duration-300 border border-white/5 group-active/btn:scale-95 mx-auto">
                    <Receipt size={20} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50 group-hover/btn:text-white transition-colors">
                    Histórico
                </span>
            </button>

            {mounted && isOpen && createPortal(modalContent, document.body)}
        </>
    )
}

// ============================================================================
// COMPONENTE ITEM DO RECIBO (ACORDEÃO MELHORADO)
// ============================================================================
function ReciboItem({ recibo, euro }: { recibo: any, euro: (v: number) => string }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const dataValida = recibo?.created_at ? new Date(recibo.created_at) : new Date()
    const dia = dataValida.getDate().toString().padStart(2, '0')
    const mes = dataValida.toLocaleString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase()
    const hora = dataValida.getHours().toString().padStart(2, '0')
    const min = dataValida.getMinutes().toString().padStart(2, '0')

    const itens = recibo?.line_items || []
    const valorTotal = Math.abs(recibo.total_money || 0)

    return (
        <div className="bg-bg2 border border-soft rounded-[1.5rem] relative overflow-hidden transition-all hover:border-figueira/30 shadow-sm">

            {/* LINHA PRINCIPAL CLICÁVEL */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="w-full text-left flex justify-between items-center p-4 hover:bg-soft/50 transition-colors active:scale-[0.99] gap-4"
            >
                <div className="flex items-center gap-4">
                    {/* Bloco de Data (Estilo Calendário Apple) */}
                    <div className="flex flex-col items-center justify-center bg-bg border border-soft w-12 h-12 rounded-2xl shrink-0 shadow-sm">
                        <span className="text-sm font-black text-fg leading-none">{dia}</span>
                        <span className="text-[8px] font-black text-figueira mt-0.5">{mes}</span>
                    </div>

                    <div className="space-y-0.5">
                        <h4 className="text-xs font-black uppercase tracking-tight text-fg flex items-center gap-1.5">
                            Consumo
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-figueira' : 'text-muted/50'}`} />
                        </h4>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest">
                            {hora}H{min} • TICKET #{recibo.receipt_number.slice(-4)}
                        </p>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <p className="text-sm font-black italic text-fg valor-dinheiro leading-none">{euro(valorTotal)}</p>
                </div>
            </button>

            {/* CONTEÚDO EXPANDIDO (LISTA DE PRODUTOS) */}
            {isExpanded && (
                <div className="border-t border-soft/50 bg-bg p-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                        {itens.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-start group/item text-[10px]">
                                <div className="flex gap-2">
                                    <span className="font-black text-muted w-4 text-right shrink-0">{item.quantity}x</span>
                                    <span className="font-bold text-fg uppercase tracking-tight">{item.item_name}</span>
                                </div>
                                <span className="font-black valor-dinheirotext-fg shrink-0 pl-4">{euro(Math.abs(item.total_money))}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
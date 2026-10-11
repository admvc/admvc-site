'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Wallet, Eye, EyeOff, Coffee, Plus, RefreshCw,
    Euro, Loader2, CheckCircle2, X, Check, Utensils
} from 'lucide-react'
import ModalHistoricoCantina from '@/components/financeiro/ModalHistoricoCantina'
import { solicitarSaldoCantinaAction } from '@/actions/financeiro-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function CardWalletCantina({
    membro,
    saldoLoyverse
}: {
    membro: any
    saldoLoyverse?: number
}) {
    const router = useRouter()
    const toast = useToast()
    const saldo = saldoLoyverse ?? 0

    const [mostrar, setMostrar] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [aberto, setAberto] = useState(false)
    const [loading, setLoading] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [valor, setValor] = useState<number | string>(10)
    const [custom, setCustom] = useState(false)

    const opcoes = [5, 10, 20]

    const handleRefresh = () => {
        setRefreshing(true)
        router.refresh()
        setTimeout(() => setRefreshing(false), 1500)
    }

    async function handleSubmit(formData: FormData) {
        if (!valor || Number(valor) <= 0) { toast('Valor inválido.', 'erro'); return }
        setLoading(true)
        const res = await solicitarSaldoCantinaAction(formData)
        if (res.ok) {
            setSucesso(true)
            setTimeout(() => { setAberto(false); setSucesso(false); setValor(10); setCustom(false) }, 3000)
        } else { toast(res.error, 'erro') }
        setLoading(false)
    }

    return (
        <>
            {/* CARD PRINCIPAL */}
            <div className="bg-fg text-bg rounded-[2.5rem] p-7 flex flex-col gap-6 relative overflow-hidden shadow-xl">

                {/* Detalhe decorativo subtil */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
                <div className="absolute -left-4 -bottom-6 w-24 h-24 bg-figueira/10 rounded-full" />

                {/* TOPO */}
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                            <Wallet size={15} className="text-figueira" />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
                            Cantina
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="w-8 h-8 bg-white/8 hover:bg-white/15 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                        >
                            <RefreshCw size={13} className={`text-white/60 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => setMostrar(!mostrar)}
                            className="w-8 h-8 bg-white/8 hover:bg-white/15 rounded-xl flex items-center justify-center transition-all"
                        >
                            {mostrar ? <EyeOff size={13} className="text-white/60" /> : <Eye size={13} className="text-white/60" />}
                        </button>
                    </div>
                </div>

                {/* SALDO */}
                <div className="relative z-10 space-y-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-white/40">
                        Saldo disponível
                    </p>
                    <p className="text-4xl font-black italic tracking-tighter leading-none">
                        {mostrar
                            ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(saldo)
                            : '••••••'
                        }
                    </p>
                </div>

                {/* AÇÕES */}
                <div className="grid grid-cols-3 gap-2 relative z-10 pt-2 border-t border-white/10">
                    <AcaoBtn
                        icon={<Plus size={16} />}
                        label="Carregar"
                        onClick={() => setAberto(true)}
                        destaque
                    />
                    <Link href="/departamentos/cantina/menu" className="flex flex-col items-center gap-2 group">
                        <div className="w-10 h-10 bg-white/8 hover:bg-white/15 rounded-2xl flex items-center justify-center transition-all group-active:scale-95">
                            <Utensils size={16} className="text-white/70" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-white/40 group-hover:text-white/70 transition-colors">
                            Menu
                        </span>
                    </Link>
                    <div className="flex flex-col items-center gap-2">
                        <ModalHistoricoCantina loyverseId={membro?.loyverse_id} />
                    </div>
                </div>
            </div>

            {/* MODAL DE CARREGAMENTO */}
            {aberto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-sm rounded-[2.5rem] border border-soft shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center">
                                    <Coffee size={16} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">
                                    Carregar Saldo
                                </h3>
                            </div>
                            <button
                                onClick={() => setAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {sucesso ? (
                            <div className="px-6 py-12 text-center space-y-4 animate-in zoom-in-95 duration-300">
                                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={28} className="text-emerald-500" />
                                </div>
                                <div>
                                    <h4 className="text-base font-black uppercase italic text-fg">Pedido Enviado!</h4>
                                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                        O tesoureiro irá validar e o saldo ficará disponível em breve.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form action={handleSubmit} className="p-6 space-y-5">
                                <input type="hidden" name="membro_id" value={membro?.id} />
                                <input type="hidden" name="valor" value={valor} />

                                {/* VALORES RÁPIDOS */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                        Valor
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {opcoes.map(op => {
                                            const ativo = !custom && Number(valor) === op
                                            return (
                                                <button
                                                    key={op}
                                                    type="button"
                                                    onClick={() => { setValor(op); setCustom(false) }}
                                                    className={`py-3.5 rounded-2xl font-black text-base border-2 transition-all active:scale-95 relative
                                                        ${ativo
                                                            ? 'bg-figueira border-figueira text-white shadow-md'
                                                            : 'bg-bg2 border-soft text-muted hover:border-figueira/30 hover:text-fg'
                                                        }`}
                                                >
                                                    {ativo && (
                                                        <Check size={10} className="absolute top-1.5 right-1.5 opacity-70" strokeWidth={4} />
                                                    )}
                                                    €{op}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* VALOR CUSTOMIZADO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                        Outro valor
                                    </label>
                                    <div className="relative">
                                        <Euro size={14} className={`absolute left-4 top-1/2 -translate-y-1/2 ${custom ? 'text-figueira' : 'text-muted'}`} />
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            placeholder="Ex: 15.00"
                                            value={custom ? valor : ''}
                                            onChange={e => { setValor(e.target.value); setCustom(true) }}
                                            className={`w-full bg-bg2 border-2 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-black outline-none transition-all
                                                ${custom ? 'border-figueira ring-4 ring-figueira/8' : 'border-soft focus:border-figueira'}`}
                                        />
                                    </div>
                                </div>

                                {/* MÉTODO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                        Método de pagamento
                                    </label>
                                    <select
                                        name="forma_pagamento"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-4 py-3.5 text-sm font-bold outline-none focus:border-figueira transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="MBWAY">MB WAY</option>
                                        <option value="Transferencia">Transferência Bancária</option>
                                        <option value="Dinheiro">Dinheiro (Em mão)</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !valor || Number(valor) <= 0}
                                    className="w-full bg-fg text-bg py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-figueira transition-all flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 shadow-lg"
                                >
                                    {loading
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><CheckCircle2 size={15} /> Confirmar · €{valor || '0'}</>
                                    }
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

// ── BOTÃO DE AÇÃO ─────────────────────────────────────────────────────────────
function AcaoBtn({ icon, label, onClick, destaque }: {
    icon: React.ReactNode
    label: string
    onClick: () => void
    destaque?: boolean
}) {
    return (
        <button onClick={onClick} className="flex flex-col items-center gap-2 group">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all group-active:scale-95
                ${destaque
                    ? 'bg-figueira/20 text-figueira hover:bg-figueira hover:text-white'
                    : 'bg-white/8 text-white/70 hover:bg-white/15'
                }`}>
                {icon}
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest transition-colors
                ${destaque ? 'text-figueira/70 group-hover:text-figueira' : 'text-white/40 group-hover:text-white/70'}`}>
                {label}
            </span>
        </button>
    )
}
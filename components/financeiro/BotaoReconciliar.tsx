'use client'

import { useState } from 'react'
import { Link2, Loader2, X, Unlink, CheckCircle2 } from 'lucide-react'
import { reconciliarMovimento, desreconciliar } from '@/actions/reconciliacao-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export function BotaoReconciliar({ movimentoId }: { movimentoId: number }) {
    const toast = useToast()
    const [aberto, setAberto] = useState(false)
    const [loading, setLoading] = useState(false)
    const [referencia, setReferencia] = useState('')

    async function handleReconciliar() {
        if (!referencia.trim()) return
        setLoading(true)
        const res = await reconciliarMovimento(movimentoId, referencia.trim())
        if (!res.ok) {
            toast(res.error || 'Erro ao reconciliar.', 'erro')
        }
        setLoading(false)
        setAberto(false)
        setReferencia('')
    }

    if (!aberto) {
        return (
            <button
                onClick={() => setAberto(true)}
                className="bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1"
            >
                <Link2 size={12} />
                Reconciliar
            </button>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                placeholder="contribuicao:123 ou manual:Descricao"
                className="h-8 px-2 bg-bg border border-soft rounded-lg text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent w-56"
                onKeyDown={e => { if (e.key === 'Enter') handleReconciliar() }}
                autoFocus
            />
            <button
                onClick={handleReconciliar}
                disabled={loading || !referencia.trim()}
                className="bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white p-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            </button>
            <button
                onClick={() => { setAberto(false); setReferencia('') }}
                className="text-muted hover:text-fg p-1.5 transition-colors"
            >
                <X size={14} />
            </button>
        </div>
    )
}

export function BotaoDesreconciliar({ movimentoId }: { movimentoId: number }) {
    const [loading, setLoading] = useState(false)
    const confirmar = useConfirm()

    async function handleClick() {
        if (!await confirmar({ mensagem: 'Remover reconciliacao deste movimento?', tipo: 'perigo' })) return
        setLoading(true)
        await desreconciliar(movimentoId)
        setLoading(false)
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading}
            className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
            title="Desreconciliar"
        >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Unlink size={12} />}
        </button>
    )
}

'use client'

import { useTransition } from 'react'
import { CheckCircle2, XCircle, DollarSign, Loader2 } from 'lucide-react'
import { aprovarDespesaCantina, rejeitarDespesaCantina, pagarDespesaCantina } from '@/actions/cantina-despesa-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoAprovarDespesaCantina({
    despesaId,
    statusAtual,
}: {
    despesaId: number
    statusAtual: string
}) {
    const [isPending, startTransition] = useTransition()
    const confirmar = useConfirm()
    const toast = useToast()

    async function handleAprovar() {
        if (!await confirmar({ mensagem: 'Tem certeza que deseja aprovar esta despesa?', tipo: 'info' })) return
        startTransition(async () => {
            const res = await aprovarDespesaCantina(despesaId)
            if (res.error) {
                toast(res.error, 'erro')
            } else {
                toast('Despesa aprovada com sucesso!', 'sucesso')
            }
        })
    }

    async function handleRejeitar() {
        if (!await confirmar({ mensagem: 'Tem certeza que deseja rejeitar esta despesa?', tipo: 'perigo' })) return
        startTransition(async () => {
            const res = await rejeitarDespesaCantina(despesaId)
            if (res.error) {
                toast(res.error, 'erro')
            } else {
                toast('Despesa rejeitada.', 'info')
            }
        })
    }

    async function handlePagar() {
        if (!await confirmar({ mensagem: 'Confirmar pagamento desta despesa?', tipo: 'info' })) return
        startTransition(async () => {
            const res = await pagarDespesaCantina(despesaId)
            if (res.error) {
                toast(res.error, 'erro')
            } else {
                toast('Despesa marcada como paga!', 'sucesso')
            }
        })
    }

    if (statusAtual === 'PENDENTE') {
        return (
            <div className="flex gap-2">
                <button
                    onClick={handleAprovar}
                    disabled={isPending}
                    className="bg-emerald-100 text-emerald-600 hover:bg-emerald-500 hover:text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 shadow-sm"
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Aprovar
                </button>
                <button
                    onClick={handleRejeitar}
                    disabled={isPending}
                    className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 shadow-sm"
                >
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    Rejeitar
                </button>
            </div>
        )
    }

    if (statusAtual === 'APROVADA') {
        return (
            <button
                onClick={handlePagar}
                disabled={isPending}
                className="bg-blue-100 text-blue-600 hover:bg-blue-500 hover:text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 shadow-sm"
            >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <DollarSign size={14} />}
                Pagar
            </button>
        )
    }

    return null
}

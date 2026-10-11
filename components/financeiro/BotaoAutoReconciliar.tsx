'use client'

import { useState } from 'react'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { autoReconciliar } from '@/actions/reconciliacao-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoAutoReconciliar({ contaId }: { contaId: number }) {
    const [loading, setLoading] = useState(false)
    const [resultado, setResultado] = useState<{ reconciled: number; total: number } | null>(null)
    const toast = useToast()
    const confirmar = useConfirm()

    async function handleClick() {
        if (!await confirmar({ mensagem: 'Executar reconciliacao automatica? Isto ira tentar associar movimentos bancarios a contribuicoes, despesas e donativos.', tipo: 'aviso' })) return
        setLoading(true)
        setResultado(null)
        try {
            const res = await autoReconciliar(contaId)
            if (res.success) {
                setResultado({ reconciled: res.reconciled, total: res.total })
            }
        } catch {
            toast('Erro ao executar reconciliacao automatica.', 'erro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleClick}
                disabled={loading}
                className="h-11 px-5 bg-purple-500/10 text-purple-400 hover:bg-purple-500 hover:text-white rounded-xl flex items-center gap-2 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loading ? 'A reconciliar...' : 'Auto-Reconciliar'}
            </button>

            {resultado && (
                <span className="text-xs text-green-400 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    {resultado.reconciled}/{resultado.total} reconciliados
                </span>
            )}
        </div>
    )
}

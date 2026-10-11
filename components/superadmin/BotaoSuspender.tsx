'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useRouter } from 'next/navigation'
import { suspenderIgreja, ativarIgreja } from '@/actions/super-admin-actions'
import { Loader2, Ban, CheckCircle2 } from 'lucide-react'

interface Props {
    tenantId: number
    status: string
}

export default function BotaoSuspender({ tenantId, status }: Props) {
    const confirmar = useConfirm()
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const isSuspenso = status === 'SUSPENSO'

    async function handleToggle() {
        if (!await confirmar({ mensagem: isSuspenso ? 'Deseja ativar esta igreja?' : 'Deseja suspender esta igreja? Os membros nao conseguirao aceder.', tipo: isSuspenso ? 'info' : 'perigo' })) return
        setLoading(true)
        if (isSuspenso) {
            await ativarIgreja(tenantId)
        } else {
            await suspenderIgreja(tenantId)
        }
        setLoading(false)
        router.refresh()
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-1.5 ${
                isSuspenso
                    ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                    : 'text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'
            }`}
        >
            {loading ? (
                <Loader2 size={12} className="animate-spin" />
            ) : isSuspenso ? (
                <CheckCircle2 size={12} />
            ) : (
                <Ban size={12} />
            )}
            {isSuspenso ? 'Ativar' : 'Suspender'}
        </button>
    )
}

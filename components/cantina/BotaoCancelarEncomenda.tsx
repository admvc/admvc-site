'use client'
import { useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { cancelarPreEncomenda } from '@/actions/encomenda-actions'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function BotaoCancelarEncomenda({ encomendaId }: { encomendaId: number }) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const router = useRouter()
    const confirmar = useConfirm()

    async function handleCancelar() {
        if (!await confirmar({ mensagem: 'Tem a certeza que quer cancelar esta encomenda? O saldo sera devolvido se aplicavel.', tipo: 'perigo' })) return
        setLoading(true)
        const res = await cancelarPreEncomenda(encomendaId)
        if (res.success) {
            setDone(true)
            router.refresh()
        }
        setLoading(false)
    }

    if (done) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400">
                <XCircle size={12} /> Cancelada
            </span>
        )
    }

    return (
        <button
            onClick={handleCancelar}
            disabled={loading}
            className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
        >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
            Cancelar
        </button>
    )
}

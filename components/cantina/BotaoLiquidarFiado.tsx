'use client'
import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { liquidarFiado } from '@/actions/fiado-actions'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function BotaoLiquidarFiado({ fiadoId }: { fiadoId: number }) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const router = useRouter()
    const confirmar = useConfirm()

    async function handleLiquidar() {
        if (!await confirmar({ mensagem: 'Tem a certeza que quer liquidar este fiado?', tipo: 'aviso' })) return
        setLoading(true)
        const res = await liquidarFiado(fiadoId)
        if (res.success) {
            setDone(true)
            router.refresh()
        }
        setLoading(false)
    }

    if (done) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                <CheckCircle size={12} /> Liquidado
            </span>
        )
    }

    return (
        <button
            onClick={handleLiquidar}
            disabled={loading}
            className="px-3 py-1.5 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
        >
            {loading ? <Loader2 size={11} className="animate-spin" /> : null}
            Liquidar
        </button>
    )
}

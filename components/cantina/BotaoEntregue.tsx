'use client'
import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { marcarEntregue } from '@/actions/encomenda-actions'
import { useRouter } from 'next/navigation'

export default function BotaoEntregue({ encomendaId }: { encomendaId: number }) {
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const router = useRouter()

    async function handleEntregue() {
        setLoading(true)
        const res = await marcarEntregue(encomendaId)
        if (res.success) {
            setDone(true)
            router.refresh()
        }
        setLoading(false)
    }

    if (done) {
        return (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                <CheckCircle size={12} /> Entregue
            </span>
        )
    }

    return (
        <button
            onClick={handleEntregue}
            disabled={loading}
            className="px-3 py-1.5 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 inline-flex items-center gap-1.5"
        >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Entregue
        </button>
    )
}

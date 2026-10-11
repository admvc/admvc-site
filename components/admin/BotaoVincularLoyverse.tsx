// components/admin/BotaoVincularLoyverse.tsx
'use client'

import { useState } from 'react'
import { Link2, Loader2, CheckCircle2 } from 'lucide-react'
import { vincularLoyverseId } from '@/actions/loyverse-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function BotaoVincularLoyverse({ membroId, loyverseId, membroNome }: { membroId: number, loyverseId: string, membroNome: string }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    async function handleVincular() {
        setLoading(true);
        const res = await vincularLoyverseId(membroId, loyverseId);

        if (res.sucesso) {
            setSucesso(true);
        } else {
            toast(res.erro, 'erro');
            setLoading(false);
        }
    }

    if (sucesso) {
        return (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-500/20">
                <CheckCircle2 size={14} /> Vinculado
            </div>
        )
    }

    return (
        <button
            onClick={handleVincular}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-figueira text-white hover:bg-figueira/90 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm disabled:opacity-50"
            title={`Vincular a ${membroNome}`}
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            {loading ? 'A Gravar...' : 'Vincular Agora'}
        </button>
    )
}
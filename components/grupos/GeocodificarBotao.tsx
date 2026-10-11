'use client'
// components/grupos/GeocodificarBotao.tsx

import { useState } from 'react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react'
import { geocodificarTodosGruposAction } from '@/actions/admin-actions'

export default function GeocodificarBotao() {
    const confirmar = useConfirm()
    const toast = useToast()
    const [estado, setEstado] = useState<'idle' | 'loading' | 'done'>('idle')
    const [resultado, setResultado] = useState<{ sucesso: number; falhou: number } | null>(null)

    async function handleClick() {
        if (!await confirmar({ mensagem: 'Vai geocodificar todos os grupos sem coordenadas. Pode demorar alguns segundos. Continuar?', tipo: 'aviso' })) return
        setEstado('loading')
        const res = await geocodificarTodosGruposAction() as any
        if (res.ok) {
            setResultado({ sucesso: res.sucesso, falhou: res.falhou })
            setEstado('done')
        } else {
            toast(res.error || 'Erro ao geocodificar.', 'erro')
            setEstado('idle')
        }
    }

    if (estado === 'done' && resultado) {
        return (
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                <CheckCircle2 size={13} />
                {resultado.sucesso} OK · {resultado.falhou} falhou
            </div>
        )
    }

    return (
        <button
            onClick={handleClick}
            disabled={estado === 'loading'}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-60 shrink-0"
        >
            {estado === 'loading'
                ? <><Loader2 size={13} className="animate-spin" /> A geocodificar...</>
                : <><MapPin size={13} /> Geocodificar Agora</>
            }
        </button>
    )
}
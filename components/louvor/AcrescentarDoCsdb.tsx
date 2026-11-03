'use client'

// Botão "Acrescentar à lista de músicas da igreja" (página Descobrir).

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Check, Plus } from 'lucide-react'
import { acrescentarDoCsdbAction } from '@/app/louvor/descobrir/actions'

export default function AcrescentarDoCsdb({ trackId }: { trackId: number }) {
    const [pendente, iniciar] = useTransition()
    const [estado, setEstado] = useState<{ id: string; ja: boolean } | null>(null)
    const [erro, setErro] = useState<string | null>(null)

    function acrescentar() {
        setErro(null)
        iniciar(async () => {
            const r = await acrescentarDoCsdbAction(trackId)
            if (r.ok === true) setEstado({ id: r.id, ja: r.ja })
            else setErro(r.error)
        })
    }

    if (estado) {
        return (
            <div className="space-y-1">
                <p role="status" className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: 'var(--a-ok)' }}>
                    <Check size={17} aria-hidden /> {estado.ja ? 'Já estava na lista' : 'Acrescentada'}
                </p>
                <Link href={`/louvor/musicas/${estado.id}`} className="a-foco inline-flex min-h-[44px] items-center text-[15px] font-semibold underline">Abrir a música</Link>
            </div>
        )
    }

    return (
        <div className="space-y-1">
            <button type="button" onClick={acrescentar} disabled={pendente} className="a-botao a-botao-secundario !min-h-[44px] w-full sm:w-auto">
                <Plus size={18} aria-hidden /> {pendente ? 'A acrescentar…' : 'Acrescentar à lista de músicas da igreja'}
            </button>
            {erro && <p role="alert" className="text-[14px] font-semibold" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
        </div>
    )
}

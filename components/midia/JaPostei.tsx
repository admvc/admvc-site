'use client'

// "Já postei": a equipa do telão (e os líderes) regista que as artes foram para as redes.
import { useState } from 'react'
import { Check } from 'lucide-react'
import { jaPostei } from '@/app/midia/rotina/actions'

export default function JaPostei({ eventoId, nome, postadoPor }: { eventoId: number; nome: string; postadoPor: string | null }) {
    const [feito, setFeito] = useState(postadoPor)
    const [erro, setErro] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState(false)

    async function carregar() {
        setOcupado(true); setErro(null)
        const r = await jaPostei(eventoId)
        setOcupado(false)
        if ('erro' in r) setErro(r.erro); else setFeito('si')
    }

    return (
        <div className="a-card flex flex-wrap items-center gap-3 p-4">
            <p className="min-w-0 flex-1 text-[16px]">
                <strong>{nome}</strong><br />
                <span className="a-suave">{feito ? (feito === 'si' ? 'Registado: já postaste.' : `Postado por ${feito}.`) : 'As artes estão por postar nas redes.'}</span>
            </p>
            {!feito && <button type="button" onClick={carregar} disabled={ocupado} className="a-botao a-botao-principal !min-h-[48px]"><Check size={18} aria-hidden /> Já postei</button>}
            {erro && <p role="alert" className="w-full text-[15px]" style={{ color: 'var(--a-perigo, #c0392b)' }}>{erro}</p>}
        </div>
    )
}

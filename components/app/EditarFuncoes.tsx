'use client'

// "Funções" de uma pessoa na equipa: escolher várias e guardar (sem a tirar da equipa).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Pencil } from 'lucide-react'
import { definirFuncoesDoIntegrante } from '@/actions/equipa-actions'

export default function EditarFuncoes({ integranteId, funcoes, escolhidas, nome }: {
    integranteId: number
    funcoes: { id: number; nome: string }[]
    escolhidas: number[]
    nome: string
}) {
    const router = useRouter()
    const [aberto, setAberto] = useState(false)
    const [marcadas, setMarcadas] = useState<number[]>(escolhidas)
    const [erro, setErro] = useState<string | null>(null)
    const [pendente, iniciar] = useTransition()

    if (!aberto) {
        return (
            <button type="button" onClick={() => { setMarcadas(escolhidas); setAberto(true) }} className="a-foco inline-flex min-h-[40px] items-center gap-1.5 text-[15px] font-semibold"
                style={{ color: 'var(--a-destaque)' }} aria-label={`Mudar as funções de ${nome}`}>
                <Pencil size={16} aria-hidden /> Funções
            </button>
        )
    }
    const alternar = (id: number) => setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))
    return (
        <div className="w-full space-y-2 pt-2" role="group" aria-label={`Funções de ${nome}`}>
            <div className="flex flex-wrap gap-2">
                {funcoes.map((f) => {
                    const sim = marcadas.includes(f.id)
                    return (
                        <button key={f.id} type="button" onClick={() => alternar(f.id)} aria-pressed={sim}
                            className="a-foco inline-flex min-h-[40px] items-center gap-1 rounded-full border px-3 text-[15px]"
                            style={sim ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)', borderColor: 'var(--a-destaque)' } : { borderColor: 'var(--a-borda)' }}>
                            {sim && <Check size={14} aria-hidden />} {f.nome}
                        </button>
                    )
                })}
            </div>
            <div className="flex gap-2">
                <button type="button" disabled={pendente} className="a-botao a-botao-principal !min-h-[40px]"
                    onClick={() => iniciar(async () => {
                        setErro(null)
                        const r = await definirFuncoesDoIntegrante(integranteId, marcadas)
                        if (!r.ok) { setErro(r.error ?? 'Erro.'); return }
                        setAberto(false); router.refresh()
                    })}>
                    {pendente && <Loader2 size={16} className="animate-spin" aria-hidden />} Guardar
                </button>
                <button type="button" className="a-botao a-botao-secundario !min-h-[40px]" onClick={() => setAberto(false)}>Cancelar</button>
            </div>
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
        </div>
    )
}

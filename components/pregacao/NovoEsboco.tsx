'use client'

// Um esboço sem culto (ex.: para preparar com antecedência), para quem gere as pregações.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { novoEsboco } from '@/actions/esboco-actions'

export default function NovoEsboco({ pregadores, eu }: { pregadores: { id: number; nome: string }[]; eu: number }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [titulo, setTitulo] = useState('')
    const [pregador, setPregador] = useState(String(pregadores.some((p) => p.id === eu) ? eu : pregadores[0]?.id ?? ''))
    const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
    const [aviso, setAviso] = useState<string | null>(null)

    if (!aberto) {
        return (
            <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setAberto(true)}>
                <Plus size={18} aria-hidden /> Novo esboço (sem culto)
            </button>
        )
    }

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <form className="a-card space-y-3 p-4" onSubmit={(e) => {
            e.preventDefault()
            setAviso(null)
            iniciar(async () => {
                const r = await novoEsboco({ titulo, pregadorId: Number(pregador), data })
                if ('error' in r) setAviso(r.error)
                else router.push(`/pregacao/editor/${r.id}`)
            })
        }}>
            <h2 className="text-[19px] font-bold">Novo esboço</h2>
            <p className="text-[15px] a-suave">Para uma pregação de um culto, faça-o antes na rotina do culto (botão &quot;Escrever o esboço&quot;).</p>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Tema</span>
                <input required value={titulo} onChange={(e) => setTitulo(e.target.value)} className={campo} style={estilo} />
            </label>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Quem prega</span>
                <select value={pregador} onChange={(e) => setPregador(e.target.value)} className={campo} style={estilo}>
                    {pregadores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
            </label>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Data</span>
                <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={campo} style={estilo} />
            </label>
            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
            <div className="flex gap-2">
                <button type="button" className="a-botao a-botao-secundario flex-1" onClick={() => setAberto(false)} disabled={pendente}>Cancelar</button>
                <button type="submit" className="a-botao a-botao-principal flex-[2]" disabled={pendente}>{pendente ? 'A criar…' : 'Criar e escrever'}</button>
            </div>
        </form>
    )
}

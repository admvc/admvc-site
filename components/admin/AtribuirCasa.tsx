'use client'

// Membros sem congregação: escolher vários e dizer de que casa são (de uma vez).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { atribuirCongregacao } from '@/actions/congregacao-membros-actions'

export default function AtribuirCasa({ membros, congregacoes }: {
    membros: { id: number; nome: string }[]
    congregacoes: { id: number; nome: string }[]
}) {
    const router = useRouter()
    const [marcados, setMarcados] = useState<number[]>([])
    const [casa, setCasa] = useState('')
    const [msg, setMsg] = useState<string | null>(null)
    const [pendente, iniciar] = useTransition()
    const todos = marcados.length === membros.length && membros.length > 0

    return (
        <section className="space-y-3 rounded-2xl border border-soft bg-bg2 p-4">
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-bold text-fg">{membros.length} sem congregação</h2>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={todos} onChange={() => setMarcados(todos ? [] : membros.map((m) => m.id))} className="h-4 w-4 accent-figueira" /> Todos
                </label>
                <span className="flex-1" />
                <select value={casa} onChange={(e) => setCasa(e.target.value)} className="rounded-xl border border-soft bg-bg px-3 py-2 text-sm" aria-label="Congregação">
                    <option value="">Escolher a casa…</option>
                    {congregacoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <button type="button" disabled={pendente || !casa || marcados.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-figueira px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    onClick={() => iniciar(async () => {
                        const r = await atribuirCongregacao(marcados, Number(casa))
                        setMsg(r.ok ? `${r.n} membros passaram para ${congregacoes.find((c) => c.id === Number(casa))?.nome}.` : r.error ?? 'Erro.')
                        if (r.ok) { setMarcados([]); router.refresh() }
                    })}>
                    {pendente && <Loader2 size={14} className="animate-spin" />} Atribuir {marcados.length || ''}
                </button>
            </div>
            {msg && <p role="status" className="text-sm text-muted">{msg}</p>}
            <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {membros.map((m) => (
                    <li key={m.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-soft/40">
                            <input type="checkbox" checked={marcados.includes(m.id)} className="h-4 w-4 accent-figueira"
                                onChange={() => setMarcados((x) => (x.includes(m.id) ? x.filter((i) => i !== m.id) : [...x, m.id]))} />
                            {m.nome}
                        </label>
                    </li>
                ))}
            </ul>
        </section>
    )
}

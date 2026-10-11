'use client'

import { useState } from 'react'
import { criarOfertaBoleia } from '@/actions/boleia-actions'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Car } from 'lucide-react'

interface Evento {
    id: number
    nome: string
    data: string
}

export default function FormOferecer({ eventos }: { eventos: Evento[] }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const formData = new FormData(e.currentTarget)
        const res = await criarOfertaBoleia(formData)

        if (res.error) {
            setError(res.error)
            setLoading(false)
        } else {
            router.push('/boleia')
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-bold text-red-400">
                    {error}
                </div>
            )}

            {/* Evento */}
            <div className="space-y-1.5">
                <label htmlFor="evento_id" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Para qual evento? (opcional)
                </label>
                <select
                    id="evento_id"
                    name="evento_id"
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                >
                    <option value="">Sem evento especifico</option>
                    {eventos.map(ev => {
                        const data = new Date(ev.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                        return (
                            <option key={ev.id} value={ev.id}>{ev.nome} — {data}</option>
                        )
                    })}
                </select>
            </div>

            {/* Data e Hora */}
            <div className="space-y-1.5">
                <label htmlFor="data_hora_saida" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Data e hora de saida
                </label>
                <input
                    id="data_hora_saida"
                    name="data_hora_saida"
                    type="datetime-local"
                    required
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                />
            </div>

            {/* Morada */}
            <div className="space-y-1.5">
                <label htmlFor="endereco_partida" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Morada de partida (so visivel para quem reservar)
                </label>
                <input
                    id="endereco_partida"
                    name="endereco_partida"
                    type="text"
                    required
                    placeholder="Ex: Rua da Liberdade 45, Buarcos"
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                />
            </div>

            {/* Zona */}
            <div className="space-y-1.5">
                <label htmlFor="zona_partida" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Zona/Bairro (visivel para todos)
                </label>
                <input
                    id="zona_partida"
                    name="zona_partida"
                    type="text"
                    placeholder="Ex: Buarcos, Figueira da Foz"
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                />
            </div>

            {/* Vagas */}
            <div className="space-y-1.5">
                <label htmlFor="vagas_total" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Quantos lugares oferece?
                </label>
                <select
                    id="vagas_total"
                    name="vagas_total"
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'lugar' : 'lugares'}</option>
                    ))}
                </select>
            </div>

            {/* Nota */}
            <div className="space-y-1.5">
                <label htmlFor="nota" className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">
                    Nota adicional (opcional)
                </label>
                <textarea
                    id="nota"
                    name="nota"
                    rows={2}
                    placeholder="Ex: Passo por Buarcos as 9:30, ligar antes..."
                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all resize-none"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-figueira text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl shadow-figueira/20 active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Car size={16} />}
                {loading ? 'A criar...' : 'Publicar Boleia'}
            </button>
        </form>
    )
}

'use client'

import { useState } from 'react'
import { criarOfertaBoleia } from '@/actions/boleia-actions'
import { useRouter } from 'next/navigation'
import { Loader2, Car } from 'lucide-react'

const CAMPO = 'a-foco min-h-[52px] w-full rounded-[14px] border px-4 text-[17px]'
const ESTILO_CAMPO = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

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
                <p role="alert" className="rounded-[14px] border px-4 py-3 text-[16px] font-semibold"
                    style={{ borderColor: 'var(--a-erro)', color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                    {error}
                </p>
            )}

            {/* Evento */}
            <div className="space-y-2">
                <label htmlFor="evento_id" className="block text-[16px] font-semibold">
                    Para que culto ou evento? <span className="font-normal a-suave">(se quiser)</span>
                </label>
                <select
                    id="evento_id"
                    name="evento_id"
                    className={CAMPO} style={ESTILO_CAMPO}
                >
                    <option value="">Sem evento específico</option>
                    {eventos.map(ev => {
                        const data = new Date(ev.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
                        return (
                            <option key={ev.id} value={ev.id}>{ev.nome} — {data}</option>
                        )
                    })}
                </select>
            </div>

            {/* Data e Hora */}
            <div className="space-y-2">
                <label htmlFor="data_hora_saida" className="block text-[16px] font-semibold">
                    Quando sai?
                </label>
                <input
                    id="data_hora_saida"
                    name="data_hora_saida"
                    type="datetime-local"
                    required
                    className={CAMPO} style={ESTILO_CAMPO}
                />
            </div>

            {/* Morada */}
            <div className="space-y-2">
                <label htmlFor="endereco_partida" className="block text-[16px] font-semibold">
                    De onde sai? <span className="block text-[15px] font-normal a-suave">A morada só aparece a quem pedir lugar.</span>
                </label>
                <input
                    id="endereco_partida"
                    name="endereco_partida"
                    type="text"
                    required
                    placeholder="Ex: Rua da Liberdade 45, Buarcos"
                    className={CAMPO} style={ESTILO_CAMPO}
                />
            </div>

            {/* Zona */}
            <div className="space-y-2">
                <label htmlFor="zona_partida" className="block text-[16px] font-semibold">
                    Zona <span className="block text-[15px] font-normal a-suave">Todos veem a zona.</span>
                </label>
                <input
                    id="zona_partida"
                    name="zona_partida"
                    type="text"
                    placeholder="Ex: Buarcos, Figueira da Foz"
                    className={CAMPO} style={ESTILO_CAMPO}
                />
            </div>

            {/* Vagas */}
            <div className="space-y-2">
                <label htmlFor="vagas_total" className="block text-[16px] font-semibold">
                    Quantos lugares oferece?
                </label>
                <select
                    id="vagas_total"
                    name="vagas_total"
                    className={CAMPO} style={ESTILO_CAMPO}
                >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'lugar' : 'lugares'}</option>
                    ))}
                </select>
            </div>

            {/* Nota */}
            <div className="space-y-2">
                <label htmlFor="nota" className="block text-[16px] font-semibold">
                    Alguma nota? <span className="font-normal a-suave">(se quiser)</span>
                </label>
                <textarea
                    id="nota"
                    name="nota"
                    rows={2}
                    placeholder="Ex: Passo por Buarcos às 9:30, ligar antes..."
                    className={`${CAMPO} resize-none py-3`} style={ESTILO_CAMPO}
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className="a-botao a-botao-principal w-full !min-h-[56px]"
            >
                {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Car size={20} aria-hidden />}
                {loading ? 'A publicar…' : 'Publicar a boleia'}
            </button>
        </form>
    )
}

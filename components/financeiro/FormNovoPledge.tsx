'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, X } from 'lucide-react'
import { criarPledge } from '@/actions/pledge-actions'

interface Fundo {
    id: number
    nome: string
}

interface Membro {
    id: number
    first_name: string
    last_name: string
}

export default function FormNovoPledge({
    fundos,
    membros,
    isAdmin = false,
}: {
    fundos: Fundo[]
    membros?: Membro[]
    isAdmin?: boolean
}) {
    const [aberto, setAberto] = useState(false)
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [sucesso, setSucesso] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setErro(null)
        setSucesso(false)

        const form = e.currentTarget
        const formData = new FormData(form)

        try {
            const res = await criarPledge(formData)
            if (res.ok) {
                setSucesso(true)
                form.reset()
                setTimeout(() => {
                    setSucesso(false)
                    setAberto(false)
                }, 2000)
            } else {
                setErro(res.error || 'Erro ao criar pledge.')
            }
        } catch {
            setErro('Erro inesperado.')
        } finally {
            setLoading(false)
        }
    }

    if (!aberto) {
        return (
            <button
                onClick={() => setAberto(true)}
                className="h-11 px-5 bg-bg2 border border-soft text-fg rounded-xl flex items-center gap-2 hover:bg-bg transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest"
            >
                <PlusCircle size={14} />
                Nova Promessa
            </button>
        )
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black italic uppercase tracking-tighter text-fg">
                    Nova Promessa de Contribuicao
                </h3>
                <button
                    onClick={() => setAberto(false)}
                    className="p-2 rounded-xl text-muted hover:text-fg hover:bg-soft/30 transition-all"
                >
                    <X size={16} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {isAdmin && membros && (
                    <div className="sm:col-span-2 space-y-1.5">
                        <label className="text-[8px] font-black uppercase tracking-widest text-muted">Membro</label>
                        <select
                            name="membro_id"
                            className="w-full h-11 px-4 bg-bg border border-soft rounded-xl text-fg text-xs focus:border-figueira focus:ring-1 focus:ring-figueira/30 outline-none transition-all"
                        >
                            <option value="">Selecionar membro...</option>
                            {membros.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.first_name} {m.last_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fundo</label>
                    <select
                        name="fundo_id"
                        required
                        className="w-full h-11 px-4 bg-bg border border-soft rounded-xl text-fg text-xs focus:border-figueira focus:ring-1 focus:ring-figueira/30 outline-none transition-all"
                    >
                        <option value="">Selecionar fundo...</option>
                        {fundos.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Valor Mensal (EUR)</label>
                    <input
                        name="valor_mensal"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        className="w-full h-11 px-4 bg-bg border border-soft rounded-xl text-fg text-xs focus:border-figueira focus:ring-1 focus:ring-figueira/30 outline-none transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Duracao (meses)</label>
                    <input
                        name="duracao_meses"
                        type="number"
                        min="1"
                        max="120"
                        required
                        placeholder="12"
                        className="w-full h-11 px-4 bg-bg border border-soft rounded-xl text-fg text-xs focus:border-figueira focus:ring-1 focus:ring-figueira/30 outline-none transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Observacao</label>
                    <input
                        name="observacao"
                        type="text"
                        placeholder="Opcional..."
                        className="w-full h-11 px-4 bg-bg border border-soft rounded-xl text-fg text-xs focus:border-figueira focus:ring-1 focus:ring-figueira/30 outline-none transition-all"
                    />
                </div>

                <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={loading}
                        className="h-11 px-6 bg-figueira text-white rounded-xl flex items-center gap-2 hover:bg-figueira/90 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                        <PlusCircle size={14} />
                        {loading ? 'A criar...' : 'Criar Promessa'}
                    </button>

                    {erro && <span className="text-[10px] font-bold text-red-500">{erro}</span>}
                    {sucesso && <span className="text-[10px] font-bold text-green-500">Promessa criada com sucesso!</span>}
                </div>
            </form>
        </div>
    )
}

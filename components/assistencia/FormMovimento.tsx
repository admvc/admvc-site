'use client'

import { useState, useRef } from 'react'
import { ArrowDown, ArrowUp, Loader2 } from 'lucide-react'
import { registarMovimentoAssistencia } from '@/actions/assistencia-actions'

interface Item {
    id: number
    nome: string
    stock: number
    unidade: string
}

export default function FormMovimento({ itens }: { itens: Item[] }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState(false)
    const [tipo, setTipo] = useState('')
    const formRef = useRef<HTMLFormElement>(null)

    const isEntrada = tipo === 'DOACAO_RECEBIDA'

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setErro('')
        setSucesso(false)

        const res = await registarMovimentoAssistencia(formData)
        if (res?.error) {
            setErro(res.error)
        } else {
            formRef.current?.reset()
            setTipo('')
            setSucesso(true)
            setTimeout(() => setSucesso(false), 3000)
        }
        setLoading(false)
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Item */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Item
                    </label>
                    <select
                        name="item_id"
                        required
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                    >
                        <option value="">Selecionar item...</option>
                        {itens.map(item => (
                            <option key={item.id} value={item.id}>
                                {item.nome} (stock: {item.stock} {item.unidade})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Tipo */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Tipo de Movimento
                    </label>
                    <select
                        name="tipo"
                        required
                        value={tipo}
                        onChange={e => setTipo(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                    >
                        <option value="">Selecionar...</option>
                        <option value="DOACAO_RECEBIDA">Doacao Recebida</option>
                        <option value="ENTREGA_FAMILIA">Entrega a Familia</option>
                        <option value="ENTREGA_ENTIDADE">Entrega a Entidade</option>
                        <option value="REPASSE_CANTINA">Repasse para Cantina</option>
                    </select>
                </div>

                {/* Quantidade */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Quantidade
                    </label>
                    <input
                        type="number"
                        name="quantidade"
                        required
                        min="1"
                        placeholder="0"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Destinatario */}
                {!isEntrada && tipo && (
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                            Destinatario
                        </label>
                        <input
                            type="text"
                            name="destinatario"
                            placeholder="Nome da familia/entidade..."
                            className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                        />
                    </div>
                )}

                {/* Observacao */}
                <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Observacao
                    </label>
                    <input
                        type="text"
                        name="observacao"
                        placeholder="Nota opcional..."
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>
            </div>

            {erro && (
                <p className="text-red-500 text-sm font-bold bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                    {erro}
                </p>
            )}

            {sucesso && (
                <p className="text-green-500 text-sm font-bold bg-green-500/10 border border-green-500/20 rounded-2xl p-3">
                    Movimento registado com sucesso!
                </p>
            )}

            <button
                type="submit"
                disabled={loading || !tipo}
                className="flex items-center gap-2 bg-figueira text-bg px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : isEntrada ? (
                    <ArrowDown size={14} />
                ) : (
                    <ArrowUp size={14} />
                )}
                Registar Movimento
            </button>
        </form>
    )
}

'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { criarItemAssistencia } from '@/actions/assistencia-actions'

export default function FormNovoItem() {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const [sucesso, setSucesso] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setErro('')
        setSucesso(false)

        const res = await criarItemAssistencia(formData)
        if (res?.error) {
            setErro(res.error)
        } else {
            formRef.current?.reset()
            setSucesso(true)
            setTimeout(() => setSucesso(false), 3000)
        }
        setLoading(false)
    }

    return (
        <form ref={formRef} action={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Nome */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Nome do Item
                    </label>
                    <input
                        type="text"
                        name="nome"
                        required
                        placeholder="Ex: Arroz, Sabonete..."
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Categoria */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Categoria
                    </label>
                    <select
                        name="categoria"
                        required
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                    >
                        <option value="">Selecionar...</option>
                        <option value="ALIMENTO">Alimento</option>
                        <option value="HIGIENE">Higiene</option>
                        <option value="VESTUARIO">Vestuario</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                </div>

                {/* Unidade */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Unidade
                    </label>
                    <select
                        name="unidade"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                    >
                        <option value="unidade">Unidade</option>
                        <option value="kg">Kg</option>
                        <option value="litro">Litro</option>
                        <option value="peca">Peca</option>
                    </select>
                </div>

                {/* Stock Inicial */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Stock Inicial
                    </label>
                    <input
                        type="number"
                        name="stock"
                        min="0"
                        defaultValue="0"
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                    />
                </div>

                {/* Stock Minimo */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Stock Minimo (Alerta)
                    </label>
                    <input
                        type="number"
                        name="stock_minimo"
                        min="0"
                        defaultValue="0"
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
                    Item criado com sucesso!
                </p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-figueira text-bg px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar Item
            </button>
        </form>
    )
}

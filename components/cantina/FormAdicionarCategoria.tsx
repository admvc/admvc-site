'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { criarCategoria } from '@/actions/cantina-local-actions'

export default function FormAdicionarCategoria() {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState('')
    const formRef = useRef<HTMLFormElement>(null)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setErro('')
        const res = await criarCategoria(formData)
        if (res?.error) setErro(res.error)
        else formRef.current?.reset()
        setLoading(false)
    }

    return (
        <form ref={formRef} action={handleSubmit} className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                    Nova Categoria
                </label>
                <input
                    type="text"
                    name="nome"
                    required
                    placeholder="Ex: Bebidas, Snacks..."
                    className="w-full bg-bg border border-soft rounded-2xl p-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                />
            </div>
            <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-figueira text-bg px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar
            </button>
            {erro && <p className="text-red-500 text-xs font-bold">{erro}</p>}
        </form>
    )
}

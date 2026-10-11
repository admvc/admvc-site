'use client'

import { useState } from 'react'
import { PlusCircle, Loader2, X } from 'lucide-react'
import { criarContaBancaria } from '@/actions/reconciliacao-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function FormCriarConta() {
    const [aberto, setAberto] = useState(false)
    const [loading, setLoading] = useState(false)
    const toast = useToast()

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const form = new FormData(e.currentTarget)
        const res = await criarContaBancaria(form)
        if (res.ok) {
            setAberto(false)
        } else {
            toast(res.error || 'Erro ao criar conta.', 'erro')
        }
        setLoading(false)
    }

    if (!aberto) {
        return (
            <button
                onClick={() => setAberto(true)}
                className="h-11 px-5 bg-bg2 border border-soft text-fg rounded-xl flex items-center gap-2 hover:bg-bg transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest"
            >
                <PlusCircle size={14} />
                Nova Conta
            </button>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-bg2 border border-soft rounded-2xl p-4 space-y-3 max-w-md">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-fg">Nova Conta Bancaria</h3>
                <button type="button" onClick={() => setAberto(false)} className="text-muted hover:text-fg transition-colors">
                    <X size={16} />
                </button>
            </div>

            <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">Nome *</label>
                <input
                    name="nome"
                    required
                    placeholder="Ex: CGD Conta Principal"
                    className="w-full h-10 px-3 bg-bg border border-soft rounded-xl text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
                />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">IBAN</label>
                    <input
                        name="iban"
                        placeholder="PT50..."
                        className="w-full h-10 px-3 bg-bg border border-soft rounded-xl text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-muted">Banco</label>
                    <input
                        name="banco"
                        placeholder="Ex: CGD"
                        className="w-full h-10 px-3 bg-bg border border-soft rounded-xl text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="h-11 px-5 bg-accent text-white rounded-xl flex items-center gap-2 transition-all active:scale-95 text-[9px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                {loading ? 'A criar...' : 'Criar Conta'}
            </button>
        </form>
    )
}

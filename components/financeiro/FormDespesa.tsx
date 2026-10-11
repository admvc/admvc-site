'use client'

import { useState } from 'react'
import { Receipt, Loader2 } from 'lucide-react'
import { submeterDespesaAction } from '@/actions/fundos-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    fundos: { id: number; nome: string }[]
    categorias: { id: number; nome: string; fundo_id: number }[]
}

export default function FormDespesa({ fundos, categorias }: Props) {
    const [loading, setLoading] = useState(false)
    const [fundoId, setFundoId] = useState('')
    const toast = useToast()

    const categoriasFiltradas = categorias.filter(c => c.fundo_id === Number(fundoId))

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await submeterDespesaAction(formData)
        if (result.ok) {
            toast('Despesa submetida com sucesso!', 'sucesso')
            setFundoId('')
        } else {
            toast(result.error || 'Erro ao submeter despesa.', 'erro')
        }
        setLoading(false)
    }

    return (
        <form action={handleSubmit} className="bg-bg2 border border-soft p-6 rounded-[2.5rem] space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
                <div className="bg-figueira/10 p-3 rounded-2xl text-figueira">
                    <Receipt size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">Nova Despesa</h3>
                    <p className="text-[9px] text-muted mt-1">Submete uma despesa para aprovacao.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fundo</label>
                    <select
                        name="fundo_id"
                        required
                        value={fundoId}
                        onChange={e => setFundoId(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    >
                        <option value="">Selecionar fundo...</option>
                        {fundos.map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Categoria (opcional)</label>
                    <select
                        name="categoria_id"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    >
                        <option value="">Sem categoria</option>
                        {categoriasFiltradas.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Descricao</label>
                <input
                    type="text"
                    name="descricao"
                    required
                    placeholder="Ex: Compra de material de limpeza"
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Valor</label>
                    <input
                        type="number"
                        name="valor"
                        required
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fornecedor (opcional)</label>
                    <input
                        type="text"
                        name="fornecedor"
                        placeholder="Nome do fornecedor"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Data</label>
                    <input
                        type="date"
                        name="data"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-figueira text-white rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                {loading ? 'A Submeter...' : 'Submeter Despesa'}
            </button>
        </form>
    )
}

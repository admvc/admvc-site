'use client'

import { useRef, useState } from 'react'
import { submeterDespesaCantina } from '@/actions/cantina-despesa-actions'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Loader2, Plus } from 'lucide-react'

export default function FormDespesaCantina() {
    const [loading, setLoading] = useState(false)
    const formRef = useRef<HTMLFormElement>(null)
    const toast = useToast()

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const res = await submeterDespesaCantina(formData)
        setLoading(false)

        if (res.error) {
            toast(res.error, 'erro')
        } else {
            toast('Despesa submetida com sucesso!', 'sucesso')
            formRef.current?.reset()
        }
    }

    return (
        <form ref={formRef} action={handleSubmit} className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-fg">Nova Despesa</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Descricao */}
                <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Descricao *</label>
                    <input
                        name="descricao"
                        type="text"
                        required
                        placeholder="Ex: Compra de cafe e acucar"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg placeholder:text-muted/40 focus:outline-none focus:border-figueira/40 transition-colors"
                    />
                </div>

                {/* Valor */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Valor (EUR) *</label>
                    <input
                        name="valor"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0.00"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg placeholder:text-muted/40 focus:outline-none focus:border-figueira/40 transition-colors"
                    />
                </div>

                {/* Data */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Data *</label>
                    <input
                        name="data"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg focus:outline-none focus:border-figueira/40 transition-colors"
                    />
                </div>

                {/* Categoria */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Categoria *</label>
                    <select
                        name="categoria"
                        required
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg focus:outline-none focus:border-figueira/40 transition-colors"
                    >
                        <option value="">Selecionar...</option>
                        <option value="Compra de produtos">Compra de produtos</option>
                        <option value="Utilidades">Utilidades</option>
                        <option value="Material">Material</option>
                        <option value="Manutencao">Manutencao</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>

                {/* Fornecedor */}
                <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Fornecedor</label>
                    <input
                        name="fornecedor"
                        type="text"
                        placeholder="Opcional"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg placeholder:text-muted/40 focus:outline-none focus:border-figueira/40 transition-colors"
                    />
                </div>

                {/* Observacao */}
                <div className="sm:col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1.5">Observacao</label>
                    <textarea
                        name="observacao"
                        rows={2}
                        placeholder="Opcional"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-[11px] font-bold text-fg placeholder:text-muted/40 focus:outline-none focus:border-figueira/40 transition-colors resize-none"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-figueira text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {loading ? 'A Submeter...' : 'Submeter Despesa'}
            </button>
        </form>
    )
}

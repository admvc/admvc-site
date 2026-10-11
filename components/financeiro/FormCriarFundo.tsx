'use client'

import { useState } from 'react'
import { PlusCircle, Loader2 } from 'lucide-react'
import { criarFundoAction } from '@/actions/fundos-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

const TIPOS_FUNDO = [
    { value: 'GERAL', label: 'Geral' },
    { value: 'CONSTRUCAO', label: 'Construcao' },
    { value: 'MISSOES', label: 'Missoes' },
    { value: 'SOCIAL', label: 'Social' },
    { value: 'CANTINA', label: 'Cantina' },
    { value: 'CUSTOM', label: 'Personalizado' },
]

export default function FormCriarFundo() {
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await criarFundoAction(formData)
        if (result.ok) {
            toast('Fundo criado com sucesso!', 'sucesso')
        } else {
            toast(result.error || 'Erro ao criar fundo.', 'erro')
        }
        setLoading(false)
    }

    return (
        <form action={handleSubmit} className="bg-bg2 border border-soft p-6 rounded-[2.5rem] space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
                <div className="bg-figueira/10 p-3 rounded-2xl text-figueira">
                    <PlusCircle size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">Novo Fundo</h3>
                    <p className="text-[9px] text-muted mt-1">Cria um novo fundo financeiro para gerir saldos.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Nome</label>
                    <input
                        type="text"
                        name="nome"
                        required
                        placeholder="Ex: Fundo Missoes"
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Tipo</label>
                    <select
                        name="tipo"
                        required
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    >
                        {TIPOS_FUNDO.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Descricao (opcional)</label>
                <textarea
                    name="descricao"
                    rows={2}
                    placeholder="Descricao do fundo..."
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30 resize-none"
                />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    name="restrito"
                    value="true"
                    className="w-5 h-5 rounded-lg border-2 border-soft bg-bg text-figueira focus:ring-figueira/30 accent-figueira"
                />
                <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-fg">Fundo Restrito</span>
                    <p className="text-[8px] text-muted">O saldo deste fundo so pode ser usado para o seu fim especifico.</p>
                </div>
            </label>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-figueira text-white rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                {loading ? 'A Criar...' : 'Criar Fundo'}
            </button>
        </form>
    )
}

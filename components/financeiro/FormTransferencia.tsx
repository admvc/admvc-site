'use client'

import { useState } from 'react'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { transferirEntreeFundosAction } from '@/actions/fundos-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface FundoResumido {
    id: number
    nome: string
    saldo_atual: number
}

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

export default function FormTransferencia({ fundos }: { fundos: FundoResumido[] }) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [origemId, setOrigemId] = useState('')
    const [destinoId, setDestinoId] = useState('')

    const fundoOrigem = fundos.find(f => f.id === Number(origemId))

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await transferirEntreeFundosAction(formData)
        if (result.ok) {
            toast('Transferencia realizada com sucesso!', 'sucesso')
            setOrigemId('')
            setDestinoId('')
        } else {
            toast(result.error || 'Erro ao transferir.', 'erro')
        }
        setLoading(false)
    }

    return (
        <form action={handleSubmit} className="bg-bg2 border border-soft p-6 rounded-[2.5rem] space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-soft pb-4">
                <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500">
                    <ArrowRightLeft size={20} />
                </div>
                <div>
                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">Transferir Saldo</h3>
                    <p className="text-[9px] text-muted mt-1">Move valores entre fundos financeiros.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fundo de Origem</label>
                    <select
                        name="fundo_origem_id"
                        required
                        value={origemId}
                        onChange={e => setOrigemId(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    >
                        <option value="">Selecionar...</option>
                        {fundos.map(f => (
                            <option key={f.id} value={f.id}>
                                {f.nome} ({euro(f.saldo_atual)})
                            </option>
                        ))}
                    </select>
                    {fundoOrigem && (
                        <p className="text-[8px] text-muted">Saldo disponivel: <span className="text-fg font-bold">{euro(fundoOrigem.saldo_atual)}</span></p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Fundo de Destino</label>
                    <select
                        name="fundo_destino_id"
                        required
                        value={destinoId}
                        onChange={e => setDestinoId(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    >
                        <option value="">Selecionar...</option>
                        {fundos.filter(f => f.id !== Number(origemId)).map(f => (
                            <option key={f.id} value={f.id}>
                                {f.nome} ({euro(f.saldo_atual)})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Motivo</label>
                    <input
                        type="text"
                        name="motivo"
                        required
                        placeholder="Razao da transferencia..."
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading || !origemId || !destinoId}
                className="w-full bg-blue-600 text-white rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                {loading ? 'A Transferir...' : 'Transferir'}
            </button>
        </form>
    )
}

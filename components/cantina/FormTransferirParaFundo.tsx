'use client'

import { useState } from 'react'
import { ArrowRightLeft, Loader2, Wallet, CheckCircle } from 'lucide-react'
import { transferirCantinaParaFundo } from '@/actions/cantina-relatorio-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Fundo {
    id: number
    nome: string
}

interface Props {
    fundos: Fundo[]
    saldoDisponivel: number
    receitaCash: number
    jaTransferido: number
}

const fmt = (v: number) => v.toFixed(2).replace('.', ',')

export default function FormTransferirParaFundo({ fundos, saldoDisponivel, receitaCash, jaTransferido }: Props) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await transferirCantinaParaFundo(formData)
        if ((result as any).success) {
            toast('Transferencia realizada com sucesso!', 'sucesso')
        } else {
            toast((result as any).error || 'Erro ao transferir.', 'erro')
        }
        setLoading(false)
    }

    return (
        <div className="p-5 space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-bg border border-soft rounded-2xl p-4 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <Wallet size={10} className="text-figueira" />
                        Receita Cash Total
                    </p>
                    <p className="text-xl font-black text-fg">{fmt(receitaCash)} EUR</p>
                </div>

                <div className="bg-bg border border-soft rounded-2xl p-4 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <CheckCircle size={10} className="text-green-500" />
                        Ja Transferido
                    </p>
                    <p className="text-xl font-black text-fg">{fmt(jaTransferido)} EUR</p>
                </div>

                <div className="bg-bg border border-soft rounded-2xl p-4 space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <ArrowRightLeft size={10} className="text-blue-500" />
                        Disponivel
                    </p>
                    <p className={`text-xl font-black ${saldoDisponivel > 0 ? 'text-green-500' : 'text-muted'}`}>
                        {fmt(saldoDisponivel)} EUR
                    </p>
                </div>
            </div>

            {/* Form */}
            {saldoDisponivel > 0 ? (
                <form action={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Fundo destino */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Fundo Destino
                            </label>
                            <select
                                name="fundo_destino_id"
                                required
                                className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none"
                            >
                                <option value="">Selecione...</option>
                                {fundos.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Valor */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Valor (EUR)
                            </label>
                            <input
                                type="number"
                                name="valor"
                                required
                                min="0.01"
                                max={saldoDisponivel}
                                step="0.01"
                                placeholder="0.00"
                                className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                            />
                        </div>

                        {/* Motivo */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Motivo
                            </label>
                            <input
                                type="text"
                                name="motivo"
                                placeholder="Transferencia de receita da cantina"
                                className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted2"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-figueira text-bg px-6 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:brightness-110 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
                        Transferir
                    </button>
                </form>
            ) : (
                <p className="text-sm text-muted text-center py-4">
                    Nao ha saldo disponivel para transferencia.
                </p>
            )}
        </div>
    )
}

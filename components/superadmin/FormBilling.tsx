'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarBilling } from '@/actions/super-admin-actions'
import { Loader2, Save, X } from 'lucide-react'

interface Props {
    igreja: {
        id: number
        nome: string
        valor_mensal: number | null
        plano_inicio: string | null
        plano_fim: string | null
    }
    onClose: () => void
}

function formatDateForInput(dateStr: string | null): string {
    if (!dateStr) return ''
    try {
        return new Date(dateStr).toISOString().split('T')[0]
    } catch {
        return ''
    }
}

export default function FormBilling({ igreja, onClose }: Props) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [valorMensal, setValorMensal] = useState(igreja.valor_mensal?.toString() || '')
    const [planoInicio, setPlanoInicio] = useState(formatDateForInput(igreja.plano_inicio))
    const [planoFim, setPlanoFim] = useState(formatDateForInput(igreja.plano_fim))
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const fd = new FormData()
        fd.set('valor_mensal', valorMensal)
        fd.set('plano_inicio', planoInicio)
        fd.set('plano_fim', planoFim)
        const res = await atualizarBilling(igreja.id, fd)
        setLoading(false)
        if (res.error) setMsg({ type: 'err', text: res.error })
        else {
            setMsg({ type: 'ok', text: res.message || 'Guardado!' })
            router.refresh()
            setTimeout(onClose, 1000)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Facturacao</p>
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">{igreja.nome}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#222] text-gray-400 hover:text-white transition-all">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Valor Mensal (EUR)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valorMensal}
                            onChange={e => setValorMensal(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Inicio do Plano</label>
                            <input
                                type="date"
                                value={planoInicio}
                                onChange={e => setPlanoInicio(e.target.value)}
                                className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Fim do Plano</label>
                            <input
                                type="date"
                                value={planoFim}
                                onChange={e => setPlanoFim(e.target.value)}
                                className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {msg && (
                        <div className={`text-xs font-black uppercase p-3 rounded-xl ${msg.type === 'ok' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                            {msg.text}
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar
                    </button>
                </form>
            </div>
        </div>
    )
}

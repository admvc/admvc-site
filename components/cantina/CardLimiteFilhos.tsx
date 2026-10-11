'use client'

import { useState, useEffect } from 'react'
import { Shield, Pencil, Check, X, Loader2 } from 'lucide-react'
import { obterLimitesFilhos, definirLimiteCantina } from '@/actions/cantina-local-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Familiar {
    id: number
    first_name: string
    last_name: string
    limite_diario: number | null
    limite_semanal: number | null
}

export default function CardLimiteFilhos() {
    const [filhos, setFilhos] = useState<Familiar[]>([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()
    const [editando, setEditando] = useState<number | null>(null)
    const [diario, setDiario] = useState('')
    const [semanal, setSemanal] = useState('')
    const [salvando, setSalvando] = useState(false)

    async function carregar() {
        setLoading(true)
        const data = await obterLimitesFilhos()
        setFilhos(data)
        setLoading(false)
    }

    useEffect(() => { carregar() }, [])

    function iniciarEdicao(f: Familiar) {
        setEditando(f.id)
        setDiario(f.limite_diario?.toString() || '')
        setSemanal(f.limite_semanal?.toString() || '')
    }

    async function salvar(membroId: number) {
        setSalvando(true)
        const ld = diario.trim() ? parseFloat(diario) : null
        const ls = semanal.trim() ? parseFloat(semanal) : null
        const res = await definirLimiteCantina(membroId, ld, ls)
        if (res.error) toast(res.error, 'erro')
        else { setEditando(null); await carregar() }
        setSalvando(false)
    }

    if (loading) return null
    if (filhos.length === 0) return null

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Shield size={16} className="text-figueira" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Limites Cantina (Familia)</span>
            </div>

            <div className="space-y-2">
                {filhos.map(f => (
                    <div key={f.id} className="bg-bg border border-soft rounded-xl px-4 py-3">
                        {editando === f.id ? (
                            <div className="space-y-3">
                                <p className="text-[10px] font-black uppercase text-fg">{f.first_name} {f.last_name}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted">Limite Diario (€)</label>
                                        <input
                                            type="number"
                                            step="0.50"
                                            min="0"
                                            value={diario}
                                            onChange={e => setDiario(e.target.value)}
                                            placeholder="Sem limite"
                                            className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-xs font-bold text-fg focus:border-figueira outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted">Limite Semanal (€)</label>
                                        <input
                                            type="number"
                                            step="0.50"
                                            min="0"
                                            value={semanal}
                                            onChange={e => setSemanal(e.target.value)}
                                            placeholder="Sem limite"
                                            className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-xs font-bold text-fg focus:border-figueira outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => salvar(f.id)}
                                        disabled={salvando}
                                        className="flex items-center gap-1 bg-figueira text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                                    >
                                        {salvando ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => setEditando(null)}
                                        className="flex items-center gap-1 text-muted hover:text-fg text-[9px] font-black uppercase tracking-widest"
                                    >
                                        <X size={10} /> Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-fg">{f.first_name} {f.last_name}</p>
                                    <p className="text-[9px] text-muted mt-0.5">
                                        {f.limite_diario || f.limite_semanal ? (
                                            <>
                                                {f.limite_diario && <span>Diario: {f.limite_diario.toFixed(2)}€</span>}
                                                {f.limite_diario && f.limite_semanal && <span> · </span>}
                                                {f.limite_semanal && <span>Semanal: {f.limite_semanal.toFixed(2)}€</span>}
                                            </>
                                        ) : (
                                            <span className="italic">Sem limite definido</span>
                                        )}
                                    </p>
                                </div>
                                <button
                                    onClick={() => iniciarEdicao(f)}
                                    className="text-muted hover:text-figueira transition-colors"
                                    title="Editar limites"
                                >
                                    <Pencil size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

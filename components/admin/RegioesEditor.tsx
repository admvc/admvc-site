'use client'

import { useState } from 'react'
import { Plus, X, Save, Loader2, MapPin } from 'lucide-react'
import { salvarRegioesAction } from '@/actions/admin-actions'

export default function RegioesEditor({ regioesIniciais }: { regioesIniciais: string[] }) {
    const [regioes, setRegioes] = useState(regioesIniciais)
    const [nova, setNova] = useState('')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    function adicionar() {
        const nome = nova.trim()
        if (!nome || regioes.includes(nome)) return
        setRegioes([...regioes, nome])
        setNova('')
    }

    function remover(idx: number) {
        setRegioes(regioes.filter((_, i) => i !== idx))
    }

    async function guardar() {
        setSaving(true)
        const res = await salvarRegioesAction(regioes)
        setSaving(false)
        setMsg(res.ok ? 'Guardado!' : 'Erro')
        setTimeout(() => setMsg(''), 3000)
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {regioes.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 bg-bg border border-soft px-3 py-2 rounded-xl group hover:border-red-500/30 transition-all">
                        <MapPin size={10} className="text-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fg">{r}</span>
                        <button onClick={() => remover(i)} className="text-muted/30 hover:text-red-500 transition-colors">
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex gap-2">
                <input type="text" value={nova} onChange={e => setNova(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionar())}
                    placeholder="Nova regiao..."
                    className="flex-1 bg-bg border border-soft rounded-xl px-3 py-2 text-sm font-bold text-fg outline-none focus:border-figueira placeholder:text-muted/30" />
                <button onClick={adicionar} disabled={!nova.trim()}
                    className="px-3 py-2 rounded-xl bg-figueira text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-figueira/90 transition-all">
                    <Plus size={12} />
                </button>
                <button onClick={guardar} disabled={saving}
                    className="px-4 py-2 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-figueira transition-all flex items-center gap-1.5">
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                    Guardar
                </button>
            </div>

            {msg && <p className="text-[9px] font-bold text-emerald-500">{msg}</p>}
        </div>
    )
}

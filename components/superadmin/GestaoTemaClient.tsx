'use client'

import { useState } from 'react'
import { atualizarTemaIgreja } from '@/actions/super-admin-actions'
import { Palette, Check, Loader2, RotateCcw } from 'lucide-react'

const PRESETS = [
    { nome: 'Figueira', primaria: '#3F6B4F', secundaria: '#7FAE93', fundo: '#0b0d0c', preview: 'from-[#3F6B4F] to-[#0b0d0c]' },
    { nome: 'Oceano', primaria: '#2563EB', secundaria: '#60A5FA', fundo: '#0A0F1A', preview: 'from-[#2563EB] to-[#0A0F1A]' },
    { nome: 'Vinho', primaria: '#7C3AED', secundaria: '#A78BFA', fundo: '#0D0A14', preview: 'from-[#7C3AED] to-[#0D0A14]' },
    { nome: 'Ouro', primaria: '#D97706', secundaria: '#FCD34D', fundo: '#0F0C07', preview: 'from-[#D97706] to-[#0F0C07]' },
    { nome: 'Noite', primaria: '#6B7280', secundaria: '#9CA3AF', fundo: '#09090B', preview: 'from-[#6B7280] to-[#09090B]' },
    { nome: 'Coral', primaria: '#E11D48', secundaria: '#FB7185', fundo: '#0F0A0C', preview: 'from-[#E11D48] to-[#0F0A0C]' },
]

interface Props {
    tenant: {
        id: number
        nome: string
        slug: string
        cor_primaria: string
        cor_secundaria: string
        cor_fundo: string
        logo_url: string | null
    }
}

export default function GestaoTemaClient({ tenant }: Props) {
    const [primaria, setPrimaria] = useState(tenant.cor_primaria)
    const [secundaria, setSecundaria] = useState(tenant.cor_secundaria)
    const [fundo, setFundo] = useState(tenant.cor_fundo)
    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)

    async function handleSave() {
        setLoading(true)
        setSaved(false)
        const fd = new FormData()
        fd.set('tenantId', String(tenant.id))
        fd.set('cor_primaria', primaria)
        fd.set('cor_secundaria', secundaria)
        fd.set('cor_fundo', fundo)
        const res = await atualizarTemaIgreja(fd)
        setLoading(false)
        if (res.success) setSaved(true)
    }

    function applyPreset(preset: typeof PRESETS[0]) {
        setPrimaria(preset.primaria)
        setSecundaria(preset.secundaria)
        setFundo(preset.fundo)
        setSaved(false)
    }

    function resetToOriginal() {
        setPrimaria(tenant.cor_primaria)
        setSecundaria(tenant.cor_secundaria)
        setFundo(tenant.cor_fundo)
        setSaved(false)
    }

    const hasChanges = primaria !== tenant.cor_primaria || secundaria !== tenant.cor_secundaria || fundo !== tenant.cor_fundo

    return (
        <div className="space-y-8">

            {/* PRESETS */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    <Palette size={14} /> Presets de Tema
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {PRESETS.map(preset => {
                        const isActive = primaria === preset.primaria && secundaria === preset.secundaria && fundo === preset.fundo
                        return (
                            <button key={preset.nome} onClick={() => applyPreset(preset)}
                                className={`relative p-4 rounded-xl border transition-all text-center space-y-2 ${
                                    isActive
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : 'border-[#333] hover:border-[#555] bg-[#111]'
                                }`}>
                                <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${preset.preview}`} />
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">{preset.nome}</p>
                                {isActive && (
                                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                        <Check size={10} className="text-white" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* COLOR PICKERS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ColorField label="Cor Primaria" value={primaria} onChange={v => { setPrimaria(v); setSaved(false) }} />
                <ColorField label="Cor Secundaria" value={secundaria} onChange={v => { setSecundaria(v); setSaved(false) }} />
                <ColorField label="Cor de Fundo" value={fundo} onChange={v => { setFundo(v); setSaved(false) }} />
            </section>

            {/* PREVIEW */}
            <section className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Preview</h2>
                <div className="rounded-2xl border border-[#333] overflow-hidden" style={{ backgroundColor: fundo }}>
                    {/* Simulated header */}
                    <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: `${primaria}30`, backgroundColor: `${fundo}` }}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: primaria }}>
                                <span className="text-white text-xs font-black">{tenant.nome[0]}</span>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: primaria }}>{tenant.nome}</p>
                                <p className="text-sm font-black italic uppercase tracking-tighter" style={{ color: '#e6efea' }}>
                                    Dashboard
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg border flex items-center justify-center" style={{ borderColor: `${primaria}40`, color: secundaria }}>
                                <span className="text-xs">N</span>
                            </div>
                        </div>
                    </div>
                    {/* Simulated content */}
                    <div className="p-6 flex gap-4">
                        <div className="flex-1 rounded-xl border p-4" style={{ borderColor: `${primaria}20`, backgroundColor: `${primaria}08` }}>
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: primaria }}>Membros</p>
                            <p className="text-2xl font-black italic" style={{ color: '#e6efea' }}>128</p>
                        </div>
                        <div className="flex-1 rounded-xl border p-4" style={{ borderColor: `${secundaria}20` }}>
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: secundaria }}>Eventos</p>
                            <p className="text-2xl font-black italic" style={{ color: '#e6efea' }}>12</p>
                        </div>
                        <div className="flex-1 rounded-xl border p-4" style={{ borderColor: '#333' }}>
                            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Grupos</p>
                            <p className="text-2xl font-black italic" style={{ color: '#e6efea' }}>6</p>
                        </div>
                    </div>
                    {/* Simulated nav tabs */}
                    <div className="border-t px-6 py-3 flex gap-2" style={{ borderColor: `${primaria}20` }}>
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: primaria }}>Home</span>
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest" style={{ color: secundaria }}>Perfil</span>
                        <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest text-zinc-500">Igreja</span>
                    </div>
                </div>
            </section>

            {/* ACTIONS */}
            <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={loading || !hasChanges}
                    className={`px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        hasChanges
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    }`}>
                    {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
                    {loading ? 'A guardar...' : saved ? 'Guardado' : 'Guardar Tema'}
                </button>
                {hasChanges && (
                    <button onClick={resetToOriginal}
                        className="px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-[#222] transition-all flex items-center gap-2 border border-[#333]">
                        <RotateCcw size={14} /> Reverter
                    </button>
                )}
            </div>
        </div>
    )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="bg-[#111] border border-[#222] rounded-xl p-4 space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</label>
            <div className="flex items-center gap-3">
                <input type="color" value={value} onChange={e => onChange(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-[#333] bg-transparent" />
                <input type="text" value={value} onChange={e => onChange(e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-[#333] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 uppercase focus:border-blue-500 outline-none" />
            </div>
            <div className="w-full h-3 rounded-full" style={{ backgroundColor: value }} />
        </div>
    )
}

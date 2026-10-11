'use client'

import { useState, useRef, useMemo } from 'react'
import { atualizarBranding, resetBranding } from '@/actions/branding-actions'
import {
    Palette, Upload, RotateCcw, Save, Loader2, CheckCircle2,
    Image as ImageIcon, LayoutDashboard, Users, Calendar, Bell,
    Home, Shield, LogOut, Settings
} from 'lucide-react'

interface TenantData {
    cor_primaria: string
    cor_secundaria: string
    cor_fundo: string
    logo_url: string | null
    nome: string
    youtube_channel_id: string | null
    instagram_handle: string | null
}

// Helpers para derivar cores (replicam lib/branding.ts no client)
function lighten(hex: string, amount: number) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount)
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount + 2)
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount)
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function isLight(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (r * 299 + g * 587 + b * 114) / 1000 > 128
}

export default function PersonalizacaoClient({ tenant }: { tenant: TenantData }) {
    const [corPrimaria, setCorPrimaria] = useState(tenant.cor_primaria)
    const [corSecundaria, setCorSecundaria] = useState(tenant.cor_secundaria)
    const [corFundo, setCorFundo] = useState(tenant.cor_fundo)
    const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url)
    const [youtubeId, setYoutubeId] = useState(tenant.youtube_channel_id || '')
    const [instaHandle, setInstaHandle] = useState(tenant.instagram_handle || '')
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    // Cores derivadas para o preview
    const preview = useMemo(() => {
        const claro = isLight(corFundo)
        return {
            bg: corFundo,
            bg2: lighten(corFundo, 12),
            border: lighten(corFundo, 20),
            fg: claro ? '#1a1a1a' : '#e6efea',
            muted: claro ? '#6b7280' : '#9ca3af',
            primary: corPrimaria,
            secondary: corSecundaria,
        }
    }, [corPrimaria, corSecundaria, corFundo])

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => setLogoPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setStatus(null)
        const formData = new FormData(e.currentTarget)
        formData.set('cor_primaria', corPrimaria)
        formData.set('cor_secundaria', corSecundaria)
        formData.set('cor_fundo', corFundo)
        formData.set('youtube_channel_id', youtubeId.trim())
        formData.set('instagram_handle', instaHandle.trim().replace(/^@/, ''))
        const res = await atualizarBranding(formData)
        if (res.ok) setStatus({ type: 'success', msg: 'Visual atualizado! Recarregue a pagina para ver.' })
        else setStatus({ type: 'error', msg: res.error || 'Erro ao guardar.' })
        setSaving(false)
        setTimeout(() => setStatus(null), 5000)
    }

    async function handleReset() {
        setSaving(true)
        const res = await resetBranding()
        if (res.ok) {
            setCorPrimaria('#3F6B4F'); setCorSecundaria('#7FAE93'); setCorFundo('#0b0d0c')
            setLogoPreview(null); setYoutubeId(''); setInstaHandle('')
            setStatus({ type: 'success', msg: 'Visual restaurado para o padrao.' })
        }
        setSaving(false)
        setTimeout(() => setStatus(null), 5000)
    }

    return (
        <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in duration-700">

            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Personalizacao</h1>
                <p className="text-xs text-muted">Cores, fundo e logotipo do portal da igreja.</p>
            </header>

            {status && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <CheckCircle2 size={14} /> {status.msg}
                </div>
            )}

            <div className="grid lg:grid-cols-2 gap-8">

                {/* COLUNA ESQUERDA — CONTROLOS */}
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* CORES */}
                    <section className="bg-bg2 border border-soft rounded-2xl p-5 space-y-5">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <Palette size={12} /> Paleta de Cores
                        </h2>

                        <CorPicker label="Cor Primaria" desc="Botoes, links, destaques" value={corPrimaria} onChange={setCorPrimaria} />
                        <CorPicker label="Cor Secundaria" desc="Badges, hover, elementos suporte" value={corSecundaria} onChange={setCorSecundaria} />
                        <CorPicker label="Fundo do Portal" desc="Cor de fundo geral (claro ou escuro)" value={corFundo} onChange={setCorFundo} />
                    </section>

                    {/* LOGOTIPO */}
                    <section className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <ImageIcon size={12} /> Logotipo
                        </h2>

                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl border border-soft bg-bg flex items-center justify-center overflow-hidden shrink-0">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon size={24} className="text-muted/30" />
                                )}
                            </div>
                            <div className="space-y-2 flex-1">
                                <input ref={fileRef} type="file" name="logo" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="hidden" />
                                <button type="button" onClick={() => fileRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg border border-soft text-[9px] font-black uppercase tracking-widest text-fg hover:border-figueira/30 transition-all">
                                    <Upload size={12} /> Escolher Imagem
                                </button>
                                <p className="text-[8px] text-muted/60">PNG, JPG ou WebP. Max 2MB.</p>
                            </div>
                        </div>
                    </section>

                    {/* REDES SOCIAIS */}
                    <section className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                            Redes Sociais
                        </h2>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-fg block mb-1">YouTube Channel ID</label>
                                <input type="text" value={youtubeId} onChange={e => setYoutubeId(e.target.value)}
                                    placeholder="UCxxxxx..."
                                    className="w-full bg-bg border border-soft rounded-lg px-3 py-2 text-xs text-fg outline-none focus:border-figueira placeholder:text-muted/30" />
                                <p className="text-[8px] text-muted/60 mt-1">Encontra o ID do canal nas definicoes do YouTube.</p>
                            </div>
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-fg block mb-1">Instagram</label>
                                <input type="text" value={instaHandle} onChange={e => setInstaHandle(e.target.value)}
                                    placeholder="@igrejaxyz"
                                    className="w-full bg-bg border border-soft rounded-lg px-3 py-2 text-xs text-fg outline-none focus:border-figueira placeholder:text-muted/30" />
                                <p className="text-[8px] text-muted/60 mt-1">Nome de utilizador do Instagram (com ou sem @).</p>
                            </div>
                        </div>
                    </section>

                    {/* ACCOES */}
                    <div className="flex gap-3">
                        <button type="button" onClick={handleReset} disabled={saving}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-bg2 border border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:text-red-400 hover:border-red-500/30 transition-all disabled:opacity-50">
                            <RotateCcw size={12} /> Restaurar
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-50 shadow-sm">
                            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar Alteracoes
                        </button>
                    </div>
                </form>

                {/* COLUNA DIREITA — PREVIEW LIVE */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                        <LayoutDashboard size={12} /> Pre-visualizacao em tempo real
                    </p>

                    {/* MINI DASHBOARD */}
                    <div className="rounded-2xl border overflow-hidden shadow-lg" style={{ borderColor: preview.border, backgroundColor: preview.bg }}>

                        {/* MINI SIDEBAR + CONTENT */}
                        <div className="flex" style={{ minHeight: 320 }}>

                            {/* MINI SIDEBAR */}
                            <div className="w-14 shrink-0 flex flex-col items-center gap-1 py-3 border-r" style={{ backgroundColor: preview.bg2, borderColor: preview.border }}>
                                {/* Logo */}
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 overflow-hidden" style={{ backgroundColor: preview.primary }}>
                                    {logoPreview ? (
                                        <img src={logoPreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <Shield size={12} color="#fff" />
                                    )}
                                </div>
                                {[LayoutDashboard, Users, Home, Calendar, Settings].map((Icon, i) => (
                                    <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                                        style={{
                                            backgroundColor: i === 0 ? `${preview.primary}20` : 'transparent',
                                            color: i === 0 ? preview.primary : preview.muted,
                                        }}>
                                        <Icon size={13} />
                                    </div>
                                ))}
                                <div className="flex-1" />
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ color: '#ef4444' }}>
                                    <LogOut size={13} />
                                </div>
                            </div>

                            {/* MINI CONTENT */}
                            <div className="flex-1 p-4 space-y-3">

                                {/* HEADER */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="h-2.5 rounded-full w-28" style={{ backgroundColor: preview.fg }} />
                                        <div className="h-1.5 rounded-full w-16 mt-1.5" style={{ backgroundColor: preview.muted, opacity: 0.5 }} />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: preview.bg2, border: `1px solid ${preview.border}` }}>
                                            <Bell size={10} style={{ color: preview.muted }} />
                                        </div>
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
                                            <LogOut size={10} />
                                        </div>
                                    </div>
                                </div>

                                {/* KPIs */}
                                <div className="grid grid-cols-3 gap-2">
                                    {['Membros', 'Eventos', 'Escalas'].map((label, i) => (
                                        <div key={label} className="rounded-lg p-2" style={{ backgroundColor: preview.bg2, border: `1px solid ${preview.border}` }}>
                                            <div className="h-1 rounded-full w-10 mb-1.5" style={{ backgroundColor: preview.muted, opacity: 0.4 }} />
                                            <div className="text-sm font-black" style={{ color: preview.fg }}>{[42, 8, 15][i]}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* CARDS */}
                                <div className="space-y-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="rounded-lg p-2.5 flex items-center gap-2.5" style={{ backgroundColor: preview.bg2, border: `1px solid ${preview.border}` }}>
                                            <div className="w-6 h-6 rounded-md shrink-0" style={{ backgroundColor: i === 1 ? preview.primary : `${preview.primary}20` }}>
                                                {i === 1 && <Calendar size={10} style={{ color: '#fff', margin: '4px auto' }} />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-1.5 rounded-full w-20" style={{ backgroundColor: preview.fg, opacity: 0.8 }} />
                                                <div className="h-1 rounded-full w-14 mt-1" style={{ backgroundColor: preview.muted, opacity: 0.3 }} />
                                            </div>
                                            <div className="px-2 py-0.5 rounded text-[6px] font-bold" style={{ backgroundColor: `${preview.primary}15`, color: preview.primary, border: `1px solid ${preview.primary}30` }}>
                                                {['Hoje', 'Dom', 'Qua'][i - 1]}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* BOTAO */}
                                <div className="flex gap-2">
                                    <div className="flex-1 py-2 rounded-lg text-center text-[7px] font-black uppercase" style={{ backgroundColor: preview.primary, color: '#fff' }}>
                                        Botao Primario
                                    </div>
                                    <div className="px-3 py-2 rounded-lg text-center text-[7px] font-black uppercase" style={{ backgroundColor: preview.bg2, color: preview.muted, border: `1px solid ${preview.border}` }}>
                                        Secundario
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-[8px] text-muted/60 text-center">
                        As cores adaptam-se automaticamente — fundo claro gera texto escuro e vice-versa.
                    </p>
                </div>
            </div>
        </main>
    )
}

function CorPicker({ label, desc, value, onChange }: { label: string; desc: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-4">
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
                className="w-10 h-10 rounded-xl border border-soft cursor-pointer shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-fg">{label}</p>
                    <input type="text" value={value} onChange={e => onChange(e.target.value)}
                        className="w-20 bg-bg border border-soft rounded-lg px-2 py-1 text-[9px] font-mono text-fg outline-none focus:border-figueira"
                        maxLength={7} />
                </div>
                <p className="text-[8px] text-muted/60 mt-0.5">{desc}</p>
            </div>
        </div>
    )
}

'use client'

// Personalizacao do portal: o TEMA (um so para todo o portal: "Verde" ou
// "LouveApp"; claro/escuro segue o telemovel de cada pessoa), o logotipo e as
// redes sociais. As cores dos temas estao em app/globals.css.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Image as ImageIcon, Loader2, RotateCcw, Upload } from 'lucide-react'
import { atualizarBranding, resetBranding } from '@/actions/branding-actions'
import type { Tema } from '@/lib/branding'

interface TenantData {
    tema: Tema
    logo_url: string | null
    nome: string
    youtube_channel_id: string | null
    instagram_handle: string | null
}

// Amostras (as mesmas cores de app/globals.css), so para a escolha
const AMOSTRAS: Record<Tema, { nome: string; desc: string; claro: string[]; escuro: string[] }> = {
    verde: { nome: 'Verde', desc: 'O verde da ADMVC.', claro: ['#f5f7f6', '#ffffff', '#2f6b47', '#e3efe8'], escuro: ['#0f1311', '#181e1b', '#7fc29b', '#1f3428'] },
    louveapp: { nome: 'LouveApp', desc: 'Azul suave, como o LouveApp.', claro: ['#f4f5fb', '#ffffff', '#3b5590', '#dfe5f8'], escuro: ['#10121a', '#181b26', '#a3b8ee', '#232c47'] },
}

function Amostra({ cores, rotulo }: { cores: string[]; rotulo: string }) {
    const [bg, card, destaque, suave] = cores
    return (
        <span className="block flex-1 rounded-[12px] p-2" style={{ background: bg, border: `1px solid ${suave}` }} aria-hidden>
            <span className="block rounded-[8px] p-2 space-y-1.5" style={{ background: card }}>
                <span className="block h-2 w-3/4 rounded-full" style={{ background: destaque }} />
                <span className="block h-2 w-1/2 rounded-full" style={{ background: suave }} />
                <span className="block h-5 rounded-[6px]" style={{ background: destaque }} />
            </span>
            <span className="mt-1 block text-center text-[12px]" style={{ color: destaque }}>{rotulo}</span>
        </span>
    )
}

export default function PersonalizacaoClient({ tenant }: { tenant: TenantData }) {
    const router = useRouter()
    const [tema, setTema] = useState<Tema>(tenant.tema)
    const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url)
    const [youtubeId, setYoutubeId] = useState(tenant.youtube_channel_id || '')
    const [instaHandle, setInstaHandle] = useState(tenant.instagram_handle || '')
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setLogoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true); setStatus(null)
        const formData = new FormData(e.currentTarget)
        formData.set('tema', tema)
        formData.set('youtube_channel_id', youtubeId.trim())
        formData.set('instagram_handle', instaHandle.trim().replace(/^@/, ''))
        const res = await atualizarBranding(formData)
        setStatus(res.ok ? { ok: true, msg: 'Guardado. O tema já está aplicado.' } : { ok: false, msg: res.error || 'Erro ao guardar.' })
        setSaving(false)
        if (res.ok) router.refresh()
    }

    async function handleReset() {
        setSaving(true)
        const res = await resetBranding()
        if (res.ok) {
            setTema('verde'); setLogoPreview(null); setYoutubeId(''); setInstaHandle('')
            setStatus({ ok: true, msg: 'Reposto: tema Verde, sem logotipo.' })
            router.refresh()
        }
        setSaving(false)
    }

    return (
        <main className="app-novo mx-auto max-w-2xl px-4 py-6 md:py-10 space-y-6">
            <header>
                <h1 className="text-[24px] font-bold leading-tight">Personalização</h1>
                <p className="text-[16px] a-suave">O tema, o logotipo e as redes sociais do portal de {tenant.nome}.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
                <section className="a-card p-4 space-y-3" aria-labelledby="tema">
                    <h2 id="tema" className="text-[19px] font-bold">Tema</h2>
                    <p className="text-[15px] a-suave">Um só tema para todo o portal. Cada pessoa vê a versão clara ou escura conforme o seu telemóvel.</p>
                    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tema">
                        {(Object.keys(AMOSTRAS) as Tema[]).map((t) => {
                            const a = AMOSTRAS[t]
                            const sim = tema === t
                            return (
                                <button key={t} type="button" role="radio" aria-checked={sim} onClick={() => setTema(t)}
                                    className="a-card a-foco p-3 text-left space-y-2"
                                    style={sim ? { borderColor: 'var(--a-destaque)', boxShadow: '0 0 0 2px var(--a-destaque)' } : undefined}>
                                    <span className="flex items-center justify-between">
                                        <span>
                                            <span className="block text-[17px] font-bold">{a.nome}</span>
                                            <span className="block text-[14px] a-suave">{a.desc}</span>
                                        </span>
                                        {sim && <Check size={22} style={{ color: 'var(--a-destaque)' }} aria-hidden />}
                                    </span>
                                    <span className="flex gap-2">
                                        <Amostra cores={a.claro} rotulo="Claro" />
                                        <Amostra cores={a.escuro} rotulo="Escuro" />
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </section>

                <section className="a-card p-4 space-y-3" aria-labelledby="logo">
                    <h2 id="logo" className="text-[19px] font-bold">Logotipo</h2>
                    <div className="flex items-center gap-4">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-bg)' }}>
                            {logoPreview ? <img src={logoPreview} alt="Logotipo" className="h-full w-full object-contain" /> : <ImageIcon size={24} className="a-suave" aria-hidden />}
                        </span>
                        <span className="space-y-1">
                            <input ref={fileRef} type="file" name="logo" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} className="hidden" />
                            <button type="button" onClick={() => fileRef.current?.click()} className="a-botao a-botao-secundario !min-h-[44px]">
                                <Upload size={18} aria-hidden /> Escolher imagem
                            </button>
                            <span className="block text-[14px] a-suave">PNG, JPG ou WebP, até 2 MB.</span>
                        </span>
                    </div>
                </section>

                <section className="a-card p-4 space-y-3" aria-labelledby="redes">
                    <h2 id="redes" className="text-[19px] font-bold">Redes sociais</h2>
                    <label className="block space-y-1">
                        <span className="text-[15px] font-semibold">ID do canal de YouTube</span>
                        <input value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="UCxxxxx…" className={campo} style={estilo} />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-[15px] font-semibold">Instagram</span>
                        <input value={instaHandle} onChange={(e) => setInstaHandle(e.target.value)} placeholder="@igreja" className={campo} style={estilo} />
                    </label>
                </section>

                {status && (
                    <p role="status" className="text-[15px] font-semibold" style={{ color: status.ok ? 'var(--a-ok)' : 'var(--a-erro)' }}>{status.msg}</p>
                )}

                <div className="flex gap-3">
                    <button type="button" onClick={handleReset} disabled={saving} className="a-botao a-botao-secundario">
                        <RotateCcw size={18} aria-hidden /> Repor
                    </button>
                    <button type="submit" disabled={saving} className="a-botao a-botao-principal flex-1">
                        {saving && <Loader2 size={18} className="animate-spin" aria-hidden />} Guardar
                    </button>
                </div>
            </form>
        </main>
    )
}

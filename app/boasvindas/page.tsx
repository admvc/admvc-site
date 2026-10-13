'use client'

import { useState } from 'react'
import { Heart, Send, Loader2, CheckCircle2, Church, Coffee, Globe, Play } from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function BoasVindasPage() {
    const toast = useToast()
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [pedido, setPedido] = useState('')
    const [enviado, setEnviado] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [consentimento, setConsentimento] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!nome.trim() || !telefone.trim() || !consentimento) return

        setEnviando(true)
        try {
            const res = await fetch('/api/public/visitante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nome.trim(), telefone: telefone.trim(), pedido_oracao: pedido.trim() || null, consentimento })
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao enviar. Tente novamente.', 'erro')
            } else {
                setEnviado(true)
            }
        } catch {
            toast('Erro de ligacao. Verifique a internet e tente novamente.', 'erro')
        }
        setEnviando(false)
    }

    if (enviado) {
        return (
            <main className="min-h-screen bg-bg flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-figueira/10 rounded-3xl flex items-center justify-center mx-auto">
                        <CheckCircle2 size={40} className="text-figueira" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-fg">
                            Bem-vindo, {nome.split(' ')[0]}!
                        </h1>
                        <p className="text-sm text-muted leading-relaxed">
                            Que alegria ter-te connosco! A tua presenca e uma bencao para toda a nossa familia.
                        </p>
                    </div>

                    <div className="bg-bg2 border border-soft rounded-2xl p-6 space-y-3">
                        <p className="text-xs text-muted font-bold">Versiculo do dia</p>
                        <p className="text-base text-muted leading-relaxed">
                            "Porque onde estiverem dois ou tres reunidos em meu nome, ali eu estou no meio deles."
                        </p>
                        <p className="text-[14px] text-muted font-bold uppercase tracking-wide">Mateus 18:20</p>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                        <Coffee size={24} className="text-amber-400 shrink-0" />
                        <div className="text-left">
                            <p className="text-sm font-bold text-amber-300">Mimo Especial</p>
                            <p className="text-xs text-amber-200/60 mt-0.5">
                                Passa pela cantina e diz que es visitante — temos um mimo preparado para ti!
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <a href="https://www.igrejaadmvc.org" target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-bg2 border border-soft hover:border-emerald-500/40 text-fg py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all active:scale-95">
                            <Globe size={16} className="text-figueira" />
                            Site Oficial
                        </a>
                        <a href="https://www.youtube.com/watch?v=rHNERaeiZPs&t=12s" target="_blank" rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-2 bg-bg2 border border-soft hover:border-red-500/40 text-fg py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wide transition-all active:scale-95">
                            <Play size={16} className="text-red-400" />
                            Conhece-nos
                        </a>
                    </div>

                    <p className="text-[14px] text-muted uppercase tracking-wide font-bold">
                        ADMVC — Se muito bem-vindo, fica para sempre!
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="max-w-md w-full space-y-8 animate-in fade-in duration-700">

                <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-bg2 border border-soft rounded-2xl flex items-center justify-center mx-auto">
                        <Church size={28} className="text-figueira" />
                    </div>
                    <h1 className="text-3xl font-bold text-fg">
                        Boas-Vindas
                    </h1>
                    <p className="text-sm text-muted">
                        E uma alegria receber-te! Preenche os teus dados para que possamos acompanhar-te.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold uppercase tracking-wide text-muted">Nome completo</label>
                        <input type="text" value={nome} onChange={e => setNome(e.target.value)} required
                            placeholder="O teu nome"
                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3.5 text-sm font-bold text-fg outline-none focus:border-figueira placeholder:text-muted transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold uppercase tracking-wide text-muted">Telefone / WhatsApp</label>
                        <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} required
                            placeholder="+351 912 345 678"
                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3.5 text-sm font-bold text-fg outline-none focus:border-figueira placeholder:text-muted transition-all" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-bold uppercase tracking-wide text-muted">Pedido de oracao (opcional)</label>
                        <textarea value={pedido} onChange={e => setPedido(e.target.value)} rows={3}
                            placeholder="Se quiseres partilhar um pedido de oracao..."
                            className="w-full bg-bg2 border border-soft rounded-xl px-4 py-3.5 text-sm font-bold text-fg outline-none focus:border-figueira placeholder:text-muted resize-none transition-all" />
                    </div>

                    <div className="rounded-xl border border-soft bg-bg2 p-4 space-y-3">
                        <p className="text-xs leading-relaxed text-muted">
                            Usamos estes dados só para te acolher e contactar. Quem os vê é a equipa de acolhimento.
                            Guardamo-los até 12 meses sem visitas; o pedido de oração, 3 meses.{' '}
                            <a href="/privacidade" className="underline text-fg">Política de privacidade</a>
                        </p>
                        <label className="flex items-start gap-3 text-xs font-bold text-fg">
                            <input type="checkbox" checked={consentimento} onChange={e => setConsentimento(e.target.checked)} required
                                className="mt-0.5 h-4 w-4 shrink-0 accent-figueira" />
                            Aceito que a igreja guarde estes dados (incluindo o pedido de oração, se o escrever) para me contactar.
                        </label>
                    </div>

                    <button type="submit" disabled={enviando || !nome.trim() || !telefone.trim() || !consentimento}
                        className="w-full flex items-center justify-center gap-3 bg-figueira text-white py-4 rounded-xl font-bold text-[14px] uppercase tracking-wide hover:bg-figueira/90 transition-all disabled:opacity-50 shadow-sm active:scale-95">
                        {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        {enviando ? 'A enviar...' : 'Enviar'}
                    </button>
                </form>

                <p className="text-center text-[13px] text-muted uppercase tracking-wide font-bold">
                    ADMVC — Assembleia de Deus Ministerio Visao de Conquista
                </p>
            </div>
        </main>
    )
}

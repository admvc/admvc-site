'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle2, Church, Coffee, Globe, Play } from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function BoasVindasPage() {
    const toast = useToast()
    const [nome, setNome] = useState('')
    const [telefone, setTelefone] = useState('')
    const [pedido, setPedido] = useState('')
    const [enviado, setEnviado] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [consentimento, setConsentimento] = useState(false)
    const [falta, setFalta] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        // O botao esta sempre ativo: diz o que falta (um botao apagado nao explica nada)
        const emFalta = !nome.trim() ? 'Escreve o teu nome.'
            : !telefone.trim() ? 'Escreve o teu telefone.'
            : !consentimento ? 'Marca a autorização no fim do formulário.'
            : null
        setFalta(emFalta)
        if (emFalta) return

        setEnviando(true)
        try {
            const res = await fetch('/api/public/visitante', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome: nome.trim(), telefone: telefone.trim(), pedido_oracao: pedido.trim() || null, consentimento })
            })
            const data = await res.json()
            if (!res.ok) {
                toast(data.error || 'Erro ao enviar. Tenta novamente.', 'erro')
            } else {
                setEnviado(true)
            }
        } catch {
            toast('Erro de ligação. Verifica a internet e tenta novamente.', 'erro')
        }
        setEnviando(false)
    }

    const campo = 'a-foco w-full rounded-[14px] border px-4 text-[17px]'
    const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    if (enviado) {
        return (
            <main className="app-novo flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-md space-y-5 text-center">
                    <CheckCircle2 size={56} className="mx-auto" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                    <div className="space-y-2">
                        <h1 className="text-[28px] font-bold leading-tight">Bem-vindo, {nome.split(' ')[0]}!</h1>
                        <p className="text-[17px] a-suave">Que alegria ter-te connosco! A tua presença é uma bênção para toda a nossa família.</p>
                    </div>

                    <div className="a-card space-y-1 p-4 text-left">
                        <p className="text-[17px] font-semibold">E agora?</p>
                        <p className="text-[16px] a-suave">A equipa de acolhimento recebeu os teus dados e vai entrar em contacto contigo pelo telefone que deixaste.</p>
                    </div>

                    <div className="a-card flex items-center gap-4 p-4 text-left">
                        <Coffee size={28} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                        <div>
                            <p className="text-[17px] font-semibold">Mimo especial</p>
                            <p className="text-[16px] a-suave">Passa pela cantina e diz que és visitante: temos um mimo preparado para ti!</p>
                        </div>
                    </div>

                    <div className="a-card space-y-2 p-4">
                        <p className="text-[16px] leading-relaxed">&ldquo;Porque onde estiverem dois ou três reunidos em meu nome, ali eu estou no meio deles.&rdquo;</p>
                        <p className="text-[15px] font-semibold a-suave">Mateus 18:20</p>
                    </div>

                    <div className="flex gap-3">
                        <a href="https://www.igrejaadmvc.org" target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario flex-1">
                            <Globe size={20} aria-hidden /> Site oficial
                        </a>
                        <a href="https://www.youtube.com/watch?v=rHNERaeiZPs&t=12s" target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario flex-1">
                            <Play size={20} aria-hidden /> Conhece-nos
                        </a>
                    </div>

                    <p className="text-[15px] a-suave">ADMVC — Sê muito bem-vindo, fica para sempre!</p>
                </div>
            </main>
        )
    }

    return (
        <main className="app-novo flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-2 text-center">
                    <Church size={40} className="mx-auto" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                    <h1 className="text-[28px] font-bold leading-tight">Boas-vindas</h1>
                    <p className="text-[17px] a-suave">É uma alegria receber-te! Deixa o teu nome e telefone para que a equipa de acolhimento te possa contactar.</p>
                </div>

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="bv-nome" className="block text-[16px] font-semibold">Nome completo</label>
                        <input id="bv-nome" type="text" autoComplete="name" value={nome} onChange={e => { setNome(e.target.value); setFalta(null) }}
                            className={`${campo} min-h-[52px]`} style={estiloCampo} />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="bv-tel" className="block text-[16px] font-semibold">Telefone / WhatsApp</label>
                        <input id="bv-tel" type="tel" autoComplete="tel" inputMode="tel" value={telefone} onChange={e => { setTelefone(e.target.value); setFalta(null) }}
                            className={`${campo} min-h-[52px]`} style={estiloCampo} />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="bv-pedido" className="block text-[16px] font-semibold">
                            Pedido de oração <span className="font-normal a-suave">(se quiseres)</span>
                        </label>
                        <textarea id="bv-pedido" value={pedido} onChange={e => setPedido(e.target.value)} rows={3}
                            className={`${campo} resize-none py-3`} style={estiloCampo} />
                    </div>

                    <div className="a-card space-y-3 p-4">
                        <p className="text-[15px] leading-relaxed a-suave">
                            Usamos estes dados só para te acolher e contactar. Quem os vê é a equipa de acolhimento.
                            Guardamo-los até 12 meses sem visitas; o pedido de oração, 3 meses.{' '}
                            <a href="/privacidade" className="underline" style={{ color: 'var(--a-texto)' }}>Política de privacidade</a>
                        </p>
                        <label className="flex cursor-pointer items-start gap-3 text-[16px] font-semibold">
                            <input type="checkbox" checked={consentimento} onChange={e => { setConsentimento(e.target.checked); setFalta(null) }}
                                className="mt-0.5 h-6 w-6 shrink-0" style={{ accentColor: 'var(--a-destaque)' }} />
                            Aceito que a igreja guarde estes dados (incluindo o pedido de oração, se o escrever) para me contactar.
                        </label>
                    </div>

                    {falta && (
                        <p role="alert" className="rounded-[14px] border px-4 py-3 text-[16px] font-semibold"
                            style={{ borderColor: 'var(--a-erro)', color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                            {falta}
                        </p>
                    )}

                    <button type="submit" disabled={enviando} className="a-botao a-botao-principal w-full !min-h-[60px] !text-[18px] shadow-md">
                        {enviando ? <Loader2 size={22} className="animate-spin" aria-hidden /> : <Send size={22} aria-hidden />}
                        {enviando ? 'A enviar…' : 'Enviar os meus dados'}
                    </button>
                    <p className="text-center text-[15px] a-suave">Depois de enviares, a equipa de acolhimento entra em contacto contigo.</p>
                </form>

                <p className="text-center text-[15px] a-suave">ADMVC — Assembleia de Deus Ministério Visão de Conquista</p>
            </div>
        </main>
    )
}

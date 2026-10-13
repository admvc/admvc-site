'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Loader2, Mail } from 'lucide-react'
import { pedirLinkNovaSenha } from '@/actions/senha-actions'

export default function RecuperarSenhaPage() {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [mensagem, setMensagem] = useState<string | null>(null)

    async function enviar(formData: FormData) {
        setLoading(true)
        setErro(null)
        const r = await pedirLinkNovaSenha(formData)
        setLoading(false)
        if ('error' in r && r.error) setErro(r.error)
        else if ('mensagem' in r) setMensagem(r.mensagem ?? null)
    }

    return (
        <main className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-fg">Esqueci-me da palavra-passe</h1>
                    <p className="text-sm text-muted">Enviamos um link para o seu email. O link vale 1 hora.</p>
                </div>

                {mensagem ? (
                    <div className="bg-bg2 border border-soft p-8 rounded-3xl space-y-4 text-center">
                        <Mail className="mx-auto text-figueira" size={28} />
                        <p className="text-sm text-fg">{mensagem}</p>
                        <Link href="/membros/login" className="inline-block text-sm font-bold text-figueira underline">Voltar ao login</Link>
                    </div>
                ) : (
                    <form action={enviar} className="bg-bg2 border border-soft p-8 rounded-3xl space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-xs font-bold text-fg">Email</label>
                            <input id="email" name="email" type="email" required autoComplete="email"
                                className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira" />
                        </div>
                        {erro && <p role="alert" className="text-sm font-bold text-red-500">{erro}</p>}
                        <button disabled={loading} className="w-full py-4 rounded-2xl font-bold text-sm bg-fg text-bg hover:bg-figueira transition-colors flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="animate-spin" size={16} /> A enviar…</> : 'Enviar link'}
                        </button>
                        <p className="text-center">
                            <Link href="/membros/login" className="text-sm text-muted underline">Voltar ao login</Link>
                        </p>
                    </form>
                )}
            </div>
        </main>
    )
}

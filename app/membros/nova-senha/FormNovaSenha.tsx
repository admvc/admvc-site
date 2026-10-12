'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { definirNovaSenha } from '@/actions/senha-actions'

export default function FormNovaSenha({ token, minimo }: { token: string; minimo: number }) {
    const [loading, setLoading] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [feito, setFeito] = useState(false)

    async function enviar(formData: FormData) {
        setLoading(true)
        setErro(null)
        const r = await definirNovaSenha(formData)
        setLoading(false)
        if ('error' in r && r.error) setErro(r.error)
        else setFeito(true)
    }

    if (feito) {
        return (
            <div className="bg-bg2 border border-soft p-8 rounded-3xl space-y-4 text-center">
                <CheckCircle2 className="mx-auto text-figueira" size={28} />
                <p className="text-sm text-fg">Palavra-passe definida. Já pode entrar.</p>
                <Link href="/membros/login" className="inline-block py-3 px-6 rounded-2xl font-bold text-sm bg-fg text-bg">Entrar</Link>
            </div>
        )
    }

    return (
        <form action={enviar} className="bg-bg2 border border-soft p-8 rounded-3xl space-y-5">
            <input type="hidden" name="t" value={token} />
            <div className="space-y-2">
                <label htmlFor="senha" className="text-xs font-bold text-fg">Nova palavra-passe</label>
                <input id="senha" name="senha" type="password" required minLength={minimo} autoComplete="new-password"
                    className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira" />
                <p className="text-xs text-muted">Pelo menos {minimo} caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.</p>
            </div>
            <div className="space-y-2">
                <label htmlFor="confirmacao" className="text-xs font-bold text-fg">Repetir</label>
                <input id="confirmacao" name="confirmacao" type="password" required minLength={minimo} autoComplete="new-password"
                    className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira" />
            </div>
            {erro && <p role="alert" className="text-sm font-bold text-red-500">{erro}</p>}
            <button disabled={loading} className="w-full py-4 rounded-2xl font-bold text-sm bg-fg text-bg hover:bg-figueira transition-colors flex items-center justify-center gap-2">
                {loading ? <><Loader2 className="animate-spin" size={16} /> A guardar…</> : 'Guardar palavra-passe'}
            </button>
        </form>
    )
}

'use client'

import { loginUnificado } from '@/actions/auth-actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation' // Importamos o router
import { LogIn, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false); // Novo estado de sucesso
    const [verSenha, setVerSenha] = useState(false);

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setError(null);

        const res = await loginUnificado(formData);

        if (res?.error) {
            setError(res.error);
            setLoading(false);
            return;
        }

        // Se chegou aqui, o login foi um sucesso
        setLoading(false);
        setSucesso(true);

        // Aguarda 1 segundo para o utilizador ver o "Verdinho" e redireciona
        setTimeout(() => {
            router.push('/membros/dashboard');
        }, 800);
    }

    const campo = 'a-foco min-h-[52px] w-full rounded-[14px] border px-4 text-[17px]'
    const estiloCampo = { background: 'var(--a-bg)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <main className="app-novo flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="space-y-1 text-center">
                    <h1 className="text-[32px] font-bold leading-tight">ADMVC</h1>
                    <p className="text-[17px] a-suave">Entre com o seu email e a sua palavra-passe</p>
                </div>

                <form action={handleSubmit} className="a-card relative space-y-5 overflow-hidden p-6">
                    {/* Linha de progresso no topo quando está a carregar */}
                    {loading && <div className="absolute left-0 top-0 h-1 w-full animate-progress-loading" style={{ background: 'var(--a-destaque)' }} />}

                    <div className="space-y-2">
                        <label htmlFor="login-email" className="block text-[16px] font-semibold">Email</label>
                        <input id="login-email" name="email" type="email" autoComplete="email" inputMode="email" required
                            onChange={() => setError(null)} className={campo} style={estiloCampo} />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="login-senha" className="block text-[16px] font-semibold">Palavra-passe</label>
                        <div className="relative">
                            <input id="login-senha" name="password" type={verSenha ? 'text' : 'password'} autoComplete="current-password" required
                                onChange={() => setError(null)} className={`${campo} pr-24`} style={estiloCampo} />
                            <button type="button" onClick={() => setVerSenha((v) => !v)}
                                className="absolute right-2 top-1/2 flex min-h-[40px] -translate-y-1/2 items-center gap-1 rounded-[10px] px-2 text-[15px] font-semibold"
                                style={{ color: 'var(--a-destaque)' }} aria-pressed={verSenha}>
                                {verSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                                {verSenha ? 'Esconder' : 'Mostrar'}
                            </button>
                        </div>
                        <div className="text-right">
                            <Link href="/membros/recuperar" className="inline-block py-2 text-[16px] font-semibold underline" style={{ color: 'var(--a-destaque)' }}>
                                Esqueci-me da palavra-passe
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <p role="alert" className="rounded-[14px] border px-4 py-3 text-[16px] font-semibold"
                            style={{ borderColor: 'var(--a-erro)', color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                            {error}
                        </p>
                    )}

                    <button disabled={loading || sucesso} className="a-botao a-botao-principal w-full !min-h-[56px] text-[17px]">
                        {loading && <><Loader2 className="animate-spin" size={20} aria-hidden /> A verificar…</>}
                        {sucesso && <><CheckCircle2 size={20} aria-hidden /> A entrar…</>}
                        {!loading && !sucesso && <><LogIn size={20} aria-hidden /> Entrar</>}
                    </button>
                </form>

                <p className="text-center">
                    <Link href="/privacidade" className="text-[16px] underline a-suave">Política de privacidade</Link>
                </p>
            </div>
        </main>
    )
}

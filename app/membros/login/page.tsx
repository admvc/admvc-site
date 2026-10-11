'use client'

import { loginUnificado } from '@/actions/auth-actions'
import { useState } from 'react'
import { useRouter } from 'next/navigation' // Importamos o router
import { LogIn, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false); // Novo estado de sucesso

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

    return (
        <main className="min-h-screen bg-bg flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        ADMVC <span className="text-figueira">Acesso.</span>
                    </h1>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.3em]">Gestão Unificada</p>
                </div>

                <form action={handleSubmit} className="bg-bg2 border border-soft p-10 rounded-[4rem] shadow-2xl space-y-6 relative overflow-hidden">

                    {/* Linha de progresso no topo quando está a carregar */}
                    {loading && <div className="absolute top-0 left-0 h-1 bg-figueira animate-progress-loading w-full"></div>}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">E-mail</label>
                            <input name="email" type="email" onChange={() => setError(null)} required className="w-full bg-bg border border-soft rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-figueira transition-all" placeholder="exemplo@igreja.pt" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Palavra-passe</label>
                            <input name="password" type="password" onChange={() => setError(null)} required className="w-full bg-bg border border-soft rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-figueira transition-all" placeholder="••••••••" />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-500 bg-red-500/10 py-3 rounded-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    <button
                        disabled={loading || sucesso}
                        className={`
        relative w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 active:scale-95
        ${loading ? 'bg-muted text-bg cursor-wait' : ''}
        ${sucesso ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-[1.02]' : 'bg-fg text-bg hover:bg-figueira shadow-xl'}
        ${!loading && !sucesso ? 'hover:-translate-y-1' : ''}
    `}
                    >
                        {/* ESTADO 1: CARREGANDO (O Círculo Rodando) */}
                        {loading && (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                <span>A verificar...</span>
                            </>
                        )}

                        {/* ESTADO 2: SUCESSO (Verdinho) */}
                        {sucesso && (
                            <>
                                <CheckCircle2 size={18} className="animate-in zoom-in duration-300" />
                                <span>Acesso Autorizado</span>
                            </>
                        )}

                        {/* ESTADO 3: PADRÃO (Antes de clicar) */}
                        {!loading && !sucesso && (
                            <>
                                <LogIn size={18} />
                                <span>Entrar no Sistema</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="flex justify-center gap-2 items-center text-[9px] font-bold text-muted uppercase tracking-widest opacity-50">
                    <ShieldCheck size={12} /> Conexão Segura SSL
                </div>
            </div>
        </main>
    )
}
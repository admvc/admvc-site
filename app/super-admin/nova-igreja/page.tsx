'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarNovaIgreja } from '@/actions/super-admin-actions'
import { PlusCircle, Loader2, CheckCircle2, Building, Shield, Zap, Star, Sparkles } from 'lucide-react'

const PLANOS_OPCOES = [
    { id: 'FREE', nome: 'Gratuito', icon: Shield, cor: 'zinc' },
    { id: 'BASIC', nome: 'Basico', icon: Zap, cor: 'blue' },
    { id: 'PRO', nome: 'Profissional', icon: Star, cor: 'amber' },
    { id: 'ENTERPRISE', nome: 'Empresarial', icon: Sparkles, cor: 'fuchsia' },
] as const

const PLAN_STYLES: Record<string, { bg: string; border: string; text: string; ring: string }> = {
    FREE: { bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', text: 'text-zinc-400', ring: 'ring-zinc-500' },
    BASIC: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', ring: 'ring-blue-500' },
    PRO: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', ring: 'ring-amber-500' },
    ENTERPRISE: { bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', text: 'text-fuchsia-400', ring: 'ring-fuchsia-500' },
}

export default function NovaIgrejaPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'error' | 'success'; msg: string } | null>(null)
    const [plano, setPlano] = useState('PRO')

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setStatus(null)
        formData.set('plano', plano)

        const res = await criarNovaIgreja(formData)

        if (res?.error) {
            setStatus({ type: 'error', msg: res.error })
        } else if (res?.success) {
            setStatus({ type: 'success', msg: res.message! })
            if (res.tenantId) {
                setTimeout(() => router.push(`/super-admin/onboarding/${res.tenantId}`), 1500)
            }
        }

        setLoading(false)
    }

    const inputClass = "w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
    const labelClass = "text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1"

    return (
        <main className="max-w-3xl mx-auto py-10 px-6 lg:px-8 animate-in fade-in duration-700">
            <div className="bg-[#111] border border-[#222] p-8 md:p-10 rounded-2xl space-y-8">

                {/* HEADER */}
                <div className="flex items-center gap-4 border-b border-[#222] pb-6">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400">
                        <Building size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">Nova Organizacao</h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registar nova Igreja e Admin</p>
                    </div>
                </div>

                <form action={handleSubmit} className="space-y-8">

                    {/* PLANO SELECTOR */}
                    <div className="space-y-3">
                        <label className={labelClass}>Plano</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {PLANOS_OPCOES.map(p => {
                                const styles = PLAN_STYLES[p.id]
                                const isSelected = plano === p.id
                                const Icon = p.icon
                                return (
                                    <button key={p.id} type="button" onClick={() => setPlano(p.id)}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            isSelected
                                                ? `${styles.bg} ${styles.border} ring-1 ${styles.ring}`
                                                : 'border-[#333] hover:border-[#555] bg-[#0A0A0A]'
                                        }`}>
                                        <Icon size={16} className={`mx-auto mb-1.5 ${isSelected ? styles.text : 'text-zinc-600'}`} />
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? styles.text : 'text-zinc-500'}`}>
                                            {p.nome}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* DADOS DA IGREJA */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">1. Dados da Igreja</h2>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Nome da Igreja</label>
                                <input name="nomeIgreja" required className={inputClass} placeholder="Ex: Assembleia Central" />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Identificador (Slug)</label>
                                <input name="slug" required className={inputClass} placeholder="Ex: assembleia-central" />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Valor Mensal (EUR)</label>
                                <input name="valorMensal" type="number" step="0.01" min="0" className={inputClass} placeholder="0.00" />
                            </div>
                        </div>

                        {/* DADOS DO ADMIN */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">2. Conta do Administrador</h2>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Nome do Responsavel</label>
                                <input name="adminNome" required className={inputClass} placeholder="Nome do Pastor/Lider" />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>E-mail de Acesso</label>
                                <input name="adminEmail" type="email" required className={inputClass} placeholder="admin@igreja.pt" />
                            </div>

                            <div className="space-y-1.5">
                                <label className={labelClass}>Palavra-passe Provisoria</label>
                                <input name="adminPassword" type="password" required className={inputClass} placeholder="Minimo 6 caracteres" />
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className={`flex items-center gap-2 text-xs font-bold uppercase p-4 rounded-xl ${
                            status.type === 'error' ? 'text-red-400 bg-red-500/10 border border-red-500/20' : 'text-green-400 bg-green-500/10 border border-green-500/20'
                        }`}>
                            <CheckCircle2 size={16} />
                            {status.msg}
                            {status.type === 'success' && <span className="text-zinc-500 ml-auto text-[9px]">A redirecionar para onboarding...</span>}
                        </div>
                    )}

                    <button disabled={loading}
                        className={`w-full py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                            loading
                                ? 'bg-zinc-700 text-zinc-400 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}>
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                        {loading ? 'A processar...' : 'Criar Igreja e Gerar Acesso'}
                    </button>
                </form>
            </div>
        </main>
    )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Building, MapPin, Users, UserCog, CheckCircle2,
    Loader2, Plus, Palette, ArrowRight, ArrowLeft,
    Globe, ToggleLeft, ToggleRight, ExternalLink
} from 'lucide-react'
import {
    atualizarBrandingIgreja,
    criarCongregacaoSA,
    criarDepartamentoSA,
    atualizarAdminIgreja,
    marcarOnboardingCompleto,
    impersonarIgreja,
} from '@/actions/super-admin-actions'

interface Igreja {
    id: number
    nome: string
    slug: string
    plano: string
    logo_url: string | null
    cor_primaria: string
    cor_secundaria: string
    onboarding_completo: boolean
}

interface Congregacao {
    id: number
    nome: string
    cidade: string
    endereco: string
}

interface Departamento {
    id: number
    nome: string
    descricao: string | null
    is_global: boolean
}

interface Admin {
    id: number
    first_name: string
    last_name: string
    email: string
}

interface Props {
    igreja: Igreja
    congregacoes: Congregacao[]
    departamentos: Departamento[]
    admin: Admin | null
    initialStep: number
}

const STEPS = [
    { num: 1, label: 'Dados da Igreja', icon: Building },
    { num: 2, label: 'Congregacoes', icon: MapPin },
    { num: 3, label: 'Departamentos', icon: Users },
    { num: 4, label: 'Admin', icon: UserCog },
    { num: 5, label: 'Checklist', icon: CheckCircle2 },
]

export default function OnboardingWizard({ igreja, congregacoes, departamentos, admin, initialStep }: Props) {
    const router = useRouter()
    const [step, setStep] = useState(initialStep)
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    function goStep(n: number) {
        setStep(n)
        setMsg(null)
        router.push(`/super-admin/onboarding/${igreja.id}?step=${n}`, { scroll: false })
    }

    // ── Step 1: Dados da Igreja ──
    function Step1() {
        const [logoUrl, setLogoUrl] = useState(igreja.logo_url || '')
        const [corPrim, setCorPrim] = useState(igreja.cor_primaria)
        const [corSec, setCorSec] = useState(igreja.cor_secundaria)

        async function handleSave() {
            setLoading(true)
            const fd = new FormData()
            fd.set('logo_url', logoUrl)
            fd.set('cor_primaria', corPrim)
            fd.set('cor_secundaria', corSec)
            const res = await atualizarBrandingIgreja(igreja.id, fd)
            setLoading(false)
            if (res.error) setMsg({ type: 'err', text: res.error })
            else setMsg({ type: 'ok', text: res.message || 'Guardado!' })
        }

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nome</label>
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm text-gray-300">{igreja.nome}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Slug</label>
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm text-gray-300">{igreja.slug}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Plano</label>
                        <div className="bg-[#1A1A1A] border border-[#333] rounded-xl px-4 py-3 text-sm text-gray-300">{igreja.plano}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">URL do Logo</label>
                        <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" placeholder="https://..." />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cor Primaria</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={corPrim} onChange={e => setCorPrim(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                            <input value={corPrim} onChange={e => setCorPrim(e.target.value)} className="flex-1 bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Cor Secundaria</label>
                        <div className="flex items-center gap-3">
                            <input type="color" value={corSec} onChange={e => setCorSec(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0" />
                            <input value={corSec} onChange={e => setCorSec(e.target.value)} className="flex-1 bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                        </div>
                    </div>
                </div>

                <button onClick={handleSave} disabled={loading} className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Palette size={14} />}
                    Guardar Branding
                </button>
            </div>
        )
    }

    // ── Step 2: Congregacoes ──
    function Step2() {
        const [nome, setNome] = useState('')
        const [cidade, setCidade] = useState('')
        const [endereco, setEndereco] = useState('')

        async function handleAdd() {
            setLoading(true)
            const fd = new FormData()
            fd.set('nome', nome)
            fd.set('cidade', cidade)
            fd.set('endereco', endereco)
            const res = await criarCongregacaoSA(igreja.id, fd)
            setLoading(false)
            if (res.error) setMsg({ type: 'err', text: res.error })
            else {
                setMsg({ type: 'ok', text: res.message || 'Criada!' })
                setNome(''); setCidade(''); setEndereco('')
                router.refresh()
            }
        }

        return (
            <div className="space-y-6">
                {congregacoes.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Congregacoes Existentes ({congregacoes.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {congregacoes.map(c => (
                                <div key={c.id} className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 flex items-start gap-3">
                                    <MapPin size={16} className="text-blue-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-white">{c.nome}</p>
                                        <p className="text-xs text-gray-500">{c.cidade} - {c.endereco}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border border-[#333] rounded-xl p-5 space-y-4 bg-[#111]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Adicionar Congregacao</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" className="bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                        <input value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                        <input value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Endereco" className="bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
                    </div>
                    <button onClick={handleAdd} disabled={loading || !nome || !cidade || !endereco} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Adicionar
                    </button>
                </div>
            </div>
        )
    }

    // ── Step 3: Departamentos ──
    function Step3() {
        const [nome, setNome] = useState('')
        const [descricao, setDescricao] = useState('')
        const [isGlobal, setIsGlobal] = useState(false)

        async function handleAdd() {
            setLoading(true)
            const fd = new FormData()
            fd.set('nome', nome)
            fd.set('descricao', descricao)
            fd.set('is_global', isGlobal.toString())
            const res = await criarDepartamentoSA(igreja.id, fd)
            setLoading(false)
            if (res.error) setMsg({ type: 'err', text: res.error })
            else {
                setMsg({ type: 'ok', text: res.message || 'Criado!' })
                setNome(''); setDescricao(''); setIsGlobal(false)
                router.refresh()
            }
        }

        return (
            <div className="space-y-6">
                {departamentos.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Departamentos ({departamentos.length})</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {departamentos.map(d => (
                                <div key={d.id} className="bg-[#1A1A1A] border border-[#333] rounded-xl p-4 flex items-start gap-3">
                                    <Users size={16} className="text-purple-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-white">{d.nome}</p>
                                        {d.descricao && <p className="text-xs text-gray-500">{d.descricao}</p>}
                                        {d.is_global && <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full mt-1 inline-block">Global</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="border border-[#333] rounded-xl p-5 space-y-4 bg-[#111]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Adicionar Departamento</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do Departamento" className="bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500" />
                        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descricao (opcional)" className="bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-purple-500" />
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setIsGlobal(!isGlobal)} className="text-gray-400 hover:text-white transition-colors">
                            {isGlobal ? <ToggleRight size={24} className="text-amber-400" /> : <ToggleLeft size={24} />}
                        </button>
                        <span className="text-xs text-gray-400">Global (visivel em todas as congregacoes)</span>
                    </div>
                    <button onClick={handleAdd} disabled={loading || !nome} className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Adicionar
                    </button>
                </div>
            </div>
        )
    }

    // ── Step 4: Admin ──
    function Step4() {
        const [email, setEmail] = useState(admin?.email || '')
        const [password, setPassword] = useState('')

        async function handleSave() {
            setLoading(true)
            const fd = new FormData()
            fd.set('email', email)
            fd.set('password', password)
            const res = await atualizarAdminIgreja(igreja.id, fd)
            setLoading(false)
            if (res.error) setMsg({ type: 'err', text: res.error })
            else {
                setMsg({ type: 'ok', text: res.message || 'Guardado!' })
                setPassword('')
            }
        }

        return (
            <div className="space-y-6">
                {admin && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-green-400 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-green-300">Admin ja criado</p>
                            <p className="text-xs text-green-400/70">{admin.first_name} {admin.last_name} ({admin.email})</p>
                        </div>
                    </div>
                )}

                <div className="border border-[#333] rounded-xl p-5 space-y-4 bg-[#111]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Alterar Credenciais (Opcional)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email</label>
                            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Nova Password (min 6 chars)</label>
                            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Deixar vazio para manter" className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-cyan-500" />
                        </div>
                    </div>
                    <button onClick={handleSave} disabled={loading} className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />}
                        Guardar Alteracoes
                    </button>
                </div>
            </div>
        )
    }

    // ── Step 5: Checklist Final ──
    function Step5() {
        const checks = [
            { label: 'Dados da Igreja', done: true, detail: `${igreja.nome} (${igreja.plano})` },
            { label: 'Branding', done: !!(igreja.cor_primaria && igreja.cor_secundaria), detail: igreja.logo_url ? 'Logo definido' : 'Sem logo (cores definidas)' },
            { label: 'Congregacoes', done: congregacoes.length > 0, detail: `${congregacoes.length} congregacao(oes)` },
            { label: 'Departamentos', done: departamentos.length > 0, detail: `${departamentos.length} departamento(s)` },
            { label: 'Admin', done: !!admin, detail: admin ? admin.email : 'Sem admin' },
        ]

        const allDone = checks.every(c => c.done)

        async function handleComplete() {
            setLoading(true)
            const res = await marcarOnboardingCompleto(igreja.id)
            setLoading(false)
            if (res.error) setMsg({ type: 'err', text: res.error })
            else {
                setMsg({ type: 'ok', text: res.message || 'Concluido!' })
                router.refresh()
            }
        }

        async function handleImpersonar() {
            await impersonarIgreja(igreja.id)
        }

        return (
            <div className="space-y-6">
                <div className="space-y-3">
                    {checks.map((c, i) => (
                        <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${c.done ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.done ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {c.done ? <CheckCircle2 size={16} /> : <span className="text-xs font-black">{i + 1}</span>}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm font-bold ${c.done ? 'text-green-300' : 'text-red-300'}`}>{c.label}</p>
                                <p className="text-xs text-gray-500">{c.detail}</p>
                            </div>
                            {!c.done && (
                                <button onClick={() => goStep(i + 1)} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                                    Configurar
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {igreja.onboarding_completo ? (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center space-y-3">
                        <CheckCircle2 size={32} className="text-green-400 mx-auto" />
                        <p className="text-lg font-black text-green-300 uppercase tracking-tight">Onboarding Concluido</p>
                        <button onClick={handleImpersonar} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 mx-auto">
                            <ExternalLink size={14} /> Entrar na Igreja
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button onClick={handleComplete} disabled={loading || !allDone} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2">
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Marcar Onboarding Completo
                        </button>
                        {!allDone && (
                            <p className="text-xs text-gray-500">Conclua todos os passos para finalizar</p>
                        )}
                    </div>
                )}
            </div>
        )
    }

    const StepContent = [Step1, Step2, Step3, Step4, Step5]
    const CurrentStep = StepContent[step - 1] || Step1

    return (
        <div className="space-y-8">
            {/* Progress bar */}
            <div className="flex items-center gap-1">
                {STEPS.map((s) => {
                    const Icon = s.icon
                    const active = step === s.num
                    const done = step > s.num
                    return (
                        <button
                            key={s.num}
                            onClick={() => goStep(s.num)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                active
                                    ? 'bg-blue-600 text-white'
                                    : done
                                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                    : 'bg-[#1A1A1A] text-gray-500 hover:bg-[#222] hover:text-gray-300'
                            }`}
                        >
                            <Icon size={14} />
                            <span className="hidden md:inline">{s.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Step title */}
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Passo {step} de 5</p>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">{STEPS[step - 1]?.label}</h2>
                </div>
                <div className="flex items-center gap-2">
                    {step > 1 && (
                        <button onClick={() => goStep(step - 1)} className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-gray-400 hover:text-white transition-all">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    {step < 5 && (
                        <button onClick={() => goStep(step + 1)} className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-gray-400 hover:text-white transition-all">
                            <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Feedback message */}
            {msg && (
                <div className={`flex items-center gap-2 text-xs font-black uppercase p-4 rounded-xl ${msg.type === 'ok' ? 'text-green-400 bg-green-500/10 border border-green-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                    {msg.type === 'ok' ? <CheckCircle2 size={14} /> : null}
                    {msg.text}
                </div>
            )}

            {/* Step content */}
            <CurrentStep />
        </div>
    )
}

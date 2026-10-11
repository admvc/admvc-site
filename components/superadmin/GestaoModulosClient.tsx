'use client'

import { useState } from 'react'
import { atualizarPlanoIgreja, atualizarModulosCustom } from '@/actions/super-admin-actions'
import {
    ArrowLeft, Building, CheckCircle2, Loader2, Save,
    Calendar, Users, Music, Wallet, Coffee, HeartHandshake,
    Package, BookOpen, MessageSquare, BarChart3, Shield,
    Crown, Zap, Rocket, Globe, ToggleLeft, ToggleRight, Palette
} from 'lucide-react'
import Link from 'next/link'

interface IgrejaData {
    id: number
    nome: string
    slug: string
    plano: string
    modulos_custom: string[] | null
    _count: { membros: number; congregacoes: number; departamentos: number }
}

const PLANOS_UI = [
    { id: 'FREE', nome: 'Gratuito', icon: Globe, cor: 'text-gray-400', border: 'border-gray-600', bg: 'bg-gray-500/10' },
    { id: 'BASIC', nome: 'Basico', icon: Zap, cor: 'text-blue-400', border: 'border-blue-500/30', bg: 'bg-blue-500/10' },
    { id: 'PRO', nome: 'Profissional', icon: Rocket, cor: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
    { id: 'ENTERPRISE', nome: 'Empresarial', icon: Crown, cor: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
]

const MODULOS_UI = [
    { id: 'escalas', nome: 'Escalas', desc: 'Gestao de eventos e escalas de servico', icon: Calendar, planos: ['BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'grupos', nome: 'Grupos / Celulas', desc: 'Gestao de pequenos grupos e encontros', icon: Users, planos: ['BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'louvor', nome: 'Louvor & Holyrics', desc: 'Setlists, catalogo de musicas e integracao Holyrics', icon: Music, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'financeiro', nome: 'Financeiro', desc: 'Dizimos, ofertas, campanhas e carnes', icon: Wallet, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'cantina', nome: 'Cantina', desc: 'Integracao Loyverse, menu, despensa e TV', icon: Coffee, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'acolhimento', nome: 'Acolhimento', desc: 'Registo de visitantes e acompanhamento', icon: HeartHandshake, planos: ['BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'inventario', nome: 'Inventario', desc: 'Controlo de patrimonio e equipamentos', icon: Package, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'gabinete', nome: 'Gabinete / Agenda', desc: 'Agenda pastoral e marcacoes publicas', icon: BookOpen, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'mural', nome: 'Mural', desc: 'Avisos e comunicados internos', icon: MessageSquare, planos: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'relatorios', nome: 'Relatorios', desc: 'Relatorios de escalas e financeiros', icon: BarChart3, planos: ['BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'personalizacao', nome: 'Personalizacao', desc: 'Cores, logotipo e identidade visual da igreja', icon: Palette, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'auditoria', nome: 'Auditoria', desc: 'Logs de acoes e seguranca', icon: Shield, planos: ['BASIC', 'PRO', 'ENTERPRISE'] },
    { id: 'holyrics', nome: 'Holyrics', desc: 'Integracao com software de projeccao Holyrics', icon: Music, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'cifras', nome: 'Cifras Internas', desc: 'Editor de cifras com transposicao e importacao', icon: Music, planos: ['PRO', 'ENTERPRISE'] },
    { id: 'mesa_som', nome: 'Mesa de Som (X32)', desc: 'Controlo remoto da Behringer X32 via OSC', icon: Music, planos: ['ENTERPRISE'] },
    { id: 'lumikit', nome: 'Lumikit', desc: 'Controlo de iluminacao e cenas DMX', icon: Music, planos: ['ENTERPRISE'] },
]

// Mapa de planos → módulos (espelha lib/planos.ts)
const MODULOS_POR_PLANO: Record<string, string[]> = {
    FREE: ['mural'],
    BASIC: ['escalas', 'grupos', 'mural', 'acolhimento', 'relatorios', 'auditoria'],
    PRO: ['escalas', 'grupos', 'louvor', 'financeiro', 'cantina', 'acolhimento', 'inventario', 'gabinete', 'mural', 'personalizacao', 'relatorios', 'auditoria', 'cifras', 'holyrics'],
    ENTERPRISE: MODULOS_UI.map(m => m.id),
}

export default function GestaoModulosClient({ igreja }: { igreja: IgrejaData }) {
    const [plano, setPlano] = useState(igreja.plano)
    const [modoCustom, setModoCustom] = useState(!!igreja.modulos_custom)
    const [modulosAtivos, setModulosAtivos] = useState<string[]>(
        igreja.modulos_custom || MODULOS_POR_PLANO[igreja.plano] || []
    )
    const [saving, setSaving] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    const modulosDoPlano = MODULOS_POR_PLANO[plano] || []

    async function handleMudarPlano(novoPlano: string) {
        setSaving(true)
        setStatus(null)
        const res = await atualizarPlanoIgreja(igreja.id, novoPlano)
        if (res.ok) {
            setPlano(novoPlano)
            setModoCustom(false)
            setModulosAtivos(MODULOS_POR_PLANO[novoPlano] || [])
            setStatus({ type: 'success', msg: `Plano alterado para ${novoPlano}` })
        } else {
            setStatus({ type: 'error', msg: res.error || 'Erro ao alterar plano.' })
        }
        setSaving(false)
        setTimeout(() => setStatus(null), 3000)
    }

    function toggleModulo(moduloId: string) {
        setModulosAtivos(prev =>
            prev.includes(moduloId)
                ? prev.filter(m => m !== moduloId)
                : [...prev, moduloId]
        )
    }

    async function handleSalvarCustom() {
        setSaving(true)
        setStatus(null)
        const res = await atualizarModulosCustom(igreja.id, modulosAtivos)
        if (res.ok) {
            setStatus({ type: 'success', msg: 'Modulos personalizados guardados.' })
        } else {
            setStatus({ type: 'error', msg: res.error || 'Erro ao guardar.' })
        }
        setSaving(false)
        setTimeout(() => setStatus(null), 3000)
    }

    async function handleDesactivarCustom() {
        setSaving(true)
        setStatus(null)
        const res = await atualizarModulosCustom(igreja.id, [])
        if (res.ok) {
            setModoCustom(false)
            setModulosAtivos(MODULOS_POR_PLANO[plano] || [])
            setStatus({ type: 'success', msg: 'Voltou aos modulos do plano.' })
        } else {
            setStatus({ type: 'error', msg: res.error || 'Erro.' })
        }
        setSaving(false)
        setTimeout(() => setStatus(null), 3000)
    }

    const planoUI = PLANOS_UI.find(p => p.id === plano) || PLANOS_UI[0]

    return (
        <main className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in">
            {/* HEADER */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <Link
                        href="/super-admin/igrejas"
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-3"
                    >
                        <ArrowLeft size={12} /> Voltar
                    </Link>
                    <h1 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                        <Building size={24} className="text-blue-500" />
                        {igreja.nome}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        {igreja._count.membros} membros &middot; {igreja._count.congregacoes} congregacoes &middot; {igreja._count.departamentos} departamentos
                    </p>
                </div>

                {status && (
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold ${status.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        <CheckCircle2 size={14} /> {status.msg}
                    </div>
                )}
            </header>

            {/* SELECÇÃO DE PLANO */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Plano Activo</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {PLANOS_UI.map(p => {
                        const Icon = p.icon
                        const isActive = plano === p.id
                        return (
                            <button
                                key={p.id}
                                onClick={() => handleMudarPlano(p.id)}
                                disabled={saving || isActive}
                                className={`relative p-4 rounded-2xl border text-left transition-all ${
                                    isActive
                                        ? `${p.border} ${p.bg} shadow-lg`
                                        : 'border-[#333] bg-[#111] hover:border-[#555] hover:bg-[#1a1a1a]'
                                } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isActive && (
                                    <div className="absolute top-2 right-2">
                                        <CheckCircle2 size={14} className={p.cor} />
                                    </div>
                                )}
                                <Icon size={20} className={isActive ? p.cor : 'text-gray-600'} />
                                <h3 className={`text-sm font-black uppercase tracking-tight mt-2 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                                    {p.nome}
                                </h3>
                                <p className="text-[10px] text-gray-600 mt-0.5">
                                    {MODULOS_POR_PLANO[p.id]?.length || 0} modulos
                                </p>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* TOGGLE MODO CUSTOM */}
            <section className="flex items-center justify-between bg-[#111] border border-[#333] rounded-2xl p-4">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-tight">Personalizacao de Modulos</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                        {modoCustom
                            ? 'Override activo — os modulos abaixo sao independentes do plano.'
                            : `A usar os modulos do plano ${planoUI.nome}. Active para personalizar.`
                        }
                    </p>
                </div>
                <button
                    onClick={() => {
                        if (modoCustom) {
                            handleDesactivarCustom()
                        } else {
                            setModoCustom(true)
                            setModulosAtivos([...modulosDoPlano])
                        }
                    }}
                    disabled={saving}
                    className="shrink-0"
                >
                    {modoCustom
                        ? <ToggleRight size={36} className="text-blue-500" />
                        : <ToggleLeft size={36} className="text-gray-600" />
                    }
                </button>
            </section>

            {/* GRELHA DE MÓDULOS */}
            <section className="space-y-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                    Modulos {modoCustom ? '(Personalizados)' : `(Plano ${planoUI.nome})`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {MODULOS_UI.map(mod => {
                        const Icon = mod.icon
                        const isAtivo = modulosAtivos.includes(mod.id)
                        const incluidoNoPlano = modulosDoPlano.includes(mod.id)

                        return (
                            <div
                                key={mod.id}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isAtivo
                                        ? 'border-blue-500/30 bg-blue-500/5'
                                        : 'border-[#222] bg-[#0d0d0d]'
                                }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${isAtivo ? 'bg-blue-500/10 text-blue-400' : 'bg-[#1a1a1a] text-gray-600'}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <h4 className={`text-xs font-black uppercase tracking-tight ${isAtivo ? 'text-white' : 'text-gray-500'}`}>
                                                {mod.nome}
                                            </h4>
                                            <p className="text-[9px] text-gray-600 mt-0.5 leading-relaxed">{mod.desc}</p>
                                        </div>
                                    </div>

                                    {modoCustom ? (
                                        <button
                                            onClick={() => toggleModulo(mod.id)}
                                            disabled={saving}
                                            className="shrink-0 ml-2"
                                        >
                                            {isAtivo
                                                ? <ToggleRight size={28} className="text-blue-500" />
                                                : <ToggleLeft size={28} className="text-gray-600" />
                                            }
                                        </button>
                                    ) : (
                                        <div className={`shrink-0 ml-2 w-3 h-3 rounded-full mt-1 ${isAtivo ? 'bg-blue-500' : 'bg-[#333]'}`} />
                                    )}
                                </div>

                                {!modoCustom && !incluidoNoPlano && (
                                    <p className="text-[8px] text-gray-600 mt-2 uppercase tracking-widest">
                                        Disponivel a partir do plano {mod.planos[0]}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* BOTÃO GUARDAR (só no modo custom) */}
            {modoCustom && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSalvarCustom}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-900/30"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Guardar Modulos
                    </button>
                </div>
            )}
        </main>
    )
}

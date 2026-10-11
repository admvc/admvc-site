'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft, ChevronRight, Plus, GraduationCap,
    Calendar, User, Users, BookOpen, Edit3, Trash2,
    X, Loader2, Check, ChevronDown
} from 'lucide-react'
import { criarEBD, removerEBD, registarPresencasEBD } from '@/actions/pregacao-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

const MESES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface Aula {
    id: string
    titulo: string
    tema: string | null
    data: string
    material_apoio: string | null
    perguntas_discussao: any
    professor_id: number
    sermao_id: string | null
    professor: { first_name: string; last_name: string }
    sermao: { id: string; titulo: string } | null
    _count: { presencas: number }
    presencas: { membro_id: number }[]
}

interface Membro {
    id: number
    first_name: string
    last_name: string
}

interface Sermao {
    id: string
    titulo: string
    data_pregacao: string
}

interface Props {
    aulas: Aula[]
    membros: Membro[]
    sermoes: Sermao[]
    mes: number
    ano: number
    sermaoIdInicial: string | null
}

export default function EBDClient({ aulas, membros, sermoes, mes, ano, sermaoIdInicial }: Props) {
    const confirmar = useConfirm()
    const toast = useToast()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [modalAberto, setModalAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)

    // Presence panel
    const [presencaAulaId, setPresencaAulaId] = useState<string | null>(null)
    const [presentes, setPresentes] = useState<number[]>([])
    const [presencaLoading, setPresencaLoading] = useState(false)
    const [presencaSearch, setPresencaSearch] = useState('')

    useEffect(() => { setMounted(true) }, [])

    // Auto-open modal if sermao_id is provided via URL
    useEffect(() => {
        if (sermaoIdInicial) {
            setModalAberto(true)
        }
    }, [sermaoIdInicial])

    useEffect(() => {
        if (modalAberto || presencaAulaId) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [modalAberto, presencaAulaId])

    function navegar(params: Record<string, string | undefined>) {
        const sp = new URLSearchParams(searchParams.toString())
        Object.entries(params).forEach(([k, v]) => {
            if (v === undefined) sp.delete(k)
            else sp.set(k, v)
        })
        sp.delete('sermao_id') // clean up after use
        const qs = sp.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    function mesAnterior() {
        const m = mes === 1 ? 12 : mes - 1
        const a = mes === 1 ? ano - 1 : ano
        navegar({ mes: String(m), ano: String(a) })
    }

    function mesSeguinte() {
        const m = mes === 12 ? 1 : mes + 1
        const a = mes === 12 ? ano + 1 : ano
        navegar({ mes: String(m), ano: String(a) })
    }

    async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const form = new FormData(e.currentTarget)

        // Parse perguntas_discussao from textarea (one per line)
        const perguntasRaw = form.get('perguntas_discussao') as string
        if (perguntasRaw) {
            const perguntas = perguntasRaw.split('\n').map(p => p.trim()).filter(Boolean)
            form.set('perguntas_discussao', JSON.stringify(perguntas))
        }

        const res = await criarEBD(form)
        setLoading(false)
        if (res.ok) {
            setModalAberto(false)
            router.refresh()
        } else {
            toast(res.error || 'Erro ao criar aula.', 'erro')
        }
    }

    async function handleRemover(id: string) {
        if (!await confirmar({ mensagem: 'Tens certeza que queres remover esta aula?', tipo: 'perigo' })) return
        const res = await removerEBD(id)
        if (res.ok) {
            router.refresh()
        } else {
            toast(res.error || 'Erro ao remover.', 'erro')
        }
    }

    function abrirPresencas(aula: Aula) {
        setPresencaAulaId(aula.id)
        setPresentes(aula.presencas.map(p => p.membro_id))
        setPresencaSearch('')
    }

    function togglePresenca(membroId: number) {
        setPresentes(prev =>
            prev.includes(membroId) ? prev.filter(id => id !== membroId) : [...prev, membroId]
        )
    }

    async function salvarPresencas() {
        if (!presencaAulaId) return
        setPresencaLoading(true)
        const res = await registarPresencasEBD(presencaAulaId, presentes)
        setPresencaLoading(false)
        if (res.ok) {
            setPresencaAulaId(null)
            setPresentes([])
            router.refresh()
        } else {
            toast(res.error || 'Erro ao registar presencas.', 'erro')
        }
    }

    function formatarData(iso: string) {
        return new Date(iso).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    const membrosFiltrados = presencaSearch
        ? membros.filter(m =>
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(presencaSearch.toLowerCase())
        )
        : membros

    // New class modal
    const modal = modalAberto && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-2xl bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Nova Aula EBD</h2>
                    <button onClick={() => setModalAberto(false)} className="text-muted hover:text-fg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleCriar} className="p-6 space-y-4">
                    {/* Titulo */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Titulo *</label>
                        <input
                            name="titulo"
                            required
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                            placeholder="Titulo da aula"
                        />
                    </div>

                    {/* Tema */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tema</label>
                        <input
                            name="tema"
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                            placeholder="Tema da aula"
                        />
                    </div>

                    {/* Professor + Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Professor *</label>
                            <select
                                name="professor_id"
                                required
                                className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                            >
                                <option value="">Selecionar...</option>
                                {membros.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.first_name} {m.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Data *</label>
                            <input
                                name="data"
                                type="date"
                                required
                                className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                            />
                        </div>
                    </div>

                    {/* Sermao base */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Sermao base (opcional)</label>
                        <select
                            name="sermao_id"
                            defaultValue={sermaoIdInicial || ''}
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                        >
                            <option value="">Nenhum</option>
                            {sermoes.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.titulo} — {new Date(s.data_pregacao).toLocaleDateString('pt-PT')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Perguntas de discussao */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Perguntas de Discussao (uma por linha)</label>
                        <textarea
                            name="perguntas_discussao"
                            rows={4}
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y"
                            placeholder="O que significa este texto para a nossa vida?&#10;Como podemos aplicar esta passagem no dia-a-dia?"
                        />
                    </div>

                    {/* Material de apoio */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Material de Apoio</label>
                        <textarea
                            name="material_apoio"
                            rows={3}
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y"
                            placeholder="Links, livros, recursos..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {loading ? 'A criar...' : 'Criar Aula'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    ) : null

    // Presence modal
    const presencaModal = presencaAulaId && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-lg bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">
                        Marcar Presencas
                    </h2>
                    <button onClick={() => { setPresencaAulaId(null); setPresentes([]) }} className="text-muted hover:text-fg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 pt-4 flex-shrink-0">
                    <input
                        value={presencaSearch}
                        onChange={(e) => setPresencaSearch(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                        placeholder="Pesquisar membro..."
                    />
                    <p className="text-[9px] font-bold text-figueira mt-2">
                        {presentes.length} presente{presentes.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
                    {membrosFiltrados.map(m => {
                        const isPresente = presentes.includes(m.id)
                        return (
                            <button
                                key={m.id}
                                onClick={() => togglePresenca(m.id)}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all ${
                                    isPresente
                                        ? 'bg-figueira/10 border border-figueira/30'
                                        : 'bg-bg border border-soft hover:border-figueira/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                                    isPresente ? 'bg-figueira text-white' : 'border border-soft'
                                }`}>
                                    {isPresente && <Check size={12} />}
                                </div>
                                <span className="text-[11px] font-bold text-fg">
                                    {m.first_name} {m.last_name}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="px-6 py-4 border-t border-soft flex-shrink-0">
                    <button
                        onClick={salvarPresencas}
                        disabled={presencaLoading}
                        className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {presencaLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {presencaLoading ? 'A guardar...' : 'Guardar Presencas'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    ) : null

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">
            {/* Header */}
            <header className="space-y-4">
                <div className="flex items-center gap-2 text-figueira">
                    <GraduationCap size={16} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Escola Biblica</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    EBD<span className="text-muted/20">.</span>
                </h1>
            </header>

            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-bg2 border border-soft rounded-2xl px-4 py-3">
                <button onClick={mesAnterior} className="p-2 hover:bg-bg rounded-xl transition-colors text-muted hover:text-fg">
                    <ChevronLeft size={18} />
                </button>
                <div className="text-center">
                    <p className="text-sm font-black uppercase tracking-widest text-fg">{MESES[mes - 1]}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted">{ano}</p>
                </div>
                <button onClick={mesSeguinte} className="p-2 hover:bg-bg rounded-xl transition-colors text-muted hover:text-fg">
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                    {aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'}
                </p>
                <button
                    onClick={() => setModalAberto(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity"
                >
                    <Plus size={12} />
                    Nova Aula
                </button>
            </div>

            {/* Aulas List */}
            {aulas.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-soft rounded-[2.5rem]">
                    <GraduationCap size={32} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-xs font-black uppercase text-muted tracking-widest">Nenhuma aula neste mes.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {aulas.map((a) => {
                        const perguntas = Array.isArray(a.perguntas_discussao) ? a.perguntas_discussao : []

                        return (
                            <details key={a.id} className="group bg-bg2 border border-soft rounded-2xl overflow-hidden transition-all hover:border-figueira/30">
                                <summary className="cursor-pointer px-5 py-4 flex items-center gap-4 list-none [&::-webkit-details-marker]:hidden">
                                    {/* Date badge */}
                                    <div className="flex-shrink-0 w-12 h-12 bg-bg border border-soft rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-figueira leading-none">
                                            {new Date(a.data).getDate()}
                                        </span>
                                        <span className="text-[8px] font-bold text-muted uppercase">
                                            {new Date(a.data).toLocaleDateString('pt-PT', { month: 'short' })}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-black uppercase tracking-wide text-fg truncate">{a.titulo}</h3>
                                        <p className="text-[9px] font-bold text-muted mt-0.5">
                                            <User size={9} className="inline mr-1" />
                                            {a.professor.first_name} {a.professor.last_name}
                                            {a.sermao && (
                                                <span className="ml-2 text-figueira">
                                                    <BookOpen size={9} className="inline mr-0.5" />
                                                    {a.sermao.titulo}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Presence count */}
                                    <div className="hidden sm:flex items-center gap-1.5 bg-bg border border-soft rounded-full px-3 py-1">
                                        <Users size={10} className="text-figueira" />
                                        <span className="text-[9px] font-black text-fg">{a._count.presencas}</span>
                                    </div>

                                    <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform flex-shrink-0" />
                                </summary>

                                {/* Expanded content */}
                                <div className="px-5 pb-5 pt-2 border-t border-soft space-y-4">
                                    {/* Tema */}
                                    {a.tema && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tema</p>
                                            <p className="text-[11px] text-fg/80">{a.tema}</p>
                                        </div>
                                    )}

                                    {/* Perguntas */}
                                    {perguntas.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Perguntas de Discussao</p>
                                            <ol className="space-y-1 list-decimal list-inside">
                                                {perguntas.map((p: string, i: number) => (
                                                    <li key={i} className="text-[10px] text-fg/80">{p}</li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {/* Linked sermon */}
                                    {a.sermao && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Sermao Base</p>
                                            <Link
                                                href={`/pregacao/editor/${a.sermao.id}`}
                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-figueira hover:underline"
                                            >
                                                <BookOpen size={10} />
                                                {a.sermao.titulo}
                                            </Link>
                                        </div>
                                    )}

                                    {/* Material */}
                                    {a.material_apoio && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Material de Apoio</p>
                                            <p className="text-[10px] text-fg/70 whitespace-pre-wrap">{a.material_apoio}</p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        <button
                                            onClick={() => abrirPresencas(a)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-figueira/10 border border-figueira/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-figueira hover:bg-figueira/20 transition-colors"
                                        >
                                            <Users size={10} />
                                            Marcar Presencas
                                        </button>
                                        <button
                                            onClick={() => handleRemover(a.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600/20 transition-colors ml-auto"
                                        >
                                            <Trash2 size={10} />
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            </details>
                        )
                    })}
                </div>
            )}

            {modal}
            {presencaModal}
        </main>
    )
}

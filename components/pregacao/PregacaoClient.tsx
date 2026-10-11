'use client'

import { useState, useEffect, useCallback } from 'react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft, ChevronRight, Plus, BookOpen,
    Calendar, User, Tag, Eye, EyeOff, Trash2,
    MessageCircle, GraduationCap, Edit3, X, Loader2
} from 'lucide-react'
import { criarSermao, removerSermao, partilharSermaoWhatsApp } from '@/actions/pregacao-actions'

const MESES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

interface Sermao {
    id: string
    titulo: string
    texto_corpo: string | null
    referencias_biblicas: any
    tags: any
    publicado: boolean
    partilhado_whatsapp: boolean
    data_pregacao: string
    pregador_id: number
    evento_id: number | null
    pregador: { first_name: string; last_name: string; avatar_file: string | null }
    evento: { nome: string; data: string } | null
}

interface Membro {
    id: number
    first_name: string
    last_name: string
}

interface Evento {
    id: number
    nome: string
    data: string
}

interface Props {
    sermoes: Sermao[]
    membros: Membro[]
    eventos: Evento[]
    mes: number
    ano: number
    podeGerir?: boolean
}

export default function PregacaoClient({ sermoes, membros, eventos, mes, ano, podeGerir = false }: Props) {
    const confirmar = useConfirm()
    const toast = useToast()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [modalAberto, setModalAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [refs, setRefs] = useState<any[]>([])
    const [refInput, setRefInput] = useState('')

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (modalAberto) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [modalAberto])

    function navegar(params: Record<string, string | undefined>) {
        const sp = new URLSearchParams(searchParams.toString())
        Object.entries(params).forEach(([k, v]) => {
            if (v === undefined) sp.delete(k)
            else sp.set(k, v)
        })
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

    function adicionarRef() {
        if (!refInput.trim()) return
        // Parse "Livro Cap:Vers" or just free text
        const parts = refInput.trim().match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/)
        if (parts) {
            setRefs(prev => [...prev, {
                livro: parts[1],
                capitulo: Number(parts[2]),
                versiculo_inicio: Number(parts[3]),
                versiculo_fim: parts[4] ? Number(parts[4]) : null,
            }])
        } else {
            setRefs(prev => [...prev, { livro: refInput.trim(), capitulo: 0, versiculo_inicio: 0, versiculo_fim: null }])
        }
        setRefInput('')
    }

    function removerRef(idx: number) {
        setRefs(prev => prev.filter((_, i) => i !== idx))
    }

    async function handleCriar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const form = new FormData(e.currentTarget)
        if (refs.length > 0) {
            form.set('referencias_biblicas', JSON.stringify(refs))
        }
        const tagsRaw = form.get('tags') as string
        if (tagsRaw) {
            form.set('tags', JSON.stringify(tagsRaw.split(',').map(t => t.trim()).filter(Boolean)))
        }
        const res = await criarSermao(form)
        setLoading(false)
        if (res.ok) {
            setModalAberto(false)
            setRefs([])
            router.refresh()
        } else {
            toast(res.error || 'Erro ao criar sermao.', 'erro')
        }
    }

    async function handleRemover(id: string) {
        if (!await confirmar({ mensagem: 'Tens certeza que queres remover este sermao?', tipo: 'perigo' })) return
        const res = await removerSermao(id)
        if (res.ok) {
            router.refresh()
        } else {
            toast(res.error || 'Erro ao remover.', 'erro')
        }
    }

    async function handleWhatsApp(id: string) {
        const res = await partilharSermaoWhatsApp(id)
        if (res.ok && res.data) {
            const encoded = encodeURIComponent(res.data)
            window.open(`https://wa.me/?text=${encoded}`, '_blank')
        } else {
            toast(res.error || 'Erro ao gerar partilha.', 'erro')
        }
    }

    function formatarData(iso: string) {
        return new Date(iso).toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
    }

    function formatarRef(ref: any) {
        if (!ref.capitulo) return ref.livro
        return `${ref.livro} ${ref.capitulo}:${ref.versiculo_inicio}${ref.versiculo_fim ? '-' + ref.versiculo_fim : ''}`
    }

    const modal = modalAberto && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div
                className="relative w-full max-w-2xl bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Novo Sermao</h2>
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
                            placeholder="Titulo do sermao"
                        />
                    </div>

                    {/* Pregador + Data */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Pregador *</label>
                            <select
                                name="pregador_id"
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
                                name="data_pregacao"
                                type="date"
                                required
                                className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                            />
                        </div>
                    </div>

                    {/* Evento */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Evento (opcional)</label>
                        <select
                            name="evento_id"
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                        >
                            <option value="">Nenhum</option>
                            {eventos.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.nome} — {new Date(e.data).toLocaleDateString('pt-PT')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tags (separadas por virgula)</label>
                        <input
                            name="tags"
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                            placeholder="fe, oracao, amor..."
                        />
                    </div>

                    {/* Texto corpo */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Texto do Sermao</label>
                        <textarea
                            name="texto_corpo"
                            rows={8}
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y"
                            placeholder="Escreve o corpo do sermao aqui..."
                        />
                    </div>

                    {/* Referencias Biblicas */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Referencias Biblicas</label>
                        <div className="flex gap-2">
                            <input
                                value={refInput}
                                onChange={(e) => setRefInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarRef() } }}
                                className="flex-1 bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                                placeholder="Ex: Joao 3:16 ou Romanos 8:28-30"
                            />
                            <button
                                type="button"
                                onClick={adicionarRef}
                                className="px-4 py-2 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity"
                            >
                                +
                            </button>
                        </div>
                        {refs.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {refs.map((ref, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 bg-figueira/10 text-figueira text-[9px] font-bold px-3 py-1 rounded-full">
                                        {formatarRef(ref)}
                                        <button type="button" onClick={() => removerRef(i)} className="hover:text-red-400 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Publicado */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input name="publicado" type="checkbox" className="w-4 h-4 rounded border-soft accent-figueira" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Publicar imediatamente</span>
                    </label>

                    {/* Botao */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {loading ? 'A criar...' : 'Criar Sermao'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    ) : null

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">
            {/* Header */}
            <header className="space-y-4">
                <div className="flex items-center gap-2 text-figueira">
                    <BookOpen size={16} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Pregacao</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Sermoes<span className="text-muted/20">.</span>
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
                    {sermoes.length} {sermoes.length === 1 ? 'sermao' : 'sermoes'}
                </p>
                {podeGerir && (
                    <button
                        onClick={() => setModalAberto(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity"
                    >
                        <Plus size={12} />
                        Novo Sermao
                    </button>
                )}
            </div>

            {/* Sermoes List */}
            {sermoes.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-soft rounded-[2.5rem]">
                    <BookOpen size={32} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-xs font-black uppercase text-muted tracking-widest">Nenhum sermao neste mes.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sermoes.map((s) => {
                        const tags = Array.isArray(s.tags) ? s.tags : []
                        const refsArr = Array.isArray(s.referencias_biblicas) ? s.referencias_biblicas : []

                        return (
                            <details key={s.id} className="group bg-bg2 border border-soft rounded-2xl overflow-hidden transition-all hover:border-figueira/30">
                                <summary className="cursor-pointer px-5 py-4 flex items-center gap-4 list-none [&::-webkit-details-marker]:hidden">
                                    {/* Date badge */}
                                    <div className="flex-shrink-0 w-12 h-12 bg-bg border border-soft rounded-xl flex flex-col items-center justify-center">
                                        <span className="text-[10px] font-black text-figueira leading-none">
                                            {new Date(s.data_pregacao).getDate()}
                                        </span>
                                        <span className="text-[8px] font-bold text-muted uppercase">
                                            {new Date(s.data_pregacao).toLocaleDateString('pt-PT', { month: 'short' })}
                                        </span>
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xs font-black uppercase tracking-wide text-fg truncate">{s.titulo}</h3>
                                        <p className="text-[9px] font-bold text-muted mt-0.5">
                                            <User size={9} className="inline mr-1" />
                                            {s.pregador.first_name} {s.pregador.last_name}
                                            {s.evento && (
                                                <span className="ml-2 text-figueira">
                                                    <Calendar size={9} className="inline mr-0.5" />
                                                    {s.evento.nome}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Tags + Status */}
                                    <div className="hidden sm:flex items-center gap-2">
                                        {tags.slice(0, 2).map((tag: string, i: number) => (
                                            <span key={i} className="text-[8px] font-bold uppercase tracking-wider bg-figueira/10 text-figueira px-2 py-0.5 rounded-full">
                                                {tag}
                                            </span>
                                        ))}
                                        {s.publicado ? (
                                            <Eye size={12} className="text-green-500" />
                                        ) : (
                                            <EyeOff size={12} className="text-muted/40" />
                                        )}
                                    </div>

                                    <ChevronRight size={14} className="text-muted group-open:rotate-90 transition-transform flex-shrink-0" />
                                </summary>

                                {/* Expanded content */}
                                <div className="px-5 pb-5 pt-2 border-t border-soft space-y-4">
                                    {/* References */}
                                    {refsArr.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Referencias</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {refsArr.map((ref: any, i: number) => (
                                                    <span key={i} className="text-[9px] font-bold bg-bg border border-soft px-2.5 py-1 rounded-full text-fg">
                                                        {formatarRef(ref)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Excerpt */}
                                    {s.texto_corpo && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Excerto</p>
                                            <p className="text-[11px] text-fg/80 leading-relaxed line-clamp-3">
                                                {s.texto_corpo.replace(/<[^>]*>/g, '').substring(0, 300)}
                                                {s.texto_corpo.length > 300 ? '...' : ''}
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {podeGerir && (
                                            <Link
                                                href={`/pregacao/editor/${s.id}`}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-bg border border-soft rounded-2xl text-[9px] font-black uppercase tracking-widest text-fg hover:border-figueira/50 transition-colors"
                                            >
                                                <Edit3 size={10} />
                                                Editar
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => handleWhatsApp(s.id)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600/10 border border-green-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-green-500 hover:bg-green-600/20 transition-colors"
                                        >
                                            <MessageCircle size={10} />
                                            WhatsApp
                                        </button>
                                        {podeGerir && (
                                            <Link
                                                href={`/ensino?sermao_id=${s.id}`}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600/20 transition-colors"
                                            >
                                                <GraduationCap size={10} />
                                                Usar na EBD
                                            </Link>
                                        )}
                                        {podeGerir && (
                                            <button
                                                onClick={() => handleRemover(s.id)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600/20 transition-colors ml-auto"
                                            >
                                                <Trash2 size={10} />
                                                Remover
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </details>
                        )
                    })}
                </div>
            )}

            {modal}
        </main>
    )
}

'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft, Save, Loader2, BookOpen, Search,
    Plus, X, Tag, Eye, EyeOff, ChevronRight, ChevronDown
} from 'lucide-react'
import { atualizarSermao } from '@/actions/pregacao-actions'

interface Sermao {
    id: string
    titulo: string
    texto_corpo: string | null
    referencias_biblicas: any
    notas_privadas: string | null
    tags: any
    publicado: boolean
    data_pregacao: string
    pregador_id: number
    evento_id: number | null
    pregador: { id: number; first_name: string; last_name: string }
    evento: { id: number; nome: string; data: string } | null
    escolasBiblicas: { id: string; titulo: string; data: string }[]
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
    sermao: Sermao
    membros: Membro[]
    eventos: Evento[]
}

export default function EditorSermao({ sermao, membros, eventos }: Props) {
    const router = useRouter()

    const [titulo, setTitulo] = useState(sermao.titulo)
    const [textCorpo, setTextCorpo] = useState(sermao.texto_corpo || '')
    const [notasPrivadas, setNotasPrivadas] = useState(sermao.notas_privadas || '')
    const [pregadorId, setPregadorId] = useState(sermao.pregador_id)
    const [dataPregacao, setDataPregacao] = useState(sermao.data_pregacao.split('T')[0])
    const [eventoId, setEventoId] = useState<number | null>(sermao.evento_id)
    const [publicado, setPublicado] = useState(sermao.publicado)
    const [tagsStr, setTagsStr] = useState(
        Array.isArray(sermao.tags) ? (sermao.tags as string[]).join(', ') : ''
    )

    const [refs, setRefs] = useState<any[]>(
        Array.isArray(sermao.referencias_biblicas) ? sermao.referencias_biblicas : []
    )
    const [refInput, setRefInput] = useState('')

    const [bibleSearch, setBibleSearch] = useState('')
    const [bibleResult, setBibleResult] = useState<{ reference: string; text: string } | null>(null)
    const [bibleLoading, setBibleLoading] = useState(false)
    const [biblePanelOpen, setBiblePanelOpen] = useState(true)

    const [saving, setSaving] = useState(false)
    const [saveMsg, setSaveMsg] = useState('')

    function adicionarRef() {
        if (!refInput.trim()) return
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

    function formatarRef(ref: any) {
        if (!ref.capitulo) return ref.livro
        return `${ref.livro} ${ref.capitulo}:${ref.versiculo_inicio}${ref.versiculo_fim ? '-' + ref.versiculo_fim : ''}`
    }

    async function buscarBiblia() {
        if (!bibleSearch.trim()) return
        setBibleLoading(true)
        setBibleResult(null)
        try {
            const res = await fetch(`https://bible-api.com/${encodeURIComponent(bibleSearch.trim())}?translation=almeida`)
            if (!res.ok) throw new Error('Verso nao encontrado.')
            const data = await res.json()
            setBibleResult({ reference: data.reference || bibleSearch, text: data.text || '' })
        } catch {
            setBibleResult({ reference: 'Erro', text: 'Nao foi possivel encontrar a referencia. Tenta outro formato (ex: John 3:16).' })
        }
        setBibleLoading(false)
    }

    function inserirNoSermao() {
        if (!bibleResult || bibleResult.reference === 'Erro') return
        const citacao = `\n\n--- ${bibleResult.reference} ---\n${bibleResult.text.trim()}\n`
        setTextCorpo(prev => prev + citacao)

        // Also add to refs if not already
        const parts = bibleResult.reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/)
        if (parts) {
            const exists = refs.some(r =>
                r.livro === parts[1] && r.capitulo === Number(parts[2]) && r.versiculo_inicio === Number(parts[3])
            )
            if (!exists) {
                setRefs(prev => [...prev, {
                    livro: parts[1],
                    capitulo: Number(parts[2]),
                    versiculo_inicio: Number(parts[3]),
                    versiculo_fim: parts[4] ? Number(parts[4]) : null,
                }])
            }
        }
    }

    async function handleSalvar() {
        setSaving(true)
        setSaveMsg('')
        const form = new FormData()
        form.set('titulo', titulo)
        form.set('texto_corpo', textCorpo)
        form.set('notas_privadas', notasPrivadas)
        form.set('data_pregacao', dataPregacao)
        form.set('pregador_id', String(pregadorId))
        if (eventoId) form.set('evento_id', String(eventoId))
        form.set('publicado', publicado ? 'true' : 'false')
        if (refs.length > 0) form.set('referencias_biblicas', JSON.stringify(refs))
        const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean)
        if (tags.length > 0) form.set('tags', JSON.stringify(tags))

        const res = await atualizarSermao(sermao.id, form)
        setSaving(false)
        if (res.ok) {
            setSaveMsg('Guardado com sucesso!')
            setTimeout(() => setSaveMsg(''), 3000)
        } else {
            setSaveMsg(res.error || 'Erro ao guardar.')
        }
    }

    const tagsArr = tagsStr.split(',').map(t => t.trim()).filter(Boolean)

    return (
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 animate-in fade-in duration-700">
            {/* Back + Title */}
            <div className="flex items-center gap-4 mb-8">
                <Link
                    href="/pregacao"
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors"
                >
                    <ArrowLeft size={12} />
                    Voltar
                </Link>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                    {saveMsg && (
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${saveMsg.includes('sucesso') ? 'text-green-500' : 'text-red-400'}`}>
                            {saveMsg}
                        </span>
                    )}
                    <button
                        onClick={handleSalvar}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        {saving ? 'A guardar...' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* LEFT: Editor */}
                <div className="flex-1 space-y-5">
                    {/* Title */}
                    <input
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="w-full bg-transparent text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-fg border-b border-soft pb-3 focus:outline-none focus:border-figueira transition-colors placeholder:text-muted/30"
                        placeholder="Titulo do sermao"
                    />

                    {/* Meta row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                            value={pregadorId}
                            onChange={(e) => setPregadorId(Number(e.target.value))}
                            className="bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                        >
                            {membros.map(m => (
                                <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                            ))}
                        </select>
                        <input
                            type="date"
                            value={dataPregacao}
                            onChange={(e) => setDataPregacao(e.target.value)}
                            className="bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                        />
                        <select
                            value={eventoId ?? ''}
                            onChange={(e) => setEventoId(e.target.value ? Number(e.target.value) : null)}
                            className="bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"
                        >
                            <option value="">Sem evento</option>
                            {eventos.map(e => (
                                <option key={e.id} value={e.id}>
                                    {e.nome} — {new Date(e.data).toLocaleDateString('pt-PT')}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tags</label>
                        <input
                            value={tagsStr}
                            onChange={(e) => setTagsStr(e.target.value)}
                            className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                            placeholder="fe, oracao, amor..."
                        />
                        {tagsArr.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {tagsArr.map((tag, i) => (
                                    <span key={i} className="text-[8px] font-bold uppercase tracking-wider bg-figueira/10 text-figueira px-2.5 py-0.5 rounded-full">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* References */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Referencias Biblicas</label>
                        <div className="flex gap-2">
                            <input
                                value={refInput}
                                onChange={(e) => setRefInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarRef() } }}
                                className="flex-1 bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                                placeholder="Ex: Joao 3:16"
                            />
                            <button
                                onClick={adicionarRef}
                                className="px-4 py-2 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-opacity"
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                        {refs.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {refs.map((ref, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 bg-figueira/10 text-figueira text-[9px] font-bold px-3 py-1 rounded-full">
                                        {formatarRef(ref)}
                                        <button onClick={() => removerRef(i)} className="hover:text-red-400 transition-colors">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Main textarea */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Corpo do Sermao</label>
                        <textarea
                            value={textCorpo}
                            onChange={(e) => setTextCorpo(e.target.value)}
                            rows={20}
                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs text-fg leading-relaxed placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y font-mono"
                            placeholder="Escreve o corpo do sermao aqui..."
                        />
                    </div>

                    {/* Private notes */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Notas Privadas</label>
                        <textarea
                            value={notasPrivadas}
                            onChange={(e) => setNotasPrivadas(e.target.value)}
                            rows={4}
                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-3 text-xs text-fg/70 leading-relaxed placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y"
                            placeholder="Notas pessoais (nao serao partilhadas)..."
                        />
                    </div>

                    {/* Published toggle */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={publicado}
                            onChange={(e) => setPublicado(e.target.checked)}
                            className="w-4 h-4 rounded border-soft accent-figueira"
                        />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                            {publicado ? <Eye size={12} className="text-green-500" /> : <EyeOff size={12} />}
                            {publicado ? 'Publicado' : 'Rascunho'}
                        </span>
                    </label>

                    {/* Linked EBDs */}
                    {sermao.escolasBiblicas.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Aulas EBD vinculadas</p>
                            <div className="space-y-1">
                                {sermao.escolasBiblicas.map(ebd => (
                                    <div key={ebd.id} className="text-[10px] text-fg/70 bg-bg border border-soft rounded-xl px-3 py-2">
                                        {ebd.titulo} — {new Date(ebd.data).toLocaleDateString('pt-PT')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Bible Panel */}
                <div className="lg:w-80 flex-shrink-0">
                    <div className="sticky top-4 bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        <button
                            onClick={() => setBiblePanelOpen(!biblePanelOpen)}
                            className="w-full px-5 py-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-fg hover:bg-bg transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <BookOpen size={12} className="text-figueira" />
                                Biblia
                            </span>
                            {biblePanelOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {biblePanelOpen && (
                            <div className="px-5 pb-5 space-y-4">
                                {/* Search */}
                                <div className="flex gap-2">
                                    <input
                                        value={bibleSearch}
                                        onChange={(e) => setBibleSearch(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') buscarBiblia() }}
                                        className="flex-1 bg-bg border border-soft rounded-2xl px-3 py-2 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors"
                                        placeholder="Joao 3:16"
                                    />
                                    <button
                                        onClick={buscarBiblia}
                                        disabled={bibleLoading}
                                        className="px-3 py-2 bg-figueira text-white rounded-2xl hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {bibleLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                    </button>
                                </div>

                                {/* Result */}
                                {bibleResult && (
                                    <div className="bg-bg border border-soft rounded-2xl p-4 space-y-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-figueira">{bibleResult.reference}</p>
                                        <p className="text-[11px] text-fg/80 leading-relaxed italic">{bibleResult.text}</p>
                                        {bibleResult.reference !== 'Erro' && (
                                            <button
                                                onClick={inserirNoSermao}
                                                className="w-full mt-2 py-2 bg-figueira/10 text-figueira text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-figueira/20 transition-colors"
                                            >
                                                Inserir no Sermao
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* References list */}
                                {refs.length > 0 && (
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Referencias usadas ({refs.length})</p>
                                        <div className="space-y-1">
                                            {refs.map((ref, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between bg-bg border border-soft rounded-xl px-3 py-1.5 group"
                                                >
                                                    <button
                                                        onClick={() => { setBibleSearch(formatarRef(ref)); buscarBiblia() }}
                                                        className="text-[10px] font-bold text-fg hover:text-figueira transition-colors text-left"
                                                    >
                                                        {formatarRef(ref)}
                                                    </button>
                                                    <button
                                                        onClick={() => removerRef(i)}
                                                        className="text-muted/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}

'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    BookOpen, Edit3, Save, X, Loader2, Search,
    Hash, AlignLeft, Mic, Trash2, CheckCircle2
} from 'lucide-react'
import {
    buscarMensagemEventoAction,
    salvarMensagemEventoAction,
    removerMensagemEventoAction
} from '@/actions/escalas-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

interface Membro {
    id: number
    first_name: string
    last_name: string
    avatar_file?: string | null
}

interface MensagemData {
    id?: number
    pregador_id?: number | null
    pregador?: Membro | null
    titulo?: string | null
    texto_biblico?: string | null
    tema?: string | null
    notas?: string | null
}

interface Props {
    eventoId: number
    eventoNome: string
    mensagemInicial?: MensagemData | null
    membros: Membro[]
    podeEditar: boolean
}

export default function SecaoMensagemEvento({
    eventoId,
    eventoNome,
    mensagemInicial = null,
    membros,
    podeEditar
}: Props) {
    const router = useRouter()
    const confirmar = useConfirm()
    const toast = useToast()
    const [isPending, startTransition] = useTransition()

    const [loading, setLoading] = useState(false)
    const [salvando, setSalvando] = useState(false)
    const [editando, setEditando] = useState(false)
    const [mensagem, setMensagem] = useState<MensagemData | null>(mensagemInicial)

    // Form
    const [pregadorId, setPregadorId] = useState(mensagemInicial?.pregador_id?.toString() ?? '')
    const [titulo, setTitulo] = useState(mensagemInicial?.titulo ?? '')
    const [textoBiblico, setTextoBiblico] = useState(mensagemInicial?.texto_biblico ?? '')
    const [tema, setTema] = useState(mensagemInicial?.tema ?? '')
    const [notas, setNotas] = useState(mensagemInicial?.notas ?? '')
    const [buscaPregador, setBuscaPregador] = useState(
        mensagemInicial?.pregador
            ? `${mensagemInicial.pregador.first_name} ${mensagemInicial.pregador.last_name}`
            : ''
    )

    // Se não tiver mensagemInicial, tenta carregar via action
    useEffect(() => {
        if (mensagemInicial !== undefined) return
        carregar()
    }, [eventoId])

    async function carregar() {
        setLoading(true)
        const res = await buscarMensagemEventoAction(eventoId)
        if (res.sucesso && res.mensagem) {
            setMensagem(res.mensagem)
            setPregadorId(res.mensagem.pregador_id?.toString() ?? '')
            setTitulo(res.mensagem.titulo ?? '')
            setTextoBiblico(res.mensagem.texto_biblico ?? '')
            setTema(res.mensagem.tema ?? '')
            setNotas(res.mensagem.notas ?? '')
            if (res.mensagem.pregador) {
                setBuscaPregador(`${res.mensagem.pregador.first_name} ${res.mensagem.pregador.last_name}`)
            }
        }
        setLoading(false)
    }

    const resetForm = () => {
        if (mensagem) {
            setPregadorId(mensagem.pregador_id?.toString() ?? '')
            setTitulo(mensagem.titulo ?? '')
            setTextoBiblico(mensagem.texto_biblico ?? '')
            setTema(mensagem.tema ?? '')
            setNotas(mensagem.notas ?? '')
            setBuscaPregador(mensagem.pregador
                ? `${mensagem.pregador.first_name} ${mensagem.pregador.last_name}`
                : '')
        } else {
            setPregadorId('')
            setTitulo('')
            setTextoBiblico('')
            setTema('')
            setNotas('')
            setBuscaPregador('')
        }
        setEditando(false)
    }

    async function handleSalvar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSalvando(true)

        const fd = new FormData()
        fd.append('evento_id', eventoId.toString())
        if (pregadorId) fd.append('pregador_id', pregadorId)
        if (titulo) fd.append('titulo', titulo)
        if (textoBiblico) fd.append('texto_biblico', textoBiblico)
        if (tema) fd.append('tema', tema)
        if (notas) fd.append('notas', notas)

        const res = await salvarMensagemEventoAction(fd)
        if (res.sucesso) {
            // Actualiza o estado local com os novos dados
            const pregadorActual = membros.find(m => String(m.id) === pregadorId)
            setMensagem({
                pregador_id: pregadorId ? Number(pregadorId) : null,
                pregador: pregadorActual ?? null,
                titulo: titulo || null,
                texto_biblico: textoBiblico || null,
                tema: tema || null,
                notas: notas || null,
            })
            setEditando(false)
            startTransition(() => router.refresh())
        } else {
            toast(res.error || 'Erro ao guardar.', 'erro')
        }
        setSalvando(false)
    }

    async function handleRemover() {
        const ok = await confirmar({ mensagem: 'Remover a mensagem deste evento?', tipo: 'perigo' })
        if (!ok) return
        const res = await removerMensagemEventoAction(eventoId)
        if (res.sucesso) {
            setMensagem(null)
            setPregadorId('')
            setTitulo('')
            setTextoBiblico('')
            setTema('')
            setNotas('')
            setBuscaPregador('')
            setEditando(false)
            startTransition(() => router.refresh())
        }
    }

    const pregadorSelecionado = membros.find(m => String(m.id) === pregadorId)

    const membrosFiltrados = buscaPregador && !pregadorId
        ? membros.filter(m =>
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(buscaPregador.toLowerCase())
        )
        : []

    if (loading) {
        return (
            <div className="border-t border-soft flex items-center gap-2 py-4 px-6">
                <Loader2 size={13} className="animate-spin text-figueira" />
                <span className="text-[9px] font-black uppercase tracking-widest text-muted">A carregar mensagem...</span>
            </div>
        )
    }

    return (
        <div className="border-t border-soft">

            {/* CABEÇALHO */}
            <div className="flex items-center justify-between px-6 py-4 bg-blue-500/3">
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-blue-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-fg">
                        Mensagem do Culto
                    </h4>
                    {mensagem?.titulo && (
                        <span className="text-[7px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={8} /> Preenchida
                        </span>
                    )}
                </div>
                {podeEditar && !editando && (
                    <div className="flex items-center gap-2">
                        {mensagem?.titulo && (
                            <button
                                onClick={handleRemover}
                                className="w-7 h-7 flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                title="Remover mensagem"
                            >
                                <Trash2 size={12} />
                            </button>
                        )}
                        <button
                            onClick={() => setEditando(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-soft text-muted hover:border-blue-400/40 hover:text-blue-600 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                            <Edit3 size={11} />
                            {mensagem?.titulo ? 'Editar' : 'Preencher'}
                        </button>
                    </div>
                )}
            </div>

            {/* VISUALIZAÇÃO */}
            {!editando && mensagem?.titulo && (
                <div className="px-6 py-5 space-y-4 animate-in fade-in duration-200">

                    {/* PREGADOR */}
                    {mensagem.pregador && (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 overflow-hidden flex items-center justify-center shrink-0">
                                {mensagem.pregador.avatar_file
                                    ? <img src={mensagem.pregador.avatar_file} alt="" className="w-full h-full object-cover" />
                                    : <span className="text-[11px] font-black text-blue-600">
                                        {mensagem.pregador.first_name[0]}{mensagem.pregador.last_name[0]}
                                    </span>
                                }
                            </div>
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted">Pregador</p>
                                <p className="text-sm font-black uppercase text-fg leading-none mt-0.5">
                                    {mensagem.pregador.first_name} {mensagem.pregador.last_name}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TÍTULO */}
                    <div className="bg-blue-500/5 border border-blue-500/15 rounded-2xl px-5 py-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-blue-500/70 mb-1">
                            Título da Mensagem
                        </p>
                        <p className="text-base font-black uppercase italic tracking-tighter text-fg">
                            "{mensagem.titulo}"
                        </p>
                    </div>

                    {/* TEXTO BÍBLICO + TEMA */}
                    {(mensagem.texto_biblico || mensagem.tema) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {mensagem.texto_biblico && (
                                <div className="bg-bg border border-soft rounded-2xl px-4 py-3">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-1">Texto Bíblico</p>
                                    <p className="text-sm font-black text-fg">{mensagem.texto_biblico}</p>
                                </div>
                            )}
                            {mensagem.tema && (
                                <div className="bg-bg border border-soft rounded-2xl px-4 py-3">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-1">Tema</p>
                                    <p className="text-sm font-bold text-fg">{mensagem.tema}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* NOTAS */}
                    {mensagem.notas && (
                        <div className="bg-bg border border-soft rounded-2xl px-4 py-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2 flex items-center gap-1">
                                <AlignLeft size={9} /> Esboço / Notas
                            </p>
                            <p className="text-sm text-fg font-medium whitespace-pre-wrap leading-relaxed">
                                {mensagem.notas}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ESTADO VAZIO */}
            {!editando && !mensagem?.titulo && (
                <div className="px-6 py-6 text-center">
                    <BookOpen size={22} className="mx-auto text-muted/20 mb-2" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                        Nenhuma mensagem registada
                    </p>
                    {podeEditar && (
                        <button
                            onClick={() => setEditando(true)}
                            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                        >
                            <Edit3 size={11} /> Preencher Mensagem
                        </button>
                    )}
                </div>
            )}

            {/* FORMULÁRIO DE EDIÇÃO */}
            {editando && (
                <form onSubmit={handleSalvar} className="px-6 py-5 space-y-4 animate-in slide-in-from-top-2 duration-200">

                    {/* PREGADOR */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                            <Mic size={10} /> Pregador
                        </label>
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Pesquisar membro..."
                                value={buscaPregador}
                                onChange={e => {
                                    setBuscaPregador(e.target.value)
                                    if (pregadorId) setPregadorId('')
                                }}
                                className="w-full bg-bg border border-soft rounded-xl pl-8 pr-4 py-2.5 text-sm font-medium text-fg focus:border-blue-400 outline-none transition-all placeholder:text-muted/40"
                            />
                        </div>

                        {/* DROPDOWN */}
                        {membrosFiltrados.length > 0 && (
                            <div className="bg-bg border border-soft rounded-2xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                                {membrosFiltrados.map(m => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            setPregadorId(String(m.id))
                                            setBuscaPregador(`${m.first_name} ${m.last_name}`)
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-soft/50 transition-colors text-left"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 text-[9px] font-black text-blue-600">
                                            {m.first_name[0]}{m.last_name[0]}
                                        </div>
                                        <span className="text-sm font-bold text-fg">
                                            {m.first_name} {m.last_name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {pregadorId && pregadorSelecionado && (
                            <div className="flex items-center gap-2 bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2">
                                <CheckCircle2 size={12} className="text-blue-500 shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 flex-1">
                                    {pregadorSelecionado.first_name} {pregadorSelecionado.last_name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setPregadorId(''); setBuscaPregador('') }}
                                    className="text-muted hover:text-red-500 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* TÍTULO */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                            <Hash size={10} /> Título da Mensagem *
                        </label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={e => setTitulo(e.target.value)}
                            placeholder='Ex: "O Poder da Fé"'
                            required
                            className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm font-medium text-fg focus:border-blue-400 outline-none transition-all placeholder:text-muted/40"
                        />
                    </div>

                    {/* TEXTO BÍBLICO + TEMA */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                <BookOpen size={10} /> Texto Bíblico
                            </label>
                            <input
                                type="text"
                                value={textoBiblico}
                                onChange={e => setTextoBiblico(e.target.value)}
                                placeholder="Ex: João 3:16"
                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm font-medium text-fg focus:border-blue-400 outline-none transition-all placeholder:text-muted/40"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                <Hash size={10} /> Tema
                            </label>
                            <input
                                type="text"
                                value={tema}
                                onChange={e => setTema(e.target.value)}
                                placeholder="Ex: Salvação, Família, Fé..."
                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm font-medium text-fg focus:border-blue-400 outline-none transition-all placeholder:text-muted/40"
                            />
                        </div>
                    </div>

                    {/* NOTAS */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                            <AlignLeft size={10} /> Esboço / Notas
                            <span className="text-muted/50 normal-case font-medium">(opcional)</span>
                        </label>
                        <textarea
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
                            placeholder="Pontos principais, estrutura da mensagem, versículos de apoio..."
                            rows={4}
                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-medium text-fg focus:border-blue-400 outline-none transition-all placeholder:text-muted/40 resize-none leading-relaxed"
                        />
                    </div>

                    {/* BOTÕES */}
                    <div className="flex gap-2 pt-1">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg border border-soft text-muted hover:bg-soft transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={salvando || !titulo.trim()}
                            className="flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-blue-500 text-white hover:bg-blue-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95"
                        >
                            {salvando
                                ? <><Loader2 size={13} className="animate-spin" /> A guardar...</>
                                : <><Save size={13} /> Guardar</>
                            }
                        </button>
                    </div>
                </form>
            )}
        </div>
    )
}
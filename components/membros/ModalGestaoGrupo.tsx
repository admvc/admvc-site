'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
    X, Users, Clock, BookOpen, Camera, ChevronDown,
    Plus, Loader2, Check, MapPin,
    UserCheck, ClipboardList, Pencil,
    CheckCircle2, Circle, Image as ImageIcon, Trash2
} from 'lucide-react'
import { atualizarHorarioGrupo, registarEncontro } from '@/actions/grupo-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Membro {
    id: number
    first_name: string
    last_name: string
    avatar_file?: string | null
}

interface Encontro {
    id: number
    data: Date | string
    tema: string
    foto_url?: string | null
    criado_em: Date | string
    presentes: Membro[]
}

interface Grupo {
    id: number
    nome: string
    dia_semana: string
    horario: string
    bairro: string
    cidade: string
    categoria?: string | null
    descricao?: string | null
    membros: Membro[]
    lideres: Membro[]
    encontros?: Encontro[]
}

interface Props {
    grupo: Grupo
    membroId: number
    isLider: boolean
}

type Aba = 'sobre' | 'encontros' | 'novo' | 'horario'

export default function ModalGestaoGrupo({ grupo, membroId, isLider }: Props) {
    const router = useRouter()
    const toast = useToast()
    const [isPending, startTransition] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [aba, setAba] = useState<Aba>('sobre')

    const [salvando, setSalvando] = useState(false)
    const [sucesso, setSucesso] = useState(false)
    const [presentes, setPresentes] = useState<number[]>([])
    const [tema, setTema] = useState('')
    const [dataEncontro, setDataEncontro] = useState(new Date().toISOString().split('T')[0])

    const fileInputRef = useRef<HTMLInputElement>(null)
    const [fotoPreview, setFotoPreview] = useState<string | null>(null)
    const [fotoFile, setFotoFile] = useState<File | null>(null)
    const [uploadProgress, setUploadProgress] = useState(false)

    const [salvandoHorario, setSalvandoHorario] = useState(false)
    const [sucessoHorario, setSucessoHorario] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (aberto) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [aberto])

    // Lightbox
    const [fotoAmpliada, setFotoAmpliada] = useState<{ url: string; tema: string } | null>(null)

    const encontros: Encontro[] = grupo.encontros || []

    const togglePresente = (id: number) => {
        setPresentes(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
    }

    const selecionarTodos = () => {
        setPresentes(prev => prev.length === grupo.membros.length ? [] : grupo.membros.map(m => m.id))
    }

    const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) { toast('A foto não pode ter mais de 5MB.', 'aviso'); return }
        setFotoFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setFotoPreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const removerFoto = () => {
        setFotoFile(null)
        setFotoPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleRegistarEncontro = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        // ✅ Captura ANTES de qualquer await
        const formData = new FormData(e.currentTarget)
        setSalvando(true)

        console.log('🟡 [ENCONTRO] Iniciando registo...')
        console.log('🟡 [ENCONTRO] Tema:', tema)
        console.log('🟡 [ENCONTRO] Data:', dataEncontro)
        console.log('🟡 [ENCONTRO] Presentes:', presentes)
        console.log('🟡 [ENCONTRO] Tem foto?', !!fotoFile, fotoFile ? `(${fotoFile.name}, ${(fotoFile.size / 1024).toFixed(1)}KB, ${fotoFile.type})` : '')

        try {
            let foto_url: string | null = null

            if (fotoFile) {
                setUploadProgress(true)
                console.log('🔵 [UPLOAD] A enviar foto para /api/upload/encontro-foto...')

                const uploadFormData = new FormData()
                uploadFormData.append('file', fotoFile)
                uploadFormData.append('grupo_id', grupo.id.toString())

                const uploadRes = await fetch('/api/upload/encontro-foto', {
                    method: 'POST',
                    body: uploadFormData
                })

                console.log('🔵 [UPLOAD] Status HTTP:', uploadRes.status, uploadRes.statusText)

                const uploadJson = await uploadRes.json()
                console.log('🔵 [UPLOAD] Resposta JSON:', uploadJson)

                if (!uploadRes.ok) {
                    throw new Error(uploadJson.error || `Erro HTTP ${uploadRes.status}`)
                }

                foto_url = uploadJson.url
                console.log('✅ [UPLOAD] URL gerada:', foto_url)
                setUploadProgress(false)
            }

            formData.append('grupo_id', grupo.id.toString())
            presentes.forEach(id => formData.append('presentes_ids', id.toString()))
            if (foto_url) formData.append('foto_url', foto_url)

            console.log('🔵 [ENCONTRO] A chamar Server Action registarEncontro...')
            console.log('🔵 [ENCONTRO] formData foto_url:', foto_url)

            const res = await registarEncontro(formData) as { sucesso: boolean; error?: string }
            console.log('🔵 [ENCONTRO] Resposta da action:', res)

            if (res.sucesso) {
                console.log('✅ [ENCONTRO] Registado com sucesso!')
                setSucesso(true)
                setTema(''); setPresentes([]); removerFoto()
                setTimeout(() => { setSucesso(false); setAba('encontros'); startTransition(() => router.refresh()) }, 1500)
            } else {
                console.error('❌ [ENCONTRO] Erro da action:', res.error)
                toast(res.error || 'Erro ao registar encontro.', 'erro')
            }
        } catch (err: any) {
            console.error('❌ [ENCONTRO] Exceção capturada:', err)
            toast(err.message || 'Erro inesperado.', 'erro')
            setUploadProgress(false)
        } finally {
            setSalvando(false)
        }
    }

    const handleAtualizarHorario = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setSalvandoHorario(true)
        const formData = new FormData(e.currentTarget)
        formData.append('grupo_id', grupo.id.toString())
        try {
            const res = await atualizarHorarioGrupo(formData) as { sucesso: boolean; error?: string }
            if (res.sucesso) { setSucessoHorario(true); setTimeout(() => { setSucessoHorario(false); startTransition(() => router.refresh()) }, 1500) }
            else toast(res.error || 'Erro ao atualizar.', 'erro')
        } catch { toast('Erro de ligação.', 'erro') }
        finally { setSalvandoHorario(false) }
    }

    const formatarData = (data: Date | string) => new Date(data).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    const isLoading = salvando || uploadProgress

    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setAberto(true) }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 bg-fg text-bg hover:bg-figueira"
            >
                <ClipboardList size={14} />
                {isLider ? 'Gerir Grupo' : 'Ver Encontros'}
            </button>

            {mounted && aberto && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setAberto(false)}>
                    <div className="bg-bg w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-soft flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]" onClick={e => e.stopPropagation()}>

                        {/* CABEÇALHO */}
                        <div className="p-6 border-b border-soft flex items-start justify-between gap-4 shrink-0 bg-bg2 rounded-t-[2.5rem]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                                    <Users size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-fg leading-none">{grupo.nome}</h2>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1"><Clock size={10} /> {grupo.dia_semana} · {grupo.horario}</span>
                                        <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1"><MapPin size={10} /> {grupo.bairro}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setAberto(false)} className="w-9 h-9 flex items-center justify-center bg-bg border border-soft text-muted rounded-xl hover:bg-soft transition-all shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        {/* TABS */}
                        <div className="flex gap-1 p-3 border-b border-soft shrink-0 bg-bg2 overflow-x-auto">
                            <TabBtn label="Sobre" icon={<Users size={12} />} ativo={aba === 'sobre'} onClick={() => setAba('sobre')} />
                            <TabBtn label="Histórico" icon={<BookOpen size={12} />} ativo={aba === 'encontros'} onClick={() => setAba('encontros')} />
                            {isLider && <>
                                <TabBtn label="Novo Encontro" icon={<Plus size={12} />} ativo={aba === 'novo'} onClick={() => setAba('novo')} destaque />
                                <TabBtn label="Horário" icon={<Pencil size={12} />} ativo={aba === 'horario'} onClick={() => setAba('horario')} />
                            </>}
                        </div>

                        {/* CONTEÚDO */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">

                            {/* SOBRE */}
                            {aba === 'sobre' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    {grupo.descricao && (
                                        <div className="bg-bg2 border border-soft rounded-2xl p-5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Descricao</p>
                                            <p className="text-sm text-fg leading-relaxed">{grupo.descricao}</p>
                                        </div>
                                    )}
                                    {grupo.categoria && (
                                        <div className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted">Categoria</span>
                                            <span className="text-xs font-black text-fg uppercase">{grupo.categoria}</span>
                                        </div>
                                    )}
                                    <div className="bg-bg2 border border-soft rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-3">Lideres</p>
                                        <div className="flex flex-wrap gap-2">
                                            {grupo.lideres.map(l => (
                                                <span key={l.id} className="text-[10px] font-black uppercase bg-figueira/10 text-figueira border border-figueira/20 px-3 py-1.5 rounded-lg">
                                                    {l.first_name} {l.last_name}
                                                </span>
                                            ))}
                                            {grupo.lideres.length === 0 && <span className="text-[10px] text-muted italic">Sem lideres definidos</span>}
                                        </div>
                                    </div>
                                    <div className="bg-bg2 border border-soft rounded-2xl p-4">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-3">Membros ({grupo.membros.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {grupo.membros.map(m => (
                                                <span key={m.id} className="text-[9px] font-bold bg-bg border border-soft px-2.5 py-1 rounded-lg text-fg">
                                                    {m.first_name} {m.last_name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* HISTÓRICO */}
                            {aba === 'encontros' && (
                                <div className="space-y-3 animate-in fade-in duration-200">
                                    {encontros.length === 0 ? (
                                        <div className="py-16 text-center border-2 border-dashed border-soft rounded-3xl">
                                            <BookOpen size={32} className="mx-auto text-muted/30 mb-3" />
                                            <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhum encontro registado.</p>
                                            {isLider && (
                                                <button onClick={() => setAba('novo')} className="mt-4 text-[9px] font-black uppercase tracking-widest text-figueira hover:underline flex items-center gap-1 mx-auto">
                                                    <Plus size={11} /> Registar primeiro encontro
                                                </button>
                                            )}
                                        </div>
                                    ) : (() => {
                                        const sorted = encontros.slice().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                        return (
                                            <>
                                                {sorted.slice(0, 5).map((enc, idx) => (
                                                    <details key={enc.id} className="group/enc bg-bg2 border border-soft rounded-[1.5rem] overflow-hidden hover:border-figueira/30 transition-all" open={idx === 0}>
                                                        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden p-4 flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <div className="bg-fg text-bg rounded-xl p-2 text-center shrink-0 min-w-[44px]">
                                                                    <span className="block text-[7px] font-black uppercase opacity-60">{new Date(enc.data).toLocaleDateString('pt-PT', { month: 'short' })}</span>
                                                                    <span className="block text-base font-black italic leading-none">{new Date(enc.data).toLocaleDateString('pt-PT', { day: '2-digit' })}</span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <h4 className="text-xs font-black uppercase italic tracking-tight text-fg leading-tight truncate">{enc.tema}</h4>
                                                                    <p className="text-[8px] font-bold text-muted">{formatarData(enc.data)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                {enc.foto_url && <Camera size={10} className="text-figueira" />}
                                                                <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">
                                                                    <UserCheck size={10} />
                                                                    <span className="text-[8px] font-black">{enc.presentes.length}</span>
                                                                </div>
                                                                <ChevronDown size={12} className="text-muted group-open/enc:rotate-180 transition-transform" />
                                                            </div>
                                                        </summary>
                                                        <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200">
                                                            {enc.foto_url && (
                                                                <button
                                                                    onClick={() => setFotoAmpliada({ url: enc.foto_url!, tema: enc.tema })}
                                                                    className="relative w-full h-40 rounded-xl overflow-hidden border border-soft hover:border-figueira transition-all group/thumb"
                                                                    title="Ver foto ampliada"
                                                                >
                                                                    <img src={enc.foto_url} alt={enc.tema} loading="lazy" className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/20 transition-all flex items-center justify-center">
                                                                        <Camera size={20} className="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
                                                                    </div>
                                                                </button>
                                                            )}
                                                            {enc.presentes.length > 0 && (
                                                                <div className="pt-2 border-t border-soft">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">Presentes</p>
                                                                    <div className="flex flex-wrap gap-1.5">
                                                                        {enc.presentes.map(p => (
                                                                            <span key={p.id} className="text-[8px] font-black uppercase tracking-wide bg-bg border border-soft px-2 py-1 rounded-lg text-fg">
                                                                                {p.first_name} {p.last_name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </details>
                                                ))}
                                                {sorted.length > 5 && (
                                                    <details className="group/more">
                                                        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden text-center py-3">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-figueira hover:underline">
                                                                Ver mais {sorted.length - 5} encontros <ChevronDown size={10} className="inline group-open/more:rotate-180 transition-transform" />
                                                            </span>
                                                        </summary>
                                                        <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                                                            {sorted.slice(5).map(enc => (
                                                                <div key={enc.id} className="flex items-center gap-3 bg-bg2 border border-soft rounded-xl px-4 py-3">
                                                                    <div className="bg-fg text-bg rounded-lg p-1.5 text-center shrink-0 min-w-[36px]">
                                                                        <span className="block text-[7px] font-black uppercase opacity-60">{new Date(enc.data).toLocaleDateString('pt-PT', { month: 'short' })}</span>
                                                                        <span className="block text-sm font-black italic leading-none">{new Date(enc.data).toLocaleDateString('pt-PT', { day: '2-digit' })}</span>
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[10px] font-black uppercase text-fg truncate">{enc.tema}</p>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-muted text-[8px] font-bold">
                                                                        {enc.foto_url && <Camera size={9} className="text-figueira" />}
                                                                        <UserCheck size={9} /> {enc.presentes.length}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </details>
                                                )}
                                            </>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* LIGHTBOX */}
                            {fotoAmpliada && (
                                <div
                                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-200"
                                    onClick={() => setFotoAmpliada(null)}
                                >
                                    <div className="relative max-w-3xl w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                        <img
                                            src={fotoAmpliada.url}
                                            alt={fotoAmpliada.tema}
                                            className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl">
                                            <p className="text-white font-black uppercase italic tracking-tight text-sm">{fotoAmpliada.tema}</p>
                                        </div>
                                        <button
                                            onClick={() => setFotoAmpliada(null)}
                                            className="absolute top-3 right-3 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-xl flex items-center justify-center transition-all backdrop-blur-sm"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* NOVO ENCONTRO */}
                            {aba === 'novo' && isLider && (
                                <form onSubmit={handleRegistarEncontro} className="space-y-4 animate-in fade-in duration-200">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest">Data do Encontro</label>
                                        <input type="date" name="data" required value={dataEncontro} onChange={e => setDataEncontro(e.target.value)}
                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold focus:border-figueira outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest">Tema / Título</label>
                                        <input type="text" name="tema" required placeholder="Ex: Oração e Fé..." value={tema} onChange={e => setTema(e.target.value)}
                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold focus:border-figueira outline-none placeholder:text-muted/40" />
                                    </div>

                                    {/* UPLOAD FOTO */}
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                            <Camera size={11} /> Foto <span className="text-muted/50">(opcional)</span>
                                        </label>
                                        {fotoPreview ? (
                                            <div className="relative rounded-2xl overflow-hidden border border-soft">
                                                <img src={fotoPreview} alt="Preview" className="w-full h-36 object-cover" />
                                                <button type="button" onClick={removerFoto} className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 transition-all shadow-md">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                                className="w-full h-20 border-2 border-dashed border-soft rounded-2xl flex items-center justify-center gap-3 hover:border-figueira/40 hover:bg-figueira/5 transition-all group">
                                                <ImageIcon size={16} className="text-muted group-hover:text-figueira transition-colors" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted group-hover:text-figueira transition-colors">Adicionar foto</span>
                                            </button>
                                        )}
                                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFotoChange} className="hidden" />
                                    </div>

                                    {/* LISTA DE PRESENÇA */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                                <UserCheck size={11} /> Presenças ({presentes.length}/{grupo.membros.length})
                                            </label>
                                            <button type="button" onClick={selecionarTodos} className="text-[8px] font-black uppercase tracking-widest text-figueira hover:underline">
                                                {presentes.length === grupo.membros.length ? 'Desmarcar' : 'Todos'}
                                            </button>
                                        </div>
                                        <div className="bg-bg border border-soft rounded-2xl overflow-hidden divide-y divide-soft/50 max-h-48 overflow-y-auto">
                                            {grupo.membros.length === 0
                                                ? <p className="text-[10px] text-muted italic p-4 text-center">Nenhum membro no grupo.</p>
                                                : grupo.membros.map(m => {
                                                    const presente = presentes.includes(m.id)
                                                    return (
                                                        <button key={m.id} type="button" onClick={() => togglePresente(m.id)}
                                                            className={`w-full flex items-center justify-between px-3 py-2.5 transition-all text-left ${presente ? 'bg-emerald-500/5' : 'hover:bg-soft/30'}`}>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-bg2 border border-soft flex items-center justify-center text-[10px] font-black text-muted overflow-hidden shrink-0">
                                                                    {m.avatar_file ? <img src={m.avatar_file} alt="" className="w-full h-full object-cover" /> : m.first_name[0]}
                                                                </div>
                                                                <span className={`text-[10px] font-black uppercase tracking-wide transition-colors ${presente ? 'text-emerald-700' : 'text-fg'}`}>
                                                                    {m.first_name} {m.last_name}
                                                                </span>
                                                            </div>
                                                            {presente ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> : <Circle size={16} className="text-soft shrink-0" />}
                                                        </button>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>

                                    {uploadProgress && (
                                        <div className="flex items-center gap-3 bg-figueira/5 border border-figueira/20 rounded-2xl px-4 py-3">
                                            <Loader2 size={14} className="animate-spin text-figueira shrink-0" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-figueira">A fazer upload da foto...</span>
                                        </div>
                                    )}

                                    <button type="submit" disabled={isLoading || sucesso}
                                        className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shadow-md ${sucesso ? 'bg-emerald-500 text-white' : 'bg-figueira text-white hover:brightness-110'}`}>
                                        {isLoading
                                            ? <><Loader2 size={14} className="animate-spin" />{uploadProgress ? 'A enviar foto...' : 'A guardar...'}</>
                                            : sucesso ? <><Check size={14} /> Registado!</>
                                                : <><Plus size={14} /> Registar Encontro</>}
                                    </button>
                                </form>
                            )}

                            {/* HORÁRIO */}
                            {aba === 'horario' && isLider && (
                                <HorarioForm
                                    grupo={grupo}
                                    salvando={salvandoHorario}
                                    sucesso={sucessoHorario}
                                    onSubmit={handleAtualizarHorario}
                                />
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}
        </>
    )
}

function TabBtn({ label, icon, ativo, onClick, destaque }: { label: string; icon: React.ReactNode; ativo: boolean; onClick: () => void; destaque?: boolean }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${ativo ? (destaque ? 'bg-figueira text-white shadow-md' : 'bg-fg text-bg shadow-sm') : 'text-muted hover:text-fg hover:bg-soft/50'}`}>
            {icon} {label}
        </button>
    )
}

const DIAS_SEMANA = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']

const FREQUENCIAS = [
    { id: 'semanal', label: 'Semanal' },
    { id: 'quinzenal', label: 'Quinzenal' },
    { id: 'mensal', label: 'Mensal' },
    { id: 'data', label: 'Data específica' },
]

function parseFrequencia(diaSemana: string): { freq: string; dia: string; dataEsp: string } {
    if (!diaSemana) return { freq: 'semanal', dia: 'Segunda-feira', dataEsp: '' }
    if (diaSemana.startsWith('Quinzenal - ')) return { freq: 'quinzenal', dia: diaSemana.replace('Quinzenal - ', ''), dataEsp: '' }
    if (diaSemana.startsWith('Mensal - ')) return { freq: 'mensal', dia: diaSemana.replace('Mensal - ', ''), dataEsp: '' }
    if (/^\d{4}-\d{2}-\d{2}/.test(diaSemana)) return { freq: 'data', dia: '', dataEsp: diaSemana }
    return { freq: 'semanal', dia: diaSemana, dataEsp: '' }
}

function HorarioForm({ grupo, salvando, sucesso, onSubmit }: {
    grupo: any; salvando: boolean; sucesso: boolean; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}) {
    const parsed = parseFrequencia(grupo.dia_semana)
    const [freq, setFreq] = useState(parsed.freq)
    const [dia, setDia] = useState(parsed.dia || 'Segunda-feira')
    const [dataEsp, setDataEsp] = useState(parsed.dataEsp)
    const [horario, setHorario] = useState(grupo.horario || '')

    // Compor o valor final de dia_semana
    const diaSemanaValue = freq === 'semanal' ? dia
        : freq === 'quinzenal' ? `Quinzenal - ${dia}`
        : freq === 'mensal' ? `Mensal - ${dia}`
        : dataEsp

    // Label actual para mostrar
    const labelAtual = grupo.dia_semana
        ? `${grupo.dia_semana} às ${grupo.horario}`
        : 'Não definido'

    return (
        <form onSubmit={onSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-bg2 border border-soft rounded-2xl p-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-muted">Atual</p>
                <p className="text-sm font-black text-fg uppercase italic mt-0.5">{labelAtual}</p>
            </div>

            {/* FREQUÊNCIA */}
            <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted uppercase tracking-widest">Frequencia</label>
                <div className="grid grid-cols-2 gap-2">
                    {FREQUENCIAS.map(f => (
                        <button key={f.id} type="button" onClick={() => setFreq(f.id)}
                            className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${freq === f.id ? 'bg-figueira/10 border-figueira/30 text-figueira' : 'bg-bg border-soft text-muted hover:border-figueira/20'}`}>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* DIA DA SEMANA (para semanal, quinzenal, mensal) */}
            {freq !== 'data' && (
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest">
                        {freq === 'mensal' ? 'Dia do mes (ex: 1º Sabado)' : 'Dia da semana'}
                    </label>
                    {freq === 'mensal' ? (
                        <input type="text" value={dia} onChange={e => setDia(e.target.value)}
                            placeholder="Ex: 1º Sábado, Último Domingo..."
                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted/40" />
                    ) : (
                        <select value={dia} onChange={e => setDia(e.target.value)}
                            className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none">
                            {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                </div>
            )}

            {/* DATA ESPECÍFICA */}
            {freq === 'data' && (
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest">Data do proximo encontro</label>
                    <input type="date" value={dataEsp} onChange={e => setDataEsp(e.target.value)}
                        required
                        className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none" />
                </div>
            )}

            {/* HORÁRIO */}
            <div className="space-y-1.5">
                <label className="text-[9px] font-black text-muted uppercase tracking-widest">Horario</label>
                <input type="time" value={horario} onChange={e => setHorario(e.target.value)}
                    name="horario" required
                    className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-sm font-bold text-fg focus:border-figueira outline-none" />
            </div>

            {/* Hidden fields para o form */}
            <input type="hidden" name="dia_semana" value={diaSemanaValue} />

            <button type="submit" disabled={salvando || sucesso}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 shadow-md ${sucesso ? 'bg-emerald-500 text-white' : 'bg-figueira text-white hover:brightness-110'}`}>
                {salvando ? <><Loader2 size={14} className="animate-spin" /> A guardar...</>
                    : sucesso ? <><Check size={14} /> Atualizado!</>
                    : <><Pencil size={14} /> Guardar</>}
            </button>
        </form>
    )
}
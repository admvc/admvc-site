"use client"
import { useState, useRef, useMemo } from 'react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import {
    atualizarDepartamento,
    adicionarFuncaoAoDepto,
    removerFuncaoDoDepto,
    vincularMembroDepartamento,
    uploadFotoDepartamento,
    aprovarInteresseDepartamento,
    rejeitarInteresseDepartamento,
} from '@/actions/admin-actions'
import {
    Users, Settings, X, Search, Plus, Trash2, UserMinus, CalendarDays,
    Check, ShieldCheck, UserPlus, Briefcase, Loader2, AlignLeft, CheckCircle2, Church, ImagePlus,
    HeartHandshake, XCircle
} from 'lucide-react'
import { alternarPermissaoEscala, removerFuncaoDoMembro, removerMembroTotal } from '@/actions/admin-actions'

export default function PainelGerenciarDepto({ depto, membrosDisponiveis, congregacoes = [], onClose }: any) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [aba, setAba] = useState<'equipe' | 'dados' | 'funcoes' | 'interessados'>('equipe')
    const [loading, setLoading] = useState(false)
    const [fotoPreview, setFotoPreview] = useState<string | null>(depto.foto_url || null)
    const [uploadingFoto, setUploadingFoto] = useState(false)
    const fotoInputRef = useRef<HTMLInputElement>(null)
    const formFuncaoRef = useRef<HTMLFormElement>(null)
    const formEquipeRef = useRef<HTMLFormElement>(null)

    // Equipa
    const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<number[]>([])
    const [buscaEquipe, setBuscaEquipe] = useState("")
    const [membroEquipeSelecionado, setMembroEquipeSelecionado] = useState<any>(null)
    const toggleFuncao = (id: number) => setFuncoesSelecionadas(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])
    const membrosEquipeFiltrados = useMemo(() => {
        if (buscaEquipe.length < 2) return []
        return membrosDisponiveis.filter((m: any) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(buscaEquipe.toLowerCase())).slice(0, 5)
    }, [buscaEquipe, membrosDisponiveis])

    // Lider
    const [buscaLider, setBuscaLider] = useState("")
    const liderAtualInfo = membrosDisponiveis.find((m: any) => m.id === depto.lider_id)
    const [liderSelecionado, setLiderSelecionado] = useState<any>(liderAtualInfo || null)
    const membrosLiderFiltrados = useMemo(() => {
        if (buscaLider.length < 2) return []
        return membrosDisponiveis.filter((m: any) => `${m.first_name} ${m.last_name}`.toLowerCase().includes(buscaLider.toLowerCase())).slice(0, 5)
    }, [buscaLider, membrosDisponiveis])

    // Agrupar integrantes
    const integrantesAgrupadosMap = new Map<number, any>()
    depto.integrantes?.forEach((item: any) => {
        const membroId = item.membro_id
        if (!integrantesAgrupadosMap.has(membroId)) {
            integrantesAgrupadosMap.set(membroId, {
                membro: item.membro, atribuicoes: [],
                pode_gerir_escalas: item.pode_gerir_escalas,
                integrante_id: item.id
            })
        }
        const grupo = integrantesAgrupadosMap.get(membroId)
        if (item.funcoes && item.funcoes.length > 0) {
            item.funcoes.forEach((f: any) => {
                if (!grupo.atribuicoes.find((a: any) => a.id === f.id)) {
                    grupo.atribuicoes.push({ id: f.id, nome: f.funcao?.nome || 'Cargo Desconhecido' })
                }
            })
        } else if (item.funcao) {
            grupo.atribuicoes.push({ id: item.id, nome: item.funcao })
        }
    })
    const listaIntegrantesAgrupados = Array.from(integrantesAgrupadosMap.values())

    const abas = [
        { id: 'equipe' as const, label: 'Equipa', icon: Users },
        { id: 'funcoes' as const, label: 'Cargos', icon: ShieldCheck },
        { id: 'interessados' as const, label: 'Interessados', icon: HeartHandshake },
        { id: 'dados' as const, label: 'Definicoes', icon: Settings },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-bg/80 backdrop-blur-md animate-in fade-in" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-bg max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 rounded-2xl overflow-hidden border border-soft">

                {/* HEADER */}
                <header className="px-6 pt-6 pb-0 border-b border-soft bg-bg2 shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira mb-1">Departamento</p>
                            <h2 className="text-xl font-black italic uppercase text-fg leading-none tracking-tighter">
                                {depto.nome}
                                {depto.congregacao?.nome && (
                                    <span className="text-muted/40 text-sm ml-2 not-italic">{depto.congregacao.nome}</span>
                                )}
                            </h2>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-bg border border-soft text-muted hover:text-red-500 hover:bg-red-50 transition-all">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex gap-1">
                        {abas.map(a => {
                            const Icon = a.icon
                            return (
                                <button key={a.id} onClick={() => setAba(a.id)}
                                    className={`pb-3 px-3 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest border-b-2 transition-all ${aba === a.id ? 'border-figueira text-fg' : 'border-transparent text-muted hover:text-fg'}`}>
                                    <Icon size={12} /> {a.label}
                                </button>
                            )
                        })}
                    </div>
                </header>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-bg">

                    {/* ABA EQUIPA */}
                    {aba === 'equipe' && (
                        <div className="space-y-6 animate-in fade-in">
                            <form ref={formEquipeRef} onSubmit={async (e) => {
                                e.preventDefault()
                                if (!membroEquipeSelecionado) return toast("Selecione um membro.", 'aviso')
                                if (funcoesSelecionadas.length === 0) return toast("Selecione pelo menos um cargo.", 'aviso')
                                setLoading(true)
                                const fd = new FormData(e.currentTarget)
                                const res = await vincularMembroDepartamento(fd)
                                if (res?.ok) { setMembroEquipeSelecionado(null); setFuncoesSelecionadas([]); setBuscaEquipe(""); formEquipeRef.current?.reset() }
                                else if (res?.error) toast(res.error, 'erro')
                                setLoading(false)
                            }} className="bg-bg2 p-5 rounded-xl border border-soft space-y-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <UserPlus size={12} className="text-figueira" /> Vincular Integrante
                                </p>
                                <input type="hidden" name="departamento_id" value={depto.id} />
                                <input type="hidden" name="membro_id" value={membroEquipeSelecionado?.id || ""} />
                                {funcoesSelecionadas.map(id => <input key={id} type="hidden" name="funcoes_ids" value={id} />)}

                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 relative">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest">Membro</label>
                                        {membroEquipeSelecionado ? (
                                            <div className="flex items-center justify-between bg-bg border border-figueira/50 px-3 py-2.5 rounded-xl">
                                                <span className="text-[10px] font-black text-fg uppercase">{membroEquipeSelecionado.first_name} {membroEquipeSelecionado.last_name}</span>
                                                <button type="button" onClick={() => setMembroEquipeSelecionado(null)} className="text-muted hover:text-red-500"><X size={12} /></button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                                <input type="text" placeholder="Pesquisar..." value={buscaEquipe} onChange={(e) => setBuscaEquipe(e.target.value)} className="w-full bg-bg border border-soft pl-9 pr-3 py-2.5 rounded-xl text-[10px] font-bold focus:border-figueira outline-none" />
                                                {membrosEquipeFiltrados.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-bg border border-soft rounded-xl shadow-2xl overflow-hidden z-[100]">
                                                        {membrosEquipeFiltrados.map((m: any) => (
                                                            <div key={m.id} onClick={() => { setMembroEquipeSelecionado(m); setBuscaEquipe("") }} className="px-3 py-2.5 hover:bg-soft cursor-pointer text-[10px] font-bold uppercase border-b border-soft last:border-0">{m.first_name} {m.last_name}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest">Cargos</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {depto.funcoes?.map((f: any) => {
                                                const sel = funcoesSelecionadas.includes(f.id)
                                                return (
                                                    <button key={f.id} type="button" onClick={() => toggleFuncao(f.id)}
                                                        className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${sel ? 'bg-figueira border-figueira text-white' : 'bg-bg border-soft text-muted hover:border-figueira/30'}`}>
                                                        {sel ? <CheckCircle2 size={10} className="inline mr-1" /> : null}{f.nome}
                                                    </button>
                                                )
                                            })}
                                            {depto.funcoes?.length === 0 && <p className="text-[9px] text-muted italic">Crie cargos na aba "Cargos".</p>}
                                        </div>
                                    </div>
                                </div>
                                <button disabled={loading || !membroEquipeSelecionado || funcoesSelecionadas.length === 0}
                                    className="w-full bg-fg text-bg py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-figueira disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                                    {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirmar
                                </button>
                            </form>

                            {/* Lista de integrantes */}
                            <div className="space-y-3">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <Users size={12} /> Voluntarios <span className="bg-soft px-1.5 py-0.5 rounded text-[8px]">{listaIntegrantesAgrupados.length}</span>
                                </p>
                                {listaIntegrantesAgrupados.map((grupo: any) => (
                                    <div key={grupo.membro.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${grupo.membro.id === depto.lider_id ? 'border-figueira/30 bg-figueira/5' : 'bg-bg2 border-soft'}`}>
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-bg border border-soft flex items-center justify-center text-[9px] font-black text-muted shrink-0">
                                                {grupo.membro.first_name[0]}{grupo.membro.last_name[0]}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase text-fg truncate flex items-center gap-2">
                                                    {grupo.membro.first_name} {grupo.membro.last_name}
                                                    {grupo.membro.id === depto.lider_id && <span className="text-[7px] bg-figueira text-white px-1.5 py-0.5 rounded">Lider</span>}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    {grupo.membro.id !== depto.lider_id && (
                                                        <button disabled={loading} onClick={async () => { setLoading(true); await alternarPermissaoEscala(grupo.integrante_id, grupo.pode_gerir_escalas); setLoading(false) }}
                                                            className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border transition-all ${grupo.pode_gerir_escalas ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-bg text-muted border-soft'}`}>
                                                            <CalendarDays size={8} className="inline mr-0.5" />{grupo.pode_gerir_escalas ? 'Delegado' : 'Delegar?'}
                                                        </button>
                                                    )}
                                                    <button disabled={loading} onClick={async () => { const ok = await confirmar({ mensagem: `Remover ${grupo.membro.first_name}?`, tipo: 'perigo' }); if (ok) { setLoading(true); await removerMembroTotal(grupo.membro.id, depto.id); setLoading(false) } }}
                                                        className="text-[7px] font-black uppercase text-red-400 hover:text-red-600 bg-red-500/5 px-1.5 py-0.5 rounded transition-all">
                                                        <UserMinus size={8} className="inline mr-0.5" />Remover
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1 shrink-0 max-w-[200px] justify-end">
                                            {grupo.atribuicoes.map((a: any) => (
                                                <button key={a.id} disabled={loading} onClick={async () => { const ok = await confirmar({ mensagem: `Remover ${a.nome}?`, tipo: 'perigo' }); if (ok) { setLoading(true); await removerFuncaoDoMembro(a.id); setLoading(false) } }}
                                                    className="group flex items-center gap-1 bg-bg border border-soft px-2 py-1 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all">
                                                    <span className="w-1 h-1 rounded-full bg-figueira group-hover:bg-red-500" />
                                                    <span className="text-[8px] font-bold text-fg uppercase group-hover:text-red-700">{a.nome}</span>
                                                    <X size={8} className="text-muted/40 group-hover:text-red-500" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {listaIntegrantesAgrupados.length === 0 && (
                                    <div className="py-10 text-center border border-dashed border-soft rounded-xl">
                                        <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Nenhum membro vinculado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ABA CARGOS */}
                    {aba === 'funcoes' && (
                        <div className="space-y-6 animate-in fade-in">
                            <form ref={formFuncaoRef} action={async (fd) => { setLoading(true); await adicionarFuncaoAoDepto(fd); formFuncaoRef.current?.reset(); setLoading(false) }}
                                className="bg-bg2 p-5 rounded-xl border border-soft flex gap-3 items-end">
                                <input type="hidden" name="departamento_id" value={depto.id} />
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-[8px] font-black uppercase text-muted tracking-widest">Novo cargo</label>
                                    <input name="nome" placeholder="Ex: Guitarrista, Sonoplasta..." required className="w-full bg-bg border border-soft px-3 py-2.5 rounded-xl text-sm font-bold outline-none focus:border-figueira" />
                                </div>
                                <button disabled={loading} className="bg-figueira text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Adicionar
                                </button>
                            </form>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {depto.funcoes?.map((f: any) => (
                                    <div key={f.id} className="flex justify-between items-center p-3 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                        <span className="text-[10px] font-black uppercase text-fg tracking-widest flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-figueira" /> {f.nome}
                                        </span>
                                        <button onClick={async () => { const ok = await confirmar({ mensagem: 'Excluir esta funcao?', tipo: 'perigo' }); if (ok) removerFuncaoDoDepto(f.id) }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg border border-soft hover:bg-red-50 hover:border-red-200 text-muted hover:text-red-500 transition-all">
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                {depto.funcoes?.length === 0 && <p className="col-span-full text-[9px] text-center text-muted py-8 font-bold uppercase tracking-widest italic bg-bg2 border border-soft rounded-xl">Nenhum cargo configurado.</p>}
                            </div>
                        </div>
                    )}

                    {/* ABA INTERESSADOS */}
                    {aba === 'interessados' && (
                        <InteressadosTab deptoId={depto.id} interesses={depto.interesses || []} />
                    )}

                    {/* ABA DEFINIÇÕES */}
                    {aba === 'dados' && (
                        <form action={async (formData) => { setLoading(true); const res = await atualizarDepartamento(formData); setLoading(false); if (res?.ok) toast("Atualizado!", 'sucesso') }}
                            className="space-y-5 animate-in fade-in">
                            <input type="hidden" name="id" value={depto.id} />

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase text-muted tracking-widest">Nome</label>
                                    <input name="nome" defaultValue={depto.nome} required className="w-full bg-bg border border-soft px-3 py-2.5 rounded-xl text-sm font-bold focus:border-figueira outline-none" />
                                </div>

                                {congregacoes.length > 0 && (
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest flex items-center gap-1">
                                            <Church size={10} /> Congregacao
                                        </label>
                                        <select name="congregacaoId" defaultValue={depto.congregacaoId || ''}
                                            className="w-full bg-bg border border-soft px-3 py-2.5 rounded-xl text-sm font-bold focus:border-figueira outline-none appearance-none">
                                            <option value="">Global (toda a igreja)</option>
                                            {congregacoes.map((c: any) => (
                                                <option key={c.id} value={c.id}>{c.nome} — {c.cidade}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5 relative">
                                <label className="text-[8px] font-black uppercase text-muted tracking-widest">Lider</label>
                                <input type="hidden" name="lider_id" value={liderSelecionado?.id || ""} />
                                {liderSelecionado ? (
                                    <div className="flex items-center justify-between bg-bg border border-figueira/50 px-3 py-2.5 rounded-xl">
                                        <span className="text-[10px] font-black text-fg uppercase flex items-center gap-2">
                                            <ShieldCheck size={13} className="text-figueira" /> {liderSelecionado.first_name} {liderSelecionado.last_name}
                                        </span>
                                        <button type="button" onClick={() => setLiderSelecionado(null)} className="text-muted hover:text-red-500"><X size={12} /></button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                        <input type="text" placeholder="Pesquisar lider..." value={buscaLider} onChange={(e) => setBuscaLider(e.target.value)} className="w-full bg-bg border border-soft pl-9 pr-3 py-2.5 rounded-xl text-[10px] font-bold focus:border-figueira outline-none" />
                                        {membrosLiderFiltrados.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-bg border border-soft rounded-xl shadow-2xl overflow-hidden z-[100]">
                                                {membrosLiderFiltrados.map((m: any) => (
                                                    <div key={m.id} onClick={() => { setLiderSelecionado(m); setBuscaLider("") }} className="px-3 py-2.5 hover:bg-soft cursor-pointer text-[10px] font-bold uppercase border-b border-soft last:border-0">{m.first_name} {m.last_name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase text-muted tracking-widest flex items-center gap-1">
                                    <AlignLeft size={10} /> Notas
                                </label>
                                <textarea name="descricao" defaultValue={depto.descricao} rows={3} className="w-full bg-bg border border-soft px-3 py-2.5 rounded-xl text-sm font-bold focus:border-figueira outline-none resize-none" />
                            </div>

                            {/* FOTO DE CAPA */}
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase text-muted tracking-widest flex items-center gap-1">
                                    <ImagePlus size={10} /> Foto de Capa
                                </label>
                                <div className="flex items-center gap-4">
                                    {fotoPreview ? (
                                        <img src={fotoPreview} alt="Foto do departamento" className="w-20 h-20 rounded-xl object-cover border border-soft" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl border border-dashed border-soft bg-bg2 flex items-center justify-center">
                                            <ImagePlus size={16} className="text-muted/40" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <input
                                            ref={fotoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                setUploadingFoto(true)
                                                const fd = new FormData()
                                                fd.append('file', file)
                                                const res = await uploadFotoDepartamento(depto.id, fd)
                                                if (res?.ok && res.url) {
                                                    setFotoPreview(res.url)
                                                } else {
                                                    toast(res?.error || 'Erro ao enviar foto.', 'erro')
                                                }
                                                setUploadingFoto(false)
                                                if (fotoInputRef.current) fotoInputRef.current.value = ''
                                            }}
                                        />
                                        <button
                                            type="button"
                                            disabled={uploadingFoto}
                                            onClick={() => fotoInputRef.current?.click()}
                                            className="flex items-center gap-1.5 bg-bg2 border border-soft px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-muted hover:border-figueira/30 hover:text-fg transition-all disabled:opacity-50"
                                        >
                                            {uploadingFoto ? <Loader2 size={10} className="animate-spin" /> : <ImagePlus size={10} />}
                                            {uploadingFoto ? 'A enviar...' : 'Escolher Foto'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button disabled={loading} className="w-full bg-fg text-bg py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Guardar
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

function InteressadosTab({ deptoId, interesses }: { deptoId: number; interesses: any[] }) {
    const confirmar = useConfirm()
    const [loading, setLoading] = useState<number | null>(null)

    const pendentes = interesses.filter((i: any) => i.status === 'PENDENTE')
    const processados = interesses.filter((i: any) => i.status !== 'PENDENTE')

    const handleAprovar = async (id: number) => {
        setLoading(id)
        await aprovarInteresseDepartamento(id)
        setLoading(null)
    }

    const handleRejeitar = async (id: number) => {
        if (!await confirmar({ mensagem: 'Rejeitar este interesse?', tipo: 'perigo' })) return
        setLoading(id)
        await rejeitarInteresseDepartamento(id)
        setLoading(null)
    }

    return (
        <div className="space-y-4 animate-in fade-in">
            {pendentes.length === 0 && processados.length === 0 ? (
                <div className="py-10 text-center border-2 border-dashed border-soft rounded-2xl">
                    <HeartHandshake size={24} className="mx-auto text-muted/20 mb-2" />
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Nenhum interesse registado.</p>
                </div>
            ) : (
                <>
                    {pendentes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-orange-600">Pendentes ({pendentes.length})</p>
                            {pendentes.map((i: any) => (
                                <div key={i.id} className="flex items-center justify-between gap-3 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg truncate">
                                            {i.membro?.first_name} {i.membro?.last_name}
                                        </p>
                                        {i.mensagem && (
                                            <p className="text-[9px] text-muted truncate mt-0.5">"{i.mensagem}"</p>
                                        )}
                                        <p className="text-[8px] text-muted mt-0.5">
                                            {new Date(i.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                        </p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                        <button
                                            onClick={() => handleAprovar(i.id)}
                                            disabled={loading === i.id}
                                            className="w-8 h-8 bg-emerald-500/10 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50"
                                            title="Aprovar"
                                        >
                                            {loading === i.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={14} />}
                                        </button>
                                        <button
                                            onClick={() => handleRejeitar(i.id)}
                                            disabled={loading === i.id}
                                            className="w-8 h-8 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                                            title="Rejeitar"
                                        >
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {processados.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Historico</p>
                            {processados.map((i: any) => (
                                <div key={i.id} className="flex items-center justify-between gap-3 bg-bg border border-soft rounded-xl px-4 py-2.5 opacity-60">
                                    <p className="text-[10px] font-bold text-fg truncate">
                                        {i.membro?.first_name} {i.membro?.last_name}
                                    </p>
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                        i.status === 'APROVADO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                        {i.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

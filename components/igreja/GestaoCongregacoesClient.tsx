// components/igreja/GestaoCongregacoesClient.tsx
'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { criarCongregacao, atualizarCongregacao, excluirCongregacao, associarMembrosACongregacao, removerMembroDeCongregacao } from '@/actions/admin-actions'
import { PlusCircle, Loader2, CheckCircle2, Building2, Edit3, ArrowLeft, Users, MapPin, Trash2, UserPlus, X, Search } from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'

interface Membro { id: number; first_name: string; last_name: string }

export default function GestaoCongregacoesClient({
    congregacoes,
    membrosSemCongregacao = []
}: {
    congregacoes: any[]
    membrosSemCongregacao?: Membro[]
}) {
    const confirmar = useConfirm()
    const [modo, setModo] = useState<'lista' | 'criar' | 'editar'>('lista')
    const [selecionada, setSelecionada] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null)

    // Estado para associação em massa
    const [mostrarAssociar, setMostrarAssociar] = useState(false)
    const [busca, setBusca] = useState('')
    const [selecionados, setSelecionados] = useState<number[]>([])

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setStatus(null)

        let res
        if (modo === 'criar') {
            res = await criarCongregacao(formData)
        } else if (modo === 'editar' && selecionada) {
            res = await atualizarCongregacao(selecionada.id, formData)
        }

        if (res?.error) {
            setStatus({ type: 'error', msg: res.error })
            setLoading(false)
        } else if (res?.ok) {
            setStatus({ type: 'success', msg: res.message! })
            setLoading(false)
            setTimeout(() => voltarLista(), 1500)
        }
    }

    async function handleDelete() {
        if (!await confirmar({ mensagem: 'Tem a certeza que deseja apagar esta congregacao?', tipo: 'perigo' })) return
        setLoading(true)
        const res = await excluirCongregacao(selecionada.id)
        if (res?.error) {
            setStatus({ type: 'error', msg: res.error })
            setLoading(false)
        } else {
            setStatus({ type: 'success', msg: res.message! })
            setTimeout(() => voltarLista(), 1500)
        }
    }

    async function handleAssociarMembros() {
        if (selecionados.length === 0 || !selecionada) return
        setLoading(true)
        const res = await associarMembrosACongregacao(selecionada.id, selecionados)
        if (res.ok) {
            setStatus({ type: 'success', msg: `${selecionados.length} membro(s) associado(s)!` })
            setSelecionados([])
            setMostrarAssociar(false)
        } else {
            setStatus({ type: 'error', msg: res.error || 'Erro ao associar.' })
        }
        setLoading(false)
        setTimeout(() => setStatus(null), 3000)
    }

    async function handleRemoverMembro(membroId: number) {
        if (!await confirmar({ mensagem: 'Remover este membro da congregacao?', tipo: 'perigo' })) return
        setLoading(true)
        const res = await removerMembroDeCongregacao(membroId)
        if (res.ok) {
            setStatus({ type: 'success', msg: 'Membro removido da congregacao.' })
        } else {
            setStatus({ type: 'error', msg: res.error || 'Erro.' })
        }
        setLoading(false)
        setTimeout(() => setStatus(null), 3000)
    }

    const voltarLista = () => {
        setModo('lista')
        setSelecionada(null)
        setStatus(null)
        setLoading(false)
        setMostrarAssociar(false)
        setSelecionados([])
        setBusca('')
    }

    const membrosFiltrados = membrosSemCongregacao.filter(m =>
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(busca.toLowerCase())
    )

    function toggleMembro(id: number) {
        setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in">

            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-soft pb-8">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg flex items-center gap-3">
                        <Building2 size={28} className="text-figueira" />
                        Congregacoes
                    </h1>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                        Gerir unidades e associar membros
                    </p>
                </div>

                {modo === 'lista' ? (
                    <button onClick={() => setModo('criar')} className="bg-fg text-bg px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-figueira transition-all flex items-center gap-2">
                        <PlusCircle size={14} /> Nova Congregacao
                    </button>
                ) : (
                    <button onClick={voltarLista} className="bg-bg2 border border-soft text-fg px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-figueira transition-all flex items-center gap-2">
                        <ArrowLeft size={14} /> Voltar
                    </button>
                )}
            </header>

            {status && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold animate-in fade-in ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <CheckCircle2 size={14} /> {status.msg}
                </div>
            )}

            {/* VISTA LISTA */}
            {modo === 'lista' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {congregacoes.length === 0 ? (
                        <div className="col-span-full p-10 border-2 border-dashed border-soft rounded-2xl text-center bg-bg2/50">
                            <p className="text-xs font-black uppercase tracking-widest text-muted italic">Nenhuma congregacao registada.</p>
                        </div>
                    ) : congregacoes.map((c) => (
                        <div key={c.id} className="bg-bg2 border border-soft p-6 rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group">
                            <div>
                                <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center mb-3">
                                    <Building2 size={20} />
                                </div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-none truncate">
                                    {c.nome}
                                </h3>
                                <p className="text-[10px] font-bold text-muted mt-1.5 flex items-center gap-1.5 truncate">
                                    <MapPin size={11} className="shrink-0" /> {c.cidade}
                                </p>
                                <div className="mt-4 flex items-center gap-3">
                                    <span className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-1 bg-bg px-2.5 py-1 rounded-lg border border-soft">
                                        <Users size={11} className="text-figueira" /> {c._count.membros}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => { setSelecionada(c); setModo('editar'); setStatus(null) }}
                                className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-bg border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted group-hover:bg-fg group-hover:text-bg transition-all"
                            >
                                <Edit3 size={13} /> Gerir
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* VISTA EDITAR/CRIAR */}
            {(modo === 'criar' || modo === 'editar') && (
                <div className="space-y-8">
                    {/* FORMULARIO */}
                    <div className="max-w-2xl bg-bg2 border border-soft p-8 rounded-[2.5rem] shadow-xl animate-in slide-in-from-bottom-4">
                        <form action={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Nome</label>
                                <input name="nome" defaultValue={selecionada?.nome} required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: Campus Norte" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Endereco</label>
                                    <input name="endereco" defaultValue={selecionada?.endereco} required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Rua, No..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Cidade</label>
                                    <input name="cidade" defaultValue={selecionada?.cidade} required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: Figueira da Foz" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Codigo Postal</label>
                                    <input name="codigo_postal" defaultValue={selecionada?.codigo_postal} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: 3080-001" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Distrito</label>
                                    <input name="distrito" defaultValue={selecionada?.distrito} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: Coimbra" />
                                </div>
                            </div>

                            <p className="text-[8px] font-black uppercase tracking-widest text-muted mt-4 mb-2 ml-4">Lideranca</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Pastor Responsavel</label>
                                    <input name="pastor" defaultValue={selecionada?.pastor} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Nome completo" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Co-Pastor / Auxiliar</label>
                                    <input name="co_pastor" defaultValue={selecionada?.co_pastor} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Nome completo" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Telefone</label>
                                    <input name="telefone" defaultValue={selecionada?.telefone} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="+351 912 345 678" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Email</label>
                                    <input name="email" type="email" defaultValue={selecionada?.email} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="congregacao@email.com" />
                                </div>
                            </div>

                            <p className="text-[8px] font-black uppercase tracking-widest text-muted mt-4 mb-2 ml-4">Geolocalizacao (opcional)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Latitude</label>
                                    <input name="latitude" type="number" step="any" defaultValue={selecionada?.latitude} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: 40.1508" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Longitude</label>
                                    <input name="longitude" type="number" step="any" defaultValue={selecionada?.longitude} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: -8.8613" />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-soft flex gap-3">
                                <button disabled={loading} type="submit" className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${loading ? 'bg-muted text-bg' : 'bg-fg text-bg hover:bg-figueira'}`}>
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                    Guardar
                                </button>
                                {modo === 'editar' && (
                                    <button type="button" onClick={handleDelete} disabled={loading} className="py-4 px-5 rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Apagar">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* GESTÃO DE MEMBROS (só no modo editar) */}
                    {modo === 'editar' && selecionada && (
                        <div className="bg-bg2 border border-soft rounded-[2.5rem] overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-5 border-b border-soft">
                                <div className="flex items-center gap-3">
                                    <Users size={16} className="text-figueira" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-fg">
                                        Membros ({selecionada.membros?.length || 0})
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setMostrarAssociar(!mostrarAssociar)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-figueira/10 text-figueira text-[9px] font-black uppercase tracking-widest hover:bg-figueira hover:text-white transition-all"
                                >
                                    <UserPlus size={13} /> Associar Membros
                                </button>
                            </div>

                            {/* PAINEL DE ASSOCIAÇÃO EM MASSA */}
                            {mostrarAssociar && (
                                <div className="p-5 border-b border-soft bg-figueira/5 animate-in slide-in-from-top-2 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar membros sem congregacao..."
                                                value={busca}
                                                onChange={e => setBusca(e.target.value)}
                                                className="w-full bg-bg border border-soft rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-fg outline-none focus:border-figueira"
                                            />
                                        </div>
                                        {selecionados.length > 0 && (
                                            <button
                                                onClick={handleAssociarMembros}
                                                disabled={loading}
                                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-figueira text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                            >
                                                {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                Associar {selecionados.length}
                                            </button>
                                        )}
                                    </div>

                                    {membrosFiltrados.length === 0 ? (
                                        <p className="text-[10px] text-muted text-center py-4 font-bold">
                                            {membrosSemCongregacao.length === 0 ? 'Todos os membros ja estao associados.' : 'Nenhum resultado.'}
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                                            {membrosFiltrados.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => toggleMembro(m.id)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold text-left transition-all ${
                                                        selecionados.includes(m.id)
                                                            ? 'bg-figueira text-white'
                                                            : 'bg-bg border border-soft text-fg hover:border-figueira/30'
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[8px] font-black ${
                                                        selecionados.includes(m.id) ? 'bg-white/20' : 'bg-soft/50'
                                                    }`}>
                                                        {selecionados.includes(m.id) ? <CheckCircle2 size={12} /> : m.first_name[0]}
                                                    </div>
                                                    <span className="truncate">{m.first_name} {m.last_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LISTA DE MEMBROS ACTUAIS */}
                            <div className="divide-y divide-soft">
                                {(!selecionada.membros || selecionada.membros.length === 0) ? (
                                    <div className="py-10 text-center">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted italic">
                                            Nenhum membro associado
                                        </p>
                                    </div>
                                ) : selecionada.membros.map((m: Membro) => (
                                    <div key={m.id} className="flex items-center justify-between px-6 py-3 hover:bg-soft/10 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 bg-figueira/10 text-figueira rounded-lg flex items-center justify-center text-[9px] font-black">
                                                {m.first_name[0]}
                                            </div>
                                            <span className="text-[11px] font-bold text-fg">{m.first_name} {m.last_name}</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoverMembro(m.id)}
                                            className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            title="Remover da congregacao"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </main>
    )
}

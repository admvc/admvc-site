'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Briefcase, MapPin, X, Plus, Save, Loader2, Trash2 } from 'lucide-react'
import { criarCargo, excluirCargo } from '@/actions/admin-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { salvarRegioesAction } from '@/actions/admin-actions'

interface Props {
    cargos: { id: number; nome: string }[]
    regioesIniciais: string[]
}

export default function EstruturaSubMenu({ cargos: cargosIniciais, regioesIniciais }: Props) {
    const [modalCargos, setModalCargos] = useState(false)
    const [modalRegioes, setModalRegioes] = useState(false)

    return (
        <>
            <div className="flex items-center gap-2">
                <button onClick={() => setModalCargos(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-purple-500/50 transition-all text-[9px] font-black uppercase tracking-widest text-fg">
                    <Briefcase size={14} className="text-purple-500" /> Cargos
                    <span className="text-[8px] bg-soft/50 px-1.5 py-0.5 rounded text-muted font-bold">{cargosIniciais.length}</span>
                </button>
                <button onClick={() => setModalRegioes(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft rounded-2xl hover:border-orange-500/50 transition-all text-[9px] font-black uppercase tracking-widest text-fg">
                    <MapPin size={14} className="text-orange-500" /> Regioes
                </button>
            </div>

            {modalCargos && <ModalCargos cargos={cargosIniciais} onClose={() => setModalCargos(false)} />}
            {modalRegioes && <ModalRegioes regioesIniciais={regioesIniciais} onClose={() => setModalRegioes(false)} />}
        </>
    )
}

// ── MODAL CARGOS ────────────────────────────────────────────────────────────

function ModalCargos({ cargos, onClose }: { cargos: { id: number; nome: string }[]; onClose: () => void }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [novoCargo, setNovoCargo] = useState('')
    const [loading, setLoading] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    async function handleCriar(e: React.FormEvent) {
        e.preventDefault()
        if (!novoCargo.trim()) return
        setLoading(true)
        const fd = new FormData()
        fd.set('nome', novoCargo.trim())
        try {
            await criarCargo(fd)
            setNovoCargo('')
            // Page will refresh via revalidatePath
            window.location.reload()
        } catch {
            toast('Erro ao criar cargo.', 'erro')
        }
        setLoading(false)
    }

    async function handleExcluir(id: number, nome: string) {
        const ok = await confirmar({ mensagem: `Excluir o cargo "${nome}"?`, tipo: 'perigo' })
        if (!ok) return
        setDeletingId(id)
        try {
            await excluirCargo(id)
            window.location.reload()
        } catch {
            toast('Erro ao excluir. Verifique se há membros vinculados.', 'erro')
        }
        setDeletingId(null)
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-purple-500" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">Cargos</h2>
                        <span className="text-[8px] bg-soft/50 px-1.5 py-0.5 rounded text-muted font-bold">{cargos.length}</span>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                </div>

                {/* Criar novo */}
                <form onSubmit={handleCriar} className="px-6 pt-4 flex gap-2 flex-shrink-0">
                    <input value={novoCargo} onChange={e => setNovoCargo(e.target.value)} placeholder="Nome do novo cargo..."
                        className="flex-1 bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-purple-500 transition-colors" />
                    <button type="submit" disabled={loading || !novoCargo.trim()}
                        className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-purple-700 transition-all flex items-center gap-1.5">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    </button>
                </form>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
                    {cargos.length === 0 ? (
                        <p className="text-center text-[10px] text-muted font-bold uppercase tracking-widest py-8">Nenhum cargo registado.</p>
                    ) : (
                        cargos.map(c => (
                            <div key={c.id} className="flex items-center justify-between bg-bg border border-soft rounded-xl px-4 py-2.5 group hover:border-purple-500/30 transition-all">
                                <span className="text-[10px] font-black uppercase tracking-widest text-fg">{c.nome}</span>
                                <button onClick={() => handleExcluir(c.id, c.nome)} disabled={deletingId === c.id}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all p-1 disabled:opacity-50">
                                    {deletingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── MODAL REGIÕES ───────────────────────────────────────────────────────────

function ModalRegioes({ regioesIniciais, onClose }: { regioesIniciais: string[]; onClose: () => void }) {
    const [regioes, setRegioes] = useState(regioesIniciais)
    const [nova, setNova] = useState('')
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    function adicionar() {
        const nome = nova.trim()
        if (!nome || regioes.includes(nome)) return
        setRegioes([...regioes, nome])
        setNova('')
    }

    function remover(idx: number) {
        setRegioes(regioes.filter((_, i) => i !== idx))
    }

    async function guardar() {
        setSaving(true)
        const res = await salvarRegioesAction(regioes)
        setSaving(false)
        if (res.ok) {
            setMsg('Guardado!')
            setTimeout(() => { setMsg(''); onClose() }, 1000)
        } else {
            setMsg('Erro ao guardar.')
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-orange-500" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">Regioes</h2>
                        <span className="text-[8px] bg-soft/50 px-1.5 py-0.5 rounded text-muted font-bold">{regioes.length}</span>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                </div>

                {/* Adicionar nova */}
                <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
                    <input value={nova} onChange={e => setNova(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), adicionar())}
                        placeholder="Nova regiao..."
                        className="flex-1 bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-orange-500 transition-colors" />
                    <button onClick={adicionar} disabled={!nova.trim()}
                        className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-30 hover:bg-orange-600 transition-all">
                        <Plus size={12} />
                    </button>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        {regioes.map((r, i) => (
                            <div key={i} className="flex items-center gap-1.5 bg-bg border border-soft px-3 py-2 rounded-xl group hover:border-red-500/30 transition-all">
                                <MapPin size={10} className="text-orange-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-fg">{r}</span>
                                <button onClick={() => remover(i)} className="text-muted/30 hover:text-red-500 transition-colors">
                                    <X size={10} />
                                </button>
                            </div>
                        ))}
                    </div>
                    {regioes.length === 0 && (
                        <p className="text-center text-[10px] text-muted font-bold uppercase tracking-widest py-8">Nenhuma regiao definida.</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-soft flex items-center justify-between flex-shrink-0">
                    {msg && <p className="text-[9px] font-bold text-emerald-500">{msg}</p>}
                    {!msg && <span />}
                    <button onClick={guardar} disabled={saving}
                        className="px-5 py-2.5 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50 hover:opacity-90 transition-all flex items-center gap-1.5">
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

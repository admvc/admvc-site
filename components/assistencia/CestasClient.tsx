'use client'

import { useState } from 'react'
import {
    Package, Plus, Trash2, ChevronDown, ChevronRight, Send,
    Loader2, CheckCircle2, AlertTriangle, X, History
} from 'lucide-react'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import {
    criarTipoCesta, adicionarItemCesta, removerItemCesta,
    eliminarTipoCesta, montarCesta
} from '@/actions/assistencia-actions'
import { useRouter } from 'next/navigation'

interface ItemStock {
    id: number; nome: string; stock: number; unidade: string; categoria: string
}

interface Props {
    tiposCesta: any[]
    itensStock: ItemStock[]
    entregas: any[]
    podeGerir: boolean
}

export default function CestasClient({ tiposCesta, itensStock, entregas, podeGerir }: Props) {
    const confirmar = useConfirm()
    const toast = useToast()
    const router = useRouter()

    const [loading, setLoading] = useState(false)
    const [novoNome, setNovoNome] = useState('')
    const [novaDesc, setNovaDesc] = useState('')
    const [criarAberto, setCriarAberto] = useState(false)

    // Montar cesta
    const [montarId, setMontarId] = useState<number | null>(null)
    const [destinatario, setDestinatario] = useState('')
    const [obsEntrega, setObsEntrega] = useState('')

    async function handleCriarCesta(e: React.FormEvent) {
        e.preventDefault()
        if (!novoNome.trim()) return
        setLoading(true)
        const fd = new FormData()
        fd.append('nome', novoNome)
        fd.append('descricao', novaDesc)
        const res = await criarTipoCesta(fd)
        if (res.ok) {
            toast('Cesta criada com sucesso', 'sucesso')
            setNovoNome(''); setNovaDesc(''); setCriarAberto(false)
            router.refresh()
        } else toast(res.error || 'Erro', 'erro')
        setLoading(false)
    }

    async function handleAddItem(cestaId: number, itemId: number, qtd: number) {
        const res = await adicionarItemCesta(cestaId, itemId, qtd)
        if (res.ok) { toast('Item adicionado', 'sucesso'); router.refresh() }
        else toast(res.error || 'Erro', 'erro')
    }

    async function handleRemoverItem(itemCestaId: number) {
        const ok = await confirmar({ mensagem: 'Remover este item da cesta?', tipo: 'perigo' })
        if (!ok) return
        const res = await removerItemCesta(itemCestaId)
        if (res.ok) { toast('Item removido', 'sucesso'); router.refresh() }
        else toast(res.error || 'Erro', 'erro')
    }

    async function handleEliminarCesta(id: number, nome: string) {
        const ok = await confirmar({ mensagem: `Eliminar a cesta "${nome}"? As entregas anteriores serao mantidas.`, tipo: 'perigo' })
        if (!ok) return
        const res = await eliminarTipoCesta(id)
        if (res.ok) { toast('Cesta eliminada', 'sucesso'); router.refresh() }
        else toast(res.error || 'Erro', 'erro')
    }

    async function handleMontarCesta() {
        if (!montarId || !destinatario.trim()) return
        setLoading(true)
        const res = await montarCesta(montarId, destinatario, obsEntrega)
        if (res.ok) {
            toast('Cesta montada e entregue com sucesso!', 'sucesso')
            setMontarId(null); setDestinatario(''); setObsEntrega('')
            router.refresh()
        } else toast(res.error || 'Erro', 'erro')
        setLoading(false)
    }

    // Calcular quantas cestas podem ser montadas
    function calcularCapacidade(cesta: any): number {
        if (!cesta.itens || cesta.itens.length === 0) return 0
        return Math.min(...cesta.itens.map((ic: any) =>
            ic.item.stock > 0 ? Math.floor(ic.item.stock / ic.quantidade) : 0
        ))
    }

    return (
        <div className="space-y-5">
            {/* RESUMO */}
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <p className="text-xl font-black italic text-fg">{tiposCesta.length}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Tipos</p>
                </div>
                <div className="w-px h-6 bg-soft" />
                <div className="text-center">
                    <p className="text-xl font-black italic text-fg">{entregas.length}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Entregas</p>
                </div>
            </div>

            {/* BOTÃO CRIAR (líder) */}
            {podeGerir && (
                <div className="space-y-3">
                    {!criarAberto ? (
                        <button onClick={() => setCriarAberto(true)}
                            className="flex items-center gap-2 bg-figueira text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            <Plus size={14} /> Novo Tipo de Cesta
                        </button>
                    ) : (
                        <form onSubmit={handleCriarCesta} className="bg-bg2 border border-soft rounded-2xl p-4 space-y-3">
                            <input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Nome da cesta (ex: Cesta Basica Padrao)"
                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:border-figueira outline-none" required />
                            <input value={novaDesc} onChange={e => setNovaDesc(e.target.value)} placeholder="Descricao (opcional)"
                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:border-figueira outline-none" />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setCriarAberto(false)}
                                    className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg border border-soft text-muted">Cancelar</button>
                                <button type="submit" disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-figueira text-white flex items-center justify-center gap-2 disabled:opacity-50">
                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Criar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}

            {/* LISTA DE CESTAS */}
            {tiposCesta.length === 0 ? (
                <div className="bg-bg2 border border-soft rounded-2xl p-8 text-center space-y-2">
                    <Package size={28} className="mx-auto text-muted/20" />
                    <p className="text-xs font-bold text-muted">Nenhum tipo de cesta cadastrado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tiposCesta.map(cesta => {
                        const capacidade = calcularCapacidade(cesta)
                        const isMontando = montarId === cesta.id

                        return (
                            <details key={cesta.id} className="bg-bg2 border border-soft rounded-2xl overflow-hidden group/cesta">
                                <summary className="flex items-center gap-3 p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                    <div className="w-10 h-10 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center shrink-0">
                                        <Package size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[11px] font-black uppercase italic text-fg truncate">{cesta.nome}</h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[8px] font-bold text-muted">{cesta.itens.length} itens</span>
                                            <span className="text-[8px] font-bold text-muted">·</span>
                                            <span className="text-[8px] font-bold text-muted">{cesta._count.entregas} entregas</span>
                                            <span className="text-[8px] font-bold text-muted">·</span>
                                            <span className={`text-[8px] font-black ${capacidade > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                {capacidade > 0 ? `${capacidade} disponivel` : 'Sem stock'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-muted transition-transform group-open/cesta:rotate-90 shrink-0" />
                                </summary>

                                <div className="border-t border-soft p-4 space-y-4">
                                    {cesta.descricao && (
                                        <p className="text-[10px] text-muted italic">{cesta.descricao}</p>
                                    )}

                                    {/* ITENS DA CESTA */}
                                    <div className="space-y-1.5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">Composicao</p>
                                        {cesta.itens.length > 0 ? (
                                            cesta.itens.map((ic: any) => (
                                                <div key={ic.id} className="flex items-center justify-between bg-bg rounded-xl px-3 py-2 border border-soft/50">
                                                    <div className="min-w-0">
                                                        <span className="text-[10px] font-bold text-fg">{ic.quantidade}x {ic.item.nome}</span>
                                                        <span className={`text-[8px] ml-2 ${ic.item.stock >= ic.quantidade ? 'text-emerald-500' : 'text-red-400'}`}>
                                                            (stock: {ic.item.stock})
                                                        </span>
                                                    </div>
                                                    {podeGerir && (
                                                        <button onClick={() => handleRemoverItem(ic.id)} className="text-muted hover:text-red-400 transition-colors shrink-0 p-1">
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-[9px] text-muted text-center py-2">Nenhum item na cesta</p>
                                        )}
                                    </div>

                                    {/* ADICIONAR ITEM (líder) */}
                                    {podeGerir && (
                                        <AddItemForm cestaId={cesta.id} itensStock={itensStock} itensExistentes={cesta.itens.map((ic: any) => ic.item_id)} onAdd={handleAddItem} />
                                    )}

                                    {/* BOTÕES DE ACÇÃO */}
                                    <div className="flex gap-2 pt-1">
                                        {capacidade > 0 && (
                                            <button onClick={() => setMontarId(isMontando ? null : cesta.id)}
                                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                                                    isMontando ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600'
                                                }`}>
                                                <Send size={12} /> Montar e Entregar
                                            </button>
                                        )}
                                        {podeGerir && (
                                            <button onClick={() => handleEliminarCesta(cesta.id, cesta.nome)}
                                                className="px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg border border-soft text-muted hover:text-red-500 hover:border-red-300 transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>

                                    {/* FORM MONTAR */}
                                    {isMontando && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Entregar Cesta</p>
                                            <input value={destinatario} onChange={e => setDestinatario(e.target.value)}
                                                placeholder="Nome da familia / destinatario *"
                                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:border-emerald-500 outline-none" />
                                            <input value={obsEntrega} onChange={e => setObsEntrega(e.target.value)}
                                                placeholder="Observacao (opcional)"
                                                className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold text-fg focus:border-emerald-500 outline-none" />
                                            <div className="flex gap-2">
                                                <button onClick={() => setMontarId(null)}
                                                    className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-bg border border-soft text-muted">Cancelar</button>
                                                <button onClick={handleMontarCesta} disabled={loading || !destinatario.trim()}
                                                    className="flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95">
                                                    {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Confirmar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )
                    })}
                </div>
            )}

            {/* HISTORICO DE ENTREGAS */}
            {entregas.length > 0 && (
                <details className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <summary className="flex items-center justify-between p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-figueira" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-fg">Ultimas Entregas</span>
                            <span className="text-[8px] font-bold text-muted bg-soft px-2 py-0.5 rounded-lg">{entregas.length}</span>
                        </div>
                        <ChevronDown size={14} className="text-muted" />
                    </summary>
                    <div className="border-t border-soft divide-y divide-soft/50">
                        {entregas.map((e: any) => (
                            <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold text-fg truncate">{e.destinatario}</p>
                                    <p className="text-[8px] text-muted">{e.tipoCesta.nome}</p>
                                </div>
                                <span className="text-[8px] font-bold text-muted shrink-0">
                                    {new Date(e.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    )
}

// Sub-componente para adicionar item à cesta
function AddItemForm({ cestaId, itensStock, itensExistentes, onAdd }: {
    cestaId: number; itensStock: ItemStock[]; itensExistentes: number[]
    onAdd: (cestaId: number, itemId: number, qtd: number) => Promise<void>
}) {
    const [aberto, setAberto] = useState(false)
    const [itemId, setItemId] = useState('')
    const [qtd, setQtd] = useState('1')
    const [loading, setLoading] = useState(false)

    const itensDisponiveis = itensStock.filter(i => !itensExistentes.includes(i.id))

    if (!aberto) {
        return (
            <button onClick={() => setAberto(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:border-figueira hover:text-figueira transition-all">
                <Plus size={11} /> Adicionar Item
            </button>
        )
    }

    return (
        <div className="flex gap-2 items-end">
            <div className="flex-1">
                <select value={itemId} onChange={e => setItemId(e.target.value)}
                    className="w-full bg-bg border border-soft rounded-xl px-3 py-2 text-[10px] font-bold text-fg outline-none focus:border-figueira appearance-none">
                    <option value="">Selecionar item...</option>
                    {itensDisponiveis.map(i => (
                        <option key={i.id} value={i.id}>{i.nome} (stock: {i.stock})</option>
                    ))}
                </select>
            </div>
            <input type="number" min="1" value={qtd} onChange={e => setQtd(e.target.value)}
                className="w-16 bg-bg border border-soft rounded-xl px-3 py-2 text-[10px] font-bold text-fg text-center outline-none focus:border-figueira" />
            <button
                disabled={loading || !itemId}
                onClick={async () => {
                    setLoading(true)
                    await onAdd(cestaId, Number(itemId), Number(qtd) || 1)
                    setItemId(''); setQtd('1'); setAberto(false); setLoading(false)
                }}
                className="px-3 py-2 rounded-xl bg-figueira text-white text-[9px] font-black disabled:opacity-50">
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
            </button>
            <button onClick={() => setAberto(false)} className="px-2 py-2 text-muted hover:text-fg">
                <X size={14} />
            </button>
        </div>
    )
}

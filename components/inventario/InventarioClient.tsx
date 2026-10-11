'use client'
// components/inventario/InventarioClient.tsx

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
    Package, Plus, Search, SlidersHorizontal, X, Filter,
    ShieldCheck, AlertTriangle, Wrench, ArrowLeftRight,
    ChevronDown, ChevronUp, Edit3, Archive, Clock,
    CheckCircle2, Loader2, List, LayoutGrid
} from 'lucide-react'
import ModalCriarItem from '@/components/inventario/ModalCriarItem'
import ModalDetalhesItem from '@/components/inventario/ModalDetalhesItem'
import ModalMovimento from '@/components/inventario/ModalMovimento'

const CATEGORIAS: Record<string, { label: string; emoji: string }> = {
    ELETRONICO: { label: 'Electrónico', emoji: '💻' },
    INSTRUMENTO: { label: 'Instrumento', emoji: '🎸' },
    MOVEL: { label: 'Móvel', emoji: '🪑' },
    VEICULO: { label: 'Veículo', emoji: '🚐' },
    FERRAMENTA: { label: 'Ferramenta', emoji: '🔧' },
    VESTUARIO: { label: 'Vestuário', emoji: '👕' },
    LIVRO: { label: 'Livro', emoji: '📖' },
    CONSUMIVEL: { label: 'Consumível', emoji: '📦' },
    OUTRO: { label: 'Outro', emoji: '📎' },
}

const ESTADOS: Record<string, { label: string; cor: string }> = {
    OTIMO: { label: 'Óptimo', cor: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20' },
    BOM: { label: 'Bom', cor: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
    REGULAR: { label: 'Regular', cor: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
    DANIFICADO: { label: 'Danificado', cor: 'bg-red-500/10 text-red-700 border-red-500/20' },
    INUTILIZAVEL: { label: 'Inutilizável', cor: 'bg-soft text-muted border-soft' },
}

interface Props {
    itens: any[]
    departamentos: any[]
    grupos: any[]
    membros: any[]
    kpis: {
        total: number
        emprestados: number
        emManutencao: number
        garantiaExpirando: number
        valorTotal: number
    }
    isAdmin: boolean
}

export default function InventarioClient({ itens, departamentos, grupos, membros, kpis, isAdmin }: Props) {
    const router = useRouter()
    const [, startTransition] = useTransition()

    // Filtros
    const [busca, setBusca] = useState('')
    const [filtroCategoria, setFiltroCategoria] = useState('TODAS')
    const [filtroEstado, setFiltroEstado] = useState('TODOS')
    const [filtroDonoTipo, setFiltroDonoTipo] = useState('TODOS')
    const [filtrosAbertos, setFiltrosAbertos] = useState(false)
    const [vista, setVista] = useState<'tabela' | 'cards'>('tabela')

    // Modais
    const [modalCriar, setModalCriar] = useState(false)
    const [itemDetalhes, setItemDetalhes] = useState<any | null>(null)
    const [itemMovimento, setItemMovimento] = useState<any | null>(null)

    const temFiltros = filtroCategoria !== 'TODAS' || filtroEstado !== 'TODOS' || filtroDonoTipo !== 'TODOS'

    const itensFiltrados = useMemo(() => {
        return itens.filter(item => {
            const termo = busca.toLowerCase()
            const matchBusca = !busca ||
                item.nome.toLowerCase().includes(termo) ||
                item.marca?.toLowerCase().includes(termo) ||
                item.modelo?.toLowerCase().includes(termo) ||
                item.codigo_patrimonio?.toLowerCase().includes(termo) ||
                item.localizacao?.toLowerCase().includes(termo)

            const matchCat = filtroCategoria === 'TODAS' || item.categoria === filtroCategoria
            const matchEstado = filtroEstado === 'TODOS' || item.estado === filtroEstado
            const matchDono = filtroDonoTipo === 'TODOS' || item.dono_tipo === filtroDonoTipo

            return matchBusca && matchCat && matchEstado && matchDono
        })
    }, [itens, busca, filtroCategoria, filtroEstado, filtroDonoTipo])

    function nomeDono(item: any) {
        if (item.dono_tipo === 'DEPARTAMENTO' && item.dono_departamento) return item.dono_departamento.nome
        if (item.dono_tipo === 'GRUPO' && item.dono_grupo) return item.dono_grupo.nome
        if (item.dono_tipo === 'MEMBRO' && item.dono_membro)
            return `${item.dono_membro.first_name} ${item.dono_membro.last_name}`
        return 'Igreja'
    }

    function statusDisponibilidade(item: any) {
        const dispo = item.quantidade_disponivel
        const total = item.quantidade_total
        if (dispo === 0) return { label: 'Indisponível', cor: 'text-red-500' }
        if (dispo < total) return { label: `${dispo}/${total} disp.`, cor: 'text-orange-500' }
        return { label: `${dispo} disp.`, cor: 'text-emerald-600' }
    }

    function garantiaStatus(item: any) {
        if (!item.tem_garantia) return null
        if (!item.garantia_validade) return { label: 'Garantia', cor: 'text-blue-500' }
        const validade = new Date(item.garantia_validade)
        const hoje = new Date()
        const diff = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        if (diff < 0) return { label: 'Garantia expirada', cor: 'text-red-500' }
        if (diff <= 30) return { label: `Garante ${diff}d`, cor: 'text-orange-500' }
        return { label: 'Em garantia', cor: 'text-emerald-600' }
    }

    return (
        <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'Total Itens', value: kpis.total, cor: 'text-fg', sub: null },
                    { label: 'Emprestados', value: kpis.emprestados, cor: kpis.emprestados > 0 ? 'text-orange-600' : 'text-fg', sub: null },
                    { label: 'Manutenção', value: kpis.emManutencao, cor: kpis.emManutencao > 0 ? 'text-red-600' : 'text-fg', sub: null },
                    { label: 'Garantia 30d', value: kpis.garantiaExpirando, cor: kpis.garantiaExpirando > 0 ? 'text-orange-600' : 'text-fg', sub: null },
                    {
                        label: 'Valor Total',
                        value: kpis.valorTotal > 0
                            ? new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(kpis.valorTotal)
                            : '—',
                        cor: 'text-figueira', sub: null
                    },
                ].map(k => (
                    <div key={k.label} className="bg-bg2 border border-soft rounded-2xl px-4 py-3">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">{k.label}</p>
                        <p className={`text-xl font-black italic ${k.cor}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* BARRA DE ACÇÕES */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Nome, marca, modelo, código..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full bg-bg2 border border-soft rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-fg focus:border-figueira outline-none placeholder:text-muted/40"
                    />
                    {busca && (
                        <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-red-500">
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                    className={`flex items-center gap-2 px-4 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
                        ${filtrosAbertos || temFiltros ? 'bg-figueira text-white border-figueira' : 'bg-bg2 border-soft text-muted hover:text-fg'}`}
                >
                    <SlidersHorizontal size={13} />
                    Filtros
                    {temFiltros && <span className="bg-white/30 rounded-full w-4 h-4 flex items-center justify-center text-[7px]">!</span>}
                </button>

                <div className="flex border border-soft rounded-xl overflow-hidden bg-bg2">
                    <button onClick={() => setVista('tabela')} className={`px-3 py-3 transition-all ${vista === 'tabela' ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                        <List size={14} />
                    </button>
                    <button onClick={() => setVista('cards')} className={`px-3 py-3 transition-all ${vista === 'cards' ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                        <LayoutGrid size={14} />
                    </button>
                </div>

                <button
                    onClick={() => setModalCriar(true)}
                    className="flex items-center gap-2 bg-figueira text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95"
                >
                    <Plus size={14} /> Adicionar
                </button>
            </div>

            {/* FILTROS */}
            {filtrosAbertos && (
                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Categoria</label>
                            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                <option value="TODAS">Todas</option>
                                {Object.entries(CATEGORIAS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.emoji} {v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Estado</label>
                            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                <option value="TODOS">Todos</option>
                                {Object.entries(ESTADOS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Pertence a</label>
                            <select value={filtroDonoTipo} onChange={e => setFiltroDonoTipo(e.target.value)}
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                <option value="TODOS">Todos</option>
                                <option value="IGREJA">Igreja</option>
                                <option value="DEPARTAMENTO">Departamento</option>
                                <option value="GRUPO">Grupo</option>
                                <option value="MEMBRO">Membro</option>
                            </select>
                        </div>
                    </div>
                    {temFiltros && (
                        <div className="flex justify-between items-center pt-2 border-t border-soft">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                                {itensFiltrados.length} resultado{itensFiltrados.length !== 1 ? 's' : ''}
                            </p>
                            <button onClick={() => { setFiltroCategoria('TODAS'); setFiltroEstado('TODOS'); setFiltroDonoTipo('TODOS') }}
                                className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 flex items-center gap-1">
                                <X size={11} /> Limpar
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TABELA */}
            {vista === 'tabela' && (
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="border-b border-soft bg-bg/50">
                                    {['Item', 'Categoria', 'Estado', 'Dono', 'Disponibilidade', 'Garantia', ''].map(h => (
                                        <th key={h} className="px-5 py-4 text-[8px] font-black text-muted uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft/50">
                                {itensFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <Package size={24} className="mx-auto text-muted/20 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum item encontrado</p>
                                        </td>
                                    </tr>
                                ) : itensFiltrados.map(item => {
                                    const cat = CATEGORIAS[item.categoria]
                                    const estado = ESTADOS[item.estado]
                                    const dispo = statusDisponibilidade(item)
                                    const garantia = garantiaStatus(item)

                                    return (
                                        <tr key={item.id} className="hover:bg-soft/10 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-soft border border-soft/50 flex items-center justify-center text-lg shrink-0">
                                                        {cat?.emoji || '📎'}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-tight text-fg leading-none">{item.nome}</p>
                                                        <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                                            {[item.marca, item.modelo].filter(Boolean).join(' · ') || item.codigo_patrimonio || `#${item.id}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                                                    {cat?.label || item.categoria}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${estado?.cor || 'bg-soft text-muted border-soft'}`}>
                                                    {estado?.label || item.estado}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-[10px] font-bold text-fg">{nomeDono(item)}</p>
                                                <p className="text-[8px] text-muted uppercase tracking-widest">{item.dono_tipo || 'IGREJA'}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`text-[10px] font-black ${dispo.cor}`}>{dispo.label}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {garantia ? (
                                                    <span className={`text-[9px] font-black ${garantia.cor}`}>{garantia.label}</span>
                                                ) : (
                                                    <span className="text-[9px] text-muted/40">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => setItemDetalhes(item)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-figueira hover:border-figueira/30 transition-all"
                                                        title="Ver detalhes">
                                                        <Package size={13} />
                                                    </button>
                                                    <button onClick={() => setItemMovimento(item)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-blue-500 hover:border-blue-500/30 transition-all"
                                                        title="Registar movimento">
                                                        <ArrowLeftRight size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-soft px-6 py-3 bg-bg">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                            {itensFiltrados.length} item{itensFiltrados.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            )}

            {/* CARDS */}
            {vista === 'cards' && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {itensFiltrados.length === 0 ? (
                        <div className="col-span-3 py-16 text-center bg-bg2 border border-soft rounded-2xl">
                            <Package size={24} className="mx-auto text-muted/20 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum item encontrado</p>
                        </div>
                    ) : itensFiltrados.map(item => {
                        const cat = CATEGORIAS[item.categoria]
                        const estado = ESTADOS[item.estado]
                        const dispo = statusDisponibilidade(item)
                        const garantia = garantiaStatus(item)

                        return (
                            <div key={item.id} className="bg-bg2 border border-soft rounded-2xl overflow-hidden hover:border-figueira/20 transition-all">
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{cat?.emoji || '📎'}</span>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight text-fg leading-none">{item.nome}</p>
                                                <p className="text-[8px] text-muted font-bold uppercase mt-0.5">
                                                    {[item.marca, item.modelo].filter(Boolean).join(' · ') || `#${item.id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0 ${estado?.cor || ''}`}>
                                            {estado?.label}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted">Dono</span>
                                            <span className="text-[9px] font-bold text-fg">{nomeDono(item)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted">Stock</span>
                                            <span className={`text-[9px] font-black ${dispo.cor}`}>{dispo.label}</span>
                                        </div>
                                        {item.localizacao && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Local</span>
                                                <span className="text-[9px] font-bold text-fg">{item.localizacao}</span>
                                            </div>
                                        )}
                                        {garantia && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted">Garantia</span>
                                                <span className={`text-[9px] font-black ${garantia.cor}`}>{garantia.label}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex border-t border-soft">
                                    <button onClick={() => setItemDetalhes(item)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[8px] font-black uppercase tracking-widest text-muted hover:text-figueira hover:bg-figueira/5 transition-all">
                                        <Package size={12} /> Detalhes
                                    </button>
                                    <div className="w-px bg-soft" />
                                    <button onClick={() => setItemMovimento(item)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[8px] font-black uppercase tracking-widest text-muted hover:text-blue-500 hover:bg-blue-500/5 transition-all">
                                        <ArrowLeftRight size={12} /> Movimento
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* MODAIS */}
            {modalCriar && (
                <ModalCriarItem
                    departamentos={departamentos}
                    grupos={grupos}
                    membros={membros}
                    onClose={() => setModalCriar(false)}
                    onSucesso={() => { setModalCriar(false); router.refresh() }}
                />
            )}

            {itemDetalhes && (
                <ModalDetalhesItem
                    item={itemDetalhes}
                    onClose={() => setItemDetalhes(null)}
                    onMovimento={() => { setItemMovimento(itemDetalhes); setItemDetalhes(null) }}
                    onSucesso={() => { setItemDetalhes(null); router.refresh() }}
                    departamentos={departamentos}
                    grupos={grupos}
                    membros={membros}
                />
            )}

            {itemMovimento && (
                <ModalMovimento
                    item={itemMovimento}
                    onClose={() => setItemMovimento(null)}
                    onSucesso={() => { setItemMovimento(null); router.refresh() }}
                />
            )}
        </div>
    )
}
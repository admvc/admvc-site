'use client'

import { useState } from 'react'
import { Search, Loader2, Check, X, Minus, Plus, Package, AlertCircle, Filter, Star, HeartHandshake } from 'lucide-react'
// Reutilizamos a mesma action mágica que criámos para a despensa!
import { atualizarStockLoyverseAction } from '@/actions/despensa-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function DespensaManager({ produtos, categorias }: { produtos: any[], categorias?: any[] }) {
    const [busca, setBusca] = useState('');
    const [filtroAtivo, setFiltroAtivo] = useState<'TODOS' | 'DESTAQUES' | 'ESGOTADOS' | 'DESPENSA' | 'ASSISTENCIA'>('TODOS');

    // ========================================================================
    // LÓGICA DE FILTRAGEM (Pesquisa + Botões de Filtro)
    // ========================================================================
    const produtosFiltrados = produtos.filter(p => {
        const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());

        let matchFiltro = true;
        if (filtroAtivo === 'ESGOTADOS') matchFiltro = p.stock <= 0;
        if (filtroAtivo === 'DESTAQUES') matchFiltro = p.isDestaque;
        if (filtroAtivo === 'DESPENSA') matchFiltro = p.categoria.toLowerCase().includes('despensa');
        if (filtroAtivo === 'ASSISTENCIA') matchFiltro = p.categoria.toLowerCase().includes('assistência') || p.categoria.toLowerCase().includes('assistencia');

        return matchBusca && matchFiltro;
    });

    const esgotadosCount = produtos.filter(p => p.stock <= 0).length;

    return (
        <div className="space-y-8">

            {/* CARDS DE RESUMO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bg2 border border-soft p-6 rounded-[2.5rem] flex items-center gap-5 shadow-sm">
                    <div className="p-4 bg-figueira/10 text-figueira rounded-2xl"><Package size={24} /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Total de Produtos</p>
                        <p className="text-3xl font-black italic tracking-tighter text-fg">{produtos.length}</p>
                    </div>
                </div>

                <div className={`border p-6 rounded-[2.5rem] flex items-center gap-5 shadow-sm transition-colors ${esgotadosCount > 0 ? 'bg-red-50 border-red-100' : 'bg-bg2 border-soft'}`}>
                    <div className={`p-4 rounded-2xl ${esgotadosCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {esgotadosCount > 0 ? <AlertCircle size={24} /> : <Check size={24} />}
                    </div>
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${esgotadosCount > 0 ? 'text-red-500' : 'text-muted'}`}>Ruptura de Stock</p>
                        <p className={`text-3xl font-black italic tracking-tighter ${esgotadosCount > 0 ? 'text-red-600' : 'text-fg'}`}>{esgotadosCount}</p>
                    </div>
                </div>
            </div>

            {/* BARRA DE PESQUISA E FILTROS */}
            <div className="space-y-4">
                <div className="flex items-center bg-bg2 border border-soft p-4 rounded-3xl shadow-sm relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Pesquisar produto na despensa..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-2xl pl-12 pr-4 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-colors"
                    />
                </div>

                {/* BOTÕES DE FILTRO (AGORA COM DESPENSA E ASSISTÊNCIA) */}
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setFiltroAtivo('TODOS')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroAtivo === 'TODOS' ? 'bg-fg text-bg shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-fg'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFiltroAtivo('DESTAQUES')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filtroAtivo === 'DESTAQUES' ? 'bg-yellow-500 text-white shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-yellow-500'}`}
                    >
                        <Star size={12} /> Destaques
                    </button>
                    <button
                        onClick={() => setFiltroAtivo('ESGOTADOS')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filtroAtivo === 'ESGOTADOS' ? 'bg-red-500 text-white shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-red-500'}`}
                    >
                        <AlertCircle size={12} /> Esgotados
                    </button>
                    <button
                        onClick={() => setFiltroAtivo('DESPENSA')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filtroAtivo === 'DESPENSA' ? 'bg-blue-500 text-white shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-blue-500'}`}
                    >
                        <Package size={12} /> Despensa
                    </button>
                    <button
                        onClick={() => setFiltroAtivo('ASSISTENCIA')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${filtroAtivo === 'ASSISTENCIA' ? 'bg-orange-500 text-white shadow-md' : 'bg-bg2 border border-soft text-muted hover:border-orange-500'}`}
                    >
                        <HeartHandshake size={12} /> Assistência
                    </button>
                </div>
            </div>

            {/* TABELA DE PRODUTOS E STOCK */}
            <div className="bg-bg2 border border-soft rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-soft/30 border-b border-soft text-[9px] font-black uppercase tracking-widest text-muted">
                                <th className="p-5 pl-8">Produto</th>
                                <th className="p-5">Preço</th>
                                <th className="p-5">Categoria</th>
                                <th className="p-5 text-right pr-8 w-48">Gestão de Stock</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-soft">
                            {produtosFiltrados.length > 0 ? (
                                produtosFiltrados.map(p => (
                                    <tr key={p.id} className="hover:bg-soft/20 transition-colors group">
                                        <td className="p-5 pl-8">
                                            <div className="flex items-center gap-3">
                                                {p.isDestaque && <Star size={14} className="text-yellow-500 shrink-0" />}
                                                <span className="font-black uppercase text-sm text-fg">{p.nome}</span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className="font-bold text-xs text-muted">
                                                {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(p.preco)}
                                            </span>
                                        </td>
                                        <td className="p-5">
                                            <span className="bg-soft text-muted px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest">
                                                {p.categoria}
                                            </span>
                                        </td>
                                        <td className="p-5 pr-8">
                                            {/* O COMPONENTE MÁGICO DE AJUSTE DE STOCK */}
                                            <AjustadorStock variantId={p.varianteId} stockAtual={p.stock} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center text-muted text-xs font-black uppercase tracking-widest">
                                        Nenhum produto encontrado com este filtro.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ============================================================================
// COMPONENTE DE AJUSTE DE STOCK INLINE
// ============================================================================
function AjustadorStock({ variantId, stockAtual }: { variantId: string, stockAtual: number }) {
    const [valor, setValor] = useState(Math.floor(stockAtual));
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast()

    // Se o valor for alterado, mostramos os botões de Guardar/Cancelar
    const foiAlterado = valor !== Math.floor(stockAtual);

    const handleSave = async () => {
        setIsSaving(true);
        // Usamos a mesma action da Despensa, pois faz exatamente a mesma coisa na API do Loyverse!
        const res = await atualizarStockLoyverseAction(variantId, valor);
        if (res.error) {
            toast(res.error, 'erro');
            setValor(Math.floor(stockAtual)); // Reverte em caso de erro
        }
        setIsSaving(false);
    };

    return (
        <div className="flex items-center justify-end gap-2">

            {/* Controlos de Ajuste */}
            <div className="flex items-center bg-bg border border-soft rounded-xl overflow-hidden shadow-sm">
                <button
                    type="button"
                    onClick={() => setValor(v => Math.max(0, v - 1))}
                    className="p-2 text-muted hover:text-fg hover:bg-soft transition-colors active:bg-soft/50"
                    disabled={isSaving}
                >
                    <Minus size={14} />
                </button>

                <input
                    type="number"
                    value={valor}
                    onChange={(e) => setValor(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-12 text-center text-xs font-black text-fg outline-none bg-transparent appearance-none"
                    disabled={isSaving}
                />

                <button
                    type="button"
                    onClick={() => setValor(v => v + 1)}
                    className="p-2 text-muted hover:text-fg hover:bg-soft transition-colors active:bg-soft/50"
                    disabled={isSaving}
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Ações de Guardar ou Cancelar */}
            {foiAlterado && !isSaving && (
                <div className="flex animate-in fade-in slide-in-from-right-2">
                    <button onClick={handleSave} className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors" title="Guardar">
                        <Check size={16} strokeWidth={3} />
                    </button>
                    <button onClick={() => setValor(Math.floor(stockAtual))} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors" title="Cancelar">
                        <X size={16} strokeWidth={3} />
                    </button>
                </div>
            )}

            {isSaving && (
                <div className="p-2">
                    <Loader2 size={16} className="animate-spin text-figueira" />
                </div>
            )}
        </div>
    )
}
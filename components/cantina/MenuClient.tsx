// components/cantina/MenuClient.tsx
'use client'

import { useState } from 'react'
import { Coffee, Flame } from 'lucide-react'

export default function MenuClient({ produtos }: { produtos: any[] }) {
    const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');

    // 1. Extrair categorias únicas que têm produtos
    const categoriasExistentes = Array.from(new Set(produtos.map(p => p.categoria))).sort();
    const categoriasMenu = ['Todas', ...categoriasExistentes];

    // 2. Filtrar produtos pela categoria selecionada
    const produtosFiltrados = categoriaAtiva === 'Todas'
        ? produtos
        : produtos.filter(p => p.categoria === categoriaAtiva);

    const euro = (valor: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* NAVEGAÇÃO DE CATEGORIAS (Sticky para acompanhar o scroll) */}
            <div className="sticky top-4 z-30 bg-bg/80 backdrop-blur-md py-4 -mx-6 px-6 overflow-x-auto custom-scrollbar-horizontal flex gap-3 border-y border-soft shadow-sm">
                {categoriasMenu.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setCategoriaAtiva(cat)}
                        className={`px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 border ${categoriaAtiva === cat
                                ? 'bg-figueira text-white border-figueira shadow-lg shadow-figueira/20'
                                : 'bg-bg2 text-muted border-soft hover:border-figueira/50'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* GRELHA DE PRODUTOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {produtosFiltrados.map((p: any, idx: number) => (
                    <div
                        key={p.id}
                        className="bg-bg2 border border-soft rounded-[2.5rem] p-4 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:border-figueira/30 transition-all group"
                        style={{ animationDelay: `${idx * 50}ms` }}
                    >
                        {/* FOTO E TAGS */}
                        <div className="relative h-48 w-full rounded-2xl overflow-hidden bg-bg border border-soft shrink-0">
                            {p.imagem ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={p.imagem}
                                    alt={p.nome}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-20" style={{ backgroundColor: p.cor }}>
                                    <Coffee size={48} className="text-fg mix-blend-overlay" />
                                </div>
                            )}

                            {/* Alerta de Escassez */}
                            {p.stock > 0 && p.stock < 5 && (
                                <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center gap-1">
                                    <Flame size={12} /> Últimos {Math.floor(p.stock)}
                                </div>
                            )}
                        </div>

                        {/* INFORMAÇÕES */}
                        <div className="px-2 pb-2 flex-1 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-tight">
                                    {p.nome}
                                </h3>
                                <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">
                                    {p.categoria}
                                </p>
                            </div>

                            <div className="mt-4 flex items-end justify-between">
                                <span className="text-3xl font-black text-figueira italic tracking-tighter">
                                    {euro(p.preco)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MENSAGEM QUANDO VAZIO */}
            {produtosFiltrados.length === 0 && (
                <div className="text-center py-20 bg-bg2 border border-dashed border-soft rounded-[3rem]">
                    <Coffee size={40} className="text-muted mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-black uppercase tracking-widest text-fg">Categoria Vazia</h3>
                    <p className="text-xs text-muted font-medium mt-2">Nenhum produto disponível nesta categoria de momento.</p>
                </div>
            )}
        </div>
    )
}
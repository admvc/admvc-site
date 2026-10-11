'use client'

import { useState, useMemo } from 'react'
import { GestaoFamiliaCard } from '@/components/familias/GestaoFamiliaCard'
import { Search, X, Home } from 'lucide-react'

export default function FamiliasGrid({ familias }: { familias: any[] }) {
    const [busca, setBusca] = useState('')

    const filtradas = useMemo(() => {
        if (!busca || busca.length < 2) return familias

        const termo = busca.toLowerCase()
        return familias.filter(f =>
            f.surname.toLowerCase().includes(termo) ||
            f.members.some((m: any) =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(termo)
            )
        )
    }, [busca, familias])

    return (
        <div className="space-y-4">
            {/* PESQUISA */}
            <div className="relative max-w-sm">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Pesquisar familia ou membro..."
                    className="w-full bg-bg2 border border-soft rounded-xl pl-9 pr-9 py-2.5 text-xs font-bold text-fg outline-none focus:border-figueira transition-colors placeholder:text-muted/50"
                />
                {busca && (
                    <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors">
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* RESULTADO */}
            {busca.length >= 2 && (
                <p className="text-[9px] font-bold text-muted uppercase tracking-widest">
                    {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''} para &quot;{busca}&quot;
                </p>
            )}

            {/* GRID */}
            {filtradas.length > 0 ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtradas.map(familia => (
                        <GestaoFamiliaCard key={familia.id} familia={familia} />
                    ))}
                </div>
            ) : (
                <div className="py-16 text-center border border-dashed border-soft rounded-2xl bg-bg2/30">
                    <Home size={24} className="mx-auto text-muted/30 mb-2" />
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                        {busca ? 'Nenhuma familia encontrada.' : 'Nenhuma familia registada.'}
                    </p>
                </div>
            )}
        </div>
    )
}

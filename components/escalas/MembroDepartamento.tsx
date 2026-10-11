"use client"

import { useState } from 'react'
import { Check, X, ChevronDown, Award } from 'lucide-react'

interface Funcao {
    id: number;
    nome: string;
}

export default function MultiSelectFuncoes({
    funcoesDisponiveis,
    onChange
}: {
    funcoesDisponiveis: Funcao[],
    onChange: (ids: number[]) => void
}) {
    const [selecionadas, setSelecionadas] = useState<Funcao[]>([]);
    const [aberto, setAberto] = useState(false);

    const alternarFuncao = (funcao: Funcao) => {
        let novas: Funcao[];
        if (selecionadas.find(f => f.id === funcao.id)) {
            novas = selecionadas.filter(f => f.id !== funcao.id);
        } else {
            novas = [...selecionadas, funcao];
        }
        setSelecionadas(novas);
        onChange(novas.map(f => f.id));
    };

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest flex items-center gap-2">
                <Award size={14} className="text-figueira" /> Funções do Membro neste Departamento
            </label>

            <div className="relative">
                {/* Campo de Seleção / Tags */}
                <div
                    onClick={() => setAberto(!aberto)}
                    className="min-h-[60px] w-full bg-bg border border-soft rounded-[1.5rem] p-3 flex flex-wrap gap-2 cursor-pointer hover:border-figueira/50 transition-all shadow-sm"
                >
                    {selecionadas.length === 0 && (
                        <span className="text-muted text-xs font-bold p-2 uppercase italic opacity-50">
                            Clique para selecionar as funções...
                        </span>
                    )}

                    {selecionadas.map(f => (
                        <span
                            key={f.id}
                            className="bg-figueira text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in zoom-in-95"
                        >
                            {f.nome}
                            <X
                                size={12}
                                className="hover:bg-white/20 rounded-full cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); alternarFuncao(f); }}
                            />
                        </span>
                    ))}

                    <ChevronDown size={16} className={`ml-auto self-center text-muted transition-transform ${aberto ? 'rotate-180' : ''}`} />
                </div>

                {/* Menu Dropdown */}
                {aberto && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-soft rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
                            {funcoesDisponiveis.map(f => {
                                const isSelected = selecionadas.find(s => s.id === f.id);
                                return (
                                    <div
                                        key={f.id}
                                        onClick={() => alternarFuncao(f)}
                                        className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-colors ${isSelected ? 'bg-figueira/10 text-figueira' : 'hover:bg-soft text-muted'}`}
                                    >
                                        <span className="text-xs font-black uppercase tracking-widest">{f.nome}</span>
                                        {isSelected && <Check size={16} />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <p className="text-[9px] text-muted font-bold uppercase tracking-widest ml-4">
                * Pode selecionar várias funções para o mesmo membro.
            </p>
        </div>
    );
}
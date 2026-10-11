'use client'

import { useState } from 'react'
import { Coffee, ChevronDown, ChevronUp, CalendarDays } from 'lucide-react'
import ExtratoFinanceiro from './ExtratoFinanceiro'

interface SessaoExtratoCantinaProps {
    carregamentos: any[];
    objetivos: any[];
}

export default function SessaoExtratoCantina({ carregamentos, objetivos }: SessaoExtratoCantinaProps) {
    // Estados para controlar o que está aberto ou fechado (começam falsos/retraídos)
    const [mostrarCarregamentos, setMostrarCarregamentos] = useState(false)
    const [mostrarExtrato, setMostrarExtrato] = useState(false)

    return (
        <div id="secao-extrato" className="scroll-mt-24 space-y-4">

            {/* 1. HISTÓRICO DE CARREGAMENTOS (ENTRADAS) */}
            {carregamentos && carregamentos.length > 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm transition-all">
                    <button
                        onClick={() => setMostrarCarregamentos(!mostrarCarregamentos)}
                        className="w-full flex items-center justify-between p-5 hover:bg-soft transition-colors active:scale-[0.99]"
                    >
                        <h3 className="text-sm font-black italic uppercase tracking-widest text-muted">
                            Histórico de Carregamentos
                        </h3>
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-figueira bg-figueira/10 px-3 py-1 rounded-full">
                                Ver Detalhes
                            </span>
                            {mostrarCarregamentos ? <ChevronUp size={16} className="text-figueira" /> : <ChevronDown size={16} className="text-muted" />}
                        </div>
                    </button>

                    {mostrarCarregamentos && (
                        <div className="p-4 pt-0 border-t border-soft/50 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-2 mt-4">
                                {carregamentos.map((c: any) => (
                                    <div key={c.id} className="flex justify-between items-center p-3 hover:bg-soft rounded-xl transition-colors group">
                                        <div className="flex items-center gap-3">
                                            {/* Cor muda se estiver pendente */}
                                            <div className={`p-2 rounded-lg transition-colors ${c.status === 'PENDENTE' ? 'bg-orange-500/10 text-orange-500' : 'bg-figueira/10 text-figueira group-hover:bg-figueira group-hover:text-white'}`}>
                                                <Coffee size={14} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[10px] font-black text-fg uppercase">Carregamento ({c.forma_pagamento})</p>
                                                    {/* ETIQUETA DE PENDENTE */}
                                                    {c.status === 'PENDENTE' && (
                                                        <span className="bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest">
                                                            Pendente
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted mt-0.5">
                                                    <CalendarDays size={10} className="opacity-50" />
                                                    <p className="text-[8px] font-bold uppercase">
                                                        {new Date(c.createdAt).toLocaleDateString('pt-PT')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <span className={`text-xs font-black italic ${c.status === 'PENDENTE' ? 'text-orange-500 opacity-50' : 'text-figueira'}`}>
                                            +{new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(c.valor)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 2. HISTÓRICO DE CONSUMOS E EXTRATOS (SAÍDAS) */}
            <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm transition-all">


                {mostrarExtrato && (
                    <div className="p-4 pt-0 border-t border-soft/50 animate-in slide-in-from-top-2 duration-300">
                        <div className="mt-4">
                            {/* O teu componente de extrato existente */}
                            <ExtratoFinanceiro objetivos={objetivos} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
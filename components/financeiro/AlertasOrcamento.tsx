'use client'

import { AlertTriangle, TrendingUp } from 'lucide-react'
import type { AlertaOrcamento } from '@/actions/alerta-orcamento-actions'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

function getBarColor(percentagem: number): string {
    if (percentagem >= 90) return 'bg-red-500'
    if (percentagem >= 70) return 'bg-amber-500'
    return 'bg-green-500'
}

function getCardStyle(percentagem: number): string {
    if (percentagem >= 90) return 'bg-red-500/10 border-red-500/20'
    return 'bg-amber-500/10 border-amber-500/20'
}

export default function AlertasOrcamento({ alertas }: { alertas: AlertaOrcamento[] }) {
    const excedidos = alertas.filter(a => a.excedeu)

    if (excedidos.length === 0) return null

    return (
        <section className="space-y-3">
            <h2 className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                <AlertTriangle size={14} /> Alertas de Orcamento ({excedidos.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {excedidos.map((alerta, idx) => (
                    <div
                        key={idx}
                        className={`rounded-2xl border p-4 space-y-3 transition-all hover:-translate-y-0.5 ${getCardStyle(alerta.percentagem)}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-tight text-fg">
                                    {alerta.categoriaNome}
                                </p>
                                <p className="text-[9px] text-muted">{alerta.fundoNome}</p>
                            </div>
                            <div className={`p-2 rounded-xl ${alerta.percentagem >= 90 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {alerta.percentagem >= 90
                                    ? <AlertTriangle size={16} />
                                    : <TrendingUp size={16} />
                                }
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                            <div className="w-full h-2 bg-soft rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${getBarColor(alerta.percentagem)}`}
                                    style={{ width: `${Math.min(100, alerta.percentagem)}%` }}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] text-muted">
                                    {euro(alerta.valorGasto)} gasto de {euro(alerta.valorPrevisto)} previsto
                                </p>
                                <span className={`text-[9px] font-black ${alerta.percentagem >= 90 ? 'text-red-500' : 'text-amber-500'}`}>
                                    {alerta.percentagem}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}

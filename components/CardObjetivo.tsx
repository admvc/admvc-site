// components/financeiro/CardObjetivo.tsx
import { Target, Calendar, User, CreditCard, ArrowUpRight } from 'lucide-react'

export default function CardObjetivo({ objetivo }: any) {
    const progresso = (objetivo.parcelas_pagas / objetivo.parcelas_total) * 100;

    return (
        <div className="bg-bg2 border border-soft p-8 rounded-[3rem] shadow-xl hover:border-figueira transition-all group">
            <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-figueira/10 rounded-2xl text-figueira">
                    <Target size={24} />
                </div>
                <span className="text-[10px] font-black bg-soft px-4 py-2 rounded-full uppercase tracking-widest text-muted">
                    {objetivo.status}
                </span>
            </div>

            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-fg mb-1">
                {objetivo.nome}
            </h3>
            <p className="text-[10px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                <User size={12} /> {objetivo.membro.first_name} {objetivo.membro.last_name}
            </p>

            <div className="grid grid-cols-2 gap-4 my-8">
                <div className="bg-bg p-4 rounded-2xl border border-soft">
                    <span className="text-[8px] font-black text-muted uppercase block mb-1">Valor Mensal</span>
                    <p className="text-lg font-black text-fg italic">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(objetivo.valor_mensal)}
                    </p>
                </div>
                <div className="bg-bg p-4 rounded-2xl border border-soft">
                    <span className="text-[8px] font-black text-muted uppercase block mb-1">Vencimento</span>
                    <p className="text-lg font-black text-fg italic">Dia {objetivo.data_pagamento}</p>
                </div>
            </div>

            {/* BARRA DE PROGRESSO DAS PARCELAS */}
            <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                    <span className="text-muted">Parcelas: {objetivo.parcelas_pagas}/{objetivo.parcelas_total}</span>
                    <span className="text-figueira">{progresso.toFixed(0)}%</span>
                </div>
                <div className="h-3 bg-soft rounded-full overflow-hidden">
                    <div
                        className="h-full bg-figueira transition-all duration-1000 shadow-[0_0_15px_rgba(var(--figueira-rgb),0.5)]"
                        style={{ width: `${progresso}%` }}
                    ></div>
                </div>
            </div>

            <button className="w-full mt-8 py-4 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-figueira hover:text-white transition-all flex items-center justify-center gap-2">
                Lançar Pagamento <ArrowUpRight size={14} />
            </button>
        </div>
    )
}
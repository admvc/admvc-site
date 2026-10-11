'use client'

import { useState, useMemo } from 'react'
import { TrendingUp, Wallet, Receipt, Ticket, Coffee, HandCoins } from 'lucide-react'

interface Transacao {
    valor: number;
    data: string;
    categoria: string;
}

export default function FiltroTotaisFinanceiro({ transacoes }: { transacoes: Transacao[] }) {
    const [mes, setMes] = useState<string>('TODOS')
    const [categoria, setCategoria] = useState<string>('TODAS')

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    const transacoesFiltradas = useMemo(() => {
        return transacoes.filter(t => {
            const dataT = new Date(t.data)
            const matchMes = mes === 'TODOS' || dataT.getMonth() === parseInt(mes)

            let catTransacao = t.categoria
            if (categoria === 'CONTRIBUICOES' && (t.categoria === 'DIZIMO' || t.categoria === 'OFERTA' || t.categoria === 'MISSAO')) {
                catTransacao = 'CONTRIBUICOES'
            }

            const matchCat = categoria === 'TODAS' || catTransacao === categoria

            return matchMes && matchCat
        })
    }, [transacoes, mes, categoria])

    const totais = useMemo(() => {
        return transacoesFiltradas.reduce((acc, t) => {
            acc.geral += t.valor
            if (t.categoria === 'CARNE') acc.carnes += t.valor
            else if (t.categoria === 'RIFA') acc.rifas += t.valor
            else if (t.categoria === 'CANTINA') acc.cantina += t.valor
            else acc.contribuicoes += t.valor 
            return acc
        }, { geral: 0, carnes: 0, rifas: 0, cantina: 0, contribuicoes: 0 })
    }, [transacoesFiltradas])

    const euro = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

    return (
        // Removemos o bg-bg2 e as bordas grossas para não duplicar com o modal "pai"
        <div className="flex flex-col h-full space-y-6 animate-in fade-in">

            {/* BARRA DE FILTROS MINIMALISTA */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest pl-1">Mês Referência</label>
                    <select
                        value={mes}
                        onChange={(e) => setMes(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-xs font-bold text-fg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-all"
                    >
                        <option value="TODOS">Todos os Meses</option>
                        {meses.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted uppercase tracking-widest pl-1">Origem da Receita</label>
                    <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-xs font-bold text-fg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer transition-all"
                    >
                        <option value="TODAS">Consolidado Total</option>
                        <option value="CARNE">Apenas Carnês</option>
                        <option value="RIFA">Apenas Rifas</option>
                        <option value="CANTINA">Apenas Cantina</option>
                        <option value="CONTRIBUICOES">Dízimos e Ofertas</option>
                    </select>
                </div>
            </div>

            {/* CARTÃO DE TOTAIS (Otimizado para largura estreita) */}
            <div className="bg-blue-600 text-white p-6 md:p-8 rounded-2xl shadow-lg shadow-blue-600/20 relative overflow-hidden flex-1 flex flex-col justify-between">
                
                {/* Ícone de fundo subtil */}
                <TrendingUp className="absolute -bottom-6 -right-6 w-40 h-40 text-white/10 rotate-12" />

                <div className="relative z-10 mb-8">
                    <div className="flex items-center gap-2 mb-2 text-white/70">
                        <Wallet size={14} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Total Filtrado</span>
                    </div>
                    <h4 className="text-4xl lg:text-5xl font-black italic tracking-tighter leading-none">
                        <span className="valor-dinheiro inline-block">{euro(totais.geral)}</span>
                    </h4>
                </div>

                {/* Grelha 2x2 para melhor leitura em colunas */}
<div className="relative z-10 grid grid-cols-2 gap-y-5 gap-x-4 pt-5 border-t border-white/20 mt-auto">
                    <div className="flex items-start gap-2.5">
                        <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5"><Receipt size={14} /></div>
                        <div>
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest block mb-0.5 leading-none">Carnês</span>
                            {/* Adicionado aqui 👇 */}
                            <span className="text-sm font-black italic text-white leading-none valor-dinheiro inline-block">{euro(totais.carnes)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-start gap-2.5">
                        <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5"><HandCoins size={14} /></div>
                        <div>
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest block mb-0.5 leading-none">Ofertas Livres</span>
                            {/* Adicionado aqui 👇 */}
                            <span className="text-sm font-black italic text-white leading-none valor-dinheiro inline-block">{euro(totais.contribuicoes)}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5"><Ticket size={14} /></div>
                        <div>
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest block mb-0.5 leading-none">Rifas</span>
                            {/* Adicionado aqui 👇 */}
                            <span className="text-sm font-black italic text-white leading-none valor-dinheiro inline-block">{euro(totais.rifas)}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5"><Coffee size={14} /></div>
                        <div>
                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest block mb-0.5 leading-none">Cantina</span>
                            {/* Adicionado aqui 👇 */}
                            <span className="text-sm font-black italic text-white leading-none valor-dinheiro inline-block">{euro(totais.cantina)}</span>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    )
}
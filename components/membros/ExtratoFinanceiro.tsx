'use client'

import { CalendarDays, Receipt, Coffee, HeartHandshake } from 'lucide-react'

export default function ExtratoFinanceiro({ objetivos }: { objetivos: any[] }) {

    // 1. Coletar todos os lançamentos de todos os objetivos (Carnês/Dízimos/Ofertas)
    // e ordenar por data decrescente
    const todosLancamentos = objetivos
        .flatMap(obj => obj.lancamentos.map((l: any) => ({ ...l, objetivoNome: obj.nome })))
        .sort((a, b) => new Date(b.data_recebimento).getTime() - new Date(a.data_recebimento).getTime());

    const euro = (valor: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(valor);

    if (todosLancamentos.length === 0) {
        return (
            <div className="py-10 border-2 border-dashed border-soft rounded-2xl text-center bg-bg2/30">
                <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">Nenhum registo financeiro encontrado.</p>
            </div>
        );
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl p-4 space-y-2 shadow-sm">
            {todosLancamentos.slice(0, 10).map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 hover:bg-soft rounded-xl transition-all group">
                    <div className="flex items-center gap-3">
                        {/* ÍCONE DINÂMICO */}
                        <div className="bg-figueira/10 text-figueira p-2 rounded-lg group-hover:bg-figueira group-hover:text-white transition-colors">
                            {item.objetivoNome.toLowerCase().includes('dízimo') ? (
                                <HeartHandshake size={14} />
                            ) : (
                                <Receipt size={14} />
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-fg uppercase leading-none">
                                {item.objetivoNome}
                            </p>

                            {/* ÍCONE E DATA DO LANÇAMENTO */}
                            <div className="flex items-center gap-1.5 text-muted mt-1">
                                <CalendarDays size={10} className="opacity-50" />
                                <span className="text-[9px] font-bold uppercase tracking-tight">
                                    {new Date(item.data_recebimento).toLocaleDateString('pt-PT')}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="text-xs font-black text-figueira italic">
                            <div className="preco-destaque">
                                <span className="valor-dinheiro inline-block">{euro(item.valor_pago)}   </span>
                            </div>
                        </span>
                        {/* Status subtil se necessário */}
                        <p className="text-[7px] font-black text-muted uppercase tracking-tighter opacity-50">Confirmado</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
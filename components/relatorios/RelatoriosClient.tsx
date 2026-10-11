'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
    ArrowLeft, ChevronRight, BarChart3, Users, Briefcase,
    Cake, Heart, Droplet, MapPin, ShieldCheck, Calendar,
    X, PieChart, TrendingUp, FileSignature, ChevronDown
} from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'

export default function RelatoriosClient({ membros }: { membros: any[] }) {
    const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null);
    const [linhaExpandida, setLinhaExpandida] = useState<number | null>(null);

    // ------------------------------------------------------------------------
    // FUNÇÕES DE AGREGAÇÃO (Agora Guardam os Nomes Além dos Números!)
    // ------------------------------------------------------------------------
    const dadosProcessados = useMemo(() => {
        if (!relatorioAtivo || membros.length === 0) return [];

        // Agrupador Genérico: Agora guarda um array "detalhes" com as pessoas
        const agruparPor = (campo: string) => {
            const contagem = membros.reduce((acc: any, membro: any) => {
                const chave = membro[campo] || 'Não Informado';
                if (!acc[chave]) acc[chave] = { valor: 0, detalhes: [] };
                acc[chave].valor += 1;
                acc[chave].detalhes.push(membro);
                return acc;
            }, {});

            return Object.entries(contagem)
                .map(([label, data]: any) => ({ label, valor: data.valor, detalhes: data.detalhes }))
                .sort((a, b) => b.valor - a.valor);
        };

        switch (relatorioAtivo) {
            case 'cargos': return agruparPor('church_role');
            case 'sexo': return agruparPor('gender');
            case 'estado_civil': return agruparPor('marital_status');
            case 'batismo': return agruparPor('baptism_status');
            case 'permissoes': return agruparPor('role');
            case 'cidade': return agruparPor('id_city');
            case 'bairro': return agruparPor('state');

            case 'gdpr': {
                const assinados: any[] = [];
                const pendentes: any[] = [];
                membros.forEach(m => {
                    if (m.termo_aceite) assinados.push(m);
                    else pendentes.push(m);
                });
                return [
                    { label: 'Assinado (Consentiu)', valor: assinados.length, detalhes: assinados },
                    { label: 'Pendente / Faltam Assinar', valor: pendentes.length, detalhes: pendentes }
                ];
            }

            case 'idade': {
                const faixas: Record<string, any> = {
                    '0-12 Anos (Crianças)': { valor: 0, detalhes: [] },
                    '13-17 Anos (Adolescentes)': { valor: 0, detalhes: [] },
                    '18-30 Anos (Jovens)': { valor: 0, detalhes: [] },
                    '31-50 Anos (Adultos)': { valor: 0, detalhes: [] },
                    '51+ Anos (Seniores)': { valor: 0, detalhes: [] },
                    'Desconhecida': { valor: 0, detalhes: [] }
                };

                membros.forEach(m => {
                    if (!m.birthdate) {
                        faixas['Desconhecida'].valor++;
                        faixas['Desconhecida'].detalhes.push(m);
                        return;
                    }
                    const idade = new Date().getFullYear() - new Date(m.birthdate).getFullYear();
                    let key = '';
                    if (idade <= 12) key = '0-12 Anos (Crianças)';
                    else if (idade <= 17) key = '13-17 Anos (Adolescentes)';
                    else if (idade <= 30) key = '18-30 Anos (Jovens)';
                    else if (idade <= 50) key = '31-50 Anos (Adultos)';
                    else key = '51+ Anos (Seniores)';

                    faixas[key].valor++;
                    faixas[key].detalhes.push(m);
                });
                return Object.entries(faixas)
                    .map(([label, data]: any) => ({ label, valor: data.valor, detalhes: data.detalhes }))
                    .filter(f => f.valor > 0);
            }

            case 'aniversarios': {
                const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
                const niverPorMes = Array(12).fill(null).map(() => ({ count: 0, membros: [] as any[] }));
                const semData = { count: 0, membros: [] as any[] };

                membros.forEach(m => {
                    if (m.birthdate) {
                        const monthIndex = new Date(m.birthdate).getMonth();
                        niverPorMes[monthIndex].count++;
                        niverPorMes[monthIndex].membros.push(m);
                    } else {
                        semData.count++;
                        semData.membros.push(m);
                    }
                });

                // Ordena as pessoas dentro de cada mês pelo DIA do aniversário
                niverPorMes.forEach(mes => {
                    mes.membros.sort((a, b) => new Date(a.birthdate).getDate() - new Date(b.birthdate).getDate());
                });

                const resNiver = meses.map((mes, i) => ({
                    label: mes,
                    valor: niverPorMes[i].count,
                    detalhes: niverPorMes[i].membros
                })).filter(m => m.valor > 0);

                if (semData.count > 0) resNiver.push({ label: 'Não Informado', valor: semData.count, detalhes: semData.membros });
                return resNiver;
            }

            case 'conversao': {
                const anos = membros.reduce((acc: any, m: any) => {
                    const ano = m.data_admissao ? new Date(m.data_admissao).getFullYear().toString() : 'Desconhecido';
                    if (!acc[ano]) acc[ano] = { valor: 0, detalhes: [] };
                    acc[ano].valor++;
                    acc[ano].detalhes.push(m);
                    return acc;
                }, {});
                return Object.entries(anos)
                    .map(([label, data]: any) => ({ label, valor: data.valor, detalhes: data.detalhes }))
                    .sort((a, b) => b.label.localeCompare(a.label));
            }

            default: return [];
        }
    }, [relatorioAtivo, membros]);

    // ------------------------------------------------------------------------
    // MUDAR RELATÓRIO (Reseta as linhas abertas)
    // ------------------------------------------------------------------------
    const handleAbrirRelatorio = (id: string) => {
        setRelatorioAtivo(id);
        setLinhaExpandida(null);
    };

    const relatoriosDisponiveis = [
        { id: 'cargos', label: 'Cargos e Funções', icon: <Briefcase size={20} /> },
        { id: 'idade', label: 'Faixa Etária', icon: <PieChart size={20} /> },
        { id: 'aniversarios', label: 'Aniversários', icon: <Cake size={20} /> },
        { id: 'sexo', label: 'Distribuição Sexo', icon: <Users size={20} /> },
        { id: 'estado_civil', label: 'Estado Civil', icon: <Heart size={20} /> },
        { id: 'batismo', label: 'Status Batismo', icon: <Droplet size={20} /> },
        { id: 'conversao', label: 'Evolução Entradas', icon: <TrendingUp size={20} /> },
        { id: 'cidade', label: 'Distribuição Cidades', icon: <MapPin size={20} /> },
        { id: 'bairro', label: 'Zonas e Bairros', icon: <MapPin size={20} /> },
        { id: 'gdpr', label: 'Compliance (GDPR)', icon: <FileSignature size={20} /> },
        { id: 'permissoes', label: 'Níveis de Acesso', icon: <ShieldCheck size={20} /> },
    ];

    // Link direto para relatorio de escalas por membro
    const linkEscalas = '/admin/relatorios/escalas';

    const relatorioAtual = relatoriosDisponiveis.find(r => r.id === relatorioAtivo);

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-32">

            {/* HEADER */}
            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Relatorios</h1>
                <p className="text-xs text-muted">{membros.length} membros activos. Selecione um relatorio.</p>
            </header>

            {/* RELATÓRIOS */}
            <section className="bg-bg2 border border-soft p-5 md:p-6 rounded-2xl shadow-sm">

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {relatoriosDisponiveis.map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => handleAbrirRelatorio(btn.id)}
                            className="group flex flex-col items-center justify-center gap-4 p-6 bg-bg border border-soft rounded-2xl hover:border-figueira/50 hover:bg-figueira/5 transition-all active:scale-95 text-center shadow-sm"
                        >
                            <div className="text-muted group-hover:text-figueira group-hover:-translate-y-1 transition-all duration-300">
                                {btn.icon}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-fg leading-tight">
                                {btn.label}
                            </span>
                        </button>
                    ))}
                    <Link
                        href={linkEscalas}
                        className="group flex flex-col items-center justify-center gap-4 p-6 bg-bg border border-soft rounded-2xl hover:border-figueira/50 hover:bg-figueira/5 transition-all active:scale-95 text-center shadow-sm"
                    >
                        <div className="text-muted group-hover:text-figueira group-hover:-translate-y-1 transition-all duration-300">
                            <Calendar size={20} />
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-fg leading-tight">
                            Escalas / Membro
                        </span>
                    </Link>
                </div>
            </section>

            {/* --- MODAL DE VISUALIZAÇÃO DO RELATÓRIO (PREMIUM) --- */}
            {relatorioAtivo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

                    <div className="bg-bg w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">

                        <div className="p-8 md:p-10 border-b border-soft flex justify-between items-center bg-bg2 relative shrink-0">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2">
                                    <BarChart3 size={12} /> Visualizador de Dados
                                </span>
                                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-fg flex items-center gap-3">
                                    {relatorioAtual?.icon} {relatorioAtual?.label}
                                </h3>
                            </div>
                            <button
                                onClick={() => setRelatorioAtivo(null)}
                                className="w-12 h-12 flex items-center justify-center bg-bg border border-soft text-muted rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all shadow-sm active:scale-90"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            {dadosProcessados.length > 0 ? dadosProcessados.map((item: any, index: number) => {
                                const percentagem = Math.round((item.valor / membros.length) * 100);
                                const isExpanded = linhaExpandida === index;

                                return (
                                    <div key={index} className="space-y-3 group">

                                        {/* CABEÇALHO DA BARRA (CLICÁVEL) */}
                                        <div
                                            onClick={() => setLinhaExpandida(isExpanded ? null : index)}
                                            className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-fg cursor-pointer hover:text-figueira transition-colors select-none"
                                        >
                                            <span className="truncate pr-4 flex items-center gap-2">
                                                {item.label}
                                                <ChevronDown size={12} className={`text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180 text-figueira' : ''}`} />
                                            </span>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-lg italic leading-none">{item.valor}</span>
                                                <span className="bg-soft text-muted px-2 py-0.5 rounded-md text-[8px] font-bold">
                                                    {percentagem}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* BARRA DE PROGRESSO */}
                                        <div className="w-full bg-soft/50 h-4 rounded-full overflow-hidden shadow-inner relative">
                                            <div
                                                className="bg-figueira h-full rounded-full transition-all duration-[1.5s] ease-out shadow-sm"
                                                style={{ width: `${percentagem}%` }}
                                            />
                                        </div>

                                        {/* LISTA EXPANDIDA DE NOMES (ACORDEÃO) */}
                                        {isExpanded && item.detalhes && item.detalhes.length > 0 && (
                                            <div className="pt-2 pb-2 animate-in slide-in-from-top-2 fade-in duration-200">
                                                <div className="bg-bg2 border border-soft rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
                                                    {item.detalhes.map((m: any) => (
                                                        <div key={m.id} className="flex items-center justify-between border-b border-soft/50 last:border-0 pb-2 last:pb-0">
                                                            <span className="text-[10px] font-bold text-fg uppercase truncate pr-2">
                                                                {m.first_name} {m.last_name}
                                                            </span>

                                                            {/* Se for relatório de aniversários, mostra o DIA */}
                                                            {relatorioAtivo === 'aniversarios' && m.birthdate ? (
                                                                <span className="shrink-0 text-[9px] font-black text-figueira tracking-widest bg-figueira/10 px-2 py-0.5 rounded border border-figueira/20">
                                                                    Dia {new Date(m.birthdate).getDate().toString().padStart(2, '0')}
                                                                </span>
                                                            ) : (
                                                                <span className="shrink-0 text-[8px] font-bold text-muted uppercase tracking-widest">
                                                                    ID #{m.id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )
                            }) : (
                                <div className="py-16 text-center">
                                    <div className="w-16 h-16 bg-soft rounded-3xl flex items-center justify-center text-muted mx-auto mb-4">
                                        <BarChart3 size={24} />
                                    </div>
                                    <h4 className="text-xl font-black uppercase italic tracking-tighter text-fg">Sem Dados</h4>
                                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-2">
                                        Não existem registos suficientes para gerar este gráfico.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-bg2 border-t border-soft text-center shrink-0">
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest">
                                Dica: Clique no título da barra para ver a lista de nomes.
                            </p>
                        </div>

                    </div>
                </div>
            )}
        </main>
    )
}
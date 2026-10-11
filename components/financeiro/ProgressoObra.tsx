// components/financeiro/ProgressoObra.tsx
import React from 'react';
import { Building2, TrendingUp, Target } from 'lucide-react';

const JSON_URL = "https://raw.githubusercontent.com/vagneraragao/admvc-site/refs/heads/main/components/obra-admvc.json";

async function getDadosObra() {
    try {
        const res = await fetch(JSON_URL, {
            next: { revalidate: 3600 } // Atualiza o cache a cada 1 hora
        });
        if (!res.ok) throw new Error();
        return await res.json();
    } catch (error) {
        return {
            titulo: "Campanha de Construção: Nossa Sede",
            descricao: "Acompanhe os passos de fé para a nossa sede na Figueira da Foz.",
            objetivoFinal: 750000,
            videoUrl: "https://youtu.be/rHNERaeiZPs?si=cGNKB0rgjgZMaTUR",
            etapas: [
                { nome: "1. Terreno", atual: 0, alvo: 150000 },
                { nome: "2. Estrutura", atual: 0, alvo: 300000 },
                { nome: "3. Acabamentos", atual: 0, alvo: 300000 }
            ]
        };
    }
}

export default async function ProgressoObra() {
    const DADOS_CONSTRUCAO = await getDadosObra();

    // Cálculos de Progresso
    const totalArrecadadoGeral = DADOS_CONSTRUCAO.etapas?.reduce((sum: number, etapa: any) => sum + (etapa.atual || 0), 0) || 0;
    const porcentagemGeral = Math.min(100, Math.round((totalArrecadadoGeral / DADOS_CONSTRUCAO.objetivoFinal) * 100));

    const euro = (valor: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);

    return (
        <section className="relative overflow-hidden rounded-[3rem] border border-soft bg-bg2 p-8 md:p-10 space-y-8 shadow-sm">

            {/* Fundo de destaque */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-figueira/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            {/* Cabeçalho */}
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-figueira font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                        <Building2 size={14} /> Campanha Ativa
                    </div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Progresso da <span className="text-muted/30">Obra.</span>
                    </h2>
                    <p className="text-xs text-muted font-bold tracking-widest uppercase">
                        {DADOS_CONSTRUCAO.descricao}
                    </p>
                </div>

                <div className="shrink-0 flex items-center gap-4 bg-bg border border-soft p-4 rounded-3xl">
                    <div className="p-3 bg-figueira/10 text-figueira rounded-2xl hidden sm:block">
                        <Target size={24} />
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-muted uppercase tracking-widest block mb-0.5">Arrecadação Total</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-fg valor-dinheiro italic">{euro(totalArrecadadoGeral)}</span>
                            <span className="text-xs font-bold valor-dinheiro text-muted">/ {euro(DADOS_CONSTRUCAO.objetivoFinal)}</span>
                        </div>
                    </div>
                    <div className="border-l border-soft pl-4 ml-2">
                        <span className="text-3xl font-black text-figueira">{porcentagemGeral}%</span>
                    </div>
                </div>
            </div>

            {/* Grid de Etapas */}
            <div className="relative z-10 grid gap-4 md:grid-cols-3">
                {DADOS_CONSTRUCAO.etapas?.map((etapa: any, index: number) => {
                    const porcentagemEtapa = Math.min(100, Math.round(((etapa.atual || 0) / (etapa.alvo || 1)) * 100));
                    const concluido = porcentagemEtapa >= 100;

                    return (
                        <div key={index} className="space-y-4 rounded-2xl border border-soft bg-bg p-6 transition-transform hover:border-figueira/30 group">
                            <div>
                                <h3 className="font-black text-fg text-sm uppercase tracking-tight">{etapa.nome}</h3>
                                <p className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">
                                    {euro(etapa.atual)} angariados
                                </p>
                            </div>

                            <div className="relative h-2 w-full rounded-full bg-soft overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${concluido ? 'bg-green-500' : 'bg-figueira'}`}
                                    style={{ width: `${porcentagemEtapa}%` }}
                                />
                            </div>

                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5">
                                    <TrendingUp size={12} className={concluido ? 'text-green-500' : 'text-figueira'} />
                                    <p className={`text-[9px] font-black uppercase tracking-wider ${concluido ? 'text-green-500' : 'text-figueira'}`}>
                                        {concluido ? "Meta Concluída" : "Em Andamento"}
                                    </p>
                                </div>
                                <span className="text-sm font-black text-fg italic">{porcentagemEtapa}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Botão para Vídeo (se houver) */}
            {DADOS_CONSTRUCAO.videoUrl && (
                <div className="pt-2">
                    <a
                        href={DADOS_CONSTRUCAO.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-bg border border-soft text-fg px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:border-figueira hover:text-figueira transition-all"
                    >
                        ▶ Assista ao Projeto Completo no YouTube
                    </a>
                </div>
            )}
        </section>
    );
}
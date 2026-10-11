// components/financeiro/GestaoObraWidget.tsx
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Building2, Save } from 'lucide-react'

import { getSessionData } from '@/lib/auth-utils'

export default async function GestaoObraWidget() {
    const session = await getSessionData();
    if (!session) return null;

    const membro = await prisma.membro.findUnique({
        where: { id: session.membroId },
        select: { tenant_id: true }
    });

    if (!membro) return null;

    // 1. Busca o projeto ou cria um padrão se não existir
    let projeto = await prisma.projetoObra.findFirst({
        where: { tenant_id: membro.tenant_id },
        include: { etapas: { orderBy: { ordem: 'asc' } } }
    });

    if (!projeto) {
        projeto = await prisma.projetoObra.create({
            data: {
                tenant_id: membro.tenant_id,
                titulo: "Campanha de Construção: Nossa Sede",
                descricao: "Acompanhe os passos de fé para a nossa sede na Figueira da Foz.",
                objetivoFinal: 750000,
                etapas: {
                    create: [
                        { tenant_id: membro.tenant_id, nome: "1. Terreno", alvo: 150000, atual: 0, ordem: 1 },
                        { tenant_id: membro.tenant_id, nome: "2. Estrutura", alvo: 300000, atual: 0, ordem: 2 },
                        { tenant_id: membro.tenant_id, nome: "3. Acabamentos", alvo: 300000, atual: 0, ordem: 3 }
                    ]
                }
            },
            include: { etapas: true }
        });
    }

    // 2. Action para guardar os valores diretamente do Dashboard
    async function salvarProgresso(formData: FormData) {
        'use server'
        const objFinal = Number(formData.get('objetivoFinal'));
        const projetoId = formData.get('projetoId') as string;

        if (objFinal > 0) {
            await prisma.projetoObra.update({ where: { id: projetoId }, data: { objetivoFinal: objFinal } });
        }

        for (const [key, value] of Array.from(formData.entries())) {
            if (key.startsWith('etapa_')) {
                const etapaId = key.replace('etapa_', '');
                const valorAtual = Number(value);
                await prisma.etapaObra.update({
                    where: { id: etapaId },
                    data: { atual: valorAtual }
                });
            }
        }

        revalidatePath('/'); // Atualiza o site público
        revalidatePath('/departamentos/financeiro/dashboard'); // Atualiza a dashboard atual
    }

    const euro = (valor: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);

    const totalArrecadado = projeto.etapas.reduce((acc, curr) => acc + curr.atual, 0);
    const porcentagemGeral = projeto.objetivoFinal > 0 ? Math.min(100, Math.round((totalArrecadado / projeto.objetivoFinal) * 100)) : 0;

    return (
        <div className="bg-bg2 border border-soft p-6 rounded-2xl shadow-sm flex flex-col h-full">
            {/* Cabeçalho Compacto */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="inline-flex items-center gap-1.5 text-green-500 font-black text-[9px] uppercase tracking-[0.2em] mb-1">
                        <Building2 size={12} /> Gestão da Obra
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Progresso Financeiro
                    </h3>
                </div>
                <div className="text-right bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
                    <span className="text-xs font-black text-green-600 italic">{porcentagemGeral}%</span>
                </div>
            </div>

            <form action={salvarProgresso} className="space-y-4 flex-1 flex flex-col">
                <input type="hidden" name="projetoId" value={projeto.id} />

                {/* Resumo Global (Mais apertado) */}
                <div className="flex items-center justify-between bg-bg border border-soft p-4 rounded-2xl">
                    <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted block">Arrecadado</span>
                        <span className="text-lg font-black italic valor-dinheiro text-green-500">{euro(totalArrecadado)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted block mb-1">Objetivo (€)</span>
                        <input
                            type="number"
                            name="objetivoFinal"
                            defaultValue={projeto.objetivoFinal}
                            className="bg-bg2 border border-soft p-2 rounded-xl text-sm valor-dinheiro font-bold text-fg text-right w-28 outline-none focus:border-green-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Lista de Etapas Compacta */}
                <div className="space-y-3 flex-1 mt-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted border-b border-soft pb-2">Etapas / Fases</h4>
                    {projeto.etapas.map((etapa) => (
                        <div key={etapa.id} className="flex items-center justify-between gap-4 border-b border-soft/50 pb-3 last:border-0 last:pb-0">
                            <div className="flex-1 overflow-hidden">
                                <h4 className="font-black text-fg uppercase text-[11px] truncate">{etapa.nome}</h4>
                                <span className="text-[8px] font-bold text-muted valor-dinheiro uppercase tracking-widest block truncate">
                                    Alvo: {euro(etapa.alvo)}
                                </span>
                            </div>
                            <div className="shrink-0 w-28">
                                <input
                                    type="number"
                                    step="0.01"
                                    name={`etapa_${etapa.id}`}
                                    defaultValue={etapa.atual}
                                    placeholder="Atual €"
                                    className="w-full bg-bg border border-soft rounded-xl p-2.5 valor-dinheiro text-xs font-bold text-fg text-right focus:border-green-500 outline-none transition-colors"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botão Salvar Compacto */}
                <button type="submit" className="w-full mt-2 flex justify-center items-center gap-2 bg-green-600 text-white p-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-md">
                    <Save size={14} /> Atualizar Site
                </button>
            </form>
        </div>
    );
}
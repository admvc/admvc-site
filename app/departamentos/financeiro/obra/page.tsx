// app/financeiro/obra/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { Building2, Save, ArrowLeft, ChevronRight } from 'lucide-react'

export default async function GestaoObraFinanceiro() {
    const db = await getDb()
    const session = await getSessionData();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'FINANCE')) {
        redirect('/membros/dashboard?error=Acesso Negado');
    }

    const membro = await db.membro.findUnique({
        where: { id: session.membroId },
        select: { tenant_id: true }
    });

    if (!membro) {
        redirect('/membros/dashboard?error=Usuário não encontrado');
    }

    // Busca o projeto ou cria um padrão se não existir
    let projeto = await db.projetoObra.findFirst({
        where: { tenant_id: membro.tenant_id },
        include: { etapas: { orderBy: { ordem: 'asc' } } }
    });

    if (!projeto) {
        projeto = await db.projetoObra.create({
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

    // Action para guardar os valores
    async function salvarProgresso(formData: FormData) {
        'use server'
        const db = await getDb()
        const objFinal = Number(formData.get('objetivoFinal'));
        const projetoId = formData.get('projetoId') as string;

        // Atualiza objetivo global
        if (objFinal > 0) {
            await db.projetoObra.update({ where: { id: projetoId }, data: { objetivoFinal: objFinal } });
        }

        // Atualiza as etapas individualmente
        for (const [key, value] of Array.from(formData.entries())) {
            if (key.startsWith('etapa_')) {
                const etapaId = key.replace('etapa_', '');
                const valorAtual = Number(value);
                await db.etapaObra.update({
                    where: { id: etapaId },
                    data: { atual: valorAtual }
                });
            }
        }

        revalidatePath('/'); // Atualiza o site público
        revalidatePath('/financeiro/obra');
    }

    const euro = (valor: number) =>
        new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor);

    const totalArrecadado = projeto.etapas.reduce((acc, curr) => acc + curr.atual, 0);

    return (
        <main className="max-w-4xl mx-auto pt-16 md:pt-8 pb-28 px-6 space-y-8 animate-in fade-in duration-700">
            <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-8">
                <Link href="/departamentos/financeiro/dashboard" className="hover:text-green-500 transition-colors flex items-center gap-2">
                    <ArrowLeft size={12} strokeWidth={3} /> Dashboard Financeira
                </Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-fg italic">Campanha de Construção</span>
            </nav>

            <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-green-500 font-black text-[10px] uppercase tracking-[0.3em] mb-1">
                    <Building2 size={14} /> Atualização de Valores
                </div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Progresso <span className="text-muted/30">Financeiro.</span>
                </h1>
                <p className="text-xs text-muted font-bold tracking-widest uppercase mt-2">
                    Os valores inseridos aqui irão refletir em percentagem no site público.
                </p>
            </div>

            <div className="bg-bg2 border border-soft p-8 rounded-[3rem] shadow-xl">
                <form action={salvarProgresso} className="space-y-8">
                    <input type="hidden" name="projetoId" value={projeto.id} />

                    <div className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl flex justify-between items-center">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Total Arrecadado até Hoje</span>
                            <span className="text-4xl font-black italic text-green-500 valor-dinheiro inline-block">{euro(totalArrecadado)}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted block mb-1">Objetivo Global</span>
                            <input
                                type="number"
                                name="objetivoFinal"
                                defaultValue={projeto.objetivoFinal}
                                className="bg-bg border border-soft p-3 rounded-2xl text-xl font-black text-fg text-right w-40 outline-none focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-fg border-b border-soft pb-2">Etapas do Projeto</h3>

                        {projeto.etapas.map((etapa) => (
                            <div key={etapa.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-6 bg-bg border border-soft rounded-2xl hover:border-green-500/30 transition-colors">
                                <div>
                                    <h4 className="font-black text-fg uppercase text-sm">{etapa.nome}</h4>
                                    <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Alvo: {euro(etapa.alvo)}</span>
                                </div>

                                <div className="md:col-span-2 space-y-2 relative">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-green-500 ml-4">Valor Arrecadado (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name={`etapa_${etapa.id}`}
                                        defaultValue={etapa.atual}
                                        className="w-full bg-bg2 border border-soft rounded-2xl p-4 text-sm font-bold text-fg focus:border-green-500 outline-none shadow-sm transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-soft flex justify-end">
                        <button type="submit" className="flex items-center gap-2 bg-green-600 text-white px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20">
                            <Save size={16} /> Gravar e Atualizar Site
                        </button>
                    </div>
                </form>
            </div>
        </main>
    )
}
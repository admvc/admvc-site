import { getDb, getTenantIdFromHeaders } from '@/lib/db';
import { getLoyverseTokenForTenant } from '@/lib/loyverse-api';
import { getLoyverseCustomers } from '@/lib/loyverse-api';
import { ShieldCheck, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, User } from 'lucide-react';
import Link from 'next/link';
import BotaoVincularLoyverse from '@/components/admin/BotaoVincularLoyverse';
import Breadcrumb from '@/components/ui/Breadcrumb'

export const dynamic = 'force-dynamic'

export default async function DiagnosticoLoyversePage() {
    const db = await getDb();
    const tenantId = await getTenantIdFromHeaders();
    const token = await getLoyverseTokenForTenant(tenantId);

    if (!token) {
        return (
            <main className="max-w-7xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-700">
                <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl text-center space-y-2">
                    <AlertTriangle className="mx-auto text-orange-500" size={32} />
                    <h2 className="text-lg font-black uppercase text-orange-700">Loyverse nao configurado</h2>
                    <p className="text-sm text-orange-600">Configure o token Loyverse nas definicoes do tenant para utilizar esta funcionalidade.</p>
                </div>
            </main>
        );
    }

    const clientesLoyverse = await getLoyverseCustomers(token);

    // 1. BUSCAR TODOS OS MEMBROS NO BANCO DE DADOS
    const membrosApp = await db.membro.findMany({
        select: { id: true, first_name: true, last_name: true, email: true, loyverse_id: true }
    });

    // 2. LÓGICA DE CRUZAMENTO DE DADOS (MATCHING)
    const sugestoesVinculacao: any[] = [];
    let jaVinculadosCount = 0;

    if (clientesLoyverse) {
        clientesLoyverse.forEach((cliente: any) => {
            if (!cliente.email) return;

            const membroMatch = membrosApp.find(m => m.email?.toLowerCase() === cliente.email.toLowerCase());

            if (membroMatch) {
                if (!membroMatch.loyverse_id) {
                    sugestoesVinculacao.push({
                        membro: membroMatch,
                        loyverseCliente: cliente
                    });
                } else if (membroMatch.loyverse_id === cliente.id) {
                    jaVinculadosCount++;
                }
            }
        });
    }

    return (
        <main className="max-w-7xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-soft pb-8">
                <div>
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 mb-2">
                        <ShieldCheck size={14} /> Diagnóstico de Integração
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Clientes <span className="text-muted/20">Loyverse.</span>
                    </h1>
                </div>
                <div className="flex gap-4">
                    <div className="bg-bg2 border border-soft px-6 py-4 rounded-2xl shadow-sm text-right">
                        <p className="text-[9px] font-black text-muted uppercase tracking-widest">Total Loyverse</p>
                        <p className="text-2xl font-black italic text-fg leading-none mt-1">{clientesLoyverse?.length || 0}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 px-6 py-4 rounded-2xl shadow-sm text-right">
                        <p className="text-[9px] font-black text-green-600/70 uppercase tracking-widest">Já Sincronizados</p>
                        <p className="text-2xl font-black italic text-green-600 leading-none mt-1">{jaVinculadosCount}</p>
                    </div>
                </div>
            </header>

            {/* ========================================================= */}
            {/* SECÇÃO DE SUGESTÕES INTELIGENTES (MATCHES)                */}
            {/* ========================================================= */}
            {sugestoesVinculacao.length > 0 && (
                <section className="bg-orange-50 border border-orange-200 p-8 rounded-[3rem] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>

                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-orange-500/10 text-orange-500 p-3 rounded-2xl">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase italic text-orange-700 tracking-tighter leading-none">Acão Necessária: Contas Desvinculadas</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600/80 mt-1">
                                Encontrámos {sugestoesVinculacao.length} cliente(s) no Loyverse com o mesmo email da sua base de dados.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {sugestoesVinculacao.map((sugestao) => (
                            <div key={sugestao.membro.id} className="bg-white border border-orange-200 p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-orange-400">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-orange-100 text-orange-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-orange-200">Encontrado Match</span>
                                    </div>
                                    <h4 className="text-sm font-black uppercase text-fg leading-none">
                                        {sugestao.membro.first_name} {sugestao.membro.last_name}
                                    </h4>
                                    <p className="text-[10px] font-bold text-muted lowercase tracking-widest mt-1">
                                        {sugestao.membro.email}
                                    </p>
                                </div>

                                <BotaoVincularLoyverse
                                    membroId={sugestao.membro.id}
                                    loyverseId={sugestao.loyverseCliente.id}
                                    membroNome={sugestao.membro.first_name}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {sugestoesVinculacao.length === 0 && clientesLoyverse && (
                <div className="bg-green-50 border border-green-200 p-6 rounded-3xl flex items-center justify-center gap-3">
                    <CheckCircle2 className="text-green-500" />
                    <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">Todos os emails correspondentes já estão sincronizados com o Loyverse.</span>
                </div>
            )}

            {/* ========================================================= */}
            {/* TABELA GERAL DE DADOS (AGORA COM 4 COLUNAS DE COMPARAÇÃO) */}
            {/* ========================================================= */}
            <section className="bg-bg2 border border-soft rounded-[3rem] overflow-hidden shadow-xl">
                <div className="p-6 border-b border-soft bg-bg flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg flex items-center gap-2">
                        <User size={16} className="text-figueira" /> Diretório Completo
                    </h2>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-soft/30 border-b border-soft text-[10px] font-black uppercase tracking-widest text-muted">
                                <th className="px-8 py-6 w-1/4 border-r border-soft/50">Nome no Loyverse</th>
                                <th className="px-8 py-6 w-1/4">Membro na App</th>
                                <th className="px-8 py-6 w-1/6">Status</th>
                                <th className="px-8 py-6 w-1/3">ID Real (UUID)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-soft">
                            {clientesLoyverse?.map((c: any) => {
                                // 1. Verifica se já está vinculado pelo loyverse_id
                                const membroVinculado = membrosApp.find(m => m.loyverse_id === c.id);
                                // 2. Verifica se existe um match de email (mas sem ID)
                                const membroSugerido = membrosApp.find(m => m.email?.toLowerCase() === c.email?.toLowerCase() && !m.loyverse_id);

                                // O membro a apresentar visualmente na 2ª Coluna
                                const membroExibicao = membroVinculado || membroSugerido;

                                return (
                                    <tr key={c.id} className="hover:bg-soft/10 transition-colors group">

                                        {/* COLUNA 1: DADOS DO LOYVERSE */}
                                        <td className="px-8 py-6 border-r border-soft/50">
                                            <p className="text-xs font-black uppercase text-fg leading-tight">{c.name}</p>
                                            <p className="text-[10px] font-bold text-muted lowercase mt-0.5">{c.email || 'sem-email@loyverse.com'}</p>
                                        </td>

                                        {/* COLUNA 2: DADOS DA NOSSA APP (A TUA NOVA COMPARAÇÃO VISUAL) */}
                                        <td className="px-8 py-6">
                                            {membroExibicao ? (
                                                <div>
                                                    <p className={`text-xs font-black uppercase leading-tight ${membroVinculado ? 'text-fg' : 'text-orange-600'}`}>
                                                        {membroExibicao.first_name} {membroExibicao.last_name}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-muted lowercase mt-0.5">
                                                        {membroExibicao.email}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase text-muted/40 italic">--- Não Encontrado ---</span>
                                            )}
                                        </td>

                                        {/* COLUNA 3: STATUS VISUAL */}
                                        <td className="px-8 py-6">
                                            {membroVinculado ? (
                                                <span className="text-[9px] font-black uppercase text-green-600 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                                                    Sincronizado
                                                </span>
                                            ) : membroSugerido ? (
                                                <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20">
                                                    Pendente Match
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase text-muted bg-soft px-3 py-1.5 rounded-lg">
                                                    Sem Vínculo
                                                </span>
                                            )}
                                        </td>

                                        {/* COLUNA 4: UUID PARA COPIAR */}
                                        <td className="px-8 py-6">
                                            <code className="bg-bg border border-soft px-3 py-1.5 rounded-lg text-[10px] font-mono text-figueira select-all">
                                                {c.id}
                                            </code>
                                        </td>

                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {!clientesLoyverse && (
                    <div className="p-20 text-center space-y-4">
                        <RefreshCw className="mx-auto text-muted animate-spin" size={32} />
                        <p className="text-xs font-black uppercase text-muted tracking-widest">A aguardar resposta da API Loyverse...</p>
                    </div>
                )}
            </section>
        </main>
    );
}
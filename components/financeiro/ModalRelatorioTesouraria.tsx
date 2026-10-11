'use client'

import { useState, useEffect } from 'react'
import { FileBarChart, X, Printer, Loader2, Building2, Filter, MessageCircle } from 'lucide-react'
import { buscarRelatorioTesouraria } from '@/actions/financeiro-actions'

export default function ModalRelatorioTesouraria({ membros }: { membros: any[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transacoes, setTransacoes] = useState<any[]>([]);
    
    const dataAtual = new Date();
    const anoAtual = dataAtual.getFullYear();
    
    // Estados dos Filtros
    const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
    const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth() + 1);
    const [membroSelecionado, setMembroSelecionado] = useState('todos');
    const [categoriaSelecionada, setCategoriaSelecionada] = useState('TODOS');

    const mesesNome = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    useEffect(() => {
        if (!isOpen) return;

        async function carregarDados() {
            setLoading(true);
            const res = await buscarRelatorioTesouraria(anoSelecionado, mesSelecionado, membroSelecionado, categoriaSelecionada);
            if (res.sucesso) {
                setTransacoes(res.transacoes);
            }
            setLoading(false);
        }
        carregarDados();
    }, [isOpen, anoSelecionado, mesSelecionado, membroSelecionado, categoriaSelecionada]);

    const resumoPorTipo = transacoes.reduce((acc: any, t: any) => {
        if (!acc[t.tipo]) acc[t.tipo] = 0;
        acc[t.tipo] += t.valor;
        return acc;
    }, {});

    const totalGeral = transacoes.reduce((sum, t) => sum + t.valor, 0);
    const euro = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

    const handlePrint = () => {
        window.print();
    };

    // Função de Partilha para o WhatsApp
    const handleWhatsApp = () => {
        let texto = `📊 *RELATÓRIO DE TESOURARIA* 📊\n\n`;
        texto += `⛪ *Assembleia de Deus*\n`;
        texto += `🗓️ _${tituloRelatorio}_\n\n`;

        texto += `💰 *RESUMO CONSOLIDADO*\n`;
        ['DIZIMO', 'OFERTA', 'MISSAO', 'CAMPANHA'].forEach(cat => {
            if (resumoPorTipo[cat]) {
                texto += `▪️ ${cat}: *${euro(resumoPorTipo[cat])}*\n`;
            }
        });
        
        texto += `\n📈 *TOTAL GERAL: ${euro(totalGeral)}*\n`;
        texto += `────────────────\n`;
        texto += `✅ _Movimentos processados: ${transacoes.length}_\n`;
        texto += `Para ver o detalhe de quem contribuiu, consulte o PDF completo no sistema. 🙏`;

        const textoEncoded = encodeURIComponent(texto);
        window.open(`https://api.whatsapp.com/send?text=${textoEncoded}`, '_blank');
    };

    let tituloRelatorio = mesSelecionado === 0 
        ? `Fecho Anual • ${anoSelecionado}` 
        : `Fecho Mensal • ${mesesNome[mesSelecionado - 1]} ${anoSelecionado}`;
        
    if (membroSelecionado !== 'todos') {
        const m = membros.find(m => m.id === Number(membroSelecionado));
        tituloRelatorio += m ? ` (${m.first_name} ${m.last_name})` : " (Filtrado)";
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full text-left text-[10px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-4 py-3 rounded-xl transition-all flex items-center gap-3 group/link outline-none"
            >
                <FileBarChart size={14} className="text-muted group-hover/link:text-figueira transition-colors" /> Relatório Financeiro
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/90 backdrop-blur-sm print:bg-white print:p-0 animate-in fade-in">
                    
                    {/* CONTAINER DO ECRÃ (Fica invisível na impressão) */}
                    <div className="bg-bg2 w-full max-w-6xl border border-soft p-6 md:p-10 rounded-[3rem] shadow-2xl relative max-h-[95vh] flex flex-col overflow-hidden print:hidden">
                        
                        <div className="flex flex-col gap-4 mb-6 shrink-0">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-2">
                                    <Filter size={20} className="text-figueira" /> Filtros Financeiros
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={handleWhatsApp} className="bg-green-50 text-green-600 border border-green-200 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all flex items-center gap-2 shadow-sm">
                                        <MessageCircle size={14} /> WhatsApp
                                    </button>
                                    <button onClick={handlePrint} className="bg-figueira text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all flex items-center gap-2 shadow-sm">
                                        <Printer size={14} /> Imprimir / PDF
                                    </button>
                                    <button onClick={() => setIsOpen(false)} className="bg-soft/50 text-muted p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                        <X size={16} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-bg p-4 rounded-3xl border border-soft shadow-sm">
                                {/* Filtros... (Mesmo código de antes) */}
                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest text-muted ml-2">Ano</label><select value={anoSelecionado} onChange={(e) => setAnoSelecionado(Number(e.target.value))} className="w-full bg-bg2 border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none cursor-pointer">{[anoAtual, anoAtual - 1, anoAtual - 2].map(a => (<option key={a} value={a}>{a}</option>))}</select></div>
                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest text-muted ml-2">Mês</label><select value={mesSelecionado} onChange={(e) => setMesSelecionado(Number(e.target.value))} className="w-full bg-bg2 border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none cursor-pointer"><option value={0}>Todos (Ano Inteiro)</option>{mesesNome.map((m, idx) => (<option key={idx + 1} value={idx + 1}>{m}</option>))}</select></div>
                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest text-muted ml-2">Membro</label><select value={membroSelecionado} onChange={(e) => setMembroSelecionado(e.target.value)} className="w-full bg-bg2 border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none cursor-pointer"><option value="todos">Todos os Membros</option><option value="anonimo">✝ Ofertas Anónimas</option>{membros.map((m: any) => (<option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>))}</select></div>
                                <div className="space-y-1.5"><label className="text-[9px] font-black uppercase tracking-widest text-muted ml-2">Categoria</label><select value={categoriaSelecionada} onChange={(e) => setCategoriaSelecionada(e.target.value)} className="w-full bg-bg2 border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none cursor-pointer"><option value="TODOS">Todas as Entradas</option><option value="DIZIMO">Dízimos</option><option value="OFERTA">Ofertas Voluntárias</option><option value="MISSAO">Missões</option><option value="CAMPANHA">Carnês / Campanhas</option></select></div>
                            </div>
                        </div>

                        {/* DOCUMENTO NO ECRÃ */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center text-figueira gap-4"><Loader2 size={40} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">A aplicar filtros...</span></div>
                            ) : (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                        {['DIZIMO', 'OFERTA', 'MISSAO', 'CAMPANHA'].map(cat => {
                                            if (categoriaSelecionada !== 'TODOS' && categoriaSelecionada !== cat) return null;
                                            return (
                                                <div key={cat} className="bg-bg border border-soft rounded-2xl p-3">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted truncate">{cat}</p>
                                                    <p className="text-sm font-black text-fg mt-1">{euro(resumoPorTipo[cat] || 0)}</p>
                                                </div>
                                            )
                                        })}
                                        <div className="bg-figueira/10 border border-figueira/20 rounded-2xl p-3 col-span-2 sm:col-span-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Total Consolidado</p>
                                            <p className="text-lg font-black text-figueira mt-1">{euro(totalGeral)}</p>
                                        </div>
                                    </div>

                                    <div>
                                        {transacoes.length === 0 ? (
                                            <p className="text-xs italic text-muted py-4">Nenhum registo encontrado.</p>
                                        ) : (
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-soft">
                                                        <th className="py-2 text-[8px] font-black uppercase tracking-widest text-muted w-24">Data</th>
                                                        <th className="py-2 text-[8px] font-black uppercase tracking-widest text-muted">Membro / Origem</th>
                                                        <th className="py-2 text-[8px] font-black uppercase tracking-widest text-muted w-28">Categoria</th>
                                                        <th className="py-2 text-[8px] font-black uppercase tracking-widest text-muted text-right">Valor</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-soft/50">
                                                    {transacoes.map((t) => (
                                                        <tr key={t.id} className="hover:bg-soft/10">
                                                            <td className="py-3 text-[11px] font-bold text-fg">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                                                            <td className="py-3 text-[11px] font-medium text-fg truncate max-w-[150px]">{t.nome} {t.tipo === 'CAMPANHA' && <span className="block text-[9px] text-muted truncate">{t.descricao}</span>}</td>
                                                            <td className="py-3"><span className="text-[8px] font-black uppercase tracking-widest bg-bg border border-soft px-2 py-1 rounded-md">{t.tipo}</span></td>
                                                            <td className="py-3 text-xs font-black text-fg text-right">{euro(t.valor)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* FORMATO OFICIAL APENAS PARA IMPRESSÃO (O Ecrã não vê isto, só a impressora) */}
                    {/* ========================================================================= */}
                    <div className="hidden print:block print:w-[210mm] print:absolute print:top-0 print:left-0 print:bg-white print:text-black font-serif">
                        
                        {/* CABEÇALHO DO DOCUMENTO (Estilo papel timbrado) */}
                        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                            <div>
                                <h1 className="text-2xl font-black uppercase tracking-widest">Assembleia de Deus</h1>
                                <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest">Departamento de Tesouraria</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-sm font-bold uppercase">{tituloRelatorio}</h2>
                                <p className="text-[10px] text-gray-500 mt-1">Impresso a: {new Date().toLocaleDateString('pt-PT')} às {new Date().toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>

                        {/* RESUMO OFICIAL */}
                        <div className="mb-8 p-4 border border-black bg-gray-50">
                            <h3 className="text-xs font-black uppercase mb-3 border-b border-gray-300 pb-2">Resumo Consolidado do Período</h3>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                                {['DIZIMO', 'OFERTA', 'MISSAO', 'CAMPANHA'].map(cat => {
                                    if (categoriaSelecionada !== 'TODOS' && categoriaSelecionada !== cat) return null;
                                    return (
                                        <div key={cat}>
                                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{cat}</p>
                                            <p className="font-bold">{euro(resumoPorTipo[cat] || 0)}</p>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="mt-4 pt-3 border-t border-gray-300 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest">Total Geral Apurado:</span>
                                <span className="text-lg font-black">{euro(totalGeral)}</span>
                            </div>
                        </div>

                        {/* TABELA DE DADOS (Estilo Contabilístico) */}
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-y-2 border-black bg-gray-100">
                                    <th className="py-2 px-2 font-bold uppercase w-20">Data</th>
                                    <th className="py-2 px-2 font-bold uppercase w-24">Categoria</th>
                                    <th className="py-2 px-2 font-bold uppercase">Membro / Origem</th>
                                    <th className="py-2 px-2 font-bold uppercase text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-300">
                                {transacoes.map((t) => (
                                    <tr key={t.id} className="break-inside-avoid">
                                        <td className="py-2 px-2 text-gray-700">{new Date(t.data).toLocaleDateString('pt-PT')}</td>
                                        <td className="py-2 px-2">{t.tipo}</td>
                                        <td className="py-2 px-2">
                                            {t.nome}
                                            {t.tipo === 'CAMPANHA' && <span className="text-[10px] text-gray-500 ml-2">({t.descricao})</span>}
                                        </td>
                                        <td className="py-2 px-2 font-bold text-right">{euro(t.valor)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ASSINATURA PARA PAPEL */}
                        <div className="mt-24 flex justify-between px-10">
                            <div className="text-center w-48">
                                <div className="border-t border-black pt-2 text-[10px] uppercase font-bold">Visto do Tesoureiro</div>
                            </div>
                            <div className="text-center w-48">
                                <div className="border-t border-black pt-2 text-[10px] uppercase font-bold">Visto Pastoral</div>
                            </div>
                        </div>

                    </div>
                    {/* ========================================================================= */}

                </div>
            )}
        </>
    )
}
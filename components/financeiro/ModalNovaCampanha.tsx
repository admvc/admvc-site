'use client'

import { useState } from 'react'
import { X, Target, Users, Euro, CalendarDays, Hash, Loader2, Ticket, Gift, Search, UserPlus, Plus } from 'lucide-react'
import { criarCampanhaEmLoteAction, criarRifaAction } from '@/actions/financeiro-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Membro {
    id: number;
    first_name: string;
    last_name: string;
}

interface CampanhaExistente {
    nome: string;
    valor_mensal: number;
    parcelas_total: number;
    data_pagamento: number;
    membros_ids: number[]; // Sabemos quem já está nesta campanha
}

interface Props {
    membros: Membro[];
    tipoPredefinido?: 'CARNE' | 'RIFA';
    campanhasExistentes?: CampanhaExistente[]; // Novo prop!
}

export default function ModalNovaCampanha({ membros, tipoPredefinido = 'CARNE', campanhasExistentes = [] }: Props) {
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const toast = useToast()

    // Novo Estado: Controla se estamos a criar do zero ou a adicionar a uma existente
    const [modo, setModo] = useState<'NOVA' | 'EXISTENTE'>('NOVA');
    const [campanhaSelecionadaNome, setCampanhaSelecionadaNome] = useState<string>('');

    const [membrosSelecionados, setMembrosSelecionados] = useState<number[]>([]);
    const [busca, setBusca] = useState('');

    const isRifa = tipoPredefinido === 'RIFA';

    // Encontra a campanha selecionada no dropdown
    const campanhaSelecionada = campanhasExistentes.find(c => c.nome === campanhaSelecionadaNome);

    // FILTRO DE MEMBROS: Se for uma campanha existente, ESCONDE quem já faz parte dela!
    const membrosDisponiveis = membros.filter(m => {
        const jaEstaNaCampanha = campanhaSelecionada ? campanhaSelecionada.membros_ids.includes(m.id) : false;
        const jaFoiSelecionadoAgora = membrosSelecionados.includes(m.id);
        const correspondeBusca = `${m.first_name} ${m.last_name}`.toLowerCase().includes(busca.toLowerCase());

        return !jaEstaNaCampanha && !jaFoiSelecionadoAgora && correspondeBusca;
    });

    const membrosEscolhidosDetalhados = membros.filter(m => membrosSelecionados.includes(m.id));

    const adicionarMembro = (id: number) => {
        if (!membrosSelecionados.includes(id)) {
            setMembrosSelecionados([...membrosSelecionados, id]);
            setBusca('');
        }
    };

    const removerMembro = (id: number) => {
        setMembrosSelecionados(membrosSelecionados.filter(mId => mId !== id));
    };

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        let result;

        if (isRifa) {
            result = await criarRifaAction(formData);
        } else {
            // Se estivermos no modo EXISTENTE, o formulário envia os valores ocultos que extraímos da campanha escolhida!
            result = await criarCampanhaEmLoteAction(formData, membrosSelecionados);
        }

        if (result.ok) {
            setAberto(false);
            setMembrosSelecionados([]);
            setBusca('');
            setCampanhaSelecionadaNome('');
        } else {
            toast(result.error, 'erro');
        }
        setLoading(false);
    }

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="flex items-center gap-4 p-5 bg-bg2 border border-soft rounded-3xl hover:border-figueira/50 hover:bg-figueira/5 transition-all group text-left w-full h-full"
            >
                <div className="bg-figueira/10 p-3 rounded-2xl text-figueira group-hover:scale-110 transition-transform">
                    {isRifa ? <Ticket size={20} /> : <Target size={20} />}
                </div>
                <div>
                    <h5 className="text-xs font-black uppercase text-fg tracking-widest leading-tight">
                        {isRifa ? 'Nova Rifa' : 'Carnê'}
                    </h5>
                    <p className="text-[9px] text-muted font-bold mt-1 uppercase tracking-widest">
                        {isRifa ? 'Sorteios' : 'Criar ou Adicionar'}
                    </p>
                </div>
            </button>

            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-bg w-full max-w-2xl rounded-[3rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-soft animate-in zoom-in-95 duration-300">

                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2">
                                    {isRifa ? <Ticket size={12} /> : <Target size={12} />}
                                    {isRifa ? 'Sorteio' : 'Carnês de Oferta'}
                                </span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                                    {isRifa ? 'Configurar Rifa.' : 'Gestão de Carnês.'}
                                </h3>
                            </div>
                            <button onClick={() => setAberto(false)} className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* TABS (NOVA CAMPANHA vs ADICIONAR A EXISTENTE) */}
                        {!isRifa && (
                            <div className="flex border-b border-soft bg-bg2">
                                <button
                                    onClick={() => setModo('NOVA')}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'NOVA' ? 'bg-bg text-figueira border-t-2 border-figueira' : 'text-muted hover:bg-soft/50'}`}
                                >
                                    ✨ Criar Nova Campanha
                                </button>
                                <button
                                    onClick={() => setModo('EXISTENTE')}
                                    className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${modo === 'EXISTENTE' ? 'bg-bg text-figueira border-t-2 border-figueira' : 'text-muted hover:bg-soft/50'}`}
                                >
                                    <Plus size={14} className="inline mr-1 -mt-0.5" /> Adicionar a Existente
                                </button>
                            </div>
                        )}

                        <form action={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">

                            {/* MODO: CRIAR NOVA CAMPANHA OU RIFA */}
                            {(modo === 'NOVA' || isRifa) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-[0.2em]">
                                            {isRifa ? 'Nome da Rifa' : 'Nome da Nova Campanha'}
                                        </label>
                                        <input name="nome" required placeholder={isRifa ? "Ex: Rifa de Páscoa" : "Ex: Cadeiras Novas"} className="w-full bg-bg2 border-2 border-soft px-5 py-4 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                                    </div>

                                    {isRifa && (
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-[0.2em] flex items-center gap-1"><Gift size={12} /> Prémio a Sortear</label>
                                            <input name="premio" required placeholder="Ex: Cabaz de Chocolate" className="w-full bg-bg2 border-2 border-soft px-5 py-4 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-[0.2em] flex items-center gap-1"><Euro size={12} /> {isRifa ? 'Valor por Número' : 'Valor Mensal'}</label>
                                        <input name={isRifa ? "valor_numero" : "valor_mensal"} type="number" step="0.01" required placeholder="Ex: 5.00" className="w-full bg-bg2 border-2 border-soft px-5 py-4 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-[0.2em] flex items-center gap-1"><Hash size={12} /> {isRifa ? 'Total de Números' : 'Total de Parcelas'}</label>
                                        <input name={isRifa ? "total_numeros" : "parcelas_total"} type="number" required defaultValue={isRifa ? 100 : 10} min="1" className="w-full bg-bg2 border-2 border-soft px-5 py-4 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                                    </div>

                                    {!isRifa && (
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-2 tracking-[0.2em] flex items-center gap-1"><CalendarDays size={12} /> Dia de Vencimento</label>
                                            <input name="data_pagamento" type="number" required min="1" max="31" defaultValue="10" className="w-full bg-bg2 border-2 border-soft px-5 py-4 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* MODO: ADICIONAR A CAMPANHA EXISTENTE */}
                            {!isRifa && modo === 'EXISTENTE' && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="space-y-2 bg-figueira/5 p-6 rounded-2xl border border-figueira/20">
                                        <label className="text-[10px] font-black uppercase text-figueira ml-2 tracking-[0.2em]">
                                            Selecione a Campanha
                                        </label>
                                        <select
                                            value={campanhaSelecionadaNome}
                                            onChange={(e) => setCampanhaSelecionadaNome(e.target.value)}
                                            className="w-full bg-white border-2 border-figueira/30 px-5 py-4 rounded-2xl text-sm font-black text-fg focus:border-figueira outline-none transition-colors cursor-pointer"
                                            required
                                        >
                                            <option value="">-- Escolha da lista --</option>
                                            {campanhasExistentes.map(c => (
                                                <option key={c.nome} value={c.nome}>{c.nome} ({c.membros_ids.length} Membros)</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* INPUTS ESCONDIDOS PARA A ACTION FUNCIONAR IGUAL */}
                                    {campanhaSelecionada && (
                                        <>
                                            <input type="hidden" name="nome" value={campanhaSelecionada.nome} />
                                            <input type="hidden" name="valor_mensal" value={campanhaSelecionada.valor_mensal} />
                                            <input type="hidden" name="parcelas_total" value={campanhaSelecionada.parcelas_total} />
                                            <input type="hidden" name="data_pagamento" value={campanhaSelecionada.data_pagamento} />
                                        </>
                                    )}
                                </div>
                            )}

                            {/* SELEÇÃO DE MEMBROS */}
                            {!isRifa && (modo === 'NOVA' || (modo === 'EXISTENTE' && campanhaSelecionadaNome !== '')) && (
                                <div className="space-y-4 pt-4 border-t border-soft animate-in fade-in duration-300">

                                    <div className="flex items-center justify-between mb-4">
                                        <label className="text-[10px] font-black uppercase text-fg tracking-[0.2em] flex items-center gap-2">
                                            <Users size={14} className="text-figueira" /> {modo === 'NOVA' ? 'Membros Aderentes' : 'Novos Membros a Adicionar'}
                                        </label>
                                    </div>

                                    {/* ÁREA DE TAGS */}
                                    {membrosEscolhidosDetalhados.length > 0 && (
                                        <div className="flex flex-wrap gap-2 p-4 bg-figueira/5 border border-figueira/20 rounded-2xl min-h-[60px] max-h-40 overflow-y-auto">
                                            {membrosEscolhidosDetalhados.map(m => (
                                                <div key={m.id} className="bg-white border border-figueira/30 text-figueira text-[10px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-sm animate-in zoom-in duration-200">
                                                    {m.first_name} {m.last_name}
                                                    <button type="button" onClick={() => removerMembro(m.id)} className="hover:bg-red-500 hover:text-white rounded-full p-0.5 transition-colors">
                                                        <X size={12} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* CAIXA DE PESQUISA */}
                                    <div className="relative">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50" />
                                            <input
                                                type="text"
                                                placeholder="Pesquisar para adicionar à campanha..."
                                                value={busca}
                                                onChange={(e) => setBusca(e.target.value)}
                                                className="w-full bg-bg2 border-2 border-soft p-4 pl-10 rounded-2xl text-xs font-black text-fg focus:border-figueira outline-none transition-colors"
                                            />
                                        </div>

                                        {/* Dropdown de Sugestões */}
                                        {busca.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 max-h-48 overflow-y-auto bg-bg border-2 border-soft rounded-2xl shadow-xl z-10 flex flex-col p-2 space-y-1 animate-in slide-in-from-top-2">
                                                {membrosDisponiveis.length === 0 ? (
                                                    <p className="text-[10px] text-muted p-3 font-bold uppercase text-center">Nenhum membro disponível.</p>
                                                ) : (
                                                    membrosDisponiveis.map((m) => (
                                                        <div
                                                            key={m.id}
                                                            onClick={() => adicionarMembro(m.id)}
                                                            className="p-3 rounded-xl flex items-center justify-between cursor-pointer text-xs font-bold uppercase text-fg hover:bg-figueira/10 hover:text-figueira transition-colors"
                                                        >
                                                            {m.first_name} {m.last_name}
                                                            <UserPlus size={14} />
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <p className="text-[9px] text-muted font-bold uppercase tracking-widest text-right mt-2">
                                        A adicionar: <span className="text-figueira">{membrosSelecionados.length}</span>
                                    </p>
                                </div>
                            )}

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft">
                                <button
                                    type="submit"
                                    disabled={loading || (!isRifa && membrosSelecionados.length === 0)}
                                    className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={16} /> : (isRifa ? <Ticket size={16} /> : <Target size={16} />)}
                                    {loading ? 'A Gravar...' : (isRifa ? 'Criar Grelha da Rifa' : (modo === 'NOVA' ? `Criar Campanha (${membrosSelecionados.length})` : `Adicionar ${membrosSelecionados.length} Membros`))}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
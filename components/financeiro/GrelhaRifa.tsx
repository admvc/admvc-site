'use client'

import { useState, useEffect } from 'react'
import { Ticket, User, CheckCircle2, Loader2, X, Euro, Edit3, Layers, Power, Search, Trophy, Medal } from 'lucide-react'
import { atualizarCompradorRifaAction, venderNumerosRifaLoteAction, finalizarRifaAction, setVencedoresRifaAction } from '@/actions/financeiro-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

interface GrelhaRifaProps {
    rifa: any;
    membros: any[];
    // 🔴 NOVO: Prop opcional para receber o membro que já foi escolhido no Modal Unificado
    membroPreSelecionadoId?: string; 
}

export default function GrelhaRifa({ rifa, membros, membroPreSelecionadoId }: GrelhaRifaProps) {
    const [numerosSelecionados, setNumerosSelecionados] = useState<number[]>([]);
    const [numeroEditando, setNumeroEditando] = useState<number | null>(null);

    const [loading, setLoading] = useState(false);
    const confirmar = useConfirm();
    const toast = useToast();

    // 🔴 LÓGICA INTELIGENTE: Se recebeu membro do modal, já define como MEMBRO
    const [tipoComprador, setTipoComprador] = useState<'MEMBRO' | 'EXTERNO'>(
        membroPreSelecionadoId && membroPreSelecionadoId !== 'anonimo' ? 'MEMBRO' : 'EXTERNO'
    );
    const [isEditing, setIsEditing] = useState(false);
    const [modoSorteio, setModoSorteio] = useState(false);

    // 🔴 LÓGICA INTELIGENTE: Inicializa os campos de busca se já houver um membro pré-selecionado
    const [buscaMembro, setBuscaMembro] = useState('');
    const [membroIdSelecionado, setMembroIdSelecionado] = useState(membroPreSelecionadoId || '');

    const todosNumeros = Array.from({ length: rifa.total_numeros }, (_, i) => i + 1);

    const mapaVendidos = new Map();
    rifa.numeros_vendidos.forEach((venda: any) => {
        mapaVendidos.set(venda.numero, venda);
    });

    const vendaSelecionada = numeroEditando ? mapaVendidos.get(numeroEditando) : null;
    const valorTotalLote = rifa.valor_numero * numerosSelecionados.length;

    // Efeito para preencher os dados de pesquisa caso um membro venha por Prop (do Modal)
    useEffect(() => {
        if (membroPreSelecionadoId && membroPreSelecionadoId !== 'anonimo') {
            const membro = membros.find(m => String(m.id) === String(membroPreSelecionadoId));
            if (membro) {
                setBuscaMembro(`${membro.first_name} ${membro.last_name}`);
                setMembroIdSelecionado(String(membro.id));
                setTipoComprador('MEMBRO');
            }
        } else if (membroPreSelecionadoId === 'anonimo') {
             setBuscaMembro('');
             setMembroIdSelecionado('');
             setTipoComprador('EXTERNO');
        }
    }, [membroPreSelecionadoId, membros]);

    // Efeito para Edição
    useEffect(() => {
        if (isEditing && vendaSelecionada && vendaSelecionada.membro) {
            setBuscaMembro(`${vendaSelecionada.membro.first_name} ${vendaSelecionada.membro.last_name}`);
            setMembroIdSelecionado(vendaSelecionada.membro_id.toString());
        } else if (!isEditing && numerosSelecionados.length === 0 && !membroPreSelecionadoId) {
            setBuscaMembro('');
            setMembroIdSelecionado('');
        }
    }, [isEditing, vendaSelecionada, numerosSelecionados.length, membroPreSelecionadoId]);

    const handlePesquisaMembro = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valorDigitado = e.target.value;
        setBuscaMembro(valorDigitado);
        const membroEncontrado = membros.find(m => `${m.first_name} ${m.last_name}` === valorDigitado);
        if (membroEncontrado) {
            setMembroIdSelecionado(membroEncontrado.id.toString());
        } else {
            setMembroIdSelecionado('');
        }
    };

    const toggleNumeroLivre = (num: number) => {
        setNumeroEditando(null);
        setIsEditing(false);
        setModoSorteio(false);
        setNumerosSelecionados(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]);
    };

    const selecionarNumeroVendido = (num: number) => {
        setNumerosSelecionados([]);
        setModoSorteio(false);
        setNumeroEditando(num);
        setIsEditing(false);
    };

    async function handleVenderLote(formData: FormData) {
        if (tipoComprador === 'MEMBRO' && !membroIdSelecionado) return toast("Selecione um membro válido.", 'erro');
        setLoading(true);
        const result = await venderNumerosRifaLoteAction(formData);
        if (result.ok) {
            setNumerosSelecionados([]);
            // Só limpa a busca se não estivermos no modal unificado
            if (!membroPreSelecionadoId) {
                setBuscaMembro('');
                setMembroIdSelecionado('');
            }
        }
        else toast(result.error, 'erro');
        setLoading(false);
    }

    async function handleAtualizar(formData: FormData) {
        if (tipoComprador === 'MEMBRO' && !membroIdSelecionado) return toast("Selecione um membro válido.", 'erro');
        setLoading(true);
        const result = await atualizarCompradorRifaAction(formData);
        if (result.ok) {
            setIsEditing(false);
            if (!membroPreSelecionadoId) {
                setBuscaMembro('');
                setMembroIdSelecionado('');
            }
        }
        else toast(result.error, 'erro');
        setLoading(false);
    }

    async function handleEncerrarSemVencedor() {
        if (await confirmar({ mensagem: 'Atenção: Deseja encerrar a Rifa sem declarar vencedores?', tipo: 'aviso' })) {
            setLoading(true);
            const result = await finalizarRifaAction(rifa.id);
            if (!result.ok) { toast(result.error, 'erro'); setLoading(false); }
        }
    }

    async function handleDeclararVencedoresMultiplos(formData: FormData) {
        setLoading(true);
        const result = await setVencedoresRifaAction(formData);
        if (!result.ok) { toast(result.error, 'erro'); setLoading(false); }
    }

    return (
        <div className="bg-bg2 border border-soft rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col md:flex-row">
            {/* CONTEÚDO DA GRELHA E DOS BOTÕES MANTIDO... */}
            <div className="flex-1 p-6 md:p-8 border-b md:border-b-0 md:border-r border-soft">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-fg leading-none flex items-center gap-2">
                            <Ticket className="text-figueira" /> {rifa.nome}
                        </h3>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                            Prémio: <span className="text-figueira">{rifa.premio}</span>
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                            <span className="text-[10px] font-black uppercase text-muted tracking-widest block">Progresso</span>
                            <span className="text-lg font-black text-fg italic leading-none">
                                {rifa.numeros_vendidos.length} <span className="text-xs text-muted">/ {rifa.total_numeros}</span>
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleEncerrarSemVencedor} disabled={loading} className="text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 disabled:opacity-50">
                                <Power size={10} /> Encerrar
                            </button>
                            {rifa.numeros_vendidos.length > 0 && (
                                <button onClick={() => { setModoSorteio(true); setNumeroEditando(null); setNumerosSelecionados([]); }} className="text-[8px] font-black uppercase tracking-widest bg-yellow-100 text-yellow-700 hover:bg-yellow-500 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                                    <Trophy size={10} /> Sorteio
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 max-h-[400px] overflow-y-auto p-2">
                    {todosNumeros.map(num => {
                        const venda = mapaVendidos.get(num);
                        const isVendido = !!venda;
                        const isSelecionadoLivre = numerosSelecionados.includes(num);
                        const isSelecionadoVendido = numeroEditando === num;
                        const nomeCurto = isVendido ? (venda.membro ? venda.membro.first_name : venda.nome_externo.split(' ')[0]) : '';

                        return (
                            <button
                                key={num}
                                type="button" // 🔴 PREVENÇÃO CONTRA SUBMIT INDESEJADO
                                onClick={() => isVendido ? selecionarNumeroVendido(num) : toggleNumeroLivre(num)}
                                className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden ${isVendido ? isSelecionadoVendido ? 'bg-figueira text-white shadow-lg scale-110 z-10 border-2 border-white' : 'bg-figueira/10 text-figueira border border-figueira/30 hover:bg-figueira/20' : isSelecionadoLivre ? 'bg-fg text-bg shadow-lg scale-110 z-10' : 'bg-bg border border-soft text-fg hover:border-fg hover:bg-fg/5'}`}
                            >
                                <span className="text-sm font-black">{num}</span>
                                {isVendido && <span className="text-[7px] font-black uppercase w-full truncate px-1 text-center opacity-80 mt-0.5">{nomeCurto}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

<div className="w-full md:w-80 p-6 md:p-8 bg-bg flex flex-col justify-center min-h-[300px]">
                
                {modoSorteio ? (
                    // 1. MODO SORTEIO
                    <form action={handleDeclararVencedoresMultiplos} className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        <input type="hidden" name="rifa_id" value={rifa.id} />

                        <div className="flex justify-between items-start mb-6 border-b border-soft pb-4">
                            <div>
                                <h4 className="text-xl font-black italic text-yellow-600 leading-none flex items-center gap-2">
                                    <Trophy size={20} /> O Sorteio.
                                </h4>
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted block mt-1">
                                    Selecione os grandes vencedores
                                </span>
                            </div>
                            <button type="button" onClick={() => setModoSorteio(false)} className="p-2 bg-bg2 rounded-xl text-muted hover:text-red-500 transition-colors shrink-0">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase text-yellow-700 tracking-widest flex items-center gap-1 mb-2">
                                    <Trophy size={12} /> 1º Prémio (Obrigatório)
                                </label>
                                <select name="num1" required className="w-full bg-white border border-yellow-300 p-3 rounded-xl text-xs font-bold outline-none focus:border-yellow-500 transition-all cursor-pointer">
                                    <option value="">Escolha o número...</option>
                                    {rifa.numeros_vendidos.map((v: any) => (
                                        <option key={v.numero} value={v.numero}>
                                            #{v.numero} - {v.membro ? `${v.membro.first_name} ${v.membro.last_name}` : v.nome_externo}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase text-gray-600 tracking-widest flex items-center gap-1 mb-2">
                                    <Medal size={12} /> 2º Prémio (Opcional)
                                </label>
                                <select name="num2" className="w-full bg-white border border-gray-300 p-3 rounded-xl text-xs font-bold outline-none focus:border-gray-500 transition-all cursor-pointer">
                                    <option value="">Não atribuir...</option>
                                    {rifa.numeros_vendidos.map((v: any) => (
                                        <option key={v.numero} value={v.numero}>#{v.numero} - {v.membro ? v.membro.first_name : v.nome_externo}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
                                <label className="text-[10px] font-black uppercase text-orange-700 tracking-widest flex items-center gap-1 mb-2">
                                    <Medal size={12} className="text-orange-600" /> 3º Prémio (Opcional)
                                </label>
                                <select name="num3" className="w-full bg-white border border-orange-300 p-3 rounded-xl text-xs font-bold outline-none focus:border-orange-500 transition-all cursor-pointer">
                                    <option value="">Não atribuir...</option>
                                    {rifa.numeros_vendidos.map((v: any) => (
                                        <option key={v.numero} value={v.numero}>#{v.numero} - {v.membro ? v.membro.first_name : v.nome_externo}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button disabled={loading} className="w-full bg-yellow-500 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-yellow-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl mt-6">
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                            {loading ? 'A Encerrar...' : 'Finalizar e Guardar'}
                        </button>
                    </form>

                ) : numerosSelecionados.length === 0 && !numeroEditando ? (
                    // 2. ESTADO NORMAL (VAZIO)
                    <div className="text-center opacity-50 space-y-3">
                        <Layers size={40} className="mx-auto text-muted" />
                        <p className="text-[10px] font-black uppercase text-muted tracking-widest leading-relaxed">
                            Clica nos números livres<br />para venda múltipla
                        </p>
                    </div>

                ) : vendaSelecionada && !isEditing ? (
                    // 3. VISUALIZAÇÃO DE NÚMERO JÁ VENDIDO
                    <div className="space-y-6 animate-in slide-in-from-right-4 fade-in flex flex-col h-full justify-between">
                        <div>
                            <div className="flex justify-between items-start">
                                <div><span className="text-[9px] font-black uppercase text-figueira tracking-widest flex items-center gap-1"><CheckCircle2 size={12} /> Número Vendido</span><h4 className="text-4xl font-black italic text-fg mt-1">#{numeroEditando}</h4></div>
                                <button type="button" onClick={() => setNumeroEditando(null)} className="p-2 bg-bg2 rounded-xl text-muted hover:text-red-500"><X size={16} /></button>
                            </div>
                            <div className="space-y-4 pt-4 border-t border-soft mt-4">
                                <div className="bg-figueira/10 border border-figueira/20 p-5 rounded-2xl relative">
                                    <span className="text-[8px] font-black uppercase text-muted tracking-widest block mb-1">Comprador</span>
                                    <p className="text-sm font-black text-figueira uppercase pr-8">{vendaSelecionada.membro ? `${vendaSelecionada.membro.first_name} ${vendaSelecionada.membro.last_name}` : vendaSelecionada.nome_externo}</p>
                                    <button type="button" onClick={() => { setTipoComprador(vendaSelecionada.membro ? 'MEMBRO' : 'EXTERNO'); setIsEditing(true); }} className="absolute top-4 right-4 p-2 bg-white rounded-lg text-figueira hover:bg-figueira hover:text-white transition-all"><Edit3 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                ) : (
                    // 4. FORMULÁRIO DE VENDA (OU EDIÇÃO)
                    <form action={isEditing ? handleAtualizar : handleVenderLote} className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                        {isEditing ? <input type="hidden" name="venda_id" value={vendaSelecionada.id} /> : <><input type="hidden" name="rifa_id" value={rifa.id} /><input type="hidden" name="numeros" value={JSON.stringify(numerosSelecionados)} /></>}
                        <input type="hidden" name="membro_id" value={tipoComprador === 'MEMBRO' ? membroIdSelecionado : ""} />
                        
                        <div className="flex justify-between items-start">
                            <div><span className={`text-[9px] font-black uppercase tracking-widest block ${isEditing ? 'text-orange-500' : 'text-muted'}`}>{isEditing ? 'A Corrigir Dono' : `${numerosSelecionados.length} Números`}</span><h4 className={`text-2xl font-black italic leading-none mt-1 ${isEditing ? 'text-fg' : 'text-figueira'}`}>{isEditing ? `#${numeroEditando}` : numerosSelecionados.join(', ')}</h4></div>
                            <button type="button" onClick={() => { isEditing ? setIsEditing(false) : setNumerosSelecionados([]) }} className="p-2 bg-bg2 rounded-xl"><X size={16} /></button>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-soft">
                            
                            {!membroPreSelecionadoId && (
                                <div className="flex bg-bg2 p-1 rounded-xl">
                                    <button type="button" onClick={() => setTipoComprador('MEMBRO')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg ${tipoComprador === 'MEMBRO' ? 'bg-white shadow-sm text-fg' : 'text-muted'}`}>Membro</button>
                                    <button type="button" onClick={() => setTipoComprador('EXTERNO')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg ${tipoComprador === 'EXTERNO' ? 'bg-white shadow-sm text-fg' : 'text-muted'}`}>Externo</button>
                                </div>
                            )}

                            {tipoComprador === 'MEMBRO' ? (
                                <div className="space-y-2">
                                    <div className="relative mt-1">
                                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/50" />
                                        <input 
                                            list="lista-membros-rifa" 
                                            value={buscaMembro} 
                                            onChange={handlePesquisaMembro} 
                                            placeholder="Pesquisar..." 
                                            required={tipoComprador === 'MEMBRO'} 
                                            readOnly={!!membroPreSelecionadoId && membroPreSelecionadoId !== 'anonimo'}
                                            className={`w-full bg-bg border border-soft p-4 pl-10 rounded-2xl text-xs font-bold ${membroPreSelecionadoId ? 'opacity-70 cursor-not-allowed bg-soft/10' : ''}`} 
                                        />
                                        <datalist id="lista-membros-rifa">{membros.map(m => <option key={m.id} value={`${m.first_name} ${m.last_name}`} />)}</datalist>
                                    </div>
                                    
                                    {membroPreSelecionadoId && membroPreSelecionadoId !== 'anonimo' && (
                                        <p className="text-[9px] font-black text-figueira uppercase tracking-widest mt-2 flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Comprador selecionado
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <input 
                                    name="nome_externo" 
                                    required 
                                    defaultValue={isEditing && vendaSelecionada?.nome_externo ? vendaSelecionada.nome_externo : (membroPreSelecionadoId === 'anonimo' ? 'Oferta Anónima' : '')} 
                                    placeholder="Ex: Sr. Manuel do Café" 
                                    className="w-full bg-bg border border-soft p-4 rounded-2xl text-xs font-bold" 
                                />
                            )}
                        </div>
                        
                        <button disabled={loading || (tipoComprador === 'MEMBRO' && (!membroIdSelecionado || membroIdSelecionado === ''))} className={`w-full text-bg py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ${isEditing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-fg hover:bg-black'}`}>
                            {loading ? <Loader2 className="animate-spin" size={16} /> : (isEditing ? <Edit3 size={16} /> : <CheckCircle2 size={16} />)}
                            {loading ? 'A Gravar...' : (isEditing ? 'Guardar Correção' : `Vender (€${valorTotalLote.toFixed(2)})`)}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
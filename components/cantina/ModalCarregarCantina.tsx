'use client'

import { useState } from 'react'
import { Coffee, Euro, Loader2, CheckCircle2, X, Check, RefreshCw } from 'lucide-react'
import { solicitarSaldoCantinaAction } from '@/actions/financeiro-actions'
import { useRouter } from 'next/navigation' // 👈 Importação para forçar o refresh
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalCarregarCantina({ membroId }: { membroId: number }) {
    const router = useRouter(); // Hook de navegação
    const toast = useToast()

    // ESTADOS DO MODAL
    const [aberto, setAberto] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false); // Estado para o botão de sync

    // ESTADOS PARA O VALOR
    const [valorSelecionado, setValorSelecionado] = useState<number | string>(10);
    const [isCustom, setIsCustom] = useState(false);

    const opcoesPadrao = [5, 10, 20];

    // Lida com o clique nas caixas rápidas
    const handleCaixaClick = (val: number) => {
        setValorSelecionado(val);
        setIsCustom(false);
    };

    // Lida com a digitação no campo livre
    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValorSelecionado(e.target.value);
        setIsCustom(true);
    };

    // Função de Refresh
    const handleRefreshSaldo = async () => {
        setIsRefreshing(true);
        // O router.refresh() diz ao Next.js para re-renderizar a página no servidor
        // Isto fará com que o teu fetch() do Loyverse corra novamente.
        router.refresh();

        // Simular um pequeno delay para a animação de loading ser perceptível
        setTimeout(() => {
            setIsRefreshing(false);
        }, 1500);
    }

    async function handleSubmit(formData: FormData) {
        if (!valorSelecionado || Number(valorSelecionado) <= 0) {
            toast("Por favor, insira um valor válido.", 'aviso');
            return;
        }

        setLoading(true);
        const res = await solicitarSaldoCantinaAction(formData);

        if (res.ok) {
            setSucesso(true);
            setTimeout(() => {
                setAberto(false);
                setSucesso(false);
                setValorSelecionado(10);
                setIsCustom(false);
            }, 3000);
        } else {
            toast(res.error, 'erro');
        }
        setLoading(false);
    }

    return (
        <div className="flex items-center gap-3">

            {/* BOTÃO CARREGAR SALDO (Original) */}
            <button
                onClick={() => setAberto(true)}
                className="bg-fg hover:bg-figueira text-bg px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl w-full md:w-auto"
            >
                <Euro size={16} /> Carregar Saldo
            </button>

            {/* 👇 NOVO BOTÃO DE SINCRONIZAÇÃO 👇 */}
            <button
                onClick={handleRefreshSaldo}
                disabled={isRefreshing}
                title="Sincronizar Saldo"
                className="bg-bg border border-soft hover:bg-figueira hover:text-white hover:border-figueira text-muted p-4 rounded-2xl transition-all active:scale-95 shadow-sm disabled:opacity-50"
            >
                <RefreshCw size={16} className={`${isRefreshing ? 'animate-spin text-figueira' : ''}`} />
            </button>

            {/* ========================================================= */}
            {/* MODAL                                                     */}
            {/* ========================================================= */}
            {aberto && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 border border-soft w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

                        <div className="flex justify-between items-center p-6 border-b border-soft">
                            <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg flex items-center gap-2">
                                <Coffee className="text-figueira" /> Adicionar Saldo
                            </h3>
                            <button onClick={() => setAberto(false)} className="text-muted hover:text-red-500 bg-soft/50 hover:bg-soft p-2 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {sucesso ? (
                            <div className="p-8 text-center space-y-4 animate-in zoom-in-50 duration-500">
                                <CheckCircle2 size={56} className="text-green-500 mx-auto" strokeWidth={1.5} />
                                <div>
                                    <h4 className="text-xl font-black italic text-fg uppercase">Pedido Enviado!</h4>
                                    <p className="text-xs text-muted mt-2 leading-relaxed">O tesoureiro irá validar o seu pagamento e o saldo ficará disponível em breve.</p>
                                </div>
                            </div>
                        ) : (
                            <form action={handleSubmit} className="p-6 space-y-6">
                                <input type="hidden" name="membro_id" value={membroId} />
                                <input type="hidden" name="valor" value={valorSelecionado} />

                                <div>
                                    <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest">Selecione o Valor</label>
                                    <div className="grid grid-cols-3 gap-3 mt-3">
                                        {opcoesPadrao.map(val => {
                                            const isAtivo = !isCustom && Number(valorSelecionado) === val;
                                            return (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => handleCaixaClick(val)}
                                                    className={`
                                                        relative p-4 rounded-xl border-2 font-black text-lg transition-all active:scale-95 flex flex-col items-center justify-center
                                                        ${isAtivo
                                                            ? 'bg-figueira border-figueira text-white scale-105 shadow-lg shadow-figueira/20 z-10'
                                                            : 'bg-bg border-soft text-muted hover:border-figueira/40 hover:text-fg'
                                                        }
                                                    `}
                                                >
                                                    {isAtivo && <Check size={14} className="absolute top-1.5 right-1.5 opacity-60" strokeWidth={4} />}
                                                    €{val}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    <div className="flex items-center gap-3 py-4">
                                        <div className="h-[1px] flex-1 bg-soft"></div>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted">Ou Customizado</span>
                                        <div className="h-[1px] flex-1 bg-soft"></div>
                                    </div>

                                    <div className="relative">
                                        <Euro size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isCustom ? 'text-figueira' : 'text-muted'}`} />
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            placeholder="Ex: 15.00"
                                            value={isCustom ? valorSelecionado : ''}
                                            onChange={handleCustomChange}
                                            className={`
                                                w-full bg-bg border-2 rounded-xl pl-12 pr-4 py-4 text-sm font-black outline-none transition-all
                                                ${isCustom ? 'border-figueira text-fg ring-4 ring-figueira/10' : 'border-soft text-fg focus:border-figueira'}
                                            `}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest">Método de Envio</label>
                                    <select name="forma_pagamento" required className="w-full bg-bg border-2 border-soft p-4 rounded-xl text-xs font-bold outline-none focus:border-figueira mt-2 transition-colors appearance-none cursor-pointer">
                                        <option value="MBWAY">MB WAY</option>
                                        <option value="Transferencia">Transferência Bancária</option>
                                        <option value="Dinheiro">Dinheiro (Entregue em Mão)</option>
                                    </select>
                                </div>

                                <button
                                    disabled={loading || !valorSelecionado || Number(valorSelecionado) <= 0}
                                    className="w-full bg-fg text-bg py-5 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-figueira transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group active:scale-95 shadow-xl"
                                >
                                    {loading ? (
                                        <Loader2 className="animate-spin" size={18} />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" />
                                            Confirmar • €{valorSelecionado || '0'}
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
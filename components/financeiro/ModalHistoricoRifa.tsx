'use client'

import { useState } from 'react'
import { Archive, X, Trophy, Medal, AlertCircle, Users } from 'lucide-react'

export default function ModalHistoricoRifa({ rifa }: { rifa: any }) {
    const [aberto, setAberto] = useState(false);

    // Função para extrair detalhes do vencedor
    const getVencedor = (numSorteado: number | null) => {
        if (!numSorteado) return null;
        const venda = rifa.numeros_vendidos.find((v: any) => v.numero === numSorteado);
        if (!venda) return { numero: numSorteado, nome: "Número não vendido" };
        return {
            numero: numSorteado,
            nome: venda.membro ? `${venda.membro.first_name} ${venda.membro.last_name}` : venda.nome_externo
        };
    };

    const vencedor1 = getVencedor(rifa.numero_sorteado);
    const vencedor2 = getVencedor(rifa.numero_sorteado_2);
    const vencedor3 = getVencedor(rifa.numero_sorteado_3);

    // Ordenar os números vendidos do menor para o maior para facilitar a leitura
    const vendasOrdenadas = [...(rifa.numeros_vendidos || [])].sort((a, b) => a.numero - b.numero);

    // Função auxiliar para desenhar a medalha certa na lista geral
    const renderMedalha = (num: number) => {
        if (num === rifa.numero_sorteado) return <Trophy size={16} className="text-yellow-500" />;
        if (num === rifa.numero_sorteado_2) return <Medal size={16} className="text-gray-400" />;
        if (num === rifa.numero_sorteado_3) return <Medal size={16} className="text-orange-500" />;
        return null;
    };

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="bg-bg border border-soft p-5 rounded-3xl hover:border-figueira hover:shadow-md transition-all text-left group flex flex-col justify-between h-full"
            >
                <div>
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted group-hover:text-figueira transition-colors">
                            {new Date(rifa.createdAt).toLocaleDateString('pt-PT', { month: 'short', year: 'numeric' })}
                        </span>
                        <Archive size={14} className="text-muted group-hover:text-figueira transition-colors" />
                    </div>
                    <h4 className="text-sm font-black uppercase text-fg leading-tight">{rifa.nome}</h4>

                    {vencedor1 ? (
                        <p className="text-[10px] text-figueira font-black uppercase mt-2 flex items-center gap-1">
                            <Trophy size={10} /> #{vencedor1.numero} - {vencedor1.nome.split(' ')[0]}
                        </p>
                    ) : (
                        <p className="text-[10px] text-red-400 font-bold uppercase mt-2">Sem vencedor</p>
                    )}
                </div>
            </button>

            {aberto && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 border border-soft w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">

                        {/* HEADER FIXO */}
                        <div className="p-6 md:p-8 border-b border-soft flex justify-between items-start shrink-0">
                            <div>
                                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-fg leading-none">{rifa.nome}</h3>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Sorteio Finalizado</p>
                            </div>
                            <button onClick={() => setAberto(false)} className="p-2 bg-soft rounded-xl hover:bg-red-500 hover:text-white transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* ÁREA COM SCROLL (Para a lista não passar dos limites do ecrã) */}
                        <div className="overflow-y-auto p-6 md:p-8 space-y-8 flex-1">

                            {/* CAIXAS DOS VENCEDORES (DESTAQUE) */}
                            {vencedor1 ? (
                                <div className="space-y-3">
                                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl flex items-center gap-4">
                                        <div className="bg-yellow-200 text-yellow-700 p-3 rounded-xl"><Trophy size={24} /></div>
                                        <div>
                                            <span className="text-[9px] font-black uppercase text-yellow-700 tracking-widest block">1º Prémio</span>
                                            <p className="text-sm font-black text-fg uppercase">#{vencedor1.numero} - {vencedor1.nome}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {vencedor2 && (
                                            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex items-center gap-3">
                                                <div className="bg-gray-200 text-gray-600 p-2 rounded-xl"><Medal size={16} /></div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase text-gray-600 tracking-widest block">2º Prémio</span>
                                                    <p className="text-xs font-black text-fg uppercase truncate">#{vencedor2.numero} - {vencedor2.nome.split(' ')[0]}</p>
                                                </div>
                                            </div>
                                        )}
                                        {vencedor3 && (
                                            <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl flex items-center gap-3">
                                                <div className="bg-orange-200 text-orange-700 p-2 rounded-xl"><Medal size={16} /></div>
                                                <div>
                                                    <span className="text-[8px] font-black uppercase text-orange-700 tracking-widest block">3º Prémio</span>
                                                    <p className="text-xs font-black text-fg uppercase truncate">#{vencedor3.numero} - {vencedor3.nome.split(' ')[0]}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 text-red-500 p-6 rounded-2xl flex flex-col items-center text-center border border-red-100">
                                    <AlertCircle size={32} className="mb-2" />
                                    <h4 className="font-black uppercase tracking-widest text-xs">Sorteio Cancelado</h4>
                                    <p className="text-[10px] font-bold mt-1">A rifa foi encerrada sem atribuição de vencedores.</p>
                                </div>
                            )}

                            {/* RESUMO FINANCEIRO */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-bg border border-soft p-4 rounded-2xl text-center shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest block">Números Vendidos</span>
                                    <p className="text-xl font-black text-fg">{rifa.numeros_vendidos.length} <span className="text-xs text-muted">/ {rifa.total_numeros}</span></p>
                                </div>
                                <div className="bg-bg border border-soft p-4 rounded-2xl text-center shadow-sm">
                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest block">Arrecadado</span>
                                    <p className="text-xl font-black text-figueira italic">{(rifa.numeros_vendidos.length * rifa.valor_numero).toFixed(2)} €</p>
                                </div>
                            </div>

                            {/* ================================================= */}
                            {/* LISTA COMPLETA DE PARTICIPANTES (COM MARCADORES)  */}
                            {/* ================================================= */}
                            <div className="pt-6 border-t border-soft">
                                <div className="flex items-center gap-2 mb-4">
                                    <Users size={16} className="text-muted" />
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">Lista de Participantes</h4>
                                </div>

                                <div className="space-y-2">
                                    {vendasOrdenadas.length > 0 ? (
                                        vendasOrdenadas.map((venda: any) => {
                                            const isVencedor = venda.numero === rifa.numero_sorteado || venda.numero === rifa.numero_sorteado_2 || venda.numero === rifa.numero_sorteado_3;

                                            return (
                                                <div
                                                    key={venda.id}
                                                    className={`flex justify-between items-center p-3 md:p-4 rounded-xl border transition-colors ${isVencedor
                                                            ? 'bg-yellow-50/50 border-yellow-200'
                                                            : 'bg-bg border-soft hover:border-figueira/30'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-xs font-black w-8 text-center ${isVencedor ? 'text-yellow-600' : 'text-muted'}`}>
                                                            #{venda.numero}
                                                        </span>
                                                        <span className="text-xs font-bold uppercase text-fg">
                                                            {venda.membro ? `${venda.membro.first_name} ${venda.membro.last_name}` : venda.nome_externo}
                                                        </span>
                                                    </div>

                                                    {/* Marcador do Vencedor (Se for um dos sorteados) */}
                                                    <div>{renderMedalha(venda.numero)}</div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <p className="text-[10px] text-muted italic text-center py-4">Nenhum número foi vendido nesta rifa.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
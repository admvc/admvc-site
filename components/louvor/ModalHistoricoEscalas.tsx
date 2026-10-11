'use client'

import { useState, useTransition } from 'react'
import { ClipboardList, Users, Calendar, Award, X, Loader2, BarChart3, History } from 'lucide-react'
import { getEstatisticasEscalas } from '@/actions/louvor-actions'
import Portal from '../ui/Portal'

export default function ModalHistoricoEscalas({ departamentoId }: { departamentoId: number }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [dados, setDados] = useState<any>(null)

    const abrirHistorico = () => {
        setIsOpen(true)
        startTransition(async () => {
            const res = await getEstatisticasEscalas(departamentoId)
            if (res.success) setDados(res)
        })
    }

    return (
        <>
            {/* Tabela de Membros 
            <button
                onClick={abrirHistorico}
                className="flex items-center gap-2 bg-bg border border-soft hover:border-figueira/40 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-all shadow-sm"
            >
                <BarChart3 size={14} /> Relatório de Escalas
            </button>
            */}
            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-bg border-t sm:border border-soft rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] overflow-hidden">

                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-soft bg-bg2">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-figueira/10 text-figueira rounded-2xl">
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-fg">Gestão de Equipe</h2>
                                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Histórico e Frequência de Voluntários</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)} className="w-12 h-12 bg-soft/20 rounded-full flex items-center justify-center text-muted hover:bg-red-500 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                                {isPending ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 size={40} className="animate-spin text-figueira" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Gerando Relatórios...</p>
                                    </div>
                                ) : dados && (
                                    <>
                                        {/* Cards de Resumo */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="bg-bg2 border border-soft p-5 rounded-2xl">
                                                <Users size={20} className="text-blue-500 mb-2" />
                                                <span className="block text-2xl font-black italic text-fg leading-none">{dados.data.length}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Membros Ativos</span>
                                            </div>
                                            <div className="bg-bg2 border border-soft p-5 rounded-2xl">
                                                <History size={20} className="text-figueira mb-2" />
                                                <span className="block text-2xl font-black italic text-fg leading-none">{dados.historicoCompleto.length}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-muted">Últimos Eventos</span>
                                            </div>
                                        </div>

                                        {/* Tabela de Membros */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 border-b border-soft pb-2">
                                                <Award size={16} className="text-figueira" />
                                                <h3 className="text-xs font-black uppercase tracking-widest text-fg">Desempenho por Voluntário</h3>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[9px] font-black uppercase text-muted tracking-widest border-b border-soft">
                                                            <th className="pb-4 px-2">Membro</th>
                                                            <th className="pb-4 px-2">Escalas</th>
                                                            <th className="pb-4 px-2">Última Vez</th>
                                                            <th className="pb-4 px-2">Funções Atuantes</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-soft/50">
                                                        {dados.data.sort((a: any, b: any) => b.total - a.total).map((m: any) => (
                                                            <tr key={m.nome} className="group hover:bg-soft/10 transition-colors">
                                                                <td className="py-4 px-2 font-black text-xs text-fg uppercase">{m.nome}</td>
                                                                <td className="py-4 px-2">
                                                                    <span className="bg-figueira/10 text-figueira px-2 py-1 rounded-lg text-[10px] font-black">
                                                                        {m.total}x
                                                                    </span>
                                                                </td>
                                                                <td className="py-4 px-2 text-[10px] font-bold text-muted">
                                                                    {new Date(m.ultimaVez).toLocaleDateString('pt-PT')}
                                                                </td>
                                                                <td className="py-4 px-2">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {Array.from(m.funcoes).map((f: any) => (
                                                                            <span key={f} className="text-[8px] bg-bg border border-soft px-2 py-0.5 rounded-full font-black uppercase text-muted">
                                                                                {f}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    )
}
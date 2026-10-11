'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { removerMembroDaFamilia } from '@/actions/familia-actions'
import { Settings2, Trash2, User, Loader2, Users, X, UserPlus } from 'lucide-react'
import BotaoExcluirFamilia from '@/components/familias/BotaoExcluirFamilia'
import ModalAdicionarMembroFamilia from '@/components/familias/ModalAdicionarMembroFamilia'

export function GestaoFamiliaCard({ familia }: any) {
    const confirmar = useConfirm()
    const [aberto, setAberto] = useState(false)
    const [removingId, setRemovingId] = useState<number | null>(null)

    async function handleRemover(membroId: number) {
        if (await confirmar({ mensagem: 'Remover este membro da familia?', tipo: 'perigo' })) {
            setRemovingId(membroId)
            await removerMembroDaFamilia(membroId)
            setRemovingId(null)
        }
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl hover:border-figueira/20 transition-all group">
            {/* Header */}
            <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center shrink-0 text-sm font-black">
                            {familia.surname[0]}
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-fg leading-none">
                                {familia.surname}
                            </h3>
                            <p className="text-[9px] font-bold text-muted mt-1">
                                {familia.members.length} membro{familia.members.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setAberto(!aberto)}
                            className={`p-1.5 rounded-lg transition-all ${aberto ? 'bg-figueira text-white' : 'text-muted hover:text-fg hover:bg-soft/30'}`}
                            title={aberto ? 'Fechar' : 'Gerir'}
                        >
                            {aberto ? <X size={14} /> : <Settings2 size={14} />}
                        </button>
                        <BotaoExcluirFamilia
                            familiaId={familia.id}
                            nomeFamilia={familia.surname}
                            qtdMembros={familia.members.length}
                        />
                    </div>
                </div>

                {/* Avatares dos membros (sempre visivel) */}
                {familia.members.length > 0 && !aberto && (
                    <div className="flex -space-x-2">
                        {familia.members.slice(0, 5).map((m: any) => (
                            <div key={m.id} className="w-7 h-7 rounded-lg bg-soft border-2 border-bg2 flex items-center justify-center text-[8px] font-black text-muted overflow-hidden" title={`${m.first_name} ${m.last_name}`}>
                                {m.avatar_file
                                    ? <img src={m.avatar_file} alt="" className="w-full h-full object-cover" />
                                    : m.first_name[0]
                                }
                            </div>
                        ))}
                        {familia.members.length > 5 && (
                            <div className="w-7 h-7 rounded-lg bg-soft border-2 border-bg2 flex items-center justify-center text-[8px] font-black text-muted">
                                +{familia.members.length - 5}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Painel expandido */}
            {aberto && (
                <div className="border-t border-soft animate-in slide-in-from-top-2 fade-in duration-200">
                    {/* Lista de membros */}
                    <div className="p-4 space-y-1.5">
                        {familia.members.length > 0 ? familia.members.map((m: any) => (
                            <div key={m.id} className="flex items-center justify-between px-3 py-2 bg-bg rounded-xl hover:bg-soft/10 transition-all group/item">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-soft overflow-hidden flex items-center justify-center text-muted text-[9px] font-black shrink-0">
                                        {m.avatar_file
                                            ? <img src={m.avatar_file} alt="" className="w-full h-full object-cover" />
                                            : <User size={12} />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-fg">{m.first_name} {m.last_name}</p>
                                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                                            {m.parentesco ? m.parentesco.replace(/_/g, ' ') : 'Membro'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemover(m.id)}
                                    disabled={removingId === m.id}
                                    className="p-1 rounded-lg text-muted opacity-0 group-hover/item:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                    {removingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                </button>
                            </div>
                        )) : (
                            <p className="text-[10px] text-muted text-center py-4 font-bold">Nenhum membro vinculado.</p>
                        )}
                    </div>

                    {/* Adicionar membro */}
                    <div className="p-4 border-t border-soft bg-figueira/5">
                        <ModalAdicionarMembroFamilia familiaId={familia.id} familiaNome={familia.surname} />
                    </div>
                </div>
            )}
        </div>
    )
}

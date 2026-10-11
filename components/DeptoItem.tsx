"use client"
import { useState } from 'react'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import PainelGerenciarDepto from '@/components/PainelGerenciarDepto'
import Image from 'next/image'
import { LayoutGrid, Users, Wrench, Settings2, Trash2, Church, Globe } from 'lucide-react'

export default function DeptoItem({ depto, membrosDisponiveis, congregacoes = [], onExcluir }: any) {
    const confirmar = useConfirm()
    const [painelAberto, setPainelAberto] = useState(false)
    const total = depto._count?.integrantes || 0

    return (
        <>
            <div className="bg-bg2 border border-soft rounded-2xl p-5 hover:border-figueira/20 transition-all group">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-black overflow-hidden bg-blue-500/10 text-blue-500">
                            {depto.foto_url ? (
                                <Image src={depto.foto_url} alt={depto.nome} width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                                depto.nome[0]
                            )}
                        </div>
                        <div>
                            <h4 className="text-sm font-black uppercase tracking-tight text-fg leading-none">
                                {depto.nome}
                            </h4>
                            <p className="text-[9px] font-bold text-muted mt-1">
                                {depto.lider ? `${depto.lider.first_name} ${depto.lider.last_name}` : 'Sem lider'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={async () => { const ok = await confirmar({ mensagem: 'Excluir este departamento?', tipo: 'perigo' }); if (ok) onExcluir(depto.id) }}
                        className="p-1.5 rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-[9px] font-bold bg-soft/30 px-2 py-1 rounded-lg text-muted flex items-center gap-1">
                        <Users size={10} /> {total} membros
                    </span>
                    <span className="text-[9px] font-bold bg-soft/30 px-2 py-1 rounded-lg text-muted flex items-center gap-1">
                        <Wrench size={10} /> {depto.funcoes?.length || 0} funcoes
                    </span>
                    {depto.congregacao?.nome ? (
                        <span className="text-[8px] font-black bg-figueira/10 text-figueira px-2 py-0.5 rounded-lg border border-figueira/20 flex items-center gap-1">
                            <Church size={8} /> {depto.congregacao.nome}
                        </span>
                    ) : (
                        <span className="text-[8px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-lg border border-blue-500/20 flex items-center gap-1">
                            <Globe size={8} /> Global
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setPainelAberto(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-bg border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:bg-fg hover:text-bg transition-all"
                >
                    <Settings2 size={13} /> Gerir Departamento
                </button>
            </div>

            {painelAberto && (
                <PainelGerenciarDepto
                    depto={depto}
                    membrosDisponiveis={membrosDisponiveis}
                    congregacoes={congregacoes}
                    onClose={() => setPainelAberto(false)}
                />
            )}
        </>
    )
}

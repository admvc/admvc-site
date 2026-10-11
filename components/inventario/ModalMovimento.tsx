'use client'
// components/inventario/ModalMovimento.tsx

import { useState, useTransition } from 'react'
import { X, ArrowLeftRight, Loader2, CheckCircle2 } from 'lucide-react'
import { registarMovimento } from '@/actions/inventario-actions'
import Portal from '@/components/ui/Portal'

const TIPOS_MOVIMENTO = [
    { value: 'EMPRESTIMO', label: '📤 Empréstimo', desc: 'Saiu temporariamente', precisaDestino: true, precisaRetorno: true },
    { value: 'DEVOLUCAO', label: '📥 Devolução', desc: 'Voltou de empréstimo', precisaDestino: false, precisaRetorno: false },
    { value: 'MANUTENCAO', label: '🔧 Manutenção', desc: 'Enviado para reparação', precisaDestino: true, precisaRetorno: true },
    { value: 'RETORNO_MANUTENCAO', label: '✅ Retorno Manutenção', desc: 'Voltou da reparação', precisaDestino: false, precisaRetorno: false },
    { value: 'ENTRADA', label: '➕ Entrada de Stock', desc: 'Adição de unidades', precisaDestino: false, precisaRetorno: false },
    { value: 'SAIDA', label: '➖ Saída de Stock', desc: 'Retirada permanente', precisaDestino: true, precisaRetorno: false },
    { value: 'TRANSFERENCIA', label: '🔄 Transferência', desc: 'Mudou de responsável', precisaDestino: true, precisaRetorno: false },
    { value: 'AJUSTE', label: '⚖️ Ajuste de Stock', desc: 'Correcção de quantidade', precisaDestino: false, precisaRetorno: false },
]

interface Props {
    item: any
    onClose: () => void
    onSucesso: () => void
}

export function ModalMovimento({ item, onClose, onSucesso }: Props) {
    const [isPending, startTransition] = useTransition()
    const [sucesso, setSucesso] = useState(false)
    const [erro, setErro] = useState('')
    const [tipoSel, setTipoSel] = useState('EMPRESTIMO')

    const tipoInfo = TIPOS_MOVIMENTO.find(t => t.value === tipoSel)

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErro('')
        const fd = new FormData(e.currentTarget)
        fd.set('item_id', String(item.id))
        fd.set('tipo', tipoSel)

        startTransition(async () => {
            const res = await registarMovimento(fd)
            if (res.ok) {
                setSucesso(true)
                setTimeout(onSucesso, 1200)
            } else {
                setErro(res.error || 'Erro ao registar movimento.')
            }
        })
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

                    <div className="flex items-center justify-between px-7 py-5 border-b border-soft bg-bg2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-blue-500/10 text-blue-600 rounded-xl flex items-center justify-center">
                                <ArrowLeftRight size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">{item.nome}</h3>
                                <p className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                    Registar Movimento · {item.quantidade_disponivel}/{item.quantidade_total} disponíveis
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 bg-soft/20 rounded-full flex items-center justify-center text-muted hover:bg-red-500 hover:text-white transition-all">
                            <X size={15} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="overflow-y-auto px-7 py-5 space-y-5">

                        {erro && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-[9px] font-bold text-red-600 uppercase tracking-widest">
                                {erro}
                            </div>
                        )}

                        {/* TIPO */}
                        <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Tipo de Movimento</label>
                            <div className="grid grid-cols-2 gap-2">
                                {TIPOS_MOVIMENTO.map(t => (
                                    <button key={t.value} type="button" onClick={() => setTipoSel(t.value)}
                                        className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all
                                            ${tipoSel === t.value ? 'bg-fg text-bg border-fg' : 'bg-bg border-soft text-fg hover:border-figueira/30'}`}>
                                        <span className="text-[10px] font-black">{t.label}</span>
                                        <span className={`text-[8px] mt-0.5 ${tipoSel === t.value ? 'text-bg/60' : 'text-muted'}`}>{t.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* QUANTIDADE */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Quantidade</label>
                            <input type="number" name="quantidade" defaultValue="1" min="1" max={item.quantidade_total} required
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                        </div>

                        {/* RESPONSÁVEL */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Responsável</label>
                            <input type="text" name="responsavel" placeholder="Quem fez este movimento"
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                        </div>

                        {/* DESTINO */}
                        {tipoInfo?.precisaDestino && (
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted">
                                    {tipoSel === 'MANUTENCAO' ? 'Assistência / Local de Reparação' : 'Destino / Responsável'}
                                </label>
                                <input type="text" name="destino" required placeholder="Nome ou local"
                                    className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                            </div>
                        )}

                        {/* DATA RETORNO PREVISTA */}
                        {tipoInfo?.precisaRetorno && (
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-muted">Data de Retorno Prevista</label>
                                <input type="date" name="data_retorno_prevista"
                                    className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                            </div>
                        )}

                        {/* OBSERVAÇÃO */}
                        <div className="space-y-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Observação</label>
                            <textarea name="observacao" rows={2} placeholder="Notas adicionais..."
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none resize-none" />
                        </div>

                        <button type="submit" disabled={isPending}
                            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all
                                ${sucesso ? 'bg-emerald-500 text-white' : 'bg-fg text-bg hover:bg-figueira active:scale-95 disabled:opacity-50'}`}>
                            {isPending ? <><Loader2 size={14} className="animate-spin" /> A registar...</>
                                : sucesso ? <><CheckCircle2 size={14} /> Registado!</>
                                    : <><ArrowLeftRight size={14} /> Registar Movimento</>}
                        </button>
                    </form>
                </div>
            </div>
        </Portal>
    )
}

export default ModalMovimento
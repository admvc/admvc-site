'use client'
// components/inventario/ModalDetalhesItem.tsx

import { useState, useTransition } from 'react'
import {
    X, Package, ArrowLeftRight, Edit3, Archive,
    ShieldCheck, Calendar, MapPin, Hash, Tag,
    Loader2, CheckCircle2, AlertTriangle, Clock
} from 'lucide-react'
import { arquivarItemInventario, editarItemInventario } from '@/actions/inventario-actions'
import Portal from '@/components/ui/Portal'

const TIPO_COR: Record<string, string> = {
    ENTRADA: 'text-emerald-600 bg-emerald-500/10',
    SAIDA: 'text-red-600 bg-red-500/10',
    EMPRESTIMO: 'text-orange-600 bg-orange-500/10',
    DEVOLUCAO: 'text-blue-600 bg-blue-500/10',
    MANUTENCAO: 'text-purple-600 bg-purple-500/10',
    RETORNO_MANUTENCAO: 'text-emerald-600 bg-emerald-500/10',
    TRANSFERENCIA: 'text-figueira bg-figueira/10',
    AJUSTE: 'text-muted bg-soft',
}

const TIPO_LABEL: Record<string, string> = {
    ENTRADA: 'Entrada', SAIDA: 'Saída', EMPRESTIMO: 'Empréstimo',
    DEVOLUCAO: 'Devolução', MANUTENCAO: 'Manutenção',
    RETORNO_MANUTENCAO: 'Ret. Manutenção', TRANSFERENCIA: 'Transferência', AJUSTE: 'Ajuste',
}

interface Props {
    item: any
    departamentos: any[]
    grupos: any[]
    membros: any[]
    onClose: () => void
    onMovimento: () => void
    onSucesso: () => void
}

export default function ModalDetalhesItem({ item, onClose, onMovimento, onSucesso, departamentos, grupos, membros }: Props) {
    const [tab, setTab] = useState<'info' | 'historico' | 'editar'>('info')
    const [isPending, startTransition] = useTransition()
    const [confirmArchive, setConfirmArchive] = useState(false)
    const [editSucesso, setEditSucesso] = useState(false)
    const [editErro, setEditErro] = useState('')
    const [donoTipo, setDonoTipo] = useState(item.dono_tipo || 'IGREJA')
    const [temGarantia, setTemGarantia] = useState(item.tem_garantia)

    const garantiaExpirando = item.tem_garantia && item.garantia_validade &&
        new Date(item.garantia_validade) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    function nomeDono() {
        if (item.dono_tipo === 'DEPARTAMENTO' && item.dono_departamento) return item.dono_departamento.nome
        if (item.dono_tipo === 'GRUPO' && item.dono_grupo) return item.dono_grupo.nome
        if (item.dono_tipo === 'MEMBRO' && item.dono_membro)
            return `${item.dono_membro.first_name} ${item.dono_membro.last_name}`
        return 'Igreja'
    }

    function handleEditar(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setEditErro('')
        const fd = new FormData(e.currentTarget)
        fd.set('dono_tipo', donoTipo)
        fd.set('tem_garantia', String(temGarantia))

        startTransition(async () => {
            const res = await editarItemInventario(item.id, fd)
            if (res.ok) {
                setEditSucesso(true)
                setTimeout(onSucesso, 1200)
            } else {
                setEditErro(res.error || 'Erro ao editar.')
            }
        })
    }

    function handleArquivar() {
        startTransition(async () => {
            await arquivarItemInventario(item.id)
            onSucesso()
        })
    }

    const InfoRow = ({ label, value }: { label: string; value: any }) => {
        if (!value) return null
        return (
            <div className="flex items-start justify-between gap-4 py-2 border-b border-soft/50">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted shrink-0">{label}</span>
                <span className="text-[10px] font-bold text-fg text-right">{value}</span>
            </div>
        )
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden">

                    {/* HEADER */}
                    <div className="px-7 py-5 border-b border-soft bg-bg2 shrink-0">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-base font-black uppercase italic tracking-tighter text-fg leading-tight">{item.nome}</h3>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest">
                                        {nomeDono()} · {item.localizacao || 'Sem localização'}
                                    </span>
                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full
                                        ${item.quantidade_disponivel === 0 ? 'bg-red-500/10 text-red-600' :
                                            item.quantidade_disponivel < item.quantidade_total ? 'bg-orange-500/10 text-orange-600' :
                                                'bg-emerald-500/10 text-emerald-600'}`}>
                                        {item.quantidade_disponivel}/{item.quantidade_total} disp.
                                    </span>
                                    {garantiaExpirando && (
                                        <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 flex items-center gap-1">
                                            <AlertTriangle size={8} /> Garantia a expirar
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 bg-soft/20 rounded-full flex items-center justify-center text-muted hover:bg-red-500 hover:text-white transition-all shrink-0">
                                <X size={15} />
                            </button>
                        </div>

                        {/* TABS */}
                        <div className="flex gap-1 mt-4 bg-bg rounded-xl p-1">
                            {(['info', 'historico', 'editar'] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)}
                                    className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                                        ${tab === t ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                                    {t === 'info' ? 'Detalhes' : t === 'historico' ? 'Histórico' : 'Editar'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-y-auto px-7 py-5 flex-1">

                        {/* TAB INFO */}
                        {tab === 'info' && (
                            <div className="space-y-4">
                                <InfoRow label="Categoria" value={item.categoria} />
                                <InfoRow label="Estado" value={item.estado} />
                                <InfoRow label="Marca / Modelo" value={[item.marca, item.modelo].filter(Boolean).join(' · ') || null} />
                                <InfoRow label="Nº de Série" value={item.numero_serie} />
                                <InfoRow label="Cód. Patrimonial" value={item.codigo_patrimonio} />
                                <InfoRow label="Cor" value={item.cor} />
                                <InfoRow label="Localização" value={item.localizacao} />

                                {item.valor_aquisicao && (
                                    <InfoRow label="Valor de Aquisição"
                                        value={new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(item.valor_aquisicao)} />
                                )}
                                {item.data_aquisicao && (
                                    <InfoRow label="Data de Aquisição"
                                        value={new Date(item.data_aquisicao).toLocaleDateString('pt-PT')} />
                                )}
                                <InfoRow label="Fornecedor" value={item.fornecedor} />
                                <InfoRow label="Nota Fiscal" value={item.nota_fiscal} />

                                {item.tem_garantia && (
                                    <div className={`mt-2 flex items-start gap-3 p-4 rounded-2xl border
                                        ${garantiaExpirando ? 'bg-orange-500/5 border-orange-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                        <ShieldCheck size={16} className={garantiaExpirando ? 'text-orange-500 shrink-0 mt-0.5' : 'text-emerald-500 shrink-0 mt-0.5'} />
                                        <div>
                                            <p className={`text-[9px] font-black uppercase tracking-widest ${garantiaExpirando ? 'text-orange-700' : 'text-emerald-700'}`}>
                                                {garantiaExpirando ? 'Garantia a expirar em breve' : 'Em Garantia'}
                                            </p>
                                            {item.garantia_validade && (
                                                <p className="text-[8px] font-bold text-muted mt-0.5">
                                                    Válida até {new Date(item.garantia_validade).toLocaleDateString('pt-PT')}
                                                </p>
                                            )}
                                            {item.garantia_info && (
                                                <p className="text-[8px] font-medium text-muted mt-0.5">{item.garantia_info}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {item.notas && (
                                    <div className="mt-2 bg-bg2 border border-soft rounded-xl p-4">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-1">Notas</p>
                                        <p className="text-[10px] font-medium text-fg leading-relaxed">{item.notas}</p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-4">
                                    <button onClick={onMovimento}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500/10 text-blue-700 border border-blue-500/20 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95">
                                        <ArrowLeftRight size={13} /> Registar Movimento
                                    </button>
                                    {!confirmArchive ? (
                                        <button onClick={() => setConfirmArchive(true)}
                                            className="w-12 flex items-center justify-center bg-soft border border-soft rounded-2xl text-muted hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all">
                                            <Archive size={14} />
                                        </button>
                                    ) : (
                                        <button onClick={handleArquivar} disabled={isPending}
                                            className="flex items-center gap-2 bg-red-500 text-white px-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50">
                                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
                                            Confirmar
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB HISTÓRICO */}
                        {tab === 'historico' && (
                            <div className="space-y-2">
                                {item.movimentos.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Clock size={24} className="mx-auto text-muted/20 mb-3" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted">Sem movimentos registados</p>
                                    </div>
                                ) : item.movimentos.map((m: any) => (
                                    <div key={m.id} className="flex items-start gap-3 p-4 bg-bg2 border border-soft rounded-2xl">
                                        <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shrink-0 ${TIPO_COR[m.tipo] || 'bg-soft text-muted'}`}>
                                            {TIPO_LABEL[m.tipo] || m.tipo}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-fg">Qty: {m.quantidade}</span>
                                                {m.destino && <span className="text-[9px] text-muted">→ {m.destino}</span>}
                                            </div>
                                            {m.observacao && <p className="text-[9px] text-muted mt-0.5 italic">{m.observacao}</p>}
                                            {m.responsavel && <p className="text-[8px] text-muted mt-0.5">Por: {m.responsavel}</p>}
                                            {m.data_retorno_prevista && (
                                                <p className="text-[8px] text-orange-500 mt-0.5">
                                                    Retorno previsto: {new Date(m.data_retorno_prevista).toLocaleDateString('pt-PT')}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-[7px] font-bold text-muted shrink-0">
                                            {new Date(m.created_at).toLocaleDateString('pt-PT')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* TAB EDITAR */}
                        {tab === 'editar' && (
                            <form onSubmit={handleEditar} className="space-y-4">
                                {editErro && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-[9px] font-bold text-red-600">
                                        {editErro}
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Nome *</label>
                                    <input name="nome" defaultValue={item.nome} required
                                        className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted">Categoria</label>
                                        <select name="categoria" defaultValue={item.categoria}
                                            className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                            {['ELETRONICO', 'INSTRUMENTO', 'MOVEL', 'VEICULO', 'FERRAMENTA', 'VESTUARIO', 'LIVRO', 'CONSUMIVEL', 'OUTRO'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-muted">Estado</label>
                                        <select name="estado" defaultValue={item.estado}
                                            className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                            {['OTIMO', 'BOM', 'REGULAR', 'DANIFICADO', 'INUTILIZAVEL'].map(e => (
                                                <option key={e} value={e}>{e}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Localização</label>
                                    <input name="localizacao" defaultValue={item.localizacao || ''}
                                        className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                </div>

                                {/* GARANTIA */}
                                <div className="flex items-center justify-between p-3 bg-bg2 border border-soft rounded-xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-fg">Tem Garantia</span>
                                    <div onClick={() => setTemGarantia(!temGarantia)} className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${temGarantia ? 'bg-figueira' : 'bg-soft'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${temGarantia ? 'left-5' : 'left-1'}`} />
                                    </div>
                                </div>
                                {temGarantia && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Válida até</label>
                                            <input type="date" name="garantia_validade"
                                                defaultValue={item.garantia_validade ? item.garantia_validade.split('T')[0] : ''}
                                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Info Garantia</label>
                                            <input name="garantia_info" defaultValue={item.garantia_info || ''}
                                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Notas</label>
                                    <textarea name="notas" rows={2} defaultValue={item.notas || ''}
                                        className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none resize-none" />
                                </div>

                                <button type="submit" disabled={isPending}
                                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all
                                        ${editSucesso ? 'bg-emerald-500 text-white' : 'bg-fg text-bg hover:bg-figueira active:scale-95 disabled:opacity-50'}`}>
                                    {isPending ? <><Loader2 size={14} className="animate-spin" /> A guardar...</>
                                        : editSucesso ? <><CheckCircle2 size={14} /> Guardado!</>
                                            : 'Guardar Alterações'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </Portal>
    )
}
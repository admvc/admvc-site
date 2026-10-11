'use client'
// components/inventario/ModalCriarItem.tsx

import { useState, useTransition } from 'react'
import { X, Save, Loader2, CheckCircle2, Package, ShieldCheck, ChevronDown } from 'lucide-react'
import { criarItemInventario } from '@/actions/inventario-actions'
import Portal from '@/components/ui/Portal'

const CATEGORIAS = [
    { value: 'ELETRONICO', label: '💻 Electrónico' },
    { value: 'INSTRUMENTO', label: '🎸 Instrumento' },
    { value: 'MOVEL', label: '🪑 Móvel' },
    { value: 'VEICULO', label: '🚐 Veículo' },
    { value: 'FERRAMENTA', label: '🔧 Ferramenta' },
    { value: 'VESTUARIO', label: '👕 Vestuário' },
    { value: 'LIVRO', label: '📖 Livro' },
    { value: 'CONSUMIVEL', label: '📦 Consumível' },
    { value: 'OUTRO', label: '📎 Outro' },
]

const ESTADOS = [
    { value: 'OTIMO', label: 'Óptimo' },
    { value: 'BOM', label: 'Bom' },
    { value: 'REGULAR', label: 'Regular' },
    { value: 'DANIFICADO', label: 'Danificado' },
    { value: 'INUTILIZAVEL', label: 'Inutilizável' },
]

interface Props {
    departamentos: any[]
    grupos: any[]
    membros: any[]
    onClose: () => void
    onSucesso: () => void
}

function Campo({ label, name, type = 'text', placeholder = '', defaultValue = '', required = false, className = '' }: any) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="text-[8px] font-black uppercase tracking-widest text-muted">{label}{required && ' *'}</label>
            <input type={type} name={name} placeholder={placeholder} defaultValue={defaultValue} required={required}
                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all" />
        </div>
    )
}

export default function ModalCriarItem({ departamentos, grupos, membros, onClose, onSucesso }: Props) {
    const [isPending, startTransition] = useTransition()
    const [sucesso, setSucesso] = useState(false)
    const [erro, setErro] = useState('')
    const [donoTipo, setDonoTipo] = useState('IGREJA')
    const [temGarantia, setTemGarantia] = useState(false)

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErro('')
        const fd = new FormData(e.currentTarget)
        fd.set('dono_tipo', donoTipo)
        fd.set('tem_garantia', String(temGarantia))

        startTransition(async () => {
            const res = await criarItemInventario(fd)
            if (res.ok) {
                setSucesso(true)
                setTimeout(onSucesso, 1200)
            } else {
                setErro(res.error || 'Erro ao criar item.')
            }
        })
    }

    return (
        <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">

                    {/* HEADER */}
                    <div className="flex items-center justify-between px-7 py-5 border-b border-soft bg-bg2 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center">
                                <Package size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Novo Item</h3>
                                <p className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">Adicionar ao inventário</p>
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

                        {/* IDENTIFICAÇÃO */}
                        <div className="space-y-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Identificação</p>
                            <Campo label="Nome do Item" name="nome" placeholder="Ex: Microfone Shure SM58" required />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Categoria *</label>
                                    <select name="categoria" required className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Estado</label>
                                    <select name="estado" className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <Campo label="Marca" name="marca" placeholder="Shure" />
                                <Campo label="Modelo" name="modelo" placeholder="SM58" />
                                <Campo label="Cor" name="cor" placeholder="Preto" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Campo label="Nº de Série" name="numero_serie" placeholder="SN12345" />
                                <Campo label="Código Patrimonial" name="codigo_patrimonio" placeholder="ADM-001" />
                            </div>
                            <Campo label="Localização" name="localizacao" placeholder="Ex: Sala de Louvor, Armazém" />
                        </div>

                        {/* DONO */}
                        <div className="space-y-3 border-t border-soft pt-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Pertence a</p>
                            <div className="flex flex-wrap gap-2">
                                {['IGREJA', 'DEPARTAMENTO', 'GRUPO', 'MEMBRO'].map(tipo => (
                                    <button key={tipo} type="button" onClick={() => setDonoTipo(tipo)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all
                                            ${donoTipo === tipo ? 'bg-fg text-bg border-fg' : 'bg-bg border-soft text-muted hover:border-figueira/30'}`}>
                                        {tipo === 'IGREJA' ? '⛪ Igreja' : tipo === 'DEPARTAMENTO' ? '🏛 Departamento' : tipo === 'GRUPO' ? '👥 Grupo' : '👤 Membro'}
                                    </button>
                                ))}
                            </div>

                            {donoTipo === 'DEPARTAMENTO' && (
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Departamento *</label>
                                    <select name="dono_departamento_id" required className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        <option value="">Seleccione...</option>
                                        {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                                    </select>
                                </div>
                            )}
                            {donoTipo === 'GRUPO' && (
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Grupo *</label>
                                    <select name="dono_grupo_id" required className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        <option value="">Seleccione...</option>
                                        {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                    </select>
                                </div>
                            )}
                            {donoTipo === 'MEMBRO' && (
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">Membro *</label>
                                    <select name="dono_membro_id" required className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        <option value="">Seleccione...</option>
                                        {membros.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* AQUISIÇÃO */}
                        <div className="space-y-3 border-t border-soft pt-4">
                            <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Aquisição</p>
                            <div className="grid grid-cols-3 gap-3">
                                <Campo label="Quantidade" name="quantidade_total" type="number" defaultValue="1" />
                                <Campo label="Valor (€)" name="valor_aquisicao" type="number" placeholder="0.00" />
                                <Campo label="Data Aquisição" name="data_aquisicao" type="date" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Campo label="Fornecedor" name="fornecedor" placeholder="Nome da loja" />
                                <Campo label="Nota Fiscal / Recibo" name="nota_fiscal" placeholder="NF-001" />
                            </div>
                        </div>

                        {/* GARANTIA */}
                        <div className="space-y-3 border-t border-soft pt-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Garantia</p>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div onClick={() => setTemGarantia(!temGarantia)}
                                        className={`w-10 h-6 rounded-full transition-all relative ${temGarantia ? 'bg-figueira' : 'bg-soft'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${temGarantia ? 'left-5' : 'left-1'}`} />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted">
                                        {temGarantia ? 'Tem garantia' : 'Sem garantia'}
                                    </span>
                                </label>
                            </div>

                            {temGarantia && (
                                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <Campo label="Válida até" name="garantia_validade" type="date" />
                                        <Campo label="Info / Assistência" name="garantia_info" placeholder="Nome da assistência" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* NOTAS */}
                        <div className="space-y-1.5 border-t border-soft pt-4">
                            <label className="text-[8px] font-black uppercase tracking-widest text-muted">Notas</label>
                            <textarea name="notas" rows={2} placeholder="Informações adicionais..."
                                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none resize-none" />
                        </div>

                        {/* SUBMIT */}
                        <div className="pt-2 pb-2">
                            <button type="submit" disabled={isPending}
                                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all
                                    ${sucesso ? 'bg-emerald-500 text-white' : 'bg-fg text-bg hover:bg-figueira active:scale-95 disabled:opacity-50'}`}>
                                {isPending ? <><Loader2 size={14} className="animate-spin" /> A guardar...</>
                                    : sucesso ? <><CheckCircle2 size={14} /> Guardado!</>
                                        : <><Save size={14} /> Adicionar ao Inventário</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    )
}
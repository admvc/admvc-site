'use client'

import { useState } from 'react'
import { CalendarDays, X, Save, Loader2, Clock, Type, Edit3, Church, AlignLeft, Repeat } from 'lucide-react'
import { editarEventoAction, resumoSerieEventoAction } from '@/actions/admin-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarEvento({ evento, congregacoes = [] }: { evento: any; congregacoes?: { id: number; nome: string; cidade: string }[] }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    // Cultos desta série a partir deste (inclusive); >1 = dá para editar os seguintes
    const [naSerie, setNaSerie] = useState(1)
    const [alcance, setAlcance] = useState<'ESTE' | 'SEGUINTES'>('ESTE')

    async function abrir() {
        setIsOpen(true)
        setAlcance('ESTE')
        const r = await resumoSerieEventoAction(evento.id)
        setNaSerie(r.ok ? r.seguintes.cultos : 1)
    }

    const dataObj = new Date(evento.data)
    const defaultData = dataObj.toISOString().split('T')[0]
    const defaultHora = dataObj.toISOString().slice(11, 16) // hora gravada em UTC (ver components/app/datas.ts)

    async function handleAction(formData: FormData) {
        setIsPending(true)
        const res = await editarEventoAction(formData)
        setIsPending(false)
        if (res.ok) {
            setIsOpen(false)
            if (res.total && res.total > 1) toast(`${res.total} cultos atualizados.`, 'sucesso')
        }
        else toast(res.error || "Erro ao atualizar o evento.", 'erro')
    }

    return (
        <>
            <button type="button" onClick={abrir}
                className="p-2 bg-bg2 border border-soft text-muted hover:text-figueira hover:border-figueira/30 rounded-xl transition-all active:scale-90 shadow-sm"
                title="Editar Evento">
                <Edit3 size={14} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-soft animate-in zoom-in-95 duration-200">

                        <div className="px-6 py-4 border-b border-soft flex justify-between items-center bg-bg2">
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide text-figueira">Editar</p>
                                <h3 className="text-lg font-bold text-fg">{evento.nome}</h3>
                            </div>
                            <button onClick={() => !isPending && setIsOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-red-500 transition-all">
                                <X size={14} />
                            </button>
                        </div>

                        <form action={handleAction} className="p-6 space-y-4">
                            <input type="hidden" name="id" value={evento.id} />
                            <input type="hidden" name="horario_original" value={defaultHora} />
                            <input type="hidden" name="alcance" value={alcance} />

                            {naSerie > 1 && (
                                <fieldset className="rounded-xl border border-soft bg-bg2 p-3 space-y-2">
                                    <legend className="px-1 text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                        <Repeat size={10} /> Culto que se repete
                                    </legend>
                                    {([['ESTE', 'Só este culto'], ['SEGUINTES', `Este e os seguintes (${naSerie} cultos)`]] as const).map(([v, txt]) => (
                                        <label key={v} className="flex items-center gap-2 text-sm font-bold text-fg cursor-pointer">
                                            <input type="radio" name="alcance_escolha" checked={alcance === v} onChange={() => setAlcance(v)} className="accent-figueira" />
                                            {txt}
                                        </label>
                                    ))}
                                    {alcance === 'SEGUINTES' && (
                                        <p className="text-[13px] text-muted">Muda o nome, a hora, a congregação e a descrição de todos; cada culto fica no seu dia.</p>
                                    )}
                                </fieldset>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                    <Type size={10} /> Nome
                                </label>
                                <input type="text" name="nome" required defaultValue={evento.nome}
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                        <CalendarDays size={10} /> Data
                                    </label>
                                    <input type="date" name="data" required defaultValue={defaultData} disabled={alcance === 'SEGUINTES'}
                                        className="disabled:opacity-50 w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none cursor-pointer" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                        <Clock size={10} /> Hora
                                    </label>
                                    <input type="time" name="horario" required defaultValue={defaultHora}
                                        className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none cursor-pointer" />
                                </div>
                            </div>

                            {congregacoes.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                        <Church size={10} /> Congregação
                                    </label>
                                    <select name="congregacao_id" defaultValue={evento.congregacao_id || ''}
                                        className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        <option value="">Toda a Igreja</option>
                                        {congregacoes.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome} — {c.cidade}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                    <AlignLeft size={10} /> Descrição (opcional)
                                </label>
                                <textarea name="descricao" defaultValue={evento.descricao || ''} rows={2}
                                    className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none resize-none" placeholder="Tema do culto..." />
                            </div>

                            <button type="submit" disabled={isPending}
                                className="w-full flex items-center justify-center gap-2 bg-fg text-bg py-3 rounded-xl font-bold text-[13px] uppercase tracking-wide hover:bg-figueira transition-all disabled:opacity-50">
                                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                                {isPending ? "A guardar..." : "Guardar"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}

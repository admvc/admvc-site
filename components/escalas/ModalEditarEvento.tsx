'use client'

import { useState } from 'react'
import { CalendarDays, X, Save, Loader2, Clock, Type, Edit3 } from 'lucide-react'
import { editarEventoAction } from '@/actions/admin-actions' // Ajusta o caminho se necessário
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarEvento({ evento }: { evento: any }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    // Preparar as datas por defeito para os inputs
    const dataObj = new Date(evento.data);
    const defaultData = dataObj.toISOString().split('T')[0];
    const defaultHora = dataObj.toTimeString().split(' ')[0].substring(0, 5);

    async function handleAction(formData: FormData) {
        setIsPending(true)
        const res = await editarEventoAction(formData)
        setIsPending(false)

        if (res.ok) {
            setIsOpen(false)
        } else {
            toast(res.error || "Erro ao atualizar o evento.", 'erro')
        }
    }

    return (
        <>
            {/* O BOTÃO PEQUENO DE EDITAR (Para ficar ao lado do evento na lista) */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="p-2.5 bg-bg2 border border-soft text-muted hover:text-figueira hover:border-figueira hover:bg-figueira/5 rounded-xl transition-all active:scale-90 shadow-sm"
                title="Editar Evento"
            >
                <Edit3 size={16} />
            </button>

            {/* O MODAL (Com o teu design premium) */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Gestão de Agenda</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Editar <span className="text-muted/20">Evento.</span></h3>
                            </div>
                            <button
                                onClick={() => !isPending && setIsOpen(false)}
                                className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* FORMULÁRIO */}
                        <form action={handleAction} className="p-8 space-y-6">

                            {/* ID OCULTO */}
                            <input type="hidden" name="id" value={evento.id} />

                            {/* NOME DO EVENTO */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Type size={12} /> Nome do Culto / Evento
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    required
                                    defaultValue={evento.nome}
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* DATA */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <CalendarDays size={12} /> Data
                                    </label>
                                    <input
                                        type="date"
                                        name="data"
                                        required
                                        defaultValue={defaultData}
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer transition-colors"
                                    />
                                </div>

                                {/* HORA */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Clock size={12} /> Hora
                                    </label>
                                    <input
                                        type="time"
                                        name="horario"
                                        required
                                        defaultValue={defaultHora}
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer transition-colors"
                                    />
                                </div>
                            </div>

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft mt-6">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Atualizar..." : "Guardar Alterações"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
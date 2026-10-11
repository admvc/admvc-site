'use client'

import { useState } from 'react'
import { X, Save, Loader2, Clock, Briefcase, Edit3 } from 'lucide-react'
import { editarEscalaAction } from '@/actions/admin-actions' // Vamos criar esta action a seguir
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarEscala({ escala }: { escala: any }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    async function handleAction(formData: FormData) {
        setIsPending(true)
        const res = await editarEscalaAction(formData)
        setIsPending(false)

        if (res.ok) {
            setIsOpen(false)
        } else {
            toast(res.error || "Erro ao atualizar a escala.", 'erro')
        }
    }

    return (
        <>
            {/* O BOTÃO PEQUENO DE EDITAR */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="p-2.5 bg-bg2 border border-soft text-muted hover:text-figueira hover:border-figueira hover:bg-figueira/5 rounded-xl transition-all active:scale-90 shadow-sm"
                title="Editar Escala"
            >
                <Edit3 size={16} />
            </button>

            {/* O MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Gestão de Equipas</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Editar <span className="text-muted/20">Escala.</span></h3>
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

                            {/* ID OCULTO DA ESCALA */}
                            <input type="hidden" name="id" value={escala.id} />

                            {/* FUNÇÃO (Ex: Bateria, Recepção) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Briefcase size={12} /> Função / Tarefa
                                </label>
                                <input
                                    type="text"
                                    name="funcao"
                                    required
                                    defaultValue={escala.funcao}
                                    placeholder="Ex: Câmera 1, Bateria..."
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors"
                                />
                            </div>

                            {/* HORÁRIO (Ex: 18:00) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Clock size={12} /> Horário de Chegada
                                </label>
                                <input
                                    type="time"
                                    name="horario"
                                    defaultValue={escala.horario || ''}
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer transition-colors"
                                />
                            </div>

                            {/* MENSAGEM INFORMATIVA */}
                            <div className="bg-figueira/5 border border-figueira/10 p-4 rounded-2xl">
                                <p className="text-[9px] font-bold text-figueira uppercase tracking-widest leading-relaxed text-center">
                                    O membro será notificado desta alteração automaticamente.
                                </p>
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
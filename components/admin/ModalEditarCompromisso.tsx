'use client'

import { useState } from 'react'
import { X, Save, Loader2, Clock, Type, AlignLeft, CalendarDays, Edit3 } from 'lucide-react'
import { editarCompromissoAction } from '@/actions/agenda-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarCompromisso({ comp }: { comp: any }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);

    // Formatar datas para os inputs
    const dataInicial = new Date(comp.data_inicio);
    const dataFim = new Date(comp.data_fim);
    const defaultData = dataInicial.toISOString().split('T')[0];
    const defaultHoraInicio = dataInicial.toTimeString().split(' ')[0].substring(0, 5);
    const defaultHoraFim = dataFim.toTimeString().split(' ')[0].substring(0, 5);

    async function handleAction(formData: FormData) {
        setIsPending(true);
        const res = await editarCompromissoAction(formData);
        setIsPending(false);

        if (res.ok) setIsOpen(false);
        else toast(res.error, 'erro');
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-bg border border-soft text-muted hover:text-figueira transition-all" title="Editar">
                <Edit3 size={14} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2">
                            <div>
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Ajustar</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Editar <span className="text-muted/20">Marcação.</span></h3>
                            </div>
                            <button onClick={() => !isPending && setIsOpen(false)} className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <form action={handleAction} className="p-8 space-y-6">
                            <input type="hidden" name="id" value={comp.id} />
                            
                            {/* Passa os IDs antigos ocultos para não os perder na atualização simplificada */}
                            {comp.membros?.map((m: any) => <input key={`m_${m.id}`} type="hidden" name="membros[]" value={m.id} />)}
                            {comp.visitantes?.map((v: any) => <input key={`v_${v.id}`} type="hidden" name="visitantes[]" value={v.id} />)}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2">Categoria</label>
                                <select name="categoria" defaultValue={comp.categoria} className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer">
                                    <option value="CAFE">☕ Café com Pastor</option>
                                    <option value="PERMANECER">🌱 Plano Permanecer</option>
                                    <option value="DISCIPULADO">📖 Discipulado</option>
                                    <option value="LIDERANCA">👥 Reunião de Liderança</option>
                                    <option value="MESA">🍽️ A Mesa</option>
                                    <option value="OUTROS">📅 Outros</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Type size={12}/> Título</label>
                                <input name="titulo" defaultValue={comp.titulo} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2"><CalendarDays size={12}/> Data</label>
                                    <input type="date" name="data" defaultValue={defaultData} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2"><Clock size={12}/> Início</label>
                                    <input type="time" name="hora_inicio" defaultValue={defaultHoraInicio} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2"><Clock size={12}/> Fim</label>
                                    <input type="time" name="hora_fim" defaultValue={defaultHoraFim} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-soft mt-6">
                                <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Atualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
'use client'

import { useState } from 'react'
import { CalendarPlus, X, Save, Loader2, Link as LinkIcon, User, Type } from 'lucide-react'
import { criarAgendaAction } from '@/actions/agenda-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalNovaAgenda({ membros }: { membros: any[] }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [slugPreview, setSlugPreview] = useState('');

    async function handleAction(formData: FormData) {
        setIsPending(true);
        const res = await criarAgendaAction(formData);
        setIsPending(false);

        if (res.ok) {
            setIsOpen(false);
        } else {
            toast(res.error, 'erro');
        }
    }

    return (
        <>
            {/* BOTÃO QUE ABRE O MODAL */}
            <button 
                onClick={() => setIsOpen(true)}
                className="bg-fg text-bg px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
                <CalendarPlus size={14} /> Nova Agenda
            </button>

            {/* O MODAL */}
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Gabinete Pastoral</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Criar <span className="text-muted/20">Agenda.</span></h3>
                            </div>
                            <button onClick={() => !isPending && setIsOpen(false)} className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* FORMULÁRIO */}
                        <form action={handleAction} className="p-8 space-y-6">

                            {/* SELECIONAR O DONO (PASTOR/LÍDER) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <User size={12} /> Líder / Dono da Agenda
                                </label>
                                <select 
                                    name="dono_id" 
                                    required 
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione um membro...</option>
                                    {membros.map(m => (
                                        <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* NOME DA AGENDA */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Type size={12} /> Título da Agenda
                                </label>
                                <input 
                                    name="nome" 
                                    required 
                                    placeholder="Ex: Agenda Pastoral - Pr. João"
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors" 
                                />
                            </div>

                            {/* LINK PÚBLICO (SLUG) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <LinkIcon size={12} /> Link de Acesso Público
                                </label>
                                <div className="flex bg-bg2 border-2 border-soft rounded-2xl overflow-hidden focus-within:border-figueira transition-colors">
                                    <span className="px-4 py-4 bg-soft/30 text-muted text-[10px] font-black uppercase tracking-widest flex items-center border-r border-soft">
                                        admvc.org/agenda/
                                    </span>
                                    <input 
                                        name="slug" 
                                        required 
                                        placeholder="pr-joao"
                                        onChange={(e) => setSlugPreview(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                        className="w-full bg-transparent px-4 py-4 text-xs font-black text-fg outline-none" 
                                    />
                                </div>
                                {slugPreview && (
                                    <p className="text-[9px] font-bold text-figueira uppercase tracking-widest ml-2 mt-1">
                                        Ficará: /agenda/{slugPreview}
                                    </p>
                                )}
                            </div>

                            {/* TOGGLE PÚBLICA/PRIVADA */}
                            <label className="flex items-center gap-3 p-4 border border-soft rounded-2xl cursor-pointer hover:bg-soft/10 transition-colors">
                                <input type="checkbox" name="is_publica" defaultChecked className="w-4 h-4 accent-figueira" />
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-fg">Agenda Pública</p>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest">Permite que qualquer pessoa marque horário no site.</p>
                                </div>
                            </label>

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft mt-6">
                                <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Criar..." : "Criar Agenda"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
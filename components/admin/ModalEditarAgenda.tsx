'use client'

import { useState } from 'react'
import { MoreHorizontal, X, Save, Loader2, Link as LinkIcon, User, Type, Trash2, Shield, Search } from 'lucide-react'
import { editarAgendaAction, apagarAgendaAction } from '@/actions/agenda-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function ModalEditarAgenda({ agenda, membros }: { agenda: any, membros: any[] }) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    const [slugPreview, setSlugPreview] = useState(agenda.slug);

    // ESTADOS PARA OS GESTORES
    const [busca, setBusca] = useState('');
    const [gestoresSelecionados, setGestoresSelecionados] = useState<{id: number, nome: string}[]>(
        agenda.gestores?.map((g: any) => ({ id: g.id, nome: `${g.first_name} ${g.last_name}` })) || []
    );

    // FILTRO DO BUSCADOR
    const opcoesFiltradas = membros.filter(m => 
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(busca.toLowerCase()) &&
        !gestoresSelecionados.some(g => g.id === m.id) &&
        m.id !== agenda.dono_id // Esconde o Dono (não faz sentido ser gestor dele próprio)
    ).slice(0, 5);

    const adicionarGestor = (m: any) => {
        setGestoresSelecionados([...gestoresSelecionados, { id: m.id, nome: `${m.first_name} ${m.last_name}` }]);
        setBusca('');
    };

    const removerGestor = (id: number) => {
        setGestoresSelecionados(gestoresSelecionados.filter(g => g.id !== id));
    };

    async function handleEdit(formData: FormData) {
        setIsPending(true);
        const res = await editarAgendaAction(formData);
        setIsPending(false);

        if (res.ok) setIsOpen(false);
        else toast(res.error, 'erro');
    }

    async function handleDelete() {
        const ok = await confirmar({ mensagem: `Tens a certeza que queres APAGAR a "${agenda.nome}"? Todos os compromissos serão apagados!`, tipo: 'perigo' })
        if (!ok) return;
        setIsPending(true);
        const res = await apagarAgendaAction(agenda.id);
        setIsPending(false);
        if (!res.ok) toast(res.error, 'erro');
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="p-3 hover:bg-soft/50 rounded-xl text-muted hover:text-fg transition-colors" title="Opções da Agenda">
                <MoreHorizontal size={20} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 relative my-auto">

                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            <button onClick={handleDelete} disabled={isPending} className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50" title="Apagar Agenda">
                                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            </button>
                            <button onClick={() => !isPending && setIsOpen(false)} className="p-3 bg-soft text-fg rounded-2xl hover:bg-fg hover:text-bg transition-all active:scale-90">
                                <X size={16} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="p-8 border-b border-soft bg-bg2">
                            <div className="space-y-1 pr-24">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Opções</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Editar <span className="text-muted/20">Agenda.</span></h3>
                            </div>
                        </div>

                        <form action={handleEdit} className="p-8 space-y-6">
                            <input type="hidden" name="id" value={agenda.id} />

                            {/* INPUTS OCULTOS DOS GESTORES */}
                            {gestoresSelecionados.map(g => <input key={`gestor_${g.id}`} type="hidden" name="gestores[]" value={g.id} />)}

                            {/* DONO E NOME */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><User size={12} /> Dono / Líder</label>
                                    <select name="dono_id" defaultValue={agenda.dono_id} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer">
                                        {membros.map(m => <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Type size={12} /> Título</label>
                                    <input name="nome" defaultValue={agenda.nome} required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                            </div>

                            {/* DELEGAR GESTORES (NOVO) */}
                            <div className="bg-bg2 p-6 rounded-2xl border border-soft space-y-4">
                                <label className="text-[10px] font-black uppercase text-fg tracking-[0.2em] flex items-center gap-2">
                                    <Shield size={12} className="text-figueira"/> Delegar a Gestores / Secretariado
                                </label>
                                
                                <div className="relative">
                                    <div className="flex items-center bg-bg border-2 border-soft rounded-xl focus-within:border-figueira transition-colors px-4">
                                        <Search size={16} className="text-muted" />
                                        <input 
                                            type="text" 
                                            value={busca}
                                            onChange={(e) => setBusca(e.target.value)}
                                            placeholder="Pesquisar membro para delegar..." 
                                            className="w-full bg-transparent px-3 py-3 text-xs font-bold text-fg outline-none" 
                                        />
                                    </div>
                                    
                                    {busca && opcoesFiltradas.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-bg border border-soft rounded-xl mt-2 shadow-xl z-50 overflow-hidden">
                                            {opcoesFiltradas.map((m, i) => (
                                                <button key={i} type="button" onClick={() => adicionarGestor(m)} className="w-full text-left px-4 py-3 text-xs font-bold text-fg hover:bg-soft/30 transition-colors border-b border-soft last:border-0">
                                                    {m.first_name} {m.last_name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {gestoresSelecionados.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {gestoresSelecionados.map((g, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-figueira/10 border border-figueira/20 text-figueira px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                <span>{g.nome}</span>
                                                <button type="button" onClick={() => removerGestor(g.id)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* LINK */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><LinkIcon size={12} /> Link Público</label>
                                <div className="flex bg-bg2 border-2 border-soft rounded-2xl overflow-hidden focus-within:border-figueira transition-colors">
                                    <span className="px-4 py-4 bg-soft/30 text-muted text-[10px] font-black uppercase tracking-widest flex items-center border-r border-soft">/agenda/</span>
                                    <input name="slug" defaultValue={agenda.slug} required onChange={(e) => setSlugPreview(e.target.value.toLowerCase().replace(/\s+/g, '-'))} className="w-full bg-transparent px-4 py-4 text-xs font-black text-fg outline-none" />
                                </div>
                            </div>

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft mt-6">
                                <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Atualizar Agenda
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
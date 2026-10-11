'use client'

import { useState, useMemo } from 'react'
import { CalendarPlus, X, Save, Loader2, Clock, Users, Type, AlignLeft, CalendarDays, Search, Check } from 'lucide-react'
import { criarCompromissoAction } from '@/actions/agenda-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

type Participante = { id: number, nome: string, tipo: 'MEMBRO' | 'VISITANTE' | 'DEPARTAMENTO' | 'GRUPO' };

export default function ModalNovoCompromisso({
    agendas, membros, visitantes, departamentos = [], grupos = []
}: {
    agendas: any[], membros: any[], visitantes: any[], departamentos?: any[], grupos?: any[]
}) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
    
    // Estado para o Buscador
    const [busca, setBusca] = useState('');
    const [selecionados, setSelecionados] = useState<Participante[]>([]);

    // Unifica todas as listas numa só para o buscador
    const todasOpcoes: Participante[] = useMemo(() => [
        ...membros.map(m => ({ id: m.id, nome: `${m.first_name} ${m.last_name}`, tipo: 'MEMBRO' as const })),
        ...visitantes.map(v => ({ id: v.id, nome: v.nome, tipo: 'VISITANTE' as const })),
        ...departamentos.map(d => ({ id: d.id, nome: d.nome, tipo: 'DEPARTAMENTO' as const })),
        ...grupos.map(g => ({ id: g.id, nome: g.nome, tipo: 'GRUPO' as const }))
    ], [membros, visitantes, departamentos]);

    // Filtra as opções baseadas no que o utilizador digita
    const opcoesFiltradas = todasOpcoes.filter(op => 
        op.nome.toLowerCase().includes(busca.toLowerCase()) && 
        !selecionados.some(s => s.id === op.id && s.tipo === op.tipo)
    ).slice(0, 5); // Mostra só os 5 primeiros resultados para não poluir

    const adicionarParticipante = (p: Participante) => {
        setSelecionados([...selecionados, p]);
        setBusca(''); // Limpa a busca após selecionar
    };

    const removerParticipante = (p: Participante) => {
        setSelecionados(selecionados.filter(s => !(s.id === p.id && s.tipo === p.tipo)));
    };

    async function handleAction(formData: FormData) {
        setIsPending(true);
        const res = await criarCompromissoAction(formData);
        setIsPending(false);

        if (res.ok) {
            setIsOpen(false);
            setSelecionados([]); // Limpa após sucesso
        } else toast(res.error, 'erro');
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)} className="bg-fg text-bg px-6 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all shadow-sm flex items-center gap-2 active:scale-95">
                <CalendarPlus size={14} /> Nova Marcação
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
                    <div className="bg-bg w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 my-auto">
                        
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Secretariado</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Agendar <span className="text-muted/20">Compromisso.</span></h3>
                            </div>
                            <button onClick={() => !isPending && setIsOpen(false)} className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all">
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        <form action={handleAction} className="p-8 space-y-6">
                            
                            {/* INPUTS OCULTOS PARA OS PARTICIPANTES SELECIONADOS */}
                            {selecionados.filter(s => s.tipo === 'MEMBRO').map(s => <input key={`m_${s.id}`} type="hidden" name="membros[]" value={s.id} />)}
                            {selecionados.filter(s => s.tipo === 'VISITANTE').map(s => <input key={`v_${s.id}`} type="hidden" name="visitantes[]" value={s.id} />)}
                            {selecionados.filter(s => s.tipo === 'DEPARTAMENTO').map(s => <input key={`d_${s.id}`} type="hidden" name="departamentos[]" value={s.id} />)}
                            {selecionados.filter(s => s.tipo === 'GRUPO').map(s => <input key={`g_${s.id}`} type="hidden" name="grupos[]" value={s.id} />)}

                            {/* O RESTO DOS CAMPOS (Agenda, Categoria, Titulo) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2">Agenda (Pastor/Líder)</label>
                                    <select name="agenda_id" required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer">
                                        <option value="">Selecione a agenda...</option>
                                        {agendas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2">Tipo de Compromisso</label>
                                    <select name="categoria" required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer">
                                        <option value="CAFE">☕ Café com Pastor</option>
                                        <option value="PERMANECER">🌱 Plano Permanecer</option>
                                        <option value="DISCIPULADO">📖 Discipulado</option>
                                        <option value="LIDERANCA">👥 Reunião de Liderança</option>
                                        <option value="MESA">🍽️ A Mesa</option>
                                        <option value="OUTROS">📅 Outros</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Type size={12}/> Título / Assunto</label>
                                <input name="titulo" required placeholder="Ex: Reunião Equipa de Louvor" className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                            </div>

                            {/* --- NOVO BUSCADOR DE PARTICIPANTES --- */}
                            <div className="bg-bg2 p-6 rounded-2xl border border-soft space-y-4">
                                <label className="text-[10px] font-black uppercase text-fg tracking-[0.2em] flex items-center gap-2">
                                    <Users size={12} className="text-figueira"/> Adicionar Participantes (Membros, Visitantes, Deptos)
                                </label>
                                
                                <div className="relative">
                                    <div className="flex items-center bg-bg border-2 border-soft rounded-xl focus-within:border-figueira transition-colors px-4">
                                        <Search size={16} className="text-muted" />
                                        <input 
                                            type="text" 
                                            value={busca}
                                            onChange={(e) => setBusca(e.target.value)}
                                            placeholder="Pesquisar por nome..." 
                                            className="w-full bg-transparent px-3 py-3 text-xs font-bold text-fg outline-none" 
                                        />
                                    </div>
                                    
                                    {/* LISTA DE RESULTADOS SUSPENSA */}
                                    {busca && opcoesFiltradas.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-bg border border-soft rounded-xl mt-2 shadow-xl z-50 overflow-hidden">
                                            {opcoesFiltradas.map((op, i) => (
                                                <button 
                                                    key={i} 
                                                    type="button"
                                                    onClick={() => adicionarParticipante(op)}
                                                    className="w-full text-left px-4 py-3 text-xs font-bold text-fg hover:bg-soft/30 flex justify-between items-center transition-colors border-b border-soft last:border-0"
                                                >
                                                    {op.nome}
                                                    <span className="text-[8px] font-black tracking-widest uppercase text-muted bg-soft/30 px-2 py-1 rounded-md">{op.tipo}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* TAGS DOS SELECIONADOS */}
                                {selecionados.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {selecionados.map((s, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-figueira/10 border border-figueira/20 text-figueira px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                                <span>{s.nome}</span>
                                                <button type="button" onClick={() => removerParticipante(s)} className="hover:text-red-500 transition-colors"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* PESSOAS EXTERNAS */}
                                <div className="pt-2 border-t border-soft">
                                    <label className="text-[9px] font-bold uppercase text-muted tracking-widest ml-1 mb-1 block">Alguém de fora? (Separado por vírgulas)</label>
                                    <input name="externos" placeholder="Ex: Pastor Carlos, Banda XYZ" className="w-full bg-bg border border-soft rounded-xl px-4 py-3 text-xs font-medium text-fg focus:border-figueira outline-none" />
                                </div>
                            </div>
                            {/* ------------------------------------- */}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><CalendarDays size={12}/> Data</label>
                                    <input type="date" name="data" required min={new Date().toISOString().split('T')[0]} className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Clock size={12}/> Início</label>
                                    <input type="time" name="hora_inicio" required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Clock size={12}/> Fim</label>
                                    <input type="time" name="hora_fim" required className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><AlignLeft size={12}/> Observações Adicionais</label>
                                <textarea name="observacoes" rows={2} placeholder="Detalhes do encontro..." className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-medium text-fg focus:border-figueira outline-none resize-none" />
                            </div>

                            <div className="pt-4 border-t border-soft mt-6">
                                <button disabled={isPending} type="submit" className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Marcar..." : "Confirmar Marcação"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
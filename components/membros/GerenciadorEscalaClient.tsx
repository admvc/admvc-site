'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Calendar as CalendarIcon, User, Star, Sparkles } from 'lucide-react'
// Ajustei o import para o caminho que definimos anteriormente (membros em vez de admin)
import { criarEscalaAction, deletarEscalaAction } from '@/actions/escalas-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

export default function GerenciadorEscalaClient({ deptoId, integrantes, eventos, escalasIniciais }: any) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [escalas, setEscalas] = useState(escalasIniciais);
    const [loading, setLoading] = useState(false);

    // ESTADOS PARA O PREENCHIMENTO AUTOMÁTICO
    const [membroSelecionadoId, setMembroSelecionadoId] = useState('');
    const [funcaoInput, setFuncaoInput] = useState('');
    const [sugestoes, setSugestoes] = useState<string[]>([]);

    // Efeito: Sempre que mudar o membro, processa as funções dele
    useEffect(() => {
        if (membroSelecionadoId) {
            const integrante = integrantes.find((i: any) => i.membro.id === parseInt(membroSelecionadoId));

            if (integrante && integrante.funcao) {
                // 1. Divide a string de funções (ex: "Guitarra • Vocal" vira ["Guitarra", "Vocal"])
                const listaFuncoes = integrante.funcao
                    .split(/[•,/]+/)
                    .map((f: string) => f.trim())
                    .filter((f: string) => f.length > 0);

                setSugestoes(listaFuncoes);

                // 2. Pré-preenche o input com a primeira função da lista
                setFuncaoInput(listaFuncoes[0] || '');
            } else {
                setSugestoes([]);
                setFuncaoInput('');
            }
        } else {
            setMembroSelecionadoId('');
            setSugestoes([]);
            setFuncaoInput('');
        }
    }, [membroSelecionadoId, integrantes]);

    async function handleAddEscala(formData: FormData) {
        setLoading(true);
        const result = await criarEscalaAction(formData);
        if (result.ok) {
            setMembroSelecionadoId('');
            setFuncaoInput('');
            window.location.reload();
        } else {
            toast(result.error || "Erro ao salvar escala", 'erro');
        }
        setLoading(false);
    }

    return (
        <div className="grid lg:grid-cols-12 gap-8">

            {/* FORMULÁRIO DE CRIAÇÃO */}
            <div className="lg:col-span-4">
                <form action={handleAddEscala} className="bg-bg2 border border-soft p-8 rounded-[2.5rem] sticky top-10 space-y-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-figueira" />
                        <h3 className="text-lg font-black uppercase italic text-fg tracking-tighter">Nova Escala</h3>
                    </div>

                    <input type="hidden" name="departamento_id" value={deptoId} />

                    <div className="space-y-4">
                        {/* SELECT EVENTO */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-muted ml-2">Evento / Culto</label>
                            <select name="evento_id" required className="...">
                                <option value="">Selecione o culto...</option>
                                {eventos && eventos.length > 0 ? (
                                    eventos.map((ev: any) => (
                                        <option key={ev.id} value={ev.id}>
                                            {new Date(ev.data).toLocaleDateString('pt-BR')} - {ev.nome}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>Nenhum culto futuro encontrado</option>
                                )}
                            </select>
                        </div>

                        {/* SELECT MEMBRO */}
                        <div>
                            <label className="text-[10px] font-black uppercase text-muted ml-2">Membro da Equipe</label>
                            <select
                                name="membro_id"
                                required
                                value={membroSelecionadoId}
                                onChange={(e) => setMembroSelecionadoId(e.target.value)}
                                className="w-full bg-bg border border-soft p-4 rounded-2xl text-xs font-bold outline-none focus:border-figueira transition-all"
                            >
                                <option value="">Quem vais escalar?</option>
                                {integrantes.map((i: any) => (
                                    <option key={i.membro.id} value={i.membro.id}>
                                        {i.membro.first_name} {i.membro.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* INPUT FUNÇÃO COM SUGESTÕES */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-black uppercase text-muted ml-2">Função na Escala</label>
                                <input
                                    name="funcao"
                                    required
                                    value={funcaoInput}
                                    onChange={(e) => setFuncaoInput(e.target.value)}
                                    placeholder="Ex: Ministro, Violão..."
                                    className="w-full bg-bg border border-soft p-4 rounded-2xl text-xs font-bold outline-none focus:border-figueira transition-all"
                                />
                            </div>

                            {/* BOTÕES DE SUGESTÃO (Aparecem se o membro tiver funções) */}
                            {sugestoes.length > 0 && (
                                <div className="flex flex-wrap gap-2 px-1">
                                    {sugestoes.map((sug) => (
                                        <button
                                            key={sug}
                                            type="button"
                                            onClick={() => setFuncaoInput(sug)}
                                            className={`text-[8px] font-black uppercase px-3 py-2 rounded-xl border transition-all ${funcaoInput === sug
                                                ? 'bg-figueira border-figueira text-white shadow-md'
                                                : 'bg-bg border-soft text-muted hover:border-figueira/40'
                                                }`}
                                        >
                                            {sug}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-fg text-bg py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-figueira transition-all disabled:opacity-50 shadow-xl active:scale-95"
                        >
                            {loading ? 'A processar...' : 'Confirmar Escala'}
                        </button>
                    </div>
                </form>
            </div>

            {/* LISTAGEM DAS ESCALAS FUTURAS */}
            <div className="lg:col-span-8 space-y-4">
                <div className="flex justify-between items-end mb-2 px-4 md:px-0">
                    <div>
                        <h3 className="text-lg font-black uppercase italic text-fg leading-none tracking-tighter">Escalas Agendadas</h3>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Próximos compromissos do setor</p>
                    </div>
                </div>

                {escalas.length === 0 && (
                    <div className="p-20 border-2 border-dashed border-soft rounded-[3rem] text-center bg-bg2/30">
                        <p className="text-xs font-bold text-muted uppercase tracking-widest italic opacity-50">Nenhuma escala definida para este período.</p>
                    </div>
                )}

                {escalas.map((esc: any) => (
                    <div key={esc.id} className="bg-bg2 border border-soft p-6 rounded-2xl flex items-center justify-between group hover:border-figueira/30 transition-all shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className="bg-soft p-4 rounded-2xl text-center min-w-[70px] border border-soft/50">
                                <span className="block text-[10px] font-black text-figueira uppercase">
                                    {new Date(esc.evento.data).toLocaleDateString('pt-BR', { month: 'short' })}
                                </span>
                                <span className="block text-xl font-black text-fg">
                                    {new Date(esc.evento.data).toLocaleDateString('pt-BR', { day: '2-digit' })}
                                </span>
                            </div>

                            <div>
                                <h4 className="font-black text-sm uppercase text-fg leading-none mb-2">
                                    {esc.membro.first_name} {esc.membro.last_name}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted uppercase bg-soft px-2 py-1 rounded-lg border border-soft/50">{esc.evento.nome}</span>
                                    <span className="text-[9px] font-black text-figueira uppercase tracking-[0.15em] border-l-2 border-soft pl-3 italic">{esc.funcao}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={async () => {
                                const ok = await confirmar({ mensagem: `Remover ${esc.membro.first_name} desta escala?`, tipo: 'perigo' })
                                if (ok) {
                                    await deletarEscalaAction(esc.id);
                                    window.location.reload();
                                }
                            }}
                            className="p-3 text-muted hover:text-red-500 hover:bg-red-50 rounded-xl transition-all md:opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}
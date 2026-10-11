// components/admin/GestaoEscalasDepto.tsx
'use client'
import { useState, useMemo } from 'react'
import FormCriarEscala from './FormCriarEscala'
import { Calendar, Trash2, Clock, User, Zap, ChevronRight, LayoutList } from 'lucide-react'
import { useConfirm } from '@/components/ui/ConfirmDialog'

export default function GestaoEscalasDepto({ departamento, eventos, escalasIniciais }: any) {
    const confirmar = useConfirm()
    const [escalas, setEscalas] = useState(escalasIniciais)

    // --- LÓGICA DE AGRUPAMENTO POR EVENTO ---
    const escalasPorEvento = useMemo(() => {
        const grupos: any = {};
        escalas.forEach((esc: any) => {
            const evId = esc.evento.id;
            if (!grupos[evId]) {
                grupos[evId] = {
                    info: esc.evento,
                    voluntarios: []
                };
            }
            grupos[evId].voluntarios.push(esc);
        });
        // Transforma em array e ordena por data
        return Object.values(grupos).sort((a: any, b: any) =>
            new Date(a.info.data).getTime() - new Date(b.info.data).getTime()
        );
    }, [escalas]);

    async function deletarEscala(id: number) {
        const ok = await confirmar({ mensagem: 'Remover voluntário desta escala?', tipo: 'perigo' })
        if (!ok) return;
        const res = await fetch(`/api/escalas/deletar?id=${id}`, { method: 'DELETE' });
        if (res.ok) {
            setEscalas(escalas.filter((e: any) => e.id !== id));
        }
    }

    return (
        <div className="grid lg:grid-cols-12 gap-10 items-start">

            {/* COLUNA ESQUERDA: LISTAGEM PROFISSIONAL (7 Colunas) */}
            <div className="lg:col-span-7 space-y-8">
                <div className="flex items-center justify-between border-b border-soft pb-6">
                    <div>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                            Cronograma <span className="text-figueira">{departamento.nome}</span>
                        </h3>
                        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                            Gestão de equipes por evento
                        </p>
                    </div>
                    <LayoutList size={20} className="text-soft" />
                </div>

                <div className="space-y-10">
                    {escalasPorEvento.length > 0 ? escalasPorEvento.map((grupo: any) => (
                        <div key={grupo.info.id} className="relative pl-8 border-l-2 border-soft hover:border-figueira transition-colors">
                            {/* Marcador de Data Lateral */}
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-soft border-4 border-bg group-hover:bg-figueira transition-all"></div>

                            {/* Cabeçalho do Evento */}
                            <div className="mb-6">
                                <span className="text-[9px] font-black text-figueira uppercase tracking-[0.3em]">
                                    {new Date(grupo.info.data).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </span>
                                <h4 className="text-xl font-black uppercase italic text-fg tracking-tighter">
                                    {new Date(grupo.info.data).toLocaleDateString('pt-BR')} — {grupo.info.nome}
                                </h4>
                            </div>

                            {/* Grid de Voluntários do Evento */}
                            <div className="grid gap-3">
                                {grupo.voluntarios.map((v: any) => (
                                    <div key={v.id} className="group flex items-center justify-between bg-bg2 border border-soft p-4 rounded-2xl hover:bg-white hover:shadow-xl transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-full bg-soft flex items-center justify-center text-[10px] font-black text-muted group-hover:bg-figueira group-hover:text-white transition-colors">
                                                {v.membro.first_name[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase italic text-fg">
                                                    {v.membro.first_name} {v.membro.last_name}
                                                </p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[9px] font-bold text-figueira uppercase bg-figueira/5 px-2 py-0.5 rounded-md">
                                                        {v.funcao}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-muted uppercase flex items-center gap-1">
                                                        <Clock size={10} /> {v.horario}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deletarEscala(v.id)}
                                            className="p-2.5 text-soft hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="py-20 text-center border-2 border-dashed border-soft rounded-[3rem]">
                            <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">Nenhuma escala definida.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* COLUNA DIREITA: FORMULÁRIO (5 Colunas) */}
            <aside className="lg:col-span-5 sticky top-10">
                <div className="bg-fg p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                Nova <span className="text-figueira">Escala</span>
                            </h2>
                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em]">Preencha os dados abaixo</p>
                        </div>

                        <FormCriarEscala
                            departamento={departamento}
                            eventos={eventos}
                            onSucesso={(nova: any) => {
                                setEscalas([...escalas, nova]);
                            }}
                        />
                    </div>
                </div>
            </aside>
        </div>
    )
}
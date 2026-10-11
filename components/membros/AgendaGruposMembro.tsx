'use client'

import { Users, MapPin, Clock, CalendarDays, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const diasSemanaMap: Record<string, number> = {
    'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2,
    'Quarta-feira': 3, 'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
};

function getProximoEncontro(diaStr: string, horario: string) {
    if (!diaStr || !horario) return null;

    const today = new Date();
    const targetDay = diasSemanaMap[diaStr];

    if (targetDay === undefined) return null;

    let nextDate = new Date(today);
    let diasFaltando = (targetDay + 7 - today.getDay()) % 7;
    nextDate.setDate(today.getDate() + diasFaltando);

    const [horas, minutos] = horario.split(':').map(Number);
    nextDate.setHours(horas, minutos, 0, 0);

    if (diasFaltando === 0 && nextDate < today) {
        nextDate.setDate(nextDate.getDate() + 7);
    }

    return nextDate;
}

export default function AgendaGruposMembro({ gruposMembro }: { gruposMembro: any[] }) {
    if (!gruposMembro || gruposMembro.length === 0) return null;

    return (
        <section className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 w-full">

            <div className="flex items-center gap-3 border-b border-soft pb-4">
                <div className="bg-blue-500/10 p-2 rounded-xl text-blue-600">
                    <Users size={18} />
                </div>
                <div>
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-none">
                        Agenda do PG
                    </h3>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted mt-1">
                        Os teus próximos encontros
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {gruposMembro.map((grupo) => {
                    const dataProximo = getProximoEncontro(grupo.dia_semana, grupo.horario);
                    if (!dataProximo) return null;

                    const diaFormatado = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: 'short' }).format(dataProximo);
                    const eHoje = dataProximo.toDateString() === new Date().toDateString();

                    return (
                        <div key={grupo.id} className="group bg-bg2 border border-soft hover:border-blue-300 p-5 rounded-2xl transition-all shadow-sm relative overflow-hidden flex flex-col justify-between w-full">

                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>

                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest bg-bg border border-soft px-2 py-1 rounded-md text-muted shadow-sm">
                                            {grupo.categoria || 'Grupo'}
                                        </span>
                                        {eHoje && (
                                            <span className="text-[8px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-md shadow-sm animate-pulse">
                                                É Hoje!
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[9px] font-black uppercase text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg">
                                        <CalendarDays size={12} /> {diaFormatado}
                                    </span>
                                </div>

                                <h4 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-none">
                                    {grupo.nome}
                                </h4>

                                <div className="mt-3 space-y-1.5">
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                        <Clock size={12} className="text-blue-500 shrink-0" />
                                        {grupo.dia_semana} às {grupo.horario}
                                    </p>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                                        <MapPin size={12} className="text-blue-500 shrink-0" />
                                        <span className="truncate">{grupo.endereco || 'Local a definir'} {grupo.numero && `, ${grupo.numero}`}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="mt-5 pt-3 border-t border-soft">
                                <Link href={`/grupos/gestao/${grupo.id}`} className="flex items-center justify-between group-hover:text-blue-600 transition-colors">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-fg group-hover:text-blue-600 transition-colors">
                                        Acessar Grupo
                                    </span>
                                    <ArrowRight size={14} className="text-muted group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
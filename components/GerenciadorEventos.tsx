"use client";

import { useState } from "react";
import { salvarEvento } from "@/actions/admin-actions";
import { useToast } from '@/components/ui/ConfirmDialog';
import { formatInTimeZone } from 'date-fns-tz';

export default function GerenciadorEventos({ eventos }: { eventos: any[] }) {
    const toast = useToast();
    const [modo, setModo] = useState<'lista' | 'form'>('lista');
    const [eventoAtual, setEventoAtual] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSalvando(true);
        const formData = new FormData(e.currentTarget);
        if (eventoAtual?.id) formData.append("id", eventoAtual.id.toString());

        const res = await salvarEvento(formData);
        if (res.sucesso) {
            setModo('lista');
            window.location.reload();
        } else {
            toast("Erro ao salvar evento.", 'erro');
        }
        setSalvando(false);
    };

    return (
        <section className="bg-bg2 p-8 rounded-[3rem] border border-soft shadow-xl space-y-8">
            <header className="flex justify-between items-center border-b border-soft pb-6">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-fg">
                    {modo === 'lista' ? "Calendário de Eventos" : "Novo Evento"}
                </h2>
                <button
                    onClick={() => { setEventoAtual(null); setModo(modo === 'lista' ? 'form' : 'lista'); }}
                    className="bg-fg text-bg px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-figueira transition-all"
                >
                    {modo === 'lista' ? "+ Criar Evento" : "← Voltar"}
                </button>
            </header>

            {modo === 'lista' ? (
                <div className="grid gap-4">
                    {eventos.map((ev) => (
                        <div key={ev.id} className="flex justify-between items-center p-6 bg-bg border border-soft rounded-3xl hover:border-figueira/50 transition-all">
                            <div>
                                <span className="text-[10px] font-black text-figueira uppercase tracking-widest">
                                    {new Date(ev.data).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </span>
                                <h3 className="text-xl font-black uppercase italic text-fg leading-none mt-1">{ev.nome}</h3>
                                <p className="text-[10px] text-muted font-bold uppercase mt-1">🕒 {formatInTimeZone(new Date(ev.data), 'Europe/Lisbon', 'HH:mm')}</p>
                            </div>
                            <button
                                onClick={() => { setEventoAtual(ev); setModo('form'); }}
                                className="px-6 py-2 border border-soft rounded-xl text-[9px] font-black uppercase hover:bg-fg hover:text-bg transition-all"
                            >
                                Detalhes
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6 animate-in zoom-in-95">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-2">Nome do Evento</label>
                            <input name="nome" defaultValue={eventoAtual?.nome} required placeholder="Ex: Culto de Celebração" className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-2">Data e Hora</label>
                            <input
                                name="data"
                                type="datetime-local"
                                required
                                defaultValue={eventoAtual ? new Date(eventoAtual.data).toISOString().slice(0, 16) : ''}
                                className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[9px] font-black text-muted uppercase tracking-widest ml-2">Descrição Opcional</label>
                            <textarea name="descricao" defaultValue={eventoAtual?.descricao} rows={3} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm outline-none focus:border-figueira resize-none" />
                        </div>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button disabled={salvando} type="submit" className="bg-figueira text-white px-12 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all">
                            {salvando ? "A Gravar..." : "Confirmar Evento"}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
}
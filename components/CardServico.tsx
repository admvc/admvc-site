"use client";
import { confirmarPresenca } from "@/actions/membro-actions";
import { useState } from "react";

export default function CardServico({ escala }: { escala: any }) {
    const [status, setStatus] = useState(escala.confirmado);

    const handleToggle = async () => {
        const novoStatus = !status;
        setStatus(novoStatus); // UI otimista
        const res = await confirmarPresenca(escala.id, novoStatus);
        if (!res.sucesso) setStatus(!novoStatus); // Reverte se falhar
    };

    const dataEvento = new Date(escala.evento.data);

    return (
        <div className={`p-6 rounded-2xl border transition-all ${status ? 'bg-figueira/5 border-figueira/20' : 'bg-bg border-soft shadow-lg'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-figueira">
                        {dataEvento.toLocaleDateString('pt-PT', { weekday: 'long' })}
                    </span>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-fg">
                        {escala.evento.nome}
                    </h3>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-fg italic leading-none">
                        {dataEvento.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p className="text-[8px] font-bold uppercase text-muted">Hora de Início</p>
                </div>
            </div>

            <div className="flex items-center gap-4 mb-6 py-4 border-y border-soft/50">
                <div className="w-10 h-10 bg-fg text-bg rounded-full flex items-center justify-center font-black text-xs uppercase">
                    {escala.departamento.nome.substring(0, 2)}
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-fg">{escala.funcao}</p>
                    <p className="text-[9px] font-medium text-muted uppercase tracking-widest">{escala.departamento.nome}</p>
                </div>
            </div>

            <button
                onClick={handleToggle}
                className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${status
                        ? 'bg-figueira text-white shadow-figueira/20 shadow-lg'
                        : 'bg-soft text-fg hover:bg-fg hover:text-bg'
                    }`}
            >
                {status ? "✓ Presença Confirmada" : "Confirmar Minha Presença"}
            </button>
        </div>
    );
}
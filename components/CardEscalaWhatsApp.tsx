"use client";

import { useState } from "react";
import { useToast } from '@/components/ui/ConfirmDialog';

export default function CardEscalaWhatsApp({ evento, departamento, escalas }: any) {
    const toast = useToast();
    const dataFormatada = new Date(evento.data).toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: '2-digit',
        month: 'long'
    });

    // Função para copiar o texto formatado para o clipboard
    const copiarTexto = () => {
        const textoBase = `*ESCALA: ${evento.nome.toUpperCase()}* \n` +
            `📅 ${dataFormatada} \n` +
            `🏛️ Departamento: *${departamento.nome}* \n\n` +
            `━━━━━━━━━━━━━━━\n` +
            escalas.map((e: any) => `• *${e.funcao}:* ${e.membro.first_name} ${e.membro.last_name || ''}`).join('\n') +
            `\n━━━━━━━━━━━━━━━\n` +
            `_Por favor, confirmem a vossa presença!_ 🙏`;

        navigator.clipboard.writeText(textoBase);
        toast("Escala copiada para o WhatsApp!", 'sucesso');
    };

    return (
        <div className="bg-white border-2 border-figueira/20 rounded-[2.5rem] p-8 shadow-2xl max-w-md mx-auto my-8">
            <div className="text-center space-y-2 mb-6">
                <span className="bg-figueira/10 text-figueira text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                    Escala Confirmada
                </span>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-fg">
                    {evento.nome}
                </h3>
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">
                    {dataFormatada}
                </p>
            </div>

            <div className="bg-bg2 rounded-3xl p-6 border border-soft space-y-4">
                <h4 className="text-xs font-black text-figueira uppercase border-b border-soft pb-2">
                    {departamento.nome}
                </h4>

                <div className="space-y-3">
                    {escalas.map((e: any) => (
                        <div key={e.id} className="flex flex-col">
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                                {e.funcao}
                            </span>
                            <span className="text-sm font-bold text-fg">
                                {e.membro.first_name} {e.membro.last_name}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-3">
                <button
                    onClick={copiarTexto}
                    className="bg-fg text-bg py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all flex items-center justify-center gap-2"
                >
                    <span>复制</span> Copiar para WhatsApp
                </button>
                <p className="text-[8px] text-center text-muted font-bold uppercase">
                    Dica: Pode tirar um print desta tela para enviar a imagem
                </p>
            </div>
        </div>
    );
}
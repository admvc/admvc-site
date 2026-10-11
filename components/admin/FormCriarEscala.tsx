// components/admin/FormCriarEscala.tsx
'use client'

import { useState, useMemo } from 'react'
import { Save, Clock, User, CalendarDays, CheckCircle2, Zap } from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'

interface FormProps {
    departamento: any;
    eventos: any[];
    onSucesso?: (novaEscala: any) => void;
}

export default function FormCriarEscala({ departamento, eventos, onSucesso }: FormProps) {
    const toast = useToast()
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState(false)

    // Estado para saber qual membro foi selecionado e filtrar as funções dele
    const [membroSelecionadoId, setMembroSelecionadoId] = useState<string>("")

    // 1. Gera lista de nomes únicos para o primeiro Select
    const listaVoluntarios = useMemo(() => {
        const nomes = new Map();
        departamento?.integrantes?.forEach((i: any) => {
            nomes.set(i.membro.id, {
                id: i.membro.id,
                nome: `${i.membro.first_name} ${i.membro.last_name}`
            });
        });
        return Array.from(nomes.values());
    }, [departamento]);

    // 2. Filtra as funções que ESTE membro específico tem NESTE departamento
    const funcoesDisponiveis = useMemo(() => {
        if (!membroSelecionadoId) return [];
        return departamento?.integrantes
            ?.filter((i: any) => i.membro_id === parseInt(membroSelecionadoId))
            ?.map((i: any) => i.funcao);
    }, [membroSelecionadoId, departamento]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const formRef = e.currentTarget;

        const data = {
            eventoId: parseInt(formData.get('eventoId') as string),
            membroId: parseInt(formData.get('membroId') as string),
            departamentoId: departamento.id,
            funcao: formData.get('funcao'),
            horario: formData.get('horario') || '19:30',
        }

        try {
            const res = await fetch('/api/escalas/criar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                const novaEscala = await res.json()
                setFeedback(true)
                formRef.reset()
                setMembroSelecionadoId("") // Limpa a seleção
                if (onSucesso) onSucesso(novaEscala)
                setTimeout(() => setFeedback(false), 3000)
            } else {
                toast('Erro ao salvar escala.', 'erro')
            }
        } catch (error) {
            toast('Erro de conexão.', 'erro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">

            {/* SELEÇÃO DE EVENTO */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">
                    <CalendarDays size={12} /> Data do Evento
                </label>
                <select name="eventoId" required className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-figueira appearance-none cursor-pointer">
                    <option value="" className="bg-fg">Selecione o dia...</option>
                    {eventos?.map((ev: any) => (
                        <option key={ev.id} value={ev.id} className="bg-fg">
                            {new Date(ev.data).toLocaleDateString('pt-BR')} - {ev.nome}
                        </option>
                    ))}
                </select>
            </div>

            {/* SELEÇÃO DE VOLUNTÁRIO */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">
                    <User size={12} /> Voluntário
                </label>
                <select
                    name="membroId"
                    required
                    value={membroSelecionadoId}
                    onChange={(e) => setMembroSelecionadoId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-figueira appearance-none cursor-pointer"
                >
                    <option value="" className="bg-fg">Quem vai servir?</option>
                    {listaVoluntarios.map((v: any) => (
                        <option key={v.id} value={v.id} className="bg-fg">{v.nome}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* SELEÇÃO DE FUNÇÃO CONTEXTUAL */}
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">
                        <Zap size={12} /> Função
                    </label>
                    <select
                        name="funcao"
                        required
                        disabled={!membroSelecionadoId}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-figueira appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <option value="" className="bg-fg">Selecione...</option>
                        {funcoesDisponiveis.map((f: string, idx: number) => (
                            <option key={idx} value={f} className="bg-fg">{f}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 ml-1">Horário</label>
                    <input name="horario" type="text" defaultValue="19:30" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-figueira" />
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-2xl ${feedback ? 'bg-green-500 text-white' : 'bg-white text-figueira hover:bg-figueira hover:text-white'
                    }`}
            >
                {loading ? 'Processando...' : feedback ? <><CheckCircle2 size={16} /> Sucesso!</> : <><Save size={16} /> Confirmar Escala</>}
            </button>
        </form>
    )
}
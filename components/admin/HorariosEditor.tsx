'use client'

import { useState } from 'react'
import { Plus, X, Save, Loader2, Clock } from 'lucide-react'
import { atualizarHorariosDisponiveis, type HorarioDisponivel } from '@/actions/agenda-actions'

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function HorariosEditor({
    agendaId,
    horariosIniciais
}: {
    agendaId: number
    horariosIniciais: HorarioDisponivel[]
}) {
    const [horarios, setHorarios] = useState<HorarioDisponivel[]>(horariosIniciais || [])
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    function adicionarSlot() {
        setHorarios([...horarios, { dia_semana: 1, hora_inicio: '09:00', hora_fim: '12:00' }])
    }

    function removerSlot(idx: number) {
        setHorarios(horarios.filter((_, i) => i !== idx))
    }

    function atualizarSlot(idx: number, campo: keyof HorarioDisponivel, valor: string | number) {
        setHorarios(horarios.map((h, i) => i === idx ? { ...h, [campo]: valor } : h))
    }

    async function guardar() {
        setSaving(true)
        setMsg('')
        const res = await atualizarHorariosDisponiveis(agendaId, horarios)
        setSaving(false)
        setMsg(res.ok ? 'Guardado!' : (res.error || 'Erro'))
        setTimeout(() => setMsg(''), 4000)
    }

    return (
        <div className="space-y-3">
            {horarios.length === 0 && (
                <p className="text-[9px] font-bold text-muted uppercase tracking-widest italic">
                    Nenhum horário definido.
                </p>
            )}

            {horarios.map((h, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                    {/* Dia da semana */}
                    <select
                        value={h.dia_semana}
                        onChange={e => atualizarSlot(i, 'dia_semana', Number(e.target.value))}
                        className="bg-bg border border-soft rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-fg outline-none focus:border-figueira"
                    >
                        {DIAS_SEMANA.map((dia, idx) => (
                            <option key={idx} value={idx}>{dia}</option>
                        ))}
                    </select>

                    {/* Hora início */}
                    <input
                        type="time"
                        value={h.hora_inicio}
                        onChange={e => atualizarSlot(i, 'hora_inicio', e.target.value)}
                        className="bg-bg border border-soft rounded-xl px-2 py-1.5 text-[10px] font-bold text-fg outline-none focus:border-figueira"
                    />

                    <span className="text-[9px] text-muted font-bold">até</span>

                    {/* Hora fim */}
                    <input
                        type="time"
                        value={h.hora_fim}
                        onChange={e => atualizarSlot(i, 'hora_fim', e.target.value)}
                        className="bg-bg border border-soft rounded-xl px-2 py-1.5 text-[10px] font-bold text-fg outline-none focus:border-figueira"
                    />

                    {/* Remover */}
                    <button
                        onClick={() => removerSlot(i)}
                        className="w-6 h-6 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                        title="Remover horário"
                    >
                        <X size={10} strokeWidth={3} />
                    </button>
                </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
                <button
                    onClick={adicionarSlot}
                    className="flex items-center gap-1.5 bg-bg border border-soft rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira hover:border-figueira/30 transition-all"
                >
                    <Plus size={10} /> Adicionar
                </button>

                <button
                    onClick={guardar}
                    disabled={saving}
                    className="flex items-center gap-1.5 bg-figueira/10 border border-figueira/20 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-figueira hover:bg-figueira hover:text-white transition-all disabled:opacity-50"
                >
                    {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                    Guardar
                </button>

                {msg && (
                    <span className={`text-[9px] font-bold uppercase tracking-widest ${msg === 'Guardado!' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {msg}
                    </span>
                )}
            </div>
        </div>
    )
}

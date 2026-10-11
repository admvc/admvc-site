

'use client'
import { gerarEventosLoteAction } from '@/actions/admin-actions' // Ajuste o caminho se necessário
import { useState } from 'react'
import { CalendarDays, X, Save, Loader2, Clock, Repeat, Type, Filter } from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'


export default function ModalGerarEventosLote() {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)

    async function handleAction(formData: FormData) {
        setIsPending(true)
        const res = await gerarEventosLoteAction(formData)
        setIsPending(false)

        if (res.ok) {
            setIsOpen(false)
            toast(`Sucesso! Foram gerados ${res.totalCriado} eventos na sua agenda.`, 'sucesso')
        } else {
            toast(res.error || "Erro ao gerar eventos.", 'erro')
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-figueira text-white px-5 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95"
            >
                <Repeat size={14} />
                Gerar Cultos Contínuos
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300">

                        {/* HEADER */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Agenda Automática</span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Eventos <span className="text-muted/20">Lote.</span></h3>
                            </div>
                            <button
                                onClick={() => !isPending && setIsOpen(false)}
                                className="p-4 bg-soft text-fg rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                            >
                                <X size={20} strokeWidth={3} />
                            </button>
                        </div>

                        {/* FORMULÁRIO */}
                        <form action={handleAction} className="p-8 space-y-6">

                            {/* NOME DO EVENTO */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Type size={12} /> Nome do Evento
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    required
                                    placeholder="Ex: Culto de Celebração"
                                    className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* DIA DA SEMANA */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <CalendarDays size={12} /> Dia
                                    </label>
                                    <select
                                        name="diaDaSemana"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="0">Domingos</option>
                                        <option value="1">Segundas-feiras</option>
                                        <option value="2">Terças-feiras</option>
                                        <option value="3">Quartas-feiras</option>
                                        <option value="4">Quintas-feiras</option>
                                        <option value="5">Sextas-feiras</option>
                                        <option value="6">Sábados</option>
                                    </select>
                                </div>

                                {/* FREQUÊNCIA (NOVO) */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Filter size={12} /> Frequência
                                    </label>
                                    <select
                                        name="frequencia"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="TODAS">Toda a semana</option>
                                        <option value="1">1º do Mês</option>
                                        <option value="2">2º do Mês</option>
                                        <option value="3">3º do Mês</option>
                                        <option value="4">4º do Mês</option>
                                        <option value="ULTIMO">Último do Mês</option>
                                    </select>
                                </div>

                                {/* HORÁRIO */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Clock size={12} /> Horário Fixo
                                    </label>
                                    <input
                                        type="time"
                                        name="horario"
                                        required
                                        defaultValue="10:00"
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none cursor-pointer"
                                    />
                                </div>

                                {/* DURAÇÃO */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                        <Repeat size={12} /> Período
                                    </label>
                                    <select
                                        name="meses"
                                        required
                                        className="w-full bg-bg2 border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="1">1 mês</option>
                                        <option value="3">3 meses</option>
                                        <option value="6">6 meses</option>
                                        <option value="12">1 ano</option>
                                    </select>
                                </div>
                            </div>

                            {/* BOTÃO SALVAR */}
                            <div className="pt-4 border-t border-soft mt-6">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Gerar Agenda..." : "Gerar Cultos na Base de Dados"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
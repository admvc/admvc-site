'use client'

import { useState } from 'react'
import { CalendarDays, X, Save, Loader2, Clock, Repeat, Type, Filter, CalendarPlus, Calendar, AlignLeft } from 'lucide-react'
import { criarEventoUnificadoAction } from '@/actions/admin-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function ModalNovoEvento({ congregacoes = [] }: { congregacoes?: { id: number; nome: string; cidade: string }[] }) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const [tipoEvento, setTipoEvento] = useState<'UNICO' | 'CONTINUO'>('UNICO')

    async function handleAction(formData: FormData) {
        setIsPending(true)
        formData.append('tipo', tipoEvento)

        const res = await criarEventoUnificadoAction(formData)
        setIsPending(false)

        if (res.ok) {
            setIsOpen(false)
            toast(`Sucesso! ${res.totalCriado} evento(s) agendado(s).`, 'sucesso')
            // Opcional: window.location.reload() para atualizar a tabela por trás se necessário
        } else {
            toast(res.error || "Erro ao gerar eventos.", 'erro')
        }
    }

    return (
        <>
            {/* BOTÃO TRIGGER */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-3 bg-figueira text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira/90 transition-all shadow-lg shadow-figueira/20 active:scale-95 w-full sm:w-auto justify-center"
            >
                <CalendarPlus size={16} />
                Agendar Evento
            </button>

            {/* MODAL (OVERLAY) */}
            {isOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">

                    {/* CAIXA DO MODAL */}
                    <div className="bg-bg w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-soft flex flex-col animate-in zoom-in-95 duration-300 my-auto">

                        {/* CABEÇALHO */}
                        <div className="p-8 border-b border-soft flex justify-between items-center bg-bg2 relative shrink-0">
                            <div className="space-y-1">
                                <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em] flex items-center gap-2">
                                    <CalendarPlus size={12} /> Criador de Agendas
                                </span>
                                <h3 className="text-3xl font-black italic uppercase tracking-tighter text-fg">
                                    Novo <span className="text-muted/30">Evento.</span>
                                </h3>
                            </div>
                            <button
                                onClick={() => !isPending && setIsOpen(false)}
                                className="w-12 h-12 flex items-center justify-center bg-bg border border-soft text-muted rounded-2xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all active:scale-90"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* TOGGLE TIPO DE EVENTO */}
                        <div className="p-8 pb-0 shrink-0">
                            <div className="flex bg-bg2 p-2 rounded-2xl border border-soft shadow-inner">
                                <button
                                    type="button"
                                    onClick={() => setTipoEvento('UNICO')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${tipoEvento === 'UNICO' ? 'bg-figueira text-white shadow-md' : 'text-muted hover:text-fg'}`}
                                >
                                    <Calendar size={14} /> Evento Único
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipoEvento('CONTINUO')}
                                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${tipoEvento === 'CONTINUO' ? 'bg-figueira text-white shadow-md' : 'text-muted hover:text-fg'}`}
                                >
                                    <Repeat size={14} /> Culto Regular (Contínuo)
                                </button>
                            </div>
                        </div>

                        {/* FORMULÁRIO (COM SCROLL INTERNO SE NECESSÁRIO) */}
                        <form action={handleAction} className="p-8 space-y-8 flex-1 overflow-y-auto custom-scrollbar">

                            {/* BLOCO 1: INFORMAÇÕES BÁSICAS */}
                            <div className="space-y-6 bg-bg2 p-8 rounded-[2.5rem] border border-soft shadow-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="space-y-2 sm:col-span-2">
                                        <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                            <Type size={12} className="text-figueira" /> Título / Nome do Evento
                                        </label>
                                        <input
                                            type="text"
                                            name="nome"
                                            required
                                            placeholder="Ex: Culto de Celebração"
                                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-1">
                                        <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                            <Clock size={12} className="text-figueira" /> Horário
                                        </label>
                                        <input
                                            type="time"
                                            name="horario"
                                            required
                                            defaultValue="10:00"
                                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none cursor-pointer shadow-sm transition-all"
                                        />
                                    </div>
                                </div>

                                {/* DESCRIÇÃO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                        <AlignLeft size={12} className="text-figueira" /> Descrição / Tema (Opcional)
                                    </label>
                                    <textarea
                                        name="descricao"
                                        rows={2}
                                        placeholder="Breve resumo ou tema do evento..."
                                        className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg focus:border-figueira outline-none resize-none shadow-sm transition-all leading-relaxed"
                                    />
                                </div>

                                {/* TIPO DE EVENTO */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                        <Filter size={12} className="text-figueira" /> Tipo de Evento
                                    </label>
                                    <select
                                        name="tipo_evento"
                                        defaultValue="CULTO_REGULAR"
                                        className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none shadow-sm transition-all"
                                    >
                                        <option value="CULTO_REGULAR">Culto Regular</option>
                                        <option value="CULTO_ESPECIAL">Culto Especial</option>
                                        <option value="CULTO_RUA">Culto de Rua</option>
                                        <option value="CONVIVIO">Convivio</option>
                                        <option value="REUNIAO">Reuniao</option>
                                        <option value="FORMACAO">Formacao</option>
                                        <option value="MISSAO">Missao</option>
                                        <option value="OUTRO">Outro</option>
                                    </select>
                                </div>

                                {/* CONGREGAÇÃO */}
                                {congregacoes.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                            <CalendarDays size={12} className="text-figueira" /> Congregacao
                                        </label>
                                        <select
                                            name="congregacao_id"
                                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer shadow-sm transition-all"
                                        >
                                            <option value="">Toda a Igreja (sem congregacao)</option>
                                            {congregacoes.map(c => (
                                                <option key={c.id} value={c.id}>{c.nome} — {c.cidade}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* BLOCO 2: DATA E AGENDAMENTO */}
                            <div className="bg-bg2 p-8 rounded-[2.5rem] border border-soft shadow-sm">

                                {/* ======================================= */}
                                {/* CAMPOS PARA EVENTO ÚNICO                */}
                                {/* ======================================= */}
                                {tipoEvento === 'UNICO' && (
                                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                                        <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                            <CalendarDays size={12} className="text-figueira" /> Data do Evento
                                        </label>
                                        <input
                                            type="date"
                                            name="dataUnica"
                                            required
                                            defaultValue={new Date().toISOString().split('T')[0]}
                                            className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none cursor-pointer shadow-sm transition-all"
                                        />
                                    </div>
                                )}

                                {/* ======================================= */}
                                {/* CAMPOS PARA EVENTOS CONTÍNUOS           */}
                                {/* ======================================= */}
                                {tipoEvento === 'CONTINUO' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                                <CalendarDays size={12} className="text-figueira" /> Dia do Evento
                                            </label>
                                            <select name="diaDaSemana" className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer shadow-sm transition-all">
                                                <option value="0">Domingos</option>
                                                <option value="1">Segundas-feiras</option>
                                                <option value="2">Terças-feiras</option>
                                                <option value="3">Quartas-feiras</option>
                                                <option value="4">Quintas-feiras</option>
                                                <option value="5">Sextas-feiras</option>
                                                <option value="6">Sábados</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                                <Filter size={12} className="text-figueira" /> Frequência
                                            </label>
                                            <select name="frequencia" className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer shadow-sm transition-all">
                                                <option value="TODAS">Toda a semana</option>
                                                <option value="1">1º do Mês</option>
                                                <option value="2">2º do Mês</option>
                                                <option value="3">3º do Mês</option>
                                                <option value="4">4º do Mês</option>
                                                <option value="ULTIMO">Último do Mês</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2 sm:col-span-2 border-t border-soft pt-6 mt-2">
                                            <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-2 flex items-center gap-2">
                                                <Repeat size={12} className="text-figueira" /> Período de Agendamento Automático
                                            </label>
                                            <select name="meses" className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-sm font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer shadow-sm transition-all">
                                                <option value="1">Apenas no próximo mês</option>
                                                <option value="3">Preencher Trimestre (3 meses)</option>
                                                <option value="6">Preencher Semestre (6 meses)</option>
                                                <option value="12">Preencher Ano (12 meses)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* BOTÃO SALVAR FIXO NO FUNDO */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-xl active:scale-95 disabled:opacity-50"
                                >
                                    {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    {isPending ? "A Guardar na Agenda..." : "Gravar Agendamento"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
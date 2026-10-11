'use client'

import { useState, useMemo } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Coffee, Mail, BookOpen, Users, Utensils, CalendarDays, ArrowLeft, ArrowRight, Clock, User, Phone, AlignLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { submeterMarcacaoPublica } from '@/actions/agenda-publica-actions' // Confirma o caminho

// Horários base que o pastor disponibiliza (Podes ajustar como preferires)
const HORARIOS_DISPONIVEIS = ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

const CATEGORIAS = [
    { id: 'CAFE', label: 'Café com Pastor', icone: Coffee, cor: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { id: 'PERMANECER', label: 'Plano Permanecer', icone: BookOpen, cor: 'text-figueira', bg: 'bg-figueira/10', border: 'border-figueira/20' },
    { id: 'DISCIPULADO', label: 'Discipulado', icone: Users, cor: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 'LIDERANCA', label: 'Liderança', icone: Users, cor: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    { id: 'MESA', label: 'A Mesa', icone: Utensils, cor: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { id: 'OUTROS', label: 'Outro Motivo', icone: CalendarDays, cor: 'text-muted', bg: 'bg-soft/30', border: 'border-soft' },
];

export default function AgendamentoPublico({ agendaId, compromissosOcupados }: { agendaId: number, compromissosOcupados: any[] }) {
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);

    // Dados do Formulário
    const [categoria, setCategoria] = useState('');
    const [data, setData] = useState('');
    const [hora, setHora] = useState('');

    // Limitar a escolha de data a partir de "hoje"
    const hoje = new Date().toISOString().split('T')[0];

    // LÓGICA DE HORÁRIOS DISPONÍVEIS: 
    // Verifica se a data selecionada + horário batem com algum compromisso já gravado
    const horariosDoDia = useMemo(() => {
        if (!data) return [];
        return HORARIOS_DISPONIVEIS.map(horario => {
            const dataHoraTeste = new Date(`${data}T${horario}:00`).getTime();
            
            const ocupado = compromissosOcupados.some(comp => {
                const inicio = new Date(comp.data_inicio).getTime();
                const fim = new Date(comp.data_fim).getTime();
                // Bloqueia se o horário escolhido cair dentro de um evento (damos margem de 1 minuto)
                return dataHoraTeste >= inicio && dataHoraTeste < fim;
            });

            return { hora: horario, livre: !ocupado };
        });
    }, [data, compromissosOcupados]);

    async function handleSubmit(formData: FormData) {
        setIsPending(true);
        formData.append('agenda_id', agendaId.toString());
        formData.append('categoria', categoria);
        formData.append('data', data);
        formData.append('hora_inicio', hora);

        const res = await submeterMarcacaoPublica(formData);
        setIsPending(false);

        if (res.ok) {
            setStep(4); // Vai para a página de sucesso
        } else {
            toast(res.error, 'erro');
        }
    }

    return (
        <div className="h-full flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-500">
            
            {/* CABEÇALHO DO STEP */}
            {step < 4 && (
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <span className="text-figueira font-black text-[9px] uppercase tracking-[0.3em]">Passo {step} de 3</span>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg mt-1">
                            {step === 1 && "Qual o motivo?"}
                            {step === 2 && "Escolha a Data e Hora"}
                            {step === 3 && "Os seus detalhes"}
                        </h2>
                    </div>
                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)} className="w-10 h-10 rounded-xl bg-bg border border-soft flex items-center justify-center text-muted hover:text-fg hover:border-figueira transition-all active:scale-90">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                </div>
            )}

            {/* STEP 1: CATEGORIA */}
            {step === 1 && (
                <div className="grid grid-cols-2 gap-4">
                    {CATEGORIAS.map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => { setCategoria(cat.id); setStep(2); }}
                            className="p-5 bg-bg border border-soft rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-figueira/50 hover:bg-soft/20 transition-all active:scale-95 group"
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${cat.bg} ${cat.cor} ${cat.border} border group-hover:scale-110 transition-transform`}>
                                <cat.icone size={20} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-fg text-center">
                                {cat.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* STEP 2: DATA E HORA */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                            <CalendarDays size={12} /> Selecione o Dia
                        </label>
                        <input 
                            type="date" 
                            min={hoje}
                            value={data}
                            onChange={(e) => { setData(e.target.value); setHora(''); }}
                            className="w-full bg-bg border-2 border-soft rounded-2xl px-5 py-4 text-sm font-black text-fg focus:border-figueira outline-none cursor-pointer transition-colors" 
                        />
                    </div>

                    {data && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Clock size={12} /> Selecione a Hora
                            </label>
                            
                            <div className="grid grid-cols-3 gap-3">
                                {horariosDoDia.map((h, i) => (
                                    <button
                                        key={i}
                                        disabled={!h.livre}
                                        onClick={() => setHora(h.hora)}
                                        className={`p-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border-2 
                                            ${!h.livre ? 'opacity-30 bg-soft/50 border-soft cursor-not-allowed text-muted line-through' 
                                            : hora === h.hora ? 'bg-figueira border-figueira text-white shadow-lg shadow-figueira/20 scale-105' 
                                            : 'bg-bg border-soft text-fg hover:border-figueira/40'}`}
                                    >
                                        {h.hora}
                                    </button>
                                ))}
                            </div>
                            
                            {hora && (
                                <button onClick={() => setStep(3)} className="w-full mt-6 flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 animate-in fade-in slide-in-from-bottom-2">
                                    Continuar <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: DADOS PESSOAIS */}
            {step === 3 && (
                <form action={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                    
                    {/* Resumo visual rápido */}
                    <div className="bg-figueira/5 border border-figueira/20 p-4 rounded-2xl flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-figueira text-white rounded-xl flex items-center justify-center">
                                <CalendarDays size={18} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-figueira">A sua marcação</p>
                                <p className="text-sm font-bold text-fg italic">{new Date(data).toLocaleDateString('pt-PT')} às {hora}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><User size={12} /> O seu Nome</label>
                        <input name="nome" required placeholder="Ex: João Silva" className="w-full bg-bg border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Mail size={12} /> O seu E-mail</label>
                        <input name="email" type="email" required placeholder="Ex: joao@email.com" className="w-full bg-bg border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><Phone size={12} /> Telemóvel (WhatsApp)</label>
                        <input name="telefone" required type="tel" placeholder="Ex: 912 345 678" className="w-full bg-bg border-2 border-soft rounded-2xl px-5 py-4 text-xs font-black text-fg focus:border-figueira outline-none transition-colors" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted tracking-[0.2em] ml-2 flex items-center gap-2"><AlignLeft size={12} /> Assunto / Notas (Opcional)</label>
                        <textarea name="observacoes" rows={3} placeholder="Quer adiantar o assunto da reunião?" className="w-full bg-bg border-2 border-soft rounded-2xl px-5 py-4 text-xs font-medium text-fg focus:border-figueira outline-none resize-none transition-colors" />
                    </div>

                    <button disabled={isPending} type="submit" className="w-full mt-2 flex items-center justify-center gap-3 bg-fg text-bg px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-sm active:scale-95 disabled:opacity-50">
                        {isPending ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                        {isPending ? "A Confirmar..." : "Confirmar Agendamento"}
                    </button>
                </form>
            )}

            {/* STEP 4: SUCESSO */}
            {step === 4 && (
                <div className="text-center py-10 animate-in zoom-in-95 duration-500 flex flex-col items-center">
                    <div className="w-24 h-24 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center mb-6 shadow-inner relative">
                        <div className="absolute inset-0 border-2 border-figueira rounded-2xl animate-ping opacity-20"></div>
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-fg mb-2">Pedido Enviado!</h2>
                    <p className="text-[11px] font-medium text-muted leading-relaxed max-w-sm mx-auto mb-8">
                        O seu pedido de marcação para dia <strong className="text-fg">{new Date(data).toLocaleDateString('pt-PT')}</strong> às <strong className="text-fg">{hora}</strong> foi registado com sucesso. O Gabinete entrará em contacto para confirmar.
                    </p>
                    
                    <button onClick={() => window.location.reload()} className="px-8 py-4 bg-soft text-fg rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-fg hover:text-bg transition-all active:scale-95">
                        Fazer nova marcação
                    </button>
                </div>
            )}
        </div>
    )
}
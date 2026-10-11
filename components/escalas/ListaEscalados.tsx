"use client"

import { useState } from 'react'
import {
    CalendarDays, Clock, ShieldCheck, User, CheckCircle2, Trash2,
    Edit3, X, Save, Loader2, LayoutGrid, MessageCircle, ChevronDown,
    Music, XCircle, AlertCircle
} from 'lucide-react'
import { removerEscalaAction, atualizarEscalaAction } from '@/actions/admin-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import ModalEditarEvento from '@/components/admin/ModalEditarEvento'
import BotaoApagarEvento from '@/components/admin/BotaoApagarEvento'
import ModalRepertorio from '@/components/louvor/ModalRepertorio'
import SecaoMensagemEvento from '@/components/escalas/SecaoMensagemEvento'

export default function ListaEscalados({
    eventos,
    isAdmin,
    membros,
    isLouvor,
    congregacoes,
    podeEditarRepertorio,
    podeEditarMensagem
}: {
    eventos: any[]
    isAdmin?: boolean
    membros?: any[]
    isLouvor?: boolean
    congregacoes?: { id: number; nome: string; cidade: string }[]
    podeEditarRepertorio?: boolean
    podeEditarMensagem?: boolean
}) {
    const confirmar = useConfirm()
    const toast = useToast()
    const [editingId, setEditingId] = useState<number | null>(null)
    const [isPending, setIsPending] = useState(false)

    const eventosComEscala = eventos.filter(ev => ev.escalas && ev.escalas.length > 0)

    async function handleRemover(id: number) {
        const ok = await confirmar({ mensagem: 'Tens a certeza que desejas remover este voluntário da escala?', tipo: 'perigo' })
        if (!ok) return
        const res = await removerEscalaAction(id)
        if (res.error) toast(res.error, 'erro')
    }

    async function handleAtualizar(formData: FormData) {
        setIsPending(true)
        const res = await atualizarEscalaAction(formData)
        setIsPending(false)
        if (res.ok) setEditingId(null)
        else toast(res.error, 'erro')
    }

    function handlePartilharWhatsApp(evento: any, escalasAgrupadas: any) {
        const dataFormatada = new Intl.DateTimeFormat('pt-PT', {
            weekday: 'long', day: '2-digit', month: 'long'
        }).format(new Date(evento.data))
        const diaSemanaCapitalizado = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

        let texto = `✨ *ESCALA DE SERVIÇO* ✨\n\n`
        texto += `⛪ *${evento.nome.toUpperCase()}*\n`
        texto += `📅 _${diaSemanaCapitalizado}_\n\n`

        Object.entries(escalasAgrupadas).forEach(([deptoNome, escalas]: [string, any]) => {
            texto += `🔹 *${deptoNome.toUpperCase()}* 🔹\n`
            escalas.forEach((esc: any) => {
                const nome = `${esc.membro.first_name} ${esc.membro.last_name}`
                texto += `👤 ${nome}\n`
                texto += `  |_ _${esc.funcao}_ | ⏰ *${esc.horario}*\n`
            })
            texto += `\n`
        })

        texto += `────────────────\n`
        texto += `✅ *Atenção:* Por favor, não se esqueçam de confirmar a vossa presença na plataforma!\n\n`
        texto += `📖 _"Tudo o que fizerem, façam de todo o coração, como para o Senhor."_ \n— *Colossenses 3:23* 🙏`

        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
    }

    if (eventosComEscala.length === 0) {
        return (
            <div className="py-16 text-center border-2 border-dashed border-soft rounded-[2.5rem] bg-bg2/50">
                <ShieldCheck size={32} className="mx-auto text-muted/30 mb-4" />
                <p className="text-[10px] font-black text-muted uppercase tracking-widest italic">
                    Nenhuma equipa escalada para os próximos eventos.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4 md:space-y-6">
            {eventosComEscala.map((evento, index) => {
                const dataFormatada = new Intl.DateTimeFormat('pt-PT', {
                    weekday: 'short', day: '2-digit', month: 'short'
                }).format(new Date(evento.data))

                const escalasAgrupadasPorDepto = evento.escalas.reduce((acc: any, escala: any) => {
                    const deptoNome = escala.departamento?.nome || 'Sem Departamento'
                    if (!acc[deptoNome]) acc[deptoNome] = []
                    acc[deptoNome].push(escala)
                    return acc
                }, {})

                const totalEscalas = evento.escalas.length
                const confirmados = evento.escalas.filter((e: any) => e.confirmado).length
                const recusados = evento.escalas.filter((e: any) => !e.confirmado && e.motivo_recusa).length
                const pendentes = totalEscalas - confirmados - recusados

                return (
                    <details
                        key={evento.id}
                        open={index === 0}
                        className="group bg-bg border border-soft rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-300"
                    >
                        {/* CABEÇALHO */}
                        <summary className="list-none cursor-pointer bg-bg2 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 outline-none [&::-webkit-details-marker]:hidden hover:bg-soft/10 transition-colors group-open:border-b border-soft">
                            <div className="flex items-start sm:items-center gap-3 md:gap-4">
                                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-soft/50 flex items-center justify-center text-muted group-open:bg-blue-500 group-open:text-white transition-colors shrink-0">
                                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform duration-300" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm md:text-lg font-black uppercase italic tracking-tighter text-fg leading-none truncate">
                                        {evento.nome}
                                    </h3>
                                    <p className="text-[9px] md:text-[10px] font-black uppercase text-muted tracking-widest mt-1 flex items-center gap-1.5">
                                        <CalendarDays size={11} className="text-figueira" /> {dataFormatada}
                                    </p>

                                    <div className="flex items-center gap-1.5 md:gap-2 mt-2 flex-wrap">
                                        <StatPill count={confirmados} label="conf" color="emerald" icon={<CheckCircle2 size={9} />} />
                                        <StatPill count={pendentes} label="pend" color="orange" icon={<AlertCircle size={9} />} />
                                        <StatPill count={recusados} label="rec" color="red" icon={<XCircle size={9} />} />
                                    </div>
                                </div>

                                {isAdmin && (
                                    <div className="mt-1 sm:mt-0 flex gap-1.5 md:gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                        <ModalEditarEvento evento={evento} congregacoes={congregacoes} />
                                        <BotaoApagarEvento id={evento.id} nome={evento.nome} />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 md:gap-3 pl-11 md:pl-0" onClick={e => e.preventDefault()}>
                                <button
                                    onClick={() => handlePartilharWhatsApp(evento, escalasAgrupadasPorDepto)}
                                    className="bg-green-50 text-green-600 hover:bg-green-500 hover:text-white border border-green-200 transition-all text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95"
                                >
                                    <MessageCircle size={12} /> Partilhar
                                </button>
                                <span className="bg-bg border border-soft text-[8px] md:text-[9px] font-black uppercase tracking-widest text-fg px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl shadow-sm whitespace-nowrap">
                                    {totalEscalas} Vol.
                                </span>
                            </div>
                        </summary>

                        {/* LISTA */}
                        <div className="flex flex-col animate-in slide-in-from-top-2 duration-300">
                            {Object.entries(escalasAgrupadasPorDepto).map(([deptoNome, escalasDoDepto]: any) => (
                                <div key={deptoNome}>
                                    <div className="bg-soft/20 px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-2 border-b border-soft">
                                        <LayoutGrid size={11} className="text-blue-500" />
                                        <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-fg">{deptoNome}</h4>
                                    </div>

                                    <div className="divide-y divide-soft">
                                        {escalasDoDepto.map((escala: any) => {
                                            const isEditing = editingId === escala.id
                                            const isConfirmado = escala.confirmado
                                            const isRecusado = !escala.confirmado && !!escala.motivo_recusa
                                            const isPendente = !escala.confirmado && !escala.motivo_recusa

                                            let funcoesDisponiveis = [escala.funcao]
                                            if (membros) {
                                                const membroCompleto = membros.find((m: any) => m.id === escala.membro.id)
                                                if (membroCompleto) {
                                                    const funcoesSet = new Set<string>()
                                                    membroCompleto.ministerios?.forEach((vinc: any) => {
                                                        if (vinc.departamento_id === escala.departamento_id && vinc.funcoes) {
                                                            vinc.funcoes.forEach((f: any) => { if (f.funcao?.nome) funcoesSet.add(f.funcao.nome) })
                                                        }
                                                    })
                                                    const isLiderOficial = membroCompleto.departamentos_liderados?.some((d: any) => d.id === escala.departamento_id)
                                                    if (isLiderOficial) funcoesSet.add('Líder')
                                                    funcoesSet.add(escala.funcao)
                                                    funcoesDisponiveis = Array.from(funcoesSet)
                                                }
                                            }

                                            return (
                                                <div
                                                    key={escala.id}
                                                    className={`p-3 md:p-5 hover:bg-soft/10 transition-colors
                                                        ${isConfirmado ? 'border-l-2 border-emerald-500' : ''}
                                                        ${isRecusado ? 'border-l-2 border-red-400 bg-red-500/3' : ''}
                                                        ${isPendente ? 'border-l-2 border-orange-400' : ''}
                                                    `}
                                                >
                                                    {!isEditing ? (
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div className="flex items-center gap-3">
                                                                {/* AVATAR */}
                                                                <div className="w-10 h-10 rounded-xl bg-bg2 border border-soft flex items-center justify-center text-muted shrink-0 shadow-sm overflow-hidden">
                                                                    {escala.membro.avatar_file
                                                                        ? <img src={escala.membro.avatar_file} alt="Avatar" className="w-full h-full object-cover" />
                                                                        : <User size={16} />
                                                                    }
                                                                </div>

                                                                <div>
                                                                    {/* NOME + BADGE ESTADO */}
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <h4 className="text-xs font-black uppercase text-fg leading-none">
                                                                            {escala.membro.first_name} {escala.membro.last_name}
                                                                        </h4>
                                                                        {isConfirmado && (
                                                                            <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                                                                <CheckCircle2 size={9} /> Confirmado
                                                                            </span>
                                                                        )}
                                                                        {isRecusado && (
                                                                            <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                                                                <XCircle size={9} /> Recusado
                                                                            </span>
                                                                        )}
                                                                        {isPendente && (
                                                                            <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                                                                                <AlertCircle size={9} /> Pendente
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* FUNÇÃO E HORÁRIO */}
                                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                                        <span className="text-[9px] font-bold uppercase tracking-widest text-blue-600 flex items-center gap-1">
                                                                            <ShieldCheck size={10} /> {escala.funcao}
                                                                        </span>
                                                                        {escala.horario && (
                                                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted flex items-center gap-1 border-l border-soft pl-3">
                                                                                <Clock size={10} /> {escala.horario}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* MOTIVO DE RECUSA */}
                                                                    {isRecusado && escala.motivo_recusa && (
                                                                        <p className="text-[8px] text-red-500/80 font-medium italic mt-1.5 max-w-xs">
                                                                            "{escala.motivo_recusa}"
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* AÇÕES */}
                                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                                <button
                                                                    onClick={() => setEditingId(escala.id)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg border border-soft text-muted hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                                                                    title="Editar Escala"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRemover(escala.id)}
                                                                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-bg border border-soft text-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
                                                                    title="Remover da Escala"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* MODO EDIÇÃO */
                                                        <form action={handleAtualizar} className="flex flex-col sm:flex-row items-end gap-4 bg-bg2 p-4 rounded-2xl border border-figueira/30 shadow-inner animate-in fade-in zoom-in-95">
                                                            <input type="hidden" name="id" value={escala.id} />
                                                            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-1">Alterar Função</label>
                                                                    <div className="relative">
                                                                        <select name="funcao" defaultValue={escala.funcao} required
                                                                            className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none shadow-sm appearance-none cursor-pointer pr-8">
                                                                            {funcoesDisponiveis.map((f: string) => (
                                                                                <option key={f} value={f}>{f}</option>
                                                                            ))}
                                                                        </select>
                                                                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-1">Novo Horário</label>
                                                                    <input type="time" name="horario" defaultValue={escala.horario} required
                                                                        className="w-full bg-bg border border-soft rounded-xl px-4 py-2.5 text-xs font-bold focus:border-figueira outline-none cursor-pointer shadow-sm" />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <button type="button" onClick={() => setEditingId(null)}
                                                                    className="flex-1 sm:flex-none p-3 rounded-xl bg-bg border border-soft text-muted hover:text-red-500 transition-all flex items-center justify-center shadow-sm">
                                                                    <X size={16} />
                                                                </button>
                                                                <button type="submit" disabled={isPending}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-figueira text-white text-[10px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all shadow-sm disabled:opacity-50">
                                                                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar
                                                                </button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* REPERTÓRIO LOUVOR */}
                            {isLouvor && (
                                <div className="p-4 sm:p-6 bg-figueira/5 border-t border-figueira/10">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <Music size={14} className="text-figueira" />
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-fg">Gestão Musical</h4>
                                    </div>
                                    <ModalRepertorio eventoId={evento.id} repertorioInical={evento.repertorio || []} podeEditar={!!podeEditarRepertorio} />
                                    <SecaoMensagemEvento
                                        eventoId={evento.id}
                                        eventoNome={evento.nome}
                                        membros={membros || []}
                                        podeEditar={!!isAdmin || !!podeEditarMensagem}
                                    />
                                </div>

                            )}
                        </div>
                    </details>
                )
            })}
        </div>
    )
}

// ── PILL DE ESTADO ────────────────────────────────────────────────────────────
function StatPill({ count, label, color, icon }: {
    count: number
    label: string
    color: 'emerald' | 'orange' | 'red'
    icon: React.ReactNode
}) {
    if (count === 0) return null

    const styles = {
        emerald: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
        orange: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
        red: 'bg-red-500/10 text-red-600 border-red-500/20',
    }

    return (
        <span className={`flex items-center gap-1 text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${styles[color]}`}>
            {icon} {count} {label}{count !== 1 ? 's' : ''}
        </span>
    )
}
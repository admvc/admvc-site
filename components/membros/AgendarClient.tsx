'use client'

// Marcar atendimento: quatro perguntas numa so pagina, sempre visiveis.
// O botao esta sempre ativo e diz o que falta (um botao apagado nao explica nada).

import { useState } from 'react'
import { Calendar, Send, Loader2, CheckCircle2, User } from 'lucide-react'
import Image from 'next/image'
import { pedirAgendamentoAction } from '@/actions/agenda-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

const CATEGORIAS = [
    { id: 'CAFE', label: 'Café com o pastor' },
    { id: 'PERMANECER', label: 'Permanecer' },
    { id: 'DISCIPULADO', label: 'Discipulado' },
    { id: 'MESA', label: 'A Mesa' },
    { id: 'OUTRO', label: 'Outro' },
]

const CAMPO = 'a-foco min-h-[52px] w-full rounded-[14px] border px-4 text-[17px]'
const ESTILO_CAMPO = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

export default function AgendarClient({ agendas, membro }: { agendas: any[]; membro: any }) {
    const toast = useToast()
    const [agendaSelecionada, setAgendaSelecionada] = useState<number | null>(agendas.length === 1 ? agendas[0].id : null)
    const [categoria, setCategoria] = useState('')
    const [data, setData] = useState('')
    const [horaInicio, setHoraInicio] = useState('10:00')
    const [horaFim, setHoraFim] = useState('10:30')
    const [titulo, setTitulo] = useState('')
    const [observacoes, setObservacoes] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [enviado, setEnviado] = useState(false)
    const [falta, setFalta] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const emFalta = !agendaSelecionada ? 'Escolha com quem quer falar.'
            : !categoria ? 'Escolha o tipo de conversa.'
            : !data ? 'Escolha o dia.'
            : !titulo.trim() ? 'Escreva o assunto.'
            : null
        setFalta(emFalta)
        if (emFalta) return

        setEnviando(true)
        const res = await pedirAgendamentoAction({
            agenda_id: agendaSelecionada!,
            titulo,
            categoria,
            data,
            hora_inicio: horaInicio,
            hora_fim: horaFim,
            observacoes,
            membro_id: membro.id,
        })
        setEnviando(false)

        if (res.ok) setEnviado(true)
        else toast(res.error || 'Erro ao enviar o pedido.', 'erro')
    }

    if (enviado) {
        return (
            <div className="space-y-4 py-10 text-center">
                <CheckCircle2 size={56} className="mx-auto" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                <h1 className="text-[28px] font-bold leading-tight">Pedido enviado</h1>
                <p className="text-[17px] a-suave">O pastor recebe o pedido e confirma o dia e a hora.</p>
                <button type="button" onClick={() => { setEnviado(false); setCategoria(''); setTitulo(''); setData(''); setObservacoes('') }}
                    className="a-botao a-botao-secundario w-full">
                    Fazer outro pedido
                </button>
            </div>
        )
    }

    // Data minima: amanha
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    const dataMin = amanha.toISOString().split('T')[0]

    const limpar = () => setFalta(null)

    return (
        <>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Marcar atendimento</h1>
                <p className="text-[17px] a-suave">Peça uma conversa com o pastor ou com um líder.</p>
            </div>

            {agendas.length === 0 ? (
                <div className="a-card space-y-2 p-6 text-center">
                    <Calendar size={36} className="mx-auto a-suave" aria-hidden />
                    <p className="text-[18px] font-semibold">Ainda não é possível marcar</p>
                    <p className="text-[16px] a-suave">De momento não há agendas abertas. Fale com a secretaria.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    <Passo n={1} titulo="Com quem?">
                        <div role="radiogroup" className="space-y-2">
                            {agendas.map((a: any) => {
                                const ativo = agendaSelecionada === a.id
                                return (
                                    <button key={a.id} type="button" role="radio" aria-checked={ativo} onClick={() => { setAgendaSelecionada(a.id); limpar() }}
                                        className="a-card a-foco flex min-h-[64px] w-full items-center gap-3 px-4 py-2 text-left"
                                        style={ativo ? { borderColor: 'var(--a-destaque)', background: 'var(--a-destaque-suave)' } : undefined}>
                                        {a.dono?.avatar_file ? (
                                            <Image src={a.dono.avatar_file} alt="" width={44} height={44} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                        ) : (
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full a-suave" style={{ background: 'var(--a-bg)' }}>
                                                <User size={22} aria-hidden />
                                            </span>
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[17px] font-semibold">{a.nome}</span>
                                            <span className="block text-[15px] a-suave">{a.dono?.first_name} {a.dono?.last_name}</span>
                                        </span>
                                        {ativo && <CheckCircle2 size={24} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />}
                                    </button>
                                )
                            })}
                        </div>
                    </Passo>

                    <Passo n={2} titulo="Que tipo de conversa?">
                        <div role="radiogroup" className="flex flex-wrap gap-2">
                            {CATEGORIAS.map(c => {
                                const ativo = categoria === c.id
                                return (
                                    <button key={c.id} type="button" role="radio" aria-checked={ativo} onClick={() => { setCategoria(c.id); limpar() }}
                                        className={`a-botao !min-h-[48px] ${ativo ? 'a-botao-principal' : 'a-botao-secundario'}`}>
                                        {c.label}
                                    </button>
                                )
                            })}
                        </div>
                    </Passo>

                    <Passo n={3} titulo="Quando?">
                        <div className="space-y-2">
                            <label htmlFor="ag-data" className="block text-[16px] font-semibold">Dia</label>
                            <input id="ag-data" type="date" value={data} onChange={e => { setData(e.target.value); limpar() }} min={dataMin}
                                className={CAMPO} style={ESTILO_CAMPO} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label htmlFor="ag-inicio" className="block text-[16px] font-semibold">Das</label>
                                <input id="ag-inicio" type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="ag-fim" className="block text-[16px] font-semibold">Até às</label>
                                <input id="ag-fim" type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className={CAMPO} style={ESTILO_CAMPO} />
                            </div>
                        </div>
                    </Passo>

                    <Passo n={4} titulo="Sobre o quê?">
                        <div className="space-y-2">
                            <label htmlFor="ag-titulo" className="block text-[16px] font-semibold">Assunto</label>
                            <input id="ag-titulo" type="text" value={titulo} onChange={e => { setTitulo(e.target.value); limpar() }}
                                className={CAMPO} style={ESTILO_CAMPO} />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="ag-obs" className="block text-[16px] font-semibold">Mais alguma coisa? <span className="font-normal a-suave">(se quiser)</span></label>
                            <textarea id="ag-obs" value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
                                className={`${CAMPO} resize-none py-3`} style={ESTILO_CAMPO} />
                        </div>
                    </Passo>

                    {falta && (
                        <p role="alert" className="rounded-[14px] border px-4 py-3 text-[16px] font-semibold"
                            style={{ borderColor: 'var(--a-erro)', color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                            {falta}
                        </p>
                    )}

                    <button type="submit" disabled={enviando} className="a-botao a-botao-principal w-full !min-h-[56px]">
                        {enviando ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Send size={20} aria-hidden />}
                        {enviando ? 'A enviar…' : 'Pedir atendimento'}
                    </button>
                    <p className="text-center text-[15px] a-suave">O pastor confirma o dia e a hora depois.</p>
                </form>
            )}
        </>
    )
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h2 className="flex items-center gap-3 text-[19px] font-semibold">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] font-bold"
                    style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}>{n}</span>
                {titulo}
            </h2>
            {children}
        </section>
    )
}

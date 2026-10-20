'use client'

// Alertas de encontro no Início: encontros novos, mudados ou cancelados das minhas equipas.
// "Abrir" mostra os detalhes e o Vou / Não posso; "Fechar" esconde em todos os aparelhos (volta se mudar ou cancelar).
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, MapPin, X } from 'lucide-react'
import { fecharAlertaEncontro, responderEncontro } from '@/actions/agenda-alertas-actions'
import type { AlertaEncontro } from '@/lib/alertas-encontros'
import { TIPOS_AGENDA_DEPTO, type TipoAgendaDepto } from '@/lib/agenda'
import { diaPorExtenso, hora } from './datas'

const ROTULO = { novo: 'Novo', mudou: 'Mudou', cancelado: 'Cancelado' } as const

function Alerta({ a }: { a: AlertaEncontro }) {
    const router = useRouter()
    const [aberto, setAberto] = useState(false)
    const [pendente, iniciar] = useTransition()
    const [erro, setErro] = useState<string | null>(null)
    const [motivo, setMotivo] = useState('')
    const [pedeMotivo, setPedeMotivo] = useState(false)
    const cancelado = a.estado === 'cancelado'
    const correr = (f: () => Promise<{ ok: boolean; error?: string }>) => iniciar(async () => {
        setErro(null)
        const r = await f()
        if (!r.ok) { setErro(r.error ?? 'Erro.'); return }
        router.refresh()
    })
    const tipo = TIPOS_AGENDA_DEPTO[a.tipo as TipoAgendaDepto] ?? a.tipo
    return (
        <li className="a-card space-y-2 p-4" style={{ borderColor: cancelado ? 'var(--a-erro)' : 'var(--a-destaque)' }}>
            <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold"
                    style={{ background: cancelado ? 'var(--a-erro)' : 'var(--a-destaque-suave)', color: cancelado ? '#fff' : 'var(--a-destaque)' }}>{ROTULO[a.estado]}</span>
                <div className="min-w-0 flex-1">
                    <p className={`text-[17px] font-semibold ${cancelado ? 'line-through' : ''}`}>{a.titulo}</p>
                    <p className="text-[15px] a-suave">{a.equipa.nome} · {tipo}</p>
                    <p className="text-[15px] a-suave">{diaPorExtenso(a.inicio)}, {hora(a.inicio)}{a.fim ? `–${hora(a.fim)}` : ''}</p>
                </div>
                <button type="button" disabled={pendente} onClick={() => correr(() => fecharAlertaEncontro(a.id))}
                    className="a-foco flex h-10 w-10 shrink-0 items-center justify-center rounded-full" aria-label="Fechar o alerta"><X size={20} aria-hidden /></button>
            </div>
            {!cancelado && (
                !aberto ? (
                    <button type="button" onClick={() => setAberto(true)} className="a-foco min-h-[44px] text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>Abrir</button>
                ) : (
                    <div className="space-y-2">
                        {a.local && <p className="flex items-center gap-1 text-[15px]"><MapPin size={15} aria-hidden /> {a.local}</p>}
                        {a.resposta && <p className="flex items-center gap-1 text-[15px] font-semibold"><Check size={16} aria-hidden /> {a.resposta === 'VOU' ? 'Disse que vai' : 'Disse que não pode'}</p>}
                        {pedeMotivo ? (
                            <div className="space-y-2">
                                <input value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={200} placeholder="Motivo (opcional)"
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]" style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                                <div className="flex gap-2">
                                    <button type="button" disabled={pendente} onClick={() => correr(() => responderEncontro(a.id, 'NAO_POSSO', motivo))} className="a-botao a-botao-principal flex-1">Enviar</button>
                                    <button type="button" onClick={() => setPedeMotivo(false)} className="a-botao a-botao-secundario">Voltar</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <button type="button" disabled={pendente} onClick={() => correr(() => responderEncontro(a.id, 'VOU'))} className="a-botao a-botao-principal flex-1">Vou</button>
                                <button type="button" disabled={pendente} onClick={() => setPedeMotivo(true)} className="a-botao a-botao-secundario flex-1">Não posso</button>
                            </div>
                        )}
                    </div>
                )
            )}
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
        </li>
    )
}

export default function AlertasEncontros({ alertas }: { alertas: AlertaEncontro[] }) {
    if (alertas.length === 0) return null
    return (
        <section id="alertas" className="scroll-mt-20 space-y-3" aria-labelledby="alertas-titulo">
            <h2 id="alertas-titulo" className="flex items-center gap-2 text-[19px] font-bold"><Bell size={20} aria-hidden /> Encontros das minhas equipas</h2>
            <ul className="space-y-3">{alertas.map((a) => <Alerta key={a.id} a={a} />)}</ul>
        </section>
    )
}

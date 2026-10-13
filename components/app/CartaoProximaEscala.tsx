'use client'

// "A sua proxima escala": o que, quando, e dois botoes grandes.
// "Nao posso" pede um motivo com um toque (as razoes mais comuns).

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Check, ChevronRight, X } from 'lucide-react'
import { confirmarEscala, recusarEscala } from '@/actions/escalas-actions'
import type { MinhaEscala } from '@/lib/escalas-app'
import { diaPorExtenso, hora } from './datas'
import Estado from './Estado'

const MOTIVOS = ['Estou doente', 'Vou viajar', 'Trabalho', 'Compromisso de família']

export default function CartaoProximaEscala({ escala, titulo = 'A sua próxima escala', compacto = false, href }: { escala: MinhaEscala; titulo?: string; compacto?: boolean; href?: string }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [pedirMotivo, setPedirMotivo] = useState(false)
    const [outro, setOutro] = useState('')
    const [erro, setErro] = useState<string | null>(null)

    function responder(acao: () => Promise<{ sucesso?: boolean; error?: string }>) {
        setErro(null)
        iniciar(async () => {
            const r = await acao()
            if (r?.error) setErro(r.error)
            else {
                setPedirMotivo(false)
                router.refresh()
            }
        })
    }

    return (
        <section className={`a-card ${compacto ? 'p-4 space-y-3' : 'p-5 space-y-4'}`} aria-labelledby={`escala-${escala.id}`}>
            <div className="flex items-start justify-between gap-3">
                <h2 id={`escala-${escala.id}`} className="text-[15px] font-semibold a-suave">{titulo}</h2>
                <Estado estado={escala.estado} />
            </div>

            <div className="space-y-1">
                <p className={`${compacto ? 'text-[19px]' : 'text-[22px]'} font-bold leading-tight`}>{escala.funcao}</p>
                <p className="text-[17px]">{escala.departamento.nome} · {escala.evento.nome}</p>
                <p className="flex items-center gap-2 text-[16px] a-suave">
                    <CalendarDays size={18} aria-hidden />
                    {diaPorExtenso(escala.evento.data)}, às {hora(escala.evento.data)}
                </p>
            </div>

            {escala.estado === 'NAO_PODE' && escala.motivo && (
                <p className="text-[15px] a-suave">Disse que não pode: {escala.motivo}</p>
            )}

            {!pedirMotivo ? (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        className="a-botao a-botao-principal"
                        disabled={pendente || escala.estado === 'CONFIRMADA'}
                        onClick={() => responder(() => confirmarEscala([escala.id]))}
                    >
                        <Check size={20} aria-hidden /> {escala.estado === 'CONFIRMADA' ? 'Confirmado' : 'Vou servir'}
                    </button>
                    <button
                        type="button"
                        className="a-botao a-botao-secundario"
                        disabled={pendente}
                        onClick={() => setPedirMotivo(true)}
                    >
                        <X size={20} aria-hidden /> Não posso
                    </button>
                </div>
            ) : (
                <div className="space-y-3" role="group" aria-label="Porque não pode?">
                    <p className="text-[16px] font-semibold">Porque não pode?</p>
                    <div className="grid grid-cols-2 gap-2">
                        {MOTIVOS.map((m) => (
                            <button key={m} type="button" className="a-botao a-botao-secundario text-[15px]" disabled={pendente}
                                onClick={() => responder(() => recusarEscala([escala.id], m))}>
                                {m}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input
                            value={outro}
                            onChange={(e) => setOutro(e.target.value)}
                            placeholder="Outro motivo"
                            className="a-foco min-h-[48px] flex-1 rounded-[14px] border px-4 text-[16px]"
                            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}
                        />
                        <button type="button" className="a-botao a-botao-principal" disabled={pendente || !outro.trim()}
                            onClick={() => responder(() => recusarEscala([escala.id], outro.trim()))}>
                            Enviar
                        </button>
                    </div>
                    <button type="button" className="text-[15px] underline a-suave" onClick={() => setPedirMotivo(false)}>
                        Afinal posso
                    </button>
                </div>
            )}

            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}

            {href && (
                <Link href={href} className="a-foco flex min-h-[44px] items-center justify-between border-t pt-3 text-[16px] font-semibold"
                    style={{ borderColor: 'var(--a-borda)', color: 'var(--a-destaque)' }}>
                    Ver a escala (equipa e músicas) <ChevronRight size={20} aria-hidden />
                </Link>
            )}
        </section>
    )
}

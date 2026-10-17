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
import { useConfirm } from '@/components/ui/ConfirmDialog'

const MOTIVOS = ['Estou doente', 'Vou viajar', 'Trabalho', 'Compromisso de família']

export default function CartaoProximaEscala({ escala, titulo = 'A sua próxima escala', compacto = false, href }: { escala: MinhaEscala; titulo?: string; compacto?: boolean; href?: string }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [pedirMotivo, setPedirMotivo] = useState(false)
    const [outro, setOutro] = useState('')
    const [erro, setErro] = useState<string | null>(null)
    const confirmar = useConfirm()

    function responder(acao: () => Promise<{ sucesso?: boolean; error?: string; conflito?: string }>) {
        setErro(null)
        iniciar(async () => {
            let r = await acao()
            // Duas escalas à mesma hora: só confirma se a pessoa disser que sim
            if (r?.conflito) {
                if (!(await confirmar({ titulo: 'Duas escalas à mesma hora', mensagem: `${r.conflito} Confirmar também esta?`, botaoConfirmar: 'Confirmar as duas', tipo: 'aviso' }))) return
                r = await confirmarEscala([escala.id], true)
            }
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
                {escala.estado === 'CONFIRMADA' ? (
                    // Confirmada: o cartão fica fino; quem desistir toca na etiqueta
                    <button type="button" onClick={() => setPedirMotivo(true)} className="a-foco group/conf shrink-0 rounded-full"
                        aria-label="Confirmada. Tocar se afinal não puder ir" title="Afinal não posso ir">
                        <span className="group-hover/conf:hidden group-focus-visible/conf:hidden"><Estado estado={escala.estado} /></span>
                        {/* Rato por cima: mostra o que o clique faz */}
                        <span className="hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold group-hover/conf:inline-flex group-focus-visible/conf:inline-flex"
                            style={{ color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                            <X size={15} aria-hidden /> Cancelar
                        </span>
                    </button>
                ) : <Estado estado={escala.estado} />}
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

            {escala.estado === 'NAO_PODE' ? (
                <button type="button" className="a-botao a-botao-secundario w-full" disabled={pendente}
                    onClick={() => responder(() => confirmarEscala([escala.id]))}>
                    <Check size={20} aria-hidden /> Afinal posso servir
                </button>
            ) : escala.estado === 'POR_CONFIRMAR' ? (
                <div className="grid grid-cols-2 gap-3">
                    <button type="button" className="a-botao a-botao-principal" disabled={pendente}
                        onClick={() => responder(() => confirmarEscala([escala.id]))}>
                        <Check size={20} aria-hidden /> Vou servir
                    </button>
                    <button type="button" className="a-botao a-botao-secundario" disabled={pendente} onClick={() => setPedirMotivo(true)}>
                        <X size={20} aria-hidden /> Não posso
                    </button>
                </div>
            ) : null}

            {pedirMotivo && (
                <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center" onClick={() => setPedirMotivo(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby={`motivo-${escala.id}`} className="a-card w-full max-w-md space-y-3 p-5"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p id={`motivo-${escala.id}`} className="text-[18px] font-bold">Porque não pode?</p>
                                <p className="text-[15px] a-suave">{escala.funcao} · {diaPorExtenso(escala.evento.data)}</p>
                            </div>
                            <button type="button" onClick={() => setPedirMotivo(false)} className="a-foco a-suave" aria-label="Fechar"><X size={22} aria-hidden /></button>
                        </div>
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
                                aria-label="Outro motivo"
                                className="a-foco min-h-[48px] min-w-0 flex-1 rounded-[14px] border px-4 text-[16px]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}
                            />
                            <button type="button" className="a-botao a-botao-principal" disabled={pendente || !outro.trim()}
                                onClick={() => responder(() => recusarEscala([escala.id], outro.trim()))}>
                                Enviar
                            </button>
                        </div>
                        <p className="text-[14px] a-suave">O líder é avisado.</p>
                    </div>
                </div>
            )}

            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}

            {href && (
                <Link href={href} className="a-foco flex min-h-[44px] items-center justify-between border-t pt-3 text-[16px] font-semibold"
                    style={{ borderColor: 'var(--a-borda)', color: 'var(--a-destaque)' }}>
                    Ver a escala <ChevronRight size={20} aria-hidden />
                </Link>
            )}
        </section>
    )
}

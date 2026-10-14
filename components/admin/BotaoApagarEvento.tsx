'use client'

// Apagar um culto — ou este e os seguintes da mesma série. Antes mostra o que se
// perde; se houver escalas feitas, pede uma confirmação extra.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, Loader2, X, Repeat } from 'lucide-react'
import { apagarEventoAction, apagarSerieEventoAction, resumoSerieEventoAction } from '@/actions/admin-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

type Conta = { cultos: number; comEscalas: number; escalas: number; comRepertorio: number; comSermoes: number }

const ESTILO_PADRAO = 'p-2 bg-bg2 border border-soft text-muted hover:text-red-500 hover:border-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90 shadow-sm flex items-center justify-center disabled:opacity-50'

export default function BotaoApagarEvento({ id, nome, className = ESTILO_PADRAO, tamanho = 16 }: { id: number; nome: string; className?: string; tamanho?: number }) {
    const toast = useToast()
    const [aberto, setAberto] = useState(false)
    const [aCarregar, setACarregar] = useState(false)
    const [aApagar, setAApagar] = useState(false)
    const [resumo, setResumo] = useState<{ este: Conta; seguintes: Conta; ate: string | null } | null>(null)
    const [alcance, setAlcance] = useState<'ESTE' | 'SEGUINTES'>('ESTE')
    const [confirmouEscalas, setConfirmouEscalas] = useState(false)

    async function abrir() {
        setACarregar(true)
        const r = await resumoSerieEventoAction(id)
        setACarregar(false)
        if (!r.ok) { toast(r.error, 'erro'); return }
        setResumo({ este: r.este, seguintes: r.seguintes, ate: r.ate })
        setAlcance('ESTE')
        setConfirmouEscalas(false)
        setAberto(true)
    }

    async function apagar() {
        setAApagar(true)
        const res = alcance === 'SEGUINTES' ? await apagarSerieEventoAction(id, confirmouEscalas) : await apagarEventoAction(id)
        setAApagar(false)
        if (!res.ok) { toast(res.error || 'Não foi possível apagar.', 'erro'); return }
        setAberto(false)
        toast(alcance === 'SEGUINTES' ? `${'total' in res ? res.total : ''} cultos apagados.` : 'Culto apagado.', 'sucesso')
    }

    const conta = resumo ? (alcance === 'SEGUINTES' ? resumo.seguintes : resumo.este) : null
    const temSerie = (resumo?.seguintes.cultos ?? 1) > 1
    const precisaConfirmar = !!conta && conta.escalas > 0
    const ate = resumo?.ate ? new Date(resumo.ate).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''

    return (
        <>
            <button type="button" onClick={abrir} disabled={aCarregar || aApagar} className={className} title="Apagar evento" aria-label={`Apagar ${nome}`}>
                {aCarregar || aApagar ? <Loader2 size={tamanho} className="animate-spin" /> : <Trash2 size={tamanho} />}
            </button>

            {/* No body: dentro da linha da lista (clicável) os cliques não chegavam bem */}
            {aberto && conta && createPortal(
                <div onClick={e => e.stopPropagation()} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Apagar ${nome}`}>
                    <div className="bg-bg w-full max-w-md rounded-2xl shadow-2xl border border-soft overflow-hidden">
                        <div className="px-6 py-4 border-b border-soft flex justify-between items-center bg-bg2">
                            <div>
                                <p className="text-[13px] font-bold uppercase tracking-wide text-red-500">Apagar</p>
                                <h3 className="text-lg font-bold text-fg">{nome}</h3>
                            </div>
                            <button type="button" onClick={() => !aApagar && setAberto(false)} aria-label="Fechar"
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-red-500">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {temSerie && (
                                <fieldset className="rounded-xl border border-soft bg-bg2 p-3 space-y-2">
                                    <legend className="px-1 text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5">
                                        <Repeat size={10} /> Culto que se repete
                                    </legend>
                                    {([['ESTE', 'Só este culto'], ['SEGUINTES', `Este e os seguintes (${resumo!.seguintes.cultos} cultos, até ${ate})`]] as const).map(([v, txt]) => (
                                        <label key={v} className="flex items-center gap-2 text-sm font-bold text-fg cursor-pointer">
                                            <input type="radio" name={`alcance-${id}`} checked={alcance === v} onChange={() => { setAlcance(v); setConfirmouEscalas(false) }} className="accent-figueira" />
                                            {txt}
                                        </label>
                                    ))}
                                    <p className="text-[13px] text-muted">Os cultos anteriores nunca se apagam.</p>
                                </fieldset>
                            )}

                            <ul className="text-sm text-fg space-y-1">
                                <li>Vai apagar <strong>{conta.cultos} culto{conta.cultos !== 1 ? 's' : ''}</strong>.</li>
                                {conta.escalas > 0 && <li className="text-red-600 font-bold">{conta.escalas} escala{conta.escalas !== 1 ? 's' : ''} feita{conta.escalas !== 1 ? 's' : ''}{conta.cultos > 1 ? ` (em ${conta.comEscalas} culto${conta.comEscalas !== 1 ? 's' : ''})` : ''} também se apaga{conta.escalas !== 1 ? 'm' : ''}.</li>}
                                {conta.comRepertorio > 0 && <li>{conta.comRepertorio > 1 ? `${conta.comRepertorio} cultos têm` : 'Tem'} repertório escolhido, que também se apaga.</li>}
                                {conta.comSermoes > 0 && <li>{conta.comSermoes > 1 ? `${conta.comSermoes} cultos têm` : 'Tem'} sermão registado, que também se apaga.</li>}
                            </ul>

                            {precisaConfirmar && (
                                <label className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-3 cursor-pointer">
                                    <input type="checkbox" checked={confirmouEscalas} onChange={e => setConfirmouEscalas(e.target.checked)} className="mt-0.5 h-4 w-4 accent-red-500 shrink-0" />
                                    <span className="text-sm font-bold text-red-700">Sei que as escalas feitas também se apagam e quem estava escalado deixa de as ver.</span>
                                </label>
                            )}

                            <div className="flex gap-2">
                                <button type="button" onClick={() => setAberto(false)} disabled={aApagar}
                                    className="flex-1 py-3 rounded-xl border border-soft text-[13px] font-bold uppercase tracking-wide text-muted hover:text-fg">
                                    Cancelar
                                </button>
                                <button type="button" onClick={apagar} disabled={aApagar || (precisaConfirmar && !confirmouEscalas)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 text-white text-[13px] font-bold uppercase tracking-wide hover:bg-red-600 disabled:opacity-40">
                                    {aApagar ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                    {alcance === 'SEGUINTES' ? `Apagar ${conta.cultos}` : 'Apagar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

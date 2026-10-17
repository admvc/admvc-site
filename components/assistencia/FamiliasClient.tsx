'use client'

// Lista das famílias apoiadas: nova / editar (formulário simples) e o histórico de cada uma.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Loader2, Phone, Plus, Users } from 'lucide-react'
import { alternarFamiliaAtiva, guardarFamiliaAssistencia } from '@/actions/assistencia-actions'

type Familia = {
    id: number; nome: string; telefone: string | null; morada: string | null; pessoas: number; notas: string | null
    ativo: boolean; consentimento: string; historico: { chave: string; data: string; texto: string }[]
}

const campo = 'w-full rounded-xl border border-soft bg-bg px-3 py-2.5 text-sm text-fg outline-none focus:border-figueira'
const dia = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Europe/Lisbon' })

function Formulario({ f, onFim }: { f?: Familia; onFim: () => void }) {
    const router = useRouter()
    const [erro, setErro] = useState<string | null>(null)
    const [pendente, iniciar] = useTransition()
    return (
        <form className="space-y-3 rounded-2xl border border-soft bg-bg2 p-4"
            action={(fd) => iniciar(async () => {
                setErro(null)
                const r = await guardarFamiliaAssistencia(fd)
                if (r.error) { setErro(r.error); return }
                onFim(); router.refresh()
            })}>
            {f && <input type="hidden" name="id" value={f.id} />}
            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <label className="space-y-1 text-sm"><span className="font-semibold">Família / responsável *</span>
                    <input name="nome" required defaultValue={f?.nome} className={campo} /></label>
                <label className="space-y-1 text-sm"><span className="font-semibold">Pessoas</span>
                    <input name="pessoas" type="number" min={1} max={30} defaultValue={f?.pessoas ?? 1} className={campo} /></label>
                <label className="space-y-1 text-sm"><span className="font-semibold">Telefone</span>
                    <input name="telefone" type="tel" defaultValue={f?.telefone ?? ''} className={campo} /></label>
                <label className="space-y-1 text-sm sm:col-span-2"><span className="font-semibold">Morada</span>
                    <input name="morada" defaultValue={f?.morada ?? ''} className={campo} /></label>
                <label className="space-y-1 text-sm sm:col-span-2"><span className="font-semibold">Notas (necessidades, quem encaminhou…)</span>
                    <textarea name="notas" rows={2} defaultValue={f?.notas ?? ''} className={campo} /></label>
            </div>
            {!f && (
                <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" name="consentimento" required className="mt-0.5 h-4 w-4 accent-figueira" />
                    A família autorizou a igreja a guardar estes dados para a apoiar (RGPD).
                </label>
            )}
            {erro && <p role="alert" className="text-sm font-semibold text-red-600">{erro}</p>}
            <div className="flex gap-2">
                <button disabled={pendente} className="flex items-center gap-2 rounded-xl bg-figueira px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {pendente && <Loader2 size={14} className="animate-spin" />} Guardar
                </button>
                <button type="button" onClick={onFim} className="rounded-xl border border-soft px-4 py-2 text-sm">Cancelar</button>
            </div>
        </form>
    )
}

export default function FamiliasClient({ familias }: { familias: Familia[] }) {
    const router = useRouter()
    const [nova, setNova] = useState(false)
    const [editar, setEditar] = useState<number | null>(null)
    const [pendente, iniciar] = useTransition()

    return (
        <div className="space-y-4">
            {nova ? <Formulario onFim={() => setNova(false)} /> : (
                <button onClick={() => setNova(true)} className="flex items-center gap-2 rounded-xl bg-figueira px-4 py-2.5 text-sm font-semibold text-white">
                    <Plus size={16} /> Nova família
                </button>
            )}

            {familias.length === 0 && !nova && (
                <p className="rounded-2xl border border-dashed border-soft p-8 text-center text-sm text-muted">Ainda não há famílias registadas.</p>
            )}

            <ul className="space-y-2">
                {familias.map((f) => (
                    <li key={f.id} className={f.ativo ? '' : 'opacity-60'}>
                        {editar === f.id ? <Formulario f={f} onFim={() => setEditar(null)} /> : (
                            <details className="group rounded-2xl border border-soft bg-bg2">
                                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                                    <Users size={18} className="shrink-0 text-figueira" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-fg">{f.nome}{!f.ativo && ' (já não apoiada)'}</span>
                                        <span className="block text-sm text-muted">
                                            {f.pessoas} {f.pessoas === 1 ? 'pessoa' : 'pessoas'} · {f.historico.length} {f.historico.length === 1 ? 'entrega' : 'entregas'}
                                            {f.historico[0] ? ` · última a ${dia(f.historico[0].data)}` : ''}
                                        </span>
                                    </span>
                                    <ChevronDown size={18} className="shrink-0 text-muted transition-transform group-open:rotate-180" />
                                </summary>
                                <div className="space-y-3 border-t border-soft px-4 py-3 text-sm">
                                    {f.telefone && <a href={`tel:${f.telefone}`} className="inline-flex items-center gap-1.5 underline"><Phone size={14} /> {f.telefone}</a>}
                                    {f.morada && <p>{f.morada}</p>}
                                    {f.notas && <p className="whitespace-pre-wrap text-muted">{f.notas}</p>}
                                    <div>
                                        <p className="font-semibold">O que recebeu</p>
                                        {f.historico.length === 0 ? <p className="text-muted">Nada ainda.</p> : (
                                            <ul className="mt-1 space-y-0.5">{f.historico.map((h) => <li key={h.chave}>{dia(h.data)} — {h.texto}</li>)}</ul>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted">Autorização RGPD a {dia(f.consentimento)}.</p>
                                    <div className="flex flex-wrap gap-3">
                                        <button onClick={() => setEditar(f.id)} className="font-semibold text-figueira hover:underline">Editar</button>
                                        <button disabled={pendente} onClick={() => iniciar(async () => { await alternarFamiliaAtiva(f.id, !f.ativo); router.refresh() })}
                                            className="text-muted hover:underline">{f.ativo ? 'Já não é apoiada' : 'Voltar a apoiar'}</button>
                                    </div>
                                </div>
                            </details>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

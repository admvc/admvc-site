'use client'

// Músicas repetidas: escolher a que fica e juntar. Antes de juntar mostra o resumo do que vai acontecer.
import { useState } from 'react'
import { Loader2, Merge } from 'lucide-react'
import { juntarDuplicadas, resumoDaJuncao } from '@/actions/musicas-arrumar-actions'

type M = { id: string; titulo: string; artista: string | null; tom: string | null; cultos: number; ligada: boolean }
type G = { motivo: 'obra' | 'titulo'; sugerida: string; musicas: M[] }

export default function Duplicados({ grupos }: { grupos: G[] }) {
    const [lista, setLista] = useState(grupos)
    const [feito, setFeito] = useState<string[]>([])
    return (
        <section className="space-y-3" aria-labelledby="t-dup">
            <h2 id="t-dup" className="text-[19px] font-bold">Duplicadas <span className="a-suave text-[16px] font-normal">· {lista.length} grupo{lista.length === 1 ? '' : 's'}</span></h2>
            {feito.map((f, i) => <p key={i} role="status" className="a-card p-4 text-[15px]">{f}</p>)}
            {lista.length === 0 && <p className="a-card p-5 text-[16px] a-suave">Não há músicas repetidas.</p>}
            <ul className="space-y-3">
                {lista.map((g) => (
                    <Grupo key={g.musicas.map((m) => m.id).join()} g={g}
                        onJunto={(frases, ids) => { setFeito((f) => [`Juntadas. ${frases[0]}`, ...f]); setLista((l) => l.filter((x) => !x.musicas.some((m) => ids.includes(m.id)))) }} />
                ))}
            </ul>
        </section>
    )
}

function Grupo({ g, onJunto }: { g: G; onJunto: (frases: string[], ids: string[]) => void }) {
    const [fica, setFica] = useState(g.sugerida)
    const [resumo, setResumo] = useState<string[] | null>(null)
    const [aFazer, setAFazer] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const outras = g.musicas.filter((m) => m.id !== fica).map((m) => m.id)

    async function ver() {
        setAFazer(true); setErro(null)
        const r = await resumoDaJuncao(fica, outras)
        setAFazer(false)
        if (r.ok === false) setErro(r.error); else setResumo(r.frases)
    }
    async function juntar() {
        setAFazer(true); setErro(null)
        const r = await juntarDuplicadas(fica, outras)
        setAFazer(false)
        if (r.ok === false) setErro(r.error); else onJunto(r.frases, g.musicas.map((m) => m.id))
    }

    return (
        <li className="a-card space-y-3 p-4">
            <p className="text-[14px] a-suave">{g.motivo === 'obra' ? 'Mesma obra no CSDB' : 'Mesmo título e artista'}</p>
            <fieldset className="space-y-2">
                <legend className="sr-only">Qual fica</legend>
                {g.musicas.map((m) => (
                    <label key={m.id} className="a-foco flex min-h-[56px] cursor-pointer items-start gap-3 rounded-[12px] border p-3"
                        style={{ borderColor: fica === m.id ? 'var(--a-destaque)' : 'var(--a-borda)' }}>
                        <input type="radio" name={`g-${g.sugerida}`} checked={fica === m.id} onChange={() => { setFica(m.id); setResumo(null) }} className="mt-1 h-5 w-5" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[16px] font-semibold break-words">{m.titulo}</span>
                            <span className="block text-[15px] a-suave break-words">
                                {[m.artista || 'Sem artista', m.tom ? `tom ${m.tom}` : null, `${m.cultos} culto${m.cultos === 1 ? '' : 's'}`, m.ligada ? 'ligada ao CSDB' : null].filter(Boolean).join(' · ')}
                            </span>
                        </span>
                        {fica === m.id && <span className="shrink-0 text-[13px] font-semibold" style={{ color: 'var(--a-destaque)' }}>Fica</span>}
                    </label>
                ))}
            </fieldset>
            {resumo && (
                <div className="space-y-1 rounded-[12px] p-3 text-[15px]" style={{ background: 'var(--a-aviso-suave)' }}>
                    {resumo.map((f, i) => <p key={i}>{f}</p>)}
                </div>
            )}
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-perigo, #b3261e)' }}>{erro}</p>}
            <div className="flex flex-wrap gap-2">
                {!resumo ? (
                    <button type="button" onClick={ver} disabled={aFazer} className="a-botao a-botao-principal !min-h-[48px]">
                        {aFazer ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Merge size={18} aria-hidden />} Juntar
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={juntar} disabled={aFazer} className="a-botao a-botao-principal !min-h-[48px]">
                            {aFazer ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Merge size={18} aria-hidden />} Confirmar e juntar
                        </button>
                        <button type="button" onClick={() => setResumo(null)} disabled={aFazer} className="a-botao a-botao-secundario !min-h-[48px]">Cancelar</button>
                    </>
                )}
            </div>
        </li>
    )
}

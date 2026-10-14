'use client'

/**
 * Restaurar uma copia, em dois passos: escolher o ficheiro (a app le-o e
 * mostra o que muda, sem tocar em nada) e confirmar escrevendo RESTAURAR.
 *
 * O ficheiro fica no estado do componente e vai outra vez no segundo passo.
 * Um `<form action>` seria reposto pelo React depois do primeiro envio e o
 * ficheiro escolhido perdia-se — por isso os envios sao feitos a mao.
 */

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, FileUp, Loader2, RotateCcw, XCircle } from 'lucide-react'
import { analisarCopiaAction, restaurarCopiaAction, type AnaliseDaCopia, type EstadoDaCopia } from '@/actions/copia-actions'

const quando = (iso: string) =>
    new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'long', timeStyle: 'short' })

function Mensagem({ estado }: { estado: EstadoDaCopia }) {
    if (!estado.message) return null
    return (
        <p role="status" className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${estado.ok
            ? 'border-green-500/30 bg-green-500/10 text-green-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
            {estado.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />}
            <span>{estado.message}</span>
        </p>
    )
}

export default function RestaurarCopia() {
    const router = useRouter()
    const entrada = useRef<HTMLInputElement>(null)
    const [ficheiro, setFicheiro] = useState<File | null>(null)
    const [analise, setAnalise] = useState<AnaliseDaCopia | null>(null)
    const [resultado, setResultado] = useState<EstadoDaCopia>({ ok: true })
    const [confirmacao, setConfirmacao] = useState('')
    const [aLer, lerEmTransicao] = useTransition()
    const [aRestaurar, restaurarEmTransicao] = useTransition()

    function escolher(f: File | null) {
        setFicheiro(f); setAnalise(null); setConfirmacao(''); setResultado({ ok: true })
        if (!f) return
        const dados = new FormData()
        dados.set('ficheiro', f)
        lerEmTransicao(async () => setAnalise(await analisarCopiaAction(dados)))
    }

    function restaurar() {
        if (!ficheiro) return
        const dados = new FormData()
        dados.set('ficheiro', ficheiro)
        dados.set('confirmacao', confirmacao)
        restaurarEmTransicao(async () => {
            const r = await restaurarCopiaAction(dados)
            setResultado(r)
            if (r.ok) {
                setFicheiro(null); setAnalise(null); setConfirmacao('')
                if (entrada.current) entrada.current.value = ''
                router.refresh()
            }
        })
    }

    const tabelas = (analise?.ok ? analise.tabelas : undefined) ?? []
    const visiveis = tabelas.filter((t) => t.agora > 0 || t.naCopia > 0)
    const perdidas = tabelas.filter((t) => t.depoisDaCopia > 0)
    const podeRestaurar = Boolean(analise?.ok && ficheiro) && confirmacao.trim().toUpperCase() === 'RESTAURAR'

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label htmlFor="ficheiro-copia" className="text-sm font-bold text-zinc-300">Ficheiro da cópia (.json)</label>
                <input id="ficheiro-copia" ref={entrada} type="file" accept="application/json,.json" disabled={aLer || aRestaurar}
                    onChange={(e) => escolher(e.currentTarget.files?.[0] ?? null)}
                    className="block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#222] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[#333]" />
                <p className="text-xs text-zinc-500">Escolher o ficheiro não muda nada: primeiro a app mostra o que ia mudar.</p>
            </div>

            {aLer && (
                <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 size={16} className="animate-spin" aria-hidden />A ler a cópia…</p>
            )}

            {analise && !analise.ok && <Mensagem estado={analise} />}

            {analise?.ok && (
                <div className="space-y-4">
                    <p className="flex items-start gap-2 text-sm text-zinc-300">
                        <FileUp size={16} className="mt-0.5 shrink-0 text-blue-400" aria-hidden />
                        <span>Cópia de <strong className="text-white">{quando(analise.gravadoEm!)}</strong> (versão {analise.versao}).</span>
                    </p>

                    {perdidas.length > 0 && (
                        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
                            <span>Perde-se o que foi criado depois da cópia — {perdidas.map((t) => `${t.modelo}: ${t.depoisDaCopia}`).join(' · ')}.</span>
                        </div>
                    )}

                    <div className="max-h-96 overflow-auto rounded-xl border border-[#222]">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-[#1A1A1A] text-[10px] uppercase tracking-widest text-zinc-500">
                                <tr>
                                    <th className="px-4 py-2 text-left font-black">Tabela</th>
                                    <th className="px-4 py-2 text-right font-black">Agora</th>
                                    <th className="px-4 py-2 text-right font-black">Fica (da cópia)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visiveis.map((t) => (
                                    <tr key={t.modelo} className="border-t border-[#1A1A1A]">
                                        <td className="px-4 py-1.5 text-zinc-300">{t.modelo}</td>
                                        <td className="px-4 py-1.5 text-right tabular-nums text-zinc-400">{t.agora}</td>
                                        <td className={`px-4 py-1.5 text-right tabular-nums ${t.naCopia < t.agora ? 'font-bold text-red-400' : 'text-zinc-300'}`}>{t.naCopia}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {analise.avisos && analise.avisos.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-400">
                            {analise.avisos.map((a) => <li key={a}>{a}</li>)}
                        </ul>
                    )}

                    <p className="text-sm text-zinc-400">
                        Os Super Admins, as palavras-passe e o registo de alterações ficam como estão. Antes de
                        restaurar, a app guarda uma cópia do que há agora — se for engano, restaura-se essa.
                    </p>

                    <div className="space-y-1.5">
                        <label htmlFor="confirmacao-copia" className="text-sm font-bold text-zinc-300">Para confirmar, escreva RESTAURAR</label>
                        <input id="confirmacao-copia" value={confirmacao} autoComplete="off" disabled={aRestaurar}
                            onChange={(e) => setConfirmacao(e.currentTarget.value)}
                            className="block w-full max-w-xs rounded-xl border border-[#333] bg-[#0A0A0A] px-4 py-2.5 text-white outline-none focus:border-blue-500" />
                    </div>

                    <button type="button" disabled={!podeRestaurar || aRestaurar} onClick={restaurar}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {aRestaurar
                            ? <><Loader2 size={16} className="animate-spin" aria-hidden />A restaurar…</>
                            : <><RotateCcw size={16} aria-hidden />Restaurar esta cópia</>}
                    </button>
                </div>
            )}

            <Mensagem estado={resultado} />
        </div>
    )
}

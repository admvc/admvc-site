'use client'

// Editar uma rotina (de um culto ou de um modelo): momentos por ordem, com
// setas para mudar a ordem (mais fácil do que arrastar no telemóvel).

import { useId, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import {
    MOMENTOS, ePalavra, horasPrevistas, repeticoes, responsavel,
    type ItemRotina, type MembroRotina, type PregacaoFeita,
} from '@/lib/rotina-culto'

const OUTRO = 'outro'

type Linha = ItemRotina & { chave: number }

let proxima = 1
const comChave = (itens: ItemRotina[]): Linha[] => itens.map((i) => ({ ...i, chave: proxima++ }))

export function useRotina(inicial: ItemRotina[]) {
    const [linhas, setLinhas] = useState<Linha[]>(() => comChave(inicial))
    return {
        linhas,
        itens: linhas.map(({ chave: _c, ...i }) => i) as ItemRotina[],
        substituir: (itens: ItemRotina[]) => setLinhas(comChave(itens)),
        setLinhas,
    }
}

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export default function EditorRotina({ linhas, setLinhas, membros, inicio, desativado, feitas = [] }: {
    linhas: Linha[]
    setLinhas: (f: (l: Linha[]) => Linha[]) => void
    membros: MembroRotina[]
    inicio?: string // hora do culto, para mostrar a hora prevista de cada momento
    desativado?: boolean
    feitas?: PregacaoFeita[] // pregações anteriores (avisar se o tema ou o texto se repete)
}) {
    const idLista = useId()
    const mapa = new Map(membros.map((m) => [m.id, m]))
    const opcoes = membros
        .map((m) => ({ id: m.id, texto: responsavel({ momento: '', membro_id: m.id }, mapa) }))
        .sort((a, b) => a.texto.localeCompare(b.texto, 'pt'))
    const horas = inicio ? horasPrevistas(inicio, linhas) : []

    const mudar = (chave: number, campos: Partial<ItemRotina>) =>
        setLinhas((l) => l.map((x) => (x.chave === chave ? { ...x, ...campos } : x)))
    const mover = (i: number, d: -1 | 1) =>
        setLinhas((l) => {
            const n = [...l]
            ;[n[i], n[i + d]] = [n[i + d], n[i]]
            return n
        })

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <div className="space-y-3">
            <datalist id={idLista}>{MOMENTOS.map((m) => <option key={m} value={m} />)}</datalist>
            {linhas.length === 0 && <p className="a-card p-4 text-[16px] a-suave">Ainda não há momentos. Junte o primeiro em baixo.</p>}
            <ol className="space-y-3">
                {linhas.map((l, i) => {
                    const valorQuem = l.membro_id ? String(l.membro_id) : l.nome !== null && l.nome !== undefined ? OUTRO : ''
                    return (
                        <li key={l.chave} className="a-card space-y-3 p-4">
                            <div className="flex items-center gap-2">
                                <span className="w-12 shrink-0 text-[16px] font-bold tabular-nums" style={{ color: 'var(--a-destaque)' }}>
                                    {horas[i] ?? `${i + 1}.`}
                                </span>
                                <label className="min-w-0 flex-1">
                                    <span className="sr-only">Momento {i + 1}</span>
                                    <input list={idLista} value={l.momento} disabled={desativado} placeholder="Momento (ex.: Louvor)"
                                        onChange={(e) => mudar(l.chave, { momento: e.target.value })}
                                        className={`${campo} font-semibold`} style={estilo} />
                                </label>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                                <label className="block space-y-1">
                                    <span className="text-[14px] font-semibold a-suave">Responsável</span>
                                    <select value={valorQuem} disabled={desativado} className={campo} style={estilo}
                                        onChange={(e) => {
                                            const v = e.target.value
                                            if (v === OUTRO) mudar(l.chave, { membro_id: null, nome: '' })
                                            else if (!v) mudar(l.chave, { membro_id: null, nome: null })
                                            else mudar(l.chave, { membro_id: Number(v), nome: null })
                                        }}>
                                        <option value="">Ninguém em especial</option>
                                        <option value={OUTRO}>Outra pessoa (escrever o nome)…</option>
                                        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.texto}</option>)}
                                    </select>
                                </label>
                                <label className="block space-y-1">
                                    <span className="text-[14px] font-semibold a-suave">Duração (min)</span>
                                    <input type="number" inputMode="numeric" min={1} max={600} value={l.duracao ?? ''} disabled={desativado}
                                        onChange={(e) => mudar(l.chave, { duracao: e.target.value ? Number(e.target.value) : null })}
                                        className={campo} style={estilo} />
                                </label>
                            </div>

                            {valorQuem === OUTRO && (
                                <label className="block space-y-1">
                                    <span className="text-[14px] font-semibold a-suave">Nome (com o título, se tiver)</span>
                                    <input value={l.nome ?? ''} disabled={desativado} placeholder="ex.: Pastor João Silva (convidado)"
                                        onChange={(e) => mudar(l.chave, { nome: e.target.value })} className={campo} style={estilo} />
                                </label>
                            )}

                            <label className="block space-y-1">
                                <span className="text-[14px] font-semibold a-suave">{ePalavra(l.momento) ? 'Tema' : 'Nota'}</span>
                                <input value={l.nota ?? ''} disabled={desativado}
                                    placeholder={ePalavra(l.momento) ? 'ex.: Os talentos de Deus' : 'ex.: quem canta, o que levar'}
                                    onChange={(e) => mudar(l.chave, { nota: e.target.value })} className={campo} style={estilo} />
                            </label>

                            {ePalavra(l.momento) && (
                                <label className="block space-y-1">
                                    <span className="text-[14px] font-semibold a-suave">Texto bíblico</span>
                                    <input value={l.texto ?? ''} disabled={desativado} placeholder="ex.: Mateus 25:14-30"
                                        onChange={(e) => mudar(l.chave, { texto: e.target.value })} className={campo} style={estilo} />
                                </label>
                            )}

                            {ePalavra(l.momento) && repeticoes(l, feitas).slice(0, 3).map((f, k) => (
                                <p key={k} role="status" className="flex gap-2 rounded-[12px] p-3 text-[15px]"
                                    style={{ background: 'var(--a-aviso-suave)', color: 'var(--a-aviso)' }}>
                                    <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
                                    <span>
                                        Já pregado a {dataCurta(f.data)} ({f.culto}){f.quem ? `, por ${f.quem}` : ''}:{' '}
                                        {[f.tema, f.texto].filter(Boolean).join(' · ')}
                                    </span>
                                </p>
                            ))}

                            <div className="flex gap-2">
                                <button type="button" className="a-botao a-botao-secundario flex-1 !min-h-[44px]" disabled={desativado || i === 0}
                                    aria-label={`Subir ${l.momento || 'momento'}`} onClick={() => mover(i, -1)}>
                                    <ArrowUp size={20} aria-hidden /> Subir
                                </button>
                                <button type="button" className="a-botao a-botao-secundario flex-1 !min-h-[44px]" disabled={desativado || i === linhas.length - 1}
                                    aria-label={`Descer ${l.momento || 'momento'}`} onClick={() => mover(i, 1)}>
                                    <ArrowDown size={20} aria-hidden /> Descer
                                </button>
                                <button type="button" className="a-botao a-botao-secundario !min-h-[44px] !px-3" disabled={desativado}
                                    aria-label={`Tirar ${l.momento || 'momento'}`} style={{ color: 'var(--a-erro)' }}
                                    onClick={() => setLinhas((x) => x.filter((y) => y.chave !== l.chave))}>
                                    <Trash2 size={20} aria-hidden />
                                </button>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <button type="button" className="a-botao a-botao-secundario w-full" disabled={desativado}
                onClick={() => setLinhas((l) => [...l, { momento: '', chave: proxima++ }])}>
                <Plus size={20} aria-hidden /> Juntar momento
            </button>
        </div>
    )
}

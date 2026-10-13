'use client'

// Alterar as musicas de um culto (lider do louvor): ordem com setas (mais
// facil do que arrastar), tom, tirar; juntar do repertorio ou criar uma nova.

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Search, Trash2, X } from 'lucide-react'
import {
    adicionarMusicaNaEscala, criarMusica, moverMusicaNaEscala, mudarTomNaEscala,
    pesquisarRepertorio, tirarMusicaDaEscala,
} from '@/actions/repertorio-app-actions'
import type { DadosEscala } from '@/lib/ministerios-app'
import { diaPorExtenso, hora } from './datas'

export const TONS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']
const TONS_TODOS = [...TONS, ...TONS.map((t) => t + 'm')]

type Resultado = { ok: boolean; error?: string }

export function EscolherTom({ valor, onMudar, rotulo, disabled }: { valor: string; onMudar: (t: string) => void; rotulo: string; disabled?: boolean }) {
    const opcoes = TONS_TODOS.includes(valor) || !valor ? TONS_TODOS : [valor, ...TONS_TODOS]
    return (
        <select value={valor} disabled={disabled} aria-label={rotulo} onChange={(e) => onMudar(e.target.value)}
            className="a-foco min-h-[44px] rounded-[12px] border px-2 text-[17px] font-bold"
            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)', borderColor: 'var(--a-borda)' }}>
            {!valor && <option value="">Tom</option>}
            {opcoes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
    )
}

export default function AlterarMusicas({ dados }: { dados: DadosEscala }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [aviso, setAviso] = useState<string | null>(null)
    const [juntar, setJuntar] = useState(false)
    const { evento, departamento, musicas } = dados

    function correr(f: () => Promise<Resultado>, depois?: () => void) {
        setAviso(null)
        iniciar(async () => {
            const r = await f()
            if (!r.ok) setAviso(r.error || 'Não foi possível.')
            else {
                depois?.()
                router.refresh()
            }
        })
    }

    return (
        <div className="space-y-5">
            <Link href={`/escalas/culto/${evento.id}?equipa=${departamento.id}`} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                <ArrowLeft size={20} aria-hidden /> Voltar à escala
            </Link>

            <header className="space-y-1">
                <p className="text-[15px] font-semibold a-suave">Músicas</p>
                <h1 className="text-[24px] font-bold leading-tight">{evento.nome}</h1>
                <p className="text-[17px]">{diaPorExtenso(evento.data)}, às {hora(evento.data)}</p>
            </header>

            {musicas.length === 0 ? (
                <p className="a-card p-4 text-[16px] a-suave">Ainda não há músicas neste culto.</p>
            ) : (
                <ol className="space-y-3">
                    {musicas.map((m, i) => (
                        <li key={m.id} className="a-card p-4 space-y-3">
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 w-6 shrink-0 text-center text-[17px] font-bold a-suave">{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[17px] font-semibold leading-snug">{m.titulo}</span>
                                    <span className="block text-[15px] a-suave">
                                        {m.artista || 'Sem artista'}{m.tomOriginal ? ` · original em ${m.tomOriginal}` : ''}
                                    </span>
                                </span>
                                <EscolherTom valor={m.tom} rotulo={`Tom de ${m.titulo}`} disabled={pendente}
                                    onMudar={(t) => correr(() => mudarTomNaEscala(m.id, t))} />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" className="a-botao a-botao-secundario flex-1 !min-h-[44px]" disabled={pendente || i === 0}
                                    aria-label={`Subir ${m.titulo}`} onClick={() => correr(() => moverMusicaNaEscala(m.id, -1))}>
                                    <ArrowUp size={20} aria-hidden /> Subir
                                </button>
                                <button type="button" className="a-botao a-botao-secundario flex-1 !min-h-[44px]" disabled={pendente || i === musicas.length - 1}
                                    aria-label={`Descer ${m.titulo}`} onClick={() => correr(() => moverMusicaNaEscala(m.id, 1))}>
                                    <ArrowDown size={20} aria-hidden /> Descer
                                </button>
                                <button type="button" className="a-botao a-botao-secundario !min-h-[44px] !px-3" disabled={pendente}
                                    aria-label={`Tirar ${m.titulo}`} style={{ color: 'var(--a-erro)' }}
                                    onClick={() => correr(() => tirarMusicaDaEscala(m.id))}>
                                    <Trash2 size={20} aria-hidden />
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            <button type="button" className="a-botao a-botao-principal w-full" onClick={() => setJuntar(true)}>
                <Plus size={20} aria-hidden /> Juntar música
            </button>

            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}

            {juntar && (
                <JuntarMusica
                    eventoId={evento.id}
                    jaNoCulto={musicas.map((m) => m.musicaId)}
                    onFechar={() => setJuntar(false)}
                    correr={correr}
                    pendente={pendente}
                />
            )}
        </div>
    )
}

type Encontrada = { id: string; titulo: string; artista: string | null; tom: string | null }

function JuntarMusica({ eventoId, jaNoCulto, onFechar, correr, pendente }: {
    eventoId: number
    jaNoCulto: string[]
    onFechar: () => void
    correr: (f: () => Promise<Resultado>, depois?: () => void) => void
    pendente: boolean
}) {
    const [texto, setTexto] = useState('')
    const [lista, setLista] = useState<Encontrada[]>([])
    const [escolhida, setEscolhida] = useState<Encontrada | null>(null)
    const [tom, setTom] = useState('')
    const [nova, setNova] = useState(false)
    const [novaDados, setNovaDados] = useState({ titulo: '', artista: '', tom: '' })

    useEffect(() => {
        const t = setTimeout(async () => {
            const r = await pesquisarRepertorio(texto)
            if (r.ok) setLista(r.musicas)
        }, 250)
        return () => clearTimeout(t)
    }, [texto])

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]'
    const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <div className="app-novo fixed inset-0 z-[60] flex flex-col" role="dialog" aria-modal="true" aria-label="Juntar música"
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
                <h2 className="text-[22px] font-bold">{nova ? 'Música nova' : escolhida ? 'Em que tom?' : 'Juntar música'}</h2>
                <button type="button" onClick={onFechar} className="a-botao a-botao-secundario !px-3" aria-label="Fechar">
                    <X size={22} aria-hidden />
                </button>
            </div>

            <div className="mx-auto w-full max-w-md flex-1 space-y-4 overflow-y-auto px-4 pb-8">
                {nova ? (
                    <form className="space-y-3" onSubmit={(e) => {
                        e.preventDefault()
                        correr(async () => {
                            const r = await criarMusica({ titulo: novaDados.titulo, artista: novaDados.artista, tom: novaDados.tom }, { eventoId, tom: novaDados.tom })
                            return r.ok ? { ok: true } : r
                        }, onFechar)
                    }}>
                        <label className="block space-y-1">
                            <span className="text-[15px] font-semibold">Nome da música</span>
                            <input required value={novaDados.titulo} onChange={(e) => setNovaDados({ ...novaDados, titulo: e.target.value })} className={campo} style={estiloCampo} />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-[15px] font-semibold">Artista</span>
                            <input value={novaDados.artista} onChange={(e) => setNovaDados({ ...novaDados, artista: e.target.value })} className={campo} style={estiloCampo} />
                        </label>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[15px] font-semibold">Tom</span>
                            <EscolherTom valor={novaDados.tom} rotulo="Tom" onMudar={(t) => setNovaDados({ ...novaDados, tom: t })} />
                        </div>
                        <p className="text-[14px] a-suave">Links, cifra e BPM acrescentam-se depois, na página da música (Repertório).</p>
                        <button type="submit" className="a-botao a-botao-principal w-full" disabled={pendente || !novaDados.titulo.trim() || !novaDados.tom}>
                            Criar e juntar ao culto
                        </button>
                        <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setNova(false)}>Voltar à pesquisa</button>
                    </form>
                ) : escolhida ? (
                    <div className="space-y-4">
                        <div className="a-card p-4">
                            <p className="text-[18px] font-semibold">{escolhida.titulo}</p>
                            <p className="text-[15px] a-suave">{escolhida.artista || 'Sem artista'}{escolhida.tom ? ` · original em ${escolhida.tom}` : ''}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-[16px] font-semibold">Tom neste culto</span>
                            <EscolherTom valor={tom} rotulo="Tom neste culto" onMudar={setTom} />
                        </div>
                        <button type="button" className="a-botao a-botao-principal w-full" disabled={pendente || !tom}
                            onClick={() => correr(() => adicionarMusicaNaEscala(eventoId, escolhida.id, tom), onFechar)}>
                            Juntar ao culto
                        </button>
                        <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setEscolhida(null)}>Escolher outra</button>
                    </div>
                ) : (
                    <>
                        <label className="relative block">
                            <span className="sr-only">Pesquisar no repertório</span>
                            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 a-suave" aria-hidden />
                            <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome ou artista"
                                className={`${campo} pl-12`} style={estiloCampo} />
                        </label>
                        <ul className="space-y-2">
                            {lista.map((m) => {
                                const ja = jaNoCulto.includes(m.id)
                                return (
                                    <li key={m.id}>
                                        <button type="button" disabled={ja} onClick={() => { setEscolhida(m); setTom(m.tom || '') }}
                                            className="a-card a-foco flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-60">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[17px] font-semibold">{m.titulo}</span>
                                                <span className="block text-[14px] a-suave">{ja ? 'Já está neste culto' : (m.artista || 'Sem artista')}</span>
                                            </span>
                                            {m.tom && <span className="text-[16px] font-bold a-suave">{m.tom}</span>}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                        {lista.length === 0 && <p className="text-[16px] a-suave">{texto ? 'Não está no repertório.' : 'O repertório está vazio.'}</p>}
                        <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => { setNova(true); setNovaDados({ titulo: texto, artista: '', tom: '' }) }}>
                            <Plus size={20} aria-hidden /> Criar música nova
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

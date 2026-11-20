'use client'

// Alterar as musicas de um culto (lider do louvor): ordem com setas (mais
// facil do que arrastar), tom, tirar; juntar do repertorio ou criar uma nova.

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Search, Trash2 } from 'lucide-react'
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

            <JuntarMusica eventoId={evento.id} jaNoCulto={musicas.map((m) => m.musicaId)} correr={correr} pendente={pendente} />

            {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
        </div>
    )
}

type Encontrada = { id: string; titulo: string; artista: string | null; tom: string | null }

/** Uma linha de resultado: o tom já vem escolhido (o original) e o botão Juntar — sem janelas. */
function LinhaResultado({ m, ja, pendente, onJuntar }: { m: Encontrada; ja: boolean; pendente: boolean; onJuntar: (tom: string) => void }) {
    const [tom, setTom] = useState(m.tom || '')
    return (
        <li className="a-card flex min-h-[60px] items-center gap-2 px-3 py-2">
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">{m.titulo}</span>
                <span className="block truncate text-[14px] a-suave">{ja ? 'Já está neste culto' : (m.artista || 'Sem artista')}</span>
            </span>
            {!ja && <EscolherTom valor={tom} rotulo={`Tom de ${m.titulo}`} onMudar={setTom} disabled={pendente} />}
            {!ja && (
                <button type="button" className="a-botao a-botao-principal !min-h-[44px] !px-3" disabled={pendente || !tom} onClick={() => onJuntar(tom)}
                    aria-label={`Juntar ${m.titulo}`} title={tom ? undefined : 'Escolha o tom'}>
                    <Plus size={18} aria-hidden /> Juntar
                </button>
            )}
        </li>
    )
}

/**
 * Juntar músicas (20/11): a pesquisa fica na própria página. Cada resultado traz o tom (o original, se houver) e "Juntar";
 * depois de juntar, a caixa limpa e fica pronta para a seguinte. Se não estiver no repertório, a última linha cria a música
 * com o nome escrito (artista e tom na mesma linha) e junta-a logo — os links acrescentam-se depois no Repertório.
 */
function JuntarMusica({ eventoId, jaNoCulto, correr, pendente }: {
    eventoId: number
    jaNoCulto: string[]
    correr: (f: () => Promise<Resultado>, depois?: () => void) => void
    pendente: boolean
}) {
    const [texto, setTexto] = useState('')
    const [lista, setLista] = useState<Encontrada[]>([])
    const [artista, setArtista] = useState('')
    const [tomNova, setTomNova] = useState('')
    const [ultima, setUltima] = useState('')

    useEffect(() => {
        if (!texto.trim()) return
        const t = setTimeout(async () => {
            const r = await pesquisarRepertorio(texto)
            if (r.ok) setLista(r.musicas.slice(0, 8))
        }, 200)
        return () => clearTimeout(t)
    }, [texto])

    function limpar(nomeJuntado: string) {
        setUltima(nomeJuntado); setTexto(''); setArtista(''); setTomNova(''); setLista([])
        setTimeout(() => document.getElementById('juntar-pesquisa')?.focus(), 50)
    }

    const nome = texto.trim()
    const igual = lista.some((m) => m.titulo.trim().toLowerCase() === nome.toLowerCase())
    const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <section className="space-y-3" aria-labelledby="h-juntar">
            <h2 id="h-juntar" className="text-[18px] font-bold">Juntar música</h2>
            <label className="relative block">
                <span className="sr-only">Pesquisar no repertório</span>
                <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 a-suave" aria-hidden />
                <input id="juntar-pesquisa" value={texto} onChange={(e) => { setTexto(e.target.value); setUltima(''); if (!e.target.value.trim()) setLista([]) }}
                    placeholder="Escreva o nome, o artista ou parte da letra" autoComplete="off"
                    className="a-foco min-h-[48px] w-full rounded-[14px] border pl-12 pr-4 text-[16px]" style={estiloCampo} />
            </label>
            {ultima && !nome && <p role="status" className="text-[15px] font-semibold" style={{ color: 'var(--a-ok, #16a34a)' }}>✓ «{ultima}» juntada. Pode escrever a seguinte.</p>}

            {nome && (
                <ul className="space-y-2">
                    {lista.map((m) => (
                        <LinhaResultado key={m.id} m={m} ja={jaNoCulto.includes(m.id)} pendente={pendente}
                            onJuntar={(tom) => correr(() => adicionarMusicaNaEscala(eventoId, m.id, tom), () => limpar(m.titulo))} />
                    ))}
                    {!igual && nome.length >= 2 && (
                        <li className="a-card space-y-2 p-3" style={{ borderStyle: 'dashed' }}>
                            <p className="text-[15px]">{lista.length ? 'Não é nenhuma destas?' : 'Não está no repertório.'} Juntar <strong>«{nome}»</strong> como música nova:</p>
                            <div className="flex flex-wrap items-center gap-2">
                                <input value={artista} onChange={(e) => setArtista(e.target.value)} placeholder="Artista (opcional)" aria-label="Artista"
                                    className="a-foco min-h-[44px] w-full min-w-0 rounded-[12px] border px-3 text-[15px] sm:w-auto sm:flex-1" style={estiloCampo} />
                                <EscolherTom valor={tomNova} rotulo="Tom da música nova" onMudar={setTomNova} disabled={pendente} />
                                <button type="button" className="a-botao a-botao-principal !min-h-[44px] flex-1 !px-3 sm:flex-none" disabled={pendente || !tomNova}
                                    onClick={() => correr(async () => {
                                        const r = await criarMusica({ titulo: nome, artista, tom: tomNova, link_video: '', link_cifra: '' }, { eventoId, tom: tomNova })
                                        return r.ok ? { ok: true } : r
                                    }, () => limpar(nome))}>
                                    <Plus size={18} aria-hidden /> Criar e juntar
                                </button>
                            </div>
                            <p className="text-[13px] a-suave">Links do YouTube e da cifra acrescentam-se depois, no Repertório.</p>
                        </li>
                    )}
                </ul>
            )}
        </section>
    )
}

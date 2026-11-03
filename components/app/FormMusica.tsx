'use client'

// Criar ou editar uma musica do repertorio. "Procurar no CSDB" acha a musica no
// banco de musicas cristas e preenche tudo com os links verificados; "Procurar
// links" usa a pesquisa antiga (CifraClub, Letras, YouTube, Spotify) como recurso.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Database, Loader2, Search } from 'lucide-react'
import { criarMusica, editarMusica, type DadosMusica } from '@/actions/repertorio-app-actions'
import PesquisarLinksMusica from '@/components/louvor/PesquisarLinksMusica'
import { EscolherTom } from './AlterarMusicas'
import { formatarDuracao, type DadosDaFaixa, type ResumoFaixaCsdb } from '@/lib/csdb-dados'

export default function FormMusica({ musica }: { musica?: DadosMusica & { id: string } }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [erro, setErro] = useState<string | null>(null)
    const [procurar, setProcurar] = useState(false)
    const [d, setD] = useState<DadosMusica>({
        titulo: musica?.titulo ?? '',
        artista: musica?.artista ?? '',
        tom: musica?.tom ?? '',
        bpm: musica?.bpm ?? null,
        link_cifra: musica?.link_cifra ?? '',
        link_letra: musica?.link_letra ?? '',
        link_video: musica?.link_video ?? '',
        link_audio: musica?.link_audio ?? '',
        csdb_track_id: musica?.csdb_track_id ?? null,
    })
    // Procurar no CSDB
    const [csdbAberto, setCsdbAberto] = useState(false)
    const [q, setQ] = useState('')
    const [buscando, setBuscando] = useState(false)
    const [faixas, setFaixas] = useState<ResumoFaixaCsdb[] | null>(null)
    const [erroCsdb, setErroCsdb] = useState<string | null>(null)
    const [escolhendo, setEscolhendo] = useState<number | null>(null)
    const [playback, setPlayback] = useState(false)
    const mudar = (k: keyof DadosMusica, v: string | number | null) => setD((x) => ({ ...x, [k]: v }))

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    function abrirCsdb() {
        if (!csdbAberto) setQ([d.titulo, d.artista].filter(Boolean).join(' ').trim())
        setCsdbAberto((v) => !v)
        setErroCsdb(null)
    }

    async function procurarCsdb() {
        const termo = q.trim()
        if (termo.length < 2) return setErroCsdb('Escreve o nome da música (e o artista).')
        setBuscando(true); setErroCsdb(null); setFaixas(null)
        try {
            const r = await fetch(`/api/musica/csdb/procurar?q=${encodeURIComponent(termo)}`)
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.error || 'Não foi possível procurar no CSDB.')
            setFaixas(j.faixas)
        } catch (err) {
            setErroCsdb(err instanceof Error ? err.message : 'Não foi possível procurar no CSDB.')
        } finally {
            setBuscando(false)
        }
    }

    async function escolherFaixa(id: number) {
        setEscolhendo(id); setErroCsdb(null)
        try {
            const r = await fetch(`/api/musica/csdb/${id}`)
            const j = await r.json().catch(() => ({}))
            if (!r.ok) throw new Error(j.error || 'Não foi possível ler a música no CSDB.')
            const m = j.musica as DadosDaFaixa
            // Só se substitui o que o CSDB sabe: um campo em falta lá não apaga o que já está aqui
            setD((x) => ({
                ...x,
                titulo: m.titulo,
                artista: m.artista ?? x.artista,
                tom: m.tom ?? x.tom,
                bpm: m.bpm ?? x.bpm,
                link_cifra: m.link_cifra ?? x.link_cifra,
                link_letra: m.link_letra ?? x.link_letra,
                link_video: m.link_video ?? x.link_video,
                link_audio: m.link_audio ?? x.link_audio,
                csdb_track_id: m.csdb_track_id,
            }))
            setPlayback(!!m.link_playback)
            setCsdbAberto(false)
        } catch (err) {
            setErroCsdb(err instanceof Error ? err.message : 'Não foi possível ler a música no CSDB.')
        } finally {
            setEscolhendo(null)
        }
    }

    function guardar(e: React.FormEvent) {
        e.preventDefault()
        setErro(null)
        iniciar(async () => {
            if (musica) {
                const r = await editarMusica(musica.id, d)
                if (r.ok === false) return setErro(r.error)
                router.push(`/louvor/musicas/${musica.id}`)
            } else {
                const r = await criarMusica(d)
                if (r.ok === false) return setErro(r.error)
                router.push(`/louvor/musicas/${r.id}`)
            }
            router.refresh()
        })
    }

    return (
        <form onSubmit={guardar} className="space-y-4">
            <section className="a-card p-4 space-y-3" aria-label="CSDB">
                {d.csdb_track_id ? (
                    <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-[16px] font-semibold">
                            <BadgeCheck size={20} aria-hidden style={{ color: 'var(--a-destaque)' }} /> Ligada ao CSDB
                        </p>
                        <button type="button" className="a-botao a-botao-secundario !min-h-[40px] text-[15px]" onClick={() => { mudar('csdb_track_id', null); setPlayback(false) }}>
                            Desligar
                        </button>
                    </div>
                ) : null}
                <button type="button" className="a-botao a-botao-secundario w-full" onClick={abrirCsdb} aria-expanded={csdbAberto}>
                    <Database size={18} aria-hidden /> {csdbAberto ? 'Fechar' : d.csdb_track_id ? 'Escolher outra no CSDB' : 'Procurar no CSDB'}
                </button>
                {!csdbAberto && !d.csdb_track_id && (
                    <p className="text-[14px] a-suave">Preenche o tom, o BPM e os links certos (cifra, letra, vídeo, áudio).</p>
                )}
                {playback && <p className="text-[14px] a-suave">Inclui playback para o ensaio.</p>}
                {csdbAberto && (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome e artista"
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void procurarCsdb() } }}
                                className="a-foco min-h-[48px] min-w-0 flex-1 rounded-[14px] border px-4 text-[16px]" style={estilo} aria-label="Procurar no CSDB" />
                            <button type="button" className="a-botao a-botao-principal !min-h-[48px] shrink-0" onClick={() => void procurarCsdb()} disabled={buscando}>
                                {buscando ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />} Procurar
                            </button>
                        </div>
                        {erroCsdb && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{erroCsdb}</p>}
                        {faixas && faixas.length === 0 && <p className="text-[15px] a-suave">Nada encontrado. Tenta só o nome da música.</p>}
                        {faixas && faixas.length > 0 && (
                            <ul className="a-divide" aria-label="Resultados do CSDB">
                                {faixas.map((f) => {
                                    const info = [f.ano, f.bpm ? `${f.bpm} bpm` : null, f.tom ? `tom ${f.tom}` : null, formatarDuracao(f.duracao_seg)].filter(Boolean).join(' · ')
                                    return (
                                        <li key={f.id}>
                                            <button type="button" onClick={() => void escolherFaixa(f.id)} disabled={escolhendo !== null}
                                                className="a-foco flex min-h-[56px] w-full items-center justify-between gap-3 py-2 text-left">
                                                <span className="min-w-0">
                                                    <span className="block truncate text-[16px] font-semibold">{f.titulo}</span>
                                                    <span className="block truncate text-[14px] a-suave">{f.artista || 'Sem artista'}</span>
                                                    {info && <span className="block text-[14px] a-suave">{info}</span>}
                                                </span>
                                                {escolhendo === f.id && <Loader2 size={18} className="shrink-0 animate-spin" aria-hidden />}
                                            </button>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </div>
                )}
            </section>

            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Nome da música</span>
                <input required value={d.titulo} onChange={(e) => mudar('titulo', e.target.value)} className={campo} style={estilo} />
            </label>
            <label className="block space-y-1">
                <span className="text-[15px] font-semibold">Artista</span>
                <input value={d.artista ?? ''} onChange={(e) => mudar('artista', e.target.value)} className={campo} style={estilo} />
            </label>
            <div className="flex gap-3">
                <div className="flex flex-1 items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold">Tom original</span>
                    <EscolherTom valor={d.tom ?? ''} rotulo="Tom original" onMudar={(t) => mudar('tom', t)} />
                </div>
                <label className="flex items-center gap-2">
                    <span className="text-[15px] font-semibold">BPM</span>
                    <input type="number" inputMode="numeric" min={30} max={300} value={d.bpm ?? ''}
                        onChange={(e) => mudar('bpm', e.target.value ? Number(e.target.value) : null)}
                        className="a-foco min-h-[44px] w-20 rounded-[12px] border px-2 text-[16px]" style={estilo} />
                </label>
            </div>

            <fieldset className="a-card p-4 space-y-3">
                <legend className="sr-only">Links</legend>
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[17px] font-bold">Links</h2>
                    <button type="button" className="a-botao a-botao-secundario !min-h-[40px] text-[15px]" disabled={!d.titulo.trim()} onClick={() => setProcurar((p) => !p)}>
                        <Search size={17} aria-hidden /> {procurar ? 'Fechar' : 'Procurar links'}
                    </button>
                </div>
                {procurar && (
                    <div className="rounded-[14px] bg-zinc-900 p-3 text-white">
                        <PesquisarLinksMusica titulo={d.titulo} artista={d.artista ?? ''} csdbId={d.csdb_track_id}
                            onSelectCifra={(u) => mudar('link_cifra', u)}
                            onSelectLetra={(u) => mudar('link_letra', u)}
                            onSelectAudio={(u) => mudar('link_audio', u)}
                            onSelectVideo={(u) => mudar('link_video', u)} />
                    </div>
                )}
                {([
                    ['link_cifra', 'Cifra', 'cifraclub.com.br/…'],
                    ['link_letra', 'Letra', 'letras.mus.br/…'],
                    ['link_video', 'Vídeo', 'youtube.com/…'],
                    ['link_audio', 'Áudio', 'open.spotify.com/…'],
                ] as const).map(([k, rotulo, exemplo]) => (
                    <label key={k} className="block space-y-1">
                        <span className="text-[15px] font-semibold">{rotulo}</span>
                        <input type="url" inputMode="url" placeholder={exemplo} value={(d[k] as string) ?? ''} onChange={(e) => mudar(k, e.target.value)} className={campo} style={estilo} />
                    </label>
                ))}
            </fieldset>

            {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{erro}</p>}

            <button type="submit" className="a-botao a-botao-principal w-full" disabled={pendente || !d.titulo.trim()}>
                {musica ? 'Guardar' : 'Criar música'}
            </button>
        </form>
    )
}

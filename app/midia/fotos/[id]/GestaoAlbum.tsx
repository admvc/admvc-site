'use client'

// Gestão do álbum: editar título/data, publicar/esconder, apagar; tocar nas fotos para as marcar e pôr/tirar etiquetas
// a várias de uma vez; usar uma como capa; ver quais têm mais corações.
import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, Eye, EyeOff, Heart, Trash2 } from 'lucide-react'
import { formatarBytes } from '@/lib/fotos-limites'
import type { FotoGestao } from '@/lib/fotos-midia'
import { apagarAlbum, apagarFotos, guardarAlbum, marcarFotos, publicarAlbum } from '../actions'

type Etiqueta = { id: number; nome: string; cor: string; icone: string | null; esconde: boolean }
type Album = { id: number; slug: string; titulo: string; dia: string; publicado: boolean; bytes: number; fotos: FotoGestao[] }

export default function GestaoAlbum({ album, etiquetas }: { album: Album; etiquetas: Etiqueta[] }) {
    const router = useRouter()
    const [ocupado, comecar] = useTransition()
    const [erro, setErro] = useState<string | null>(null)
    const [nota, setNota] = useState<string | null>(null)
    const [titulo, setTitulo] = useState(album.titulo)
    const [dia, setDia] = useState(album.dia)
    const [sel, setSel] = useState<Set<number>>(new Set())
    const [filtro, setFiltro] = useState<'todas' | 'gostadas' | number>('todas')
    const [confirmar, setConfirmar] = useState<null | 'album' | 'fotos'>(null)

    // cópia local das fotos: as etiquetas mudam logo no ecrã e o servidor confirma a seguir
    const [fotos, setFotos] = useState(album.fotos)
    useEffect(() => setFotos(album.fotos), [album.fotos])
    const porId = useMemo(() => new Map(fotos.map((f) => [f.id, f])), [fotos])
    const escondem = useMemo(() => new Set(etiquetas.filter((e) => e.esconde).map((e) => e.id)), [etiquetas])
    const maisGostadas = useMemo(() => [...fotos].filter((f) => f.gostos > 0).sort((a, b) => b.gostos - a.gostos).slice(0, 5), [fotos])
    const totalGostos = fotos.reduce((n, f) => n + f.gostos, 0)

    const visiveis = useMemo(() => {
        if (filtro === 'gostadas') return [...fotos].sort((a, b) => b.gostos - a.gostos)
        if (typeof filtro === 'number') return fotos.filter((f) => f.etiquetas.includes(filtro))
        return fotos
    }, [fotos, filtro])

    function correr(fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void, mensagem?: string) {
        setErro(null); setNota(null)
        comecar(async () => {
            const r = await fn()
            if (!r.ok) setErro(r.erro ?? 'Não foi possível concluir.')
            else { depois?.(); if (mensagem) setNota(mensagem); router.refresh() }
        })
    }

    const alternar = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
    const marcadas = [...sel].filter((id) => porId.has(id))

    /** Etiqueta nas fotos marcadas: todas / algumas / nenhuma. */
    function estado(etiquetaId: number): 'todas' | 'algumas' | 'nenhuma' {
        if (!marcadas.length) return 'nenhuma'
        const n = marcadas.filter((id) => porId.get(id)!.etiquetas.includes(etiquetaId)).length
        return n === 0 ? 'nenhuma' : n === marcadas.length ? 'todas' : 'algumas'
    }

    const campo = 'a-foco min-h-[48px] rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
    const alterado = titulo.trim() !== album.titulo || dia !== album.dia

    return (
        <div className="space-y-5">
            <section className="a-card space-y-3 p-4" aria-label="Dados do álbum">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[22px] font-bold leading-tight">{album.titulo}</h1>
                    <span className="rounded-full px-2 py-0.5 text-[13px] font-semibold"
                        style={album.publicado ? { background: 'rgba(16,185,129,.18)', color: '#047857' } : { background: 'var(--a-borda)' }}>
                        {album.publicado ? 'Publicado' : 'Escondido'}
                    </span>
                </div>
                <p className="text-[14px] a-suave">{album.fotos.length} {album.fotos.length === 1 ? 'foto' : 'fotos'} · {formatarBytes(album.bytes)} · <Heart size={12} aria-hidden className="inline" fill="currentColor" /> {totalGostos}</p>

                <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); correr(() => guardarAlbum(album.id, { titulo, dia }), undefined, 'Guardado.') }}>
                    <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1 text-[14px] a-suave">Título
                        <input value={titulo} maxLength={120} required onChange={(e) => setTitulo(e.target.value)} className={campo} style={estilo} />
                    </label>
                    <label className="flex flex-col gap-1 text-[14px] a-suave">Data do culto
                        <input type="date" value={dia} required onChange={(e) => setDia(e.target.value)} className={campo} style={estilo} />
                    </label>
                    <button type="submit" disabled={ocupado || !alterado} className="a-botao a-botao-principal">Guardar</button>
                </form>

                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" disabled={ocupado} onClick={() => correr(() => publicarAlbum(album.id, !album.publicado))} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">
                        {album.publicado ? <><EyeOff size={17} aria-hidden /> Esconder</> : <><Eye size={17} aria-hidden /> Publicar</>}
                    </button>
                    {album.publicado && (
                        <Link href={`/fotos/${album.slug}`} target="_blank" className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]"><ExternalLink size={17} aria-hidden /> Ver na galeria</Link>
                    )}
                    {confirmar === 'album' ? (
                        <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar">
                            <span className="text-[14px] font-semibold">Apagar o álbum e as {album.fotos.length} fotos?</span>
                            <button type="button" disabled={ocupado} onClick={() => correr(() => apagarAlbum(album.id), () => router.push('/midia/fotos'))} className="a-botao !min-h-[44px] !px-3 text-[15px]" style={{ background: '#dc2626', color: '#fff' }}>Sim, apagar</button>
                            <button type="button" onClick={() => setConfirmar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Cancelar</button>
                        </span>
                    ) : (
                        <button type="button" onClick={() => setConfirmar('album')} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]" style={{ color: '#dc2626' }}><Trash2 size={17} aria-hidden /> Apagar álbum</button>
                    )}
                </div>
                {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
                {nota && <p role="status" className="text-[15px] font-semibold" style={{ color: '#047857' }}>{nota}</p>}
            </section>

            {maisGostadas.length > 0 && (
                <section className="a-card p-3" aria-label="Mais gostadas">
                    <h2 className="mb-2 text-[16px] font-bold">Mais gostadas</h2>
                    <ul className="flex gap-2 overflow-x-auto pb-1">
                        {maisGostadas.map((f) => (
                            <li key={f.id} className="relative shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={f.mini} alt="" className="h-20 w-28 rounded-[10px] object-cover" />
                                <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 text-[12.5px] text-white"><Heart size={12} aria-hidden fill="currentColor" /> {f.gostos}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="space-y-3" aria-label="Fotos do álbum">
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[15px]">
                        <span className="a-suave">Mostrar</span>
                        <select value={String(filtro)} onChange={(e) => setFiltro(e.target.value === 'todas' || e.target.value === 'gostadas' ? e.target.value : Number(e.target.value))} className={`${campo} !min-h-[44px]`} style={estilo}>
                            <option value="todas">Todas as fotos</option>
                            <option value="gostadas">Mais gostadas primeiro</option>
                            {etiquetas.map((e) => <option key={e.id} value={e.id}>Com “{e.nome}”</option>)}
                        </select>
                    </label>
                    <button type="button" onClick={() => setSel(new Set(visiveis.map((f) => f.id)))} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Marcar todas</button>
                    {sel.size > 0 && <button type="button" onClick={() => setSel(new Set())} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Limpar</button>}
                </div>

                {marcadas.length > 0 && (
                    <div className="a-card sticky top-2 z-10 space-y-2 p-3 shadow-lg" role="region" aria-label="Fotos marcadas">
                        <p className="text-[15px] font-semibold">{marcadas.length} {marcadas.length === 1 ? 'foto marcada' : 'fotos marcadas'}</p>
                        <div className="flex flex-wrap gap-2">
                            {etiquetas.map((e) => {
                                const st = estado(e.id)
                                return (
                                    <button key={e.id} type="button" disabled={ocupado} aria-pressed={st === 'todas'}
                                        onClick={() => {
                                            const por = st !== 'todas'
                                            const alvo = new Set(marcadas)
                                            correr(() => marcarFotos(marcadas, e.id, por), () => setFotos((l) => l.map((f) => !alvo.has(f.id) ? f : { ...f, etiquetas: por ? [...new Set([...f.etiquetas, e.id])] : f.etiquetas.filter((x) => x !== e.id) })))
                                        }}
                                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-3 text-[15px] font-semibold"
                                        style={st === 'todas' ? { background: e.cor, borderColor: e.cor, color: '#fff' } : { borderColor: e.cor, color: 'var(--a-texto)', background: st === 'algumas' ? `${e.cor}33` : 'transparent' }}>
                                        {st === 'todas' && <Check size={15} aria-hidden />}{e.icone && <span aria-hidden>{e.icone}</span>} {e.nome}
                                    </button>
                                )
                            })}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {marcadas.length === 1 && (
                                <button type="button" disabled={ocupado} onClick={() => correr(() => guardarAlbum(album.id, { titulo: album.titulo, dia: album.dia, capaFotoId: marcadas[0] }), undefined, 'Capa mudada.')} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Usar como capa</button>
                            )}
                            {confirmar === 'fotos' ? (
                                <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar">
                                    <span className="text-[14px] font-semibold">Apagar {marcadas.length} para sempre?</span>
                                    <button type="button" disabled={ocupado} onClick={() => correr(() => apagarFotos(album.id, marcadas), () => { setSel(new Set()); setConfirmar(null) })} className="a-botao !min-h-[44px] !px-3 text-[15px]" style={{ background: '#dc2626', color: '#fff' }}>Sim, apagar</button>
                                    <button type="button" onClick={() => setConfirmar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Cancelar</button>
                                </span>
                            ) : (
                                <button type="button" onClick={() => setConfirmar('fotos')} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]" style={{ color: '#dc2626' }}><Trash2 size={17} aria-hidden /> Apagar as marcadas</button>
                            )}
                        </div>
                    </div>
                )}

                {visiveis.length === 0 ? (
                    <p className="a-card p-4 a-suave">Nenhuma foto neste filtro.</p>
                ) : (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                        {visiveis.map((f) => {
                            const marcada = sel.has(f.id)
                            const tags = f.etiquetas.map((id) => etiquetas.find((e) => e.id === id)).filter((e): e is Etiqueta => !!e)
                            const escondida = f.etiquetas.some((id) => escondem.has(id)) || f.pendente
                            return (
                                <li key={f.id} id={`foto-${f.id}`} className="a-card relative overflow-hidden" style={marcada ? { outline: '3px solid var(--a-destaque)', outlineOffset: '-3px' } : undefined}>
                                    <button type="button" onClick={() => alternar(f.id)} aria-pressed={marcada} aria-label={`${marcada ? 'Desmarcar' : 'Marcar'} a foto ${f.id}`} className="block w-full">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={f.mini} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" style={escondida ? { opacity: 0.45 } : undefined} />
                                    </button>
                                    <span aria-hidden className="pointer-events-none absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white shadow"
                                        style={{ background: marcada ? 'var(--a-destaque)' : 'rgba(0,0,0,.35)' }}>{marcada && <Check size={14} />}</span>
                                    <div className="pointer-events-none absolute right-1.5 top-1.5 flex max-w-[70%] flex-wrap justify-end gap-1">
                                        {f.capa && <span className="rounded-full bg-black/65 px-2 text-[12px] text-white">Capa</span>}
                                        {f.pendente && <span className="rounded-full px-2 text-[12px] text-white" style={{ background: '#dc2626' }}>Pedido</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
                                        {f.gostos > 0 && <span className="inline-flex items-center gap-1 text-[13px]"><Heart size={13} aria-hidden fill="currentColor" /> {f.gostos}</span>}
                                        {tags.map((e) => (
                                            <span key={e.id} title={e.nome} className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] text-white" style={{ background: e.cor }}>
                                                {e.icone ?? e.nome.slice(0, 2)}
                                            </span>
                                        ))}
                                        <a href={f.grande} target="_blank" rel="noopener noreferrer" aria-label="Abrir a foto em grande" className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full a-suave"><ExternalLink size={15} aria-hidden /></a>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </section>
        </div>
    )
}

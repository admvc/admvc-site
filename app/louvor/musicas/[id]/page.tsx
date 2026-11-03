// Uma musica do repertorio: tom, BPM, links, cifra e os ultimos cultos.
import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, BadgeCheck, FileText, Guitar, Headphones, Pencil, PlayCircle, Youtube } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio, podeVerRepertorio } from '@/lib/louvor-permissoes'
import { musicaDoRepertorio } from '@/lib/ministerios-app'
import CifraDaMusica, { ApagarMusica } from '@/components/app/CifraDaMusica'
import { diaCurto } from '@/components/app/datas'
import MusicaCsdbRelacionados from '@/components/app/MusicaCsdbRelacionados'
import { formatarDuracao, nomeIdioma, PLATAFORMAS } from '@/lib/csdb-dados'

export const dynamic = 'force-dynamic'

const LINKS = [
    { chave: 'cifra', texto: 'Cifra no site', Icone: Guitar },
    { chave: 'letra', texto: 'Letra', Icone: FileText },
    { chave: 'video', texto: 'Vídeo', Icone: Youtube },
    { chave: 'audio', texto: 'Áudio', Icone: Headphones },
] as const

export default async function MusicaPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeVerRepertorio(sessao))) redirect('/membros/dashboard')
    const [m, gere] = await Promise.all([musicaDoRepertorio(sessao, id), podeGerirRepertorio(sessao)])
    if (!m) redirect('/louvor/musicas')
    const links = LINKS.filter((l) => m.links[l.chave])
    const c = m.csdb
    // Outras plataformas do CSDB, só as que ainda não são o link de áudio/vídeo da música
    const outras = c ? PLATAFORMAS.filter((p) => c.links[p.tipo] && c.links[p.tipo] !== m.links.audio && c.links[p.tipo] !== m.links.video) : []
    const ficha = c ? ([
        ['Compositores', c.compositores.join(', ') || null],
        ['Ano', c.ano ? String(c.ano) : null],
        ['Duração', formatarDuracao(c.duracaoSeg)],
        ['Idioma', nomeIdioma(c.idioma)],
        ['Compasso', c.compasso],
    ] as const).filter(([, v]) => v) : []

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/louvor/musicas" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Repertório
                </Link>

                <header className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-[24px] font-bold leading-tight">{m.titulo}</h1>
                        <p className="text-[17px] a-suave">{m.artista || 'Sem artista'}</p>
                    </div>
                    {gere && (
                        <Link href={`/louvor/musicas/${m.id}/editar`} className="a-botao a-botao-secundario !min-h-[44px] !px-3" aria-label="Editar música">
                            <Pencil size={18} aria-hidden />
                        </Link>
                    )}
                </header>

                <div className="grid grid-cols-2 gap-3">
                    <div className="a-card p-4">
                        <p className="text-[14px] a-suave">Tom original</p>
                        <p className="text-[22px] font-bold">{m.tom || '—'}</p>
                    </div>
                    <div className="a-card p-4">
                        <p className="text-[14px] a-suave">BPM</p>
                        <p className="text-[22px] font-bold">{m.bpm || '—'}</p>
                    </div>
                </div>

                {c?.playback && (
                    <a href={c.playback} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-principal w-full">
                        <PlayCircle size={18} aria-hidden /> Playback para ensaio
                    </a>
                )}

                {links.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {links.map(({ chave, texto, Icone }) => (
                            <a key={chave} href={m.links[chave]!} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario">
                                <Icone size={18} aria-hidden /> {texto}
                            </a>
                        ))}
                    </div>
                )}

                {c && (
                    <section className="a-card p-4 space-y-3" aria-labelledby="sobre">
                        <div className="flex items-center justify-between gap-2">
                            <h2 id="sobre" className="text-[19px] font-bold">Sobre a música</h2>
                            <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[13px] font-semibold a-suave" style={{ borderColor: 'var(--a-borda)' }}>
                                <BadgeCheck size={15} aria-hidden /> Dados do CSDB
                            </span>
                        </div>
                        {ficha.length > 0 && (
                            <dl className="space-y-2">
                                {ficha.map(([k, v]) => (
                                    <div key={k} className="flex items-baseline justify-between gap-4">
                                        <dt className="text-[14px] a-suave">{k}</dt>
                                        <dd className="text-right text-[16px] font-semibold">{v}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {outras.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {outras.map((p) => (
                                    <a key={p.tipo} href={c.links[p.tipo]} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario !min-h-[40px] text-[15px]">
                                        {p.nome}
                                    </a>
                                ))}
                            </div>
                        )}
                    </section>
                )}

                {c && (
                    <Suspense fallback={null}>
                        <MusicaCsdbRelacionados trackId={c.trackId} tenantId={sessao.tenantId} />
                    </Suspense>
                )}

                <CifraDaMusica gere={gere}
                    musica={{ id: m.id, titulo: m.titulo, artista: m.artista, tom: m.tom, cifra: m.cifra, linkCifra: m.links.cifra }} />

                <section className="a-card p-4 space-y-2" aria-labelledby="tocada">
                    <h2 id="tocada" className="text-[19px] font-bold">Nos cultos</h2>
                    {m.tocadas.length === 0 ? (
                        <p className="text-[16px] a-suave">Ainda não foi tocada.</p>
                    ) : (
                        <ul className="a-divide">
                            {m.tocadas.map((t) => (
                                <li key={t.eventoId} className="flex items-center justify-between gap-3 py-2.5">
                                    <span className="min-w-0">
                                        <span className="block truncate text-[16px] font-semibold">{t.nome}</span>
                                        <span className="block text-[14px] a-suave">{diaCurto(t.data)}</span>
                                    </span>
                                    <span className="text-[16px] font-bold a-suave">{t.tom}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {gere && <ApagarMusica id={m.id} />}
            </main>
        </div>
    )
}

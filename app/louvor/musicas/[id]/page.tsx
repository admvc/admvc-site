// Uma musica do repertorio: tom, BPM, links, cifra e os ultimos cultos.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, FileText, Guitar, Headphones, Pencil, Youtube } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio, podeVerRepertorio } from '@/lib/louvor-permissoes'
import { musicaDoRepertorio } from '@/lib/ministerios-app'
import CifraDaMusica, { ApagarMusica } from '@/components/app/CifraDaMusica'
import { diaCurto } from '@/components/app/datas'

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

                {links.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                        {links.map(({ chave, texto, Icone }) => (
                            <a key={chave} href={m.links[chave]!} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario">
                                <Icone size={18} aria-hidden /> {texto}
                            </a>
                        ))}
                    </div>
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

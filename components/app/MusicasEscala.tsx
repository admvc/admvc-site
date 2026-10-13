// Musicas de uma escala (setlist): ordem, nome, tom e links. Botao grande para o
// modo palco (cifra com rolagem automatica). O lider tem "Alterar musicas".
import Link from 'next/link'
import { FileText, Guitar, Headphones, MonitorPlay, Pencil, Youtube } from 'lucide-react'
import type { DadosEscala } from '@/lib/ministerios-app'

const LINKS = [
    { chave: 'cifra', texto: 'Cifra', Icone: Guitar },
    { chave: 'letra', texto: 'Letra', Icone: FileText },
    { chave: 'video', texto: 'Vídeo', Icone: Youtube },
    { chave: 'audio', texto: 'Áudio', Icone: Headphones },
] as const

export default function MusicasEscala({ dados }: { dados: DadosEscala }) {
    const { musicas, gereMusicas, evento, departamento } = dados
    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="musicas">
            <div className="flex items-center justify-between gap-2">
                <h2 id="musicas" className="flex items-center gap-2 text-[19px] font-bold">
                    Músicas
                    <span className="rounded-full px-2 py-0.5 text-[13px] font-semibold a-suave" style={{ background: 'var(--a-bg)' }}>{musicas.length}</span>
                </h2>
                {gereMusicas && (
                    <Link href={`/escalas/culto/${evento.id}/musicas?equipa=${departamento.id}`}
                        className="a-foco inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold"
                        style={{ background: 'var(--a-bg)', color: 'var(--a-destaque)' }}>
                        <Pencil size={17} aria-hidden /> Alterar
                    </Link>
                )}
            </div>

            {musicas.length === 0 ? (
                <p className="text-[16px] a-suave">Nenhuma música adicionada.</p>
            ) : (
                <>
                    <ol className="a-divide">
                        {musicas.map((m, i) => (
                            <li key={m.id} className="flex items-start gap-3 py-3">
                                <span className="mt-0.5 w-6 shrink-0 text-center text-[17px] font-bold a-suave">{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <Link href={`/louvor/musicas/${m.musicaId}`} className="a-foco block">
                                        <span className="block text-[17px] font-semibold leading-snug">{m.titulo}</span>
                                        {m.artista && <span className="block text-[15px] a-suave">{m.artista}</span>}
                                    </Link>
                                    <span className="mt-2 flex flex-wrap gap-2">
                                        {LINKS.filter((l) => m.links[l.chave]).map(({ chave, texto, Icone }) => (
                                            <a key={chave} href={m.links[chave]!} target="_blank" rel="noopener noreferrer"
                                                className="a-foco inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold"
                                                style={{ borderColor: 'var(--a-borda)' }}>
                                                <Icone size={15} aria-hidden /> {texto}
                                            </a>
                                        ))}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right">
                                    <span className="block rounded-[10px] px-2.5 py-1 text-[17px] font-bold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}
                                        aria-label={`Tom ${m.tom}`}>
                                        {m.tom}
                                    </span>
                                    {m.bpm && <span className="mt-1 block text-[13px] a-suave">{m.bpm} bpm</span>}
                                </span>
                            </li>
                        ))}
                    </ol>
                    <Link href={`/louvor/setlist/${evento.id}`} className="a-botao a-botao-principal w-full">
                        <MonitorPlay size={20} aria-hidden /> Modo palco
                    </Link>
                </>
            )}
        </section>
    )
}

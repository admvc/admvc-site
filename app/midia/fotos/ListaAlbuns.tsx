'use client'

// Lista dos álbuns: título, data, nº de fotos, tamanho, publicado/escondido. Publicar/esconder e apagar (com confirmação).
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Heart, Pencil, Trash2 } from 'lucide-react'
import { formatarBytes } from '@/lib/fotos-limites'
import type { AlbumGestao } from '@/lib/fotos-midia'
import { apagarAlbum, publicarAlbum } from './actions'

const dataBonita = (dia: string) => new Date(`${dia}T00:00:00Z`).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/\./g, '')

export default function ListaAlbuns({ albuns }: { albuns: AlbumGestao[] }) {
    const router = useRouter()
    const [pendente, comecar] = useTransition()
    const [confirmar, setConfirmar] = useState<number | null>(null)
    const [erro, setErro] = useState<string | null>(null)

    function correr(fn: () => Promise<{ ok: boolean; erro?: string }>) {
        setErro(null)
        comecar(async () => {
            const r = await fn()
            if (!r.ok) setErro(r.erro ?? 'Não foi possível concluir.')
            else { setConfirmar(null); router.refresh() }
        })
    }

    if (albuns.length === 0) {
        return (
            <p className="a-card p-4 a-suave">
                Ainda não há álbuns. Os álbuns são criados pelo módulo &quot;Fotos do culto&quot; no Holyrics, quando a equipa envia as fotos do culto.
            </p>
        )
    }

    return (
        <section className="space-y-3" aria-label="Álbuns">
            {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
            <ul className="space-y-3">
                {albuns.map((a) => (
                    <li key={a.id} className="a-card p-3">
                        <div className="flex gap-3">
                            <Link href={`/midia/fotos/${a.id}`} className="shrink-0" aria-label={`Gerir o álbum ${a.titulo}`}>
                                {a.capa
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    ? <img src={a.capa} alt="" className="h-20 w-24 rounded-[12px] object-cover" />
                                    : <span className="block h-20 w-24 rounded-[12px]" style={{ background: 'var(--a-borda)' }} />}
                            </Link>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link href={`/midia/fotos/${a.id}`} className="text-[17px] font-bold leading-tight">{a.titulo}</Link>
                                    <span className="rounded-full px-2 py-0.5 text-[13px] font-semibold"
                                        style={a.publicado ? { background: 'rgba(16,185,129,.18)', color: '#047857' } : { background: 'var(--a-borda)' }}>
                                        {a.publicado ? 'Publicado' : 'Escondido'}
                                    </span>
                                    {a.pendentes > 0 && (
                                        <Link href="/midia/fotos?aba=pedidos" className="rounded-full px-2 py-0.5 text-[13px] font-semibold" style={{ background: '#dc2626', color: '#fff' }}>
                                            {a.pendentes} {a.pendentes === 1 ? 'pedido' : 'pedidos'}
                                        </Link>
                                    )}
                                </div>
                                <p className="text-[14px] a-suave">
                                    {dataBonita(a.dia)} · {a.fotos} {a.fotos === 1 ? 'foto' : 'fotos'} · {formatarBytes(a.bytes)}
                                    {a.gostos > 0 && <> · <Heart size={12} aria-hidden className="inline" fill="currentColor" /> {a.gostos}</>}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button type="button" disabled={pendente} onClick={() => correr(() => publicarAlbum(a.id, !a.publicado))}
                                className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">
                                {a.publicado ? <><EyeOff size={17} aria-hidden /> Esconder</> : <><Eye size={17} aria-hidden /> Publicar</>}
                            </button>
                            <Link href={`/midia/fotos/${a.id}`} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]"><Pencil size={17} aria-hidden /> Gerir</Link>
                            {confirmar === a.id ? (
                                <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar">
                                    <span className="text-[14px] font-semibold">Apagar o álbum e as {a.fotos} fotos?</span>
                                    <button type="button" disabled={pendente} onClick={() => correr(() => apagarAlbum(a.id))}
                                        className="a-botao !min-h-[44px] !px-3 text-[15px]" style={{ background: '#dc2626', color: '#fff' }}>Sim, apagar</button>
                                    <button type="button" onClick={() => setConfirmar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Cancelar</button>
                                </span>
                            ) : (
                                <button type="button" onClick={() => setConfirmar(a.id)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]" style={{ color: '#dc2626' }}>
                                    <Trash2 size={17} aria-hidden /> Apagar
                                </button>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    )
}

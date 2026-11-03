// Grelha só de leitura: cada foto abre o álbum onde está (usado no filtro "todas as fotos com a etiqueta X").
import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { FotoGestao } from '@/lib/fotos-midia'

export default function GradeFotos({ fotos }: { fotos: FotoGestao[] }) {
    return (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {fotos.map((f) => (
                <li key={f.id} className="a-card overflow-hidden">
                    <Link href={`/midia/fotos/${f.albumId}#foto-${f.id}`} className="block" aria-label={`Abrir o álbum ${f.albumTitulo ?? ''}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.mini} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                        <span className="flex items-center justify-between gap-2 px-2 py-1.5 text-[13px]">
                            <span className="truncate a-suave">{f.albumTitulo}</span>
                            {f.gostos > 0 && <span className="inline-flex shrink-0 items-center gap-1"><Heart size={13} aria-hidden fill="currentColor" /> {f.gostos}</span>}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    )
}

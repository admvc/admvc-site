'use client'

// Lista do repertorio com pesquisa (nome ou artista). Toque abre a musica.
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Guitar, Search } from 'lucide-react'
import type { MusicaDoRepertorio } from '@/lib/ministerios-app'
import { diaCurto } from './datas'

const semAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function ListaRepertorio({ musicas }: { musicas: MusicaDoRepertorio[] }) {
    const [texto, setTexto] = useState('')
    const lista = useMemo(() => {
        const t = semAcentos(texto.trim())
        if (!t) return musicas
        return musicas.filter((m) => semAcentos(`${m.titulo} ${m.artista ?? ''}`).includes(t))
    }, [texto, musicas])

    return (
        <div className="space-y-3">
            <label className="relative block">
                <span className="sr-only">Pesquisar no repertório</span>
                <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 a-suave" aria-hidden />
                <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pesquisar nome ou artista"
                    className="a-foco min-h-[48px] w-full rounded-[14px] border pl-12 pr-4 text-[16px]"
                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
            </label>
            <p className="text-[14px] a-suave">{lista.length} música{lista.length === 1 ? '' : 's'}</p>
            {lista.length === 0 ? (
                <p className="a-card p-5 text-[16px] a-suave">{musicas.length ? 'Nenhuma música encontrada.' : 'O repertório ainda está vazio.'}</p>
            ) : (
                <ul className="a-card a-divide">
                    {lista.map((m) => (
                        <li key={m.id}>
                            <Link href={`/louvor/musicas/${m.id}`} className="a-foco flex min-h-[64px] items-center gap-3 px-4 py-3">
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="truncate text-[17px] font-semibold">{m.titulo}</span>
                                        {m.temCifra && <Guitar size={16} className="shrink-0 a-suave" aria-label="Tem cifra" />}
                                    </span>
                                    <span className="block truncate text-[15px] a-suave">
                                        {m.artista || 'Sem artista'}
                                        {m.ultimaVez ? ` · tocada ${m.vezes}× (última ${diaCurto(m.ultimaVez)})` : ''}
                                    </span>
                                </span>
                                {m.tom && <span className="rounded-[10px] px-2.5 py-1 text-[16px] font-bold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>{m.tom}</span>}
                                <ChevronRight size={20} className="a-suave" aria-hidden />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

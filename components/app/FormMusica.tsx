'use client'

// Criar ou editar uma musica do repertorio. "Procurar links" usa a pesquisa que
// ja existia (CifraClub, Letras, YouTube, Spotify).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { criarMusica, editarMusica, type DadosMusica } from '@/actions/repertorio-app-actions'
import PesquisarLinksMusica from '@/components/louvor/PesquisarLinksMusica'
import { EscolherTom } from './AlterarMusicas'

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
    })
    const mudar = (k: keyof DadosMusica, v: string | number | null) => setD((x) => ({ ...x, [k]: v }))

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

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
                        <PesquisarLinksMusica titulo={d.titulo} artista={d.artista ?? ''}
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

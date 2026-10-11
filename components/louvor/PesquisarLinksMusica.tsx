'use client'
// components/louvor/PesquisarLinksMusica.tsx

import { useState, useTransition } from 'react'
import {
    Search, Loader2, ExternalLink, CheckCircle2,
    Youtube, FileText, Guitar, Headphones, AlertCircle,
    Music
} from 'lucide-react'

interface ResultadoSpotify {
    id: string
    titulo: string
    artista: string
    album: string
    url: string
    imagem?: string
    duracao_ms: number
}

interface ResultadoYoutube {
    id: string
    titulo: string
    canal: string
    url: string
    imagem?: string
}

interface ResultadosPesquisa {
    links_directos: { cifra: string; letra: string }
    spotify: ResultadoSpotify[]
    youtube: ResultadoYoutube[]
}

interface Props {
    titulo: string
    artista: string
    onSelectCifra: (url: string) => void
    onSelectLetra: (url: string) => void
    onSelectAudio: (url: string) => void
    onSelectVideo: (url: string) => void
}

function formatarDuracao(ms: number) {
    const min = Math.floor(ms / 60000)
    const seg = Math.floor((ms % 60000) / 1000)
    return `${min}:${seg.toString().padStart(2, '0')}`
}

// Botão de selecção compacto
function BtnUsar({ tipo, url, onSelect, label, cor }: {
    tipo: string; url: string
    onSelect: (url: string) => void
    label: string; cor: string
}) {
    const [usado, setUsado] = useState(false)
    return (
        <button
            type="button"
            onClick={() => { onSelect(url); setUsado(true) }}
            className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all
                ${usado ? 'bg-emerald-500 text-white' : cor}`}
        >
            {usado ? <CheckCircle2 size={9} /> : label}
        </button>
    )
}

export default function PesquisarLinksMusica({
    titulo, artista,
    onSelectCifra, onSelectLetra, onSelectAudio, onSelectVideo
}: Props) {
    const [isPending, startTransition] = useTransition()
    const [resultados, setResultados] = useState<ResultadosPesquisa | null>(null)
    const [erro, setErro] = useState('')

    async function pesquisar() {
        if (!titulo.trim()) return
        setErro('')
        startTransition(async () => {
            try {
                const params = new URLSearchParams({ titulo: titulo.trim(), artista: artista.trim() })
                const res = await fetch(`/api/musica/pesquisar?${params}`)
                if (!res.ok) throw new Error(`${res.status}`)
                setResultados(await res.json())
            } catch (err: any) {
                setErro('Erro ao pesquisar. Verifica a ligação.')
            }
        })
    }

    return (
        <div className="space-y-3">
            {/* BOTÃO */}
            <button
                type="button"
                onClick={pesquisar}
                disabled={isPending || !titulo.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-figueira/40 text-figueira bg-figueira/5 hover:bg-figueira/10 font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40"
            >
                {isPending
                    ? <><Loader2 size={12} className="animate-spin" /> A pesquisar...</>
                    : <><Search size={12} /> Pesquisar Links</>}
            </button>

            {/* ERRO */}
            {erro && (
                <div className="flex items-center gap-2 bg-red-500/8 border border-red-500/20 rounded-xl px-3 py-2">
                    <AlertCircle size={12} className="text-red-500 shrink-0" />
                    <p className="text-[9px] font-bold text-red-600">{erro}</p>
                </div>
            )}

            {/* RESULTADOS */}
            {resultados && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">

                    {/* CIFRA + LETRA — links directos */}
                    <div className="bg-bg2 border border-soft rounded-2xl p-3 space-y-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-1">
                            Links Directos
                        </p>

                        {/* CIFRA */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-orange-500/10 text-orange-500 rounded-lg flex items-center justify-center shrink-0">
                                <Guitar size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-fg">CifraClub</p>
                                <p className="text-[8px] text-muted truncate">cifraclub.com.br/...</p>
                            </div>
                            <a href={resultados.links_directos.cifra} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-muted hover:text-orange-500 transition-colors shrink-0" title="Abrir para verificar">
                                <ExternalLink size={12} />
                            </a>
                            <BtnUsar tipo="cifra" url={resultados.links_directos.cifra}
                                onSelect={onSelectCifra} label="Cifra"
                                cor="bg-orange-500/10 text-orange-700 border border-orange-500/20 hover:bg-orange-500 hover:text-white" />
                        </div>

                        {/* LETRA */}
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center shrink-0">
                                <FileText size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-fg">Letras.mus.br</p>
                                <p className="text-[8px] text-muted truncate">letras.mus.br/...</p>
                            </div>
                            <a href={resultados.links_directos.letra} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 text-muted hover:text-blue-500 transition-colors shrink-0" title="Abrir para verificar">
                                <ExternalLink size={12} />
                            </a>
                            <BtnUsar tipo="letra" url={resultados.links_directos.letra}
                                onSelect={onSelectLetra} label="Letra"
                                cor="bg-blue-500/10 text-blue-700 border border-blue-500/20 hover:bg-blue-500 hover:text-white" />
                        </div>

                        <p className="text-[7px] text-muted/60 font-medium pt-1">
                            ⚠️ Abre o link para confirmar antes de usar
                        </p>
                    </div>

                    {/* SPOTIFY */}
                    {resultados.spotify.length > 0 && (
                        <div className="bg-bg2 border border-soft rounded-2xl p-3 space-y-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Headphones size={11} className="text-green-500" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted">
                                    Spotify
                                </p>
                            </div>
                            {resultados.spotify.slice(0, 3).map(track => (
                                <div key={track.id} className="flex items-center gap-2 p-2 bg-bg border border-soft rounded-xl hover:border-green-500/30 transition-all">
                                    {track.imagem && (
                                        <img src={track.imagem} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-fg truncate leading-none">{track.titulo}</p>
                                        <p className="text-[8px] text-muted truncate mt-0.5">
                                            {track.artista} · {formatarDuracao(track.duracao_ms)}
                                        </p>
                                    </div>
                                    <a href={track.url} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 text-muted hover:text-green-500 transition-colors shrink-0">
                                        <ExternalLink size={11} />
                                    </a>
                                    <BtnUsar tipo="audio" url={track.url}
                                        onSelect={onSelectAudio} label="Audio"
                                        cor="bg-green-500/10 text-green-700 border border-green-500/20 hover:bg-green-500 hover:text-white" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* YOUTUBE */}
                    {resultados.youtube.length > 0 && (
                        <div className="bg-bg2 border border-soft rounded-2xl p-3 space-y-2">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Youtube size={11} className="text-red-500" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted">
                                    YouTube
                                </p>
                            </div>
                            {resultados.youtube.slice(0, 3).map(video => (
                                <div key={video.id} className="flex items-center gap-2 p-2 bg-bg border border-soft rounded-xl hover:border-red-500/30 transition-all">
                                    {video.imagem && (
                                        <img src={video.imagem} alt="" className="w-12 h-8 rounded-lg object-cover shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-fg truncate leading-none">{video.titulo}</p>
                                        <p className="text-[8px] text-muted truncate mt-0.5">{video.canal}</p>
                                    </div>
                                    <a href={video.url} target="_blank" rel="noopener noreferrer"
                                        className="p-1.5 text-muted hover:text-red-500 transition-colors shrink-0">
                                        <ExternalLink size={11} />
                                    </a>
                                    <BtnUsar tipo="video" url={video.url}
                                        onSelect={onSelectVideo} label="Video"
                                        cor="bg-red-500/10 text-red-700 border border-red-500/20 hover:bg-red-500 hover:text-white" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* SEM RESULTADOS VIA API */}
                    {resultados.spotify.length === 0 && resultados.youtube.length === 0 && (
                        <div className="bg-bg2 border border-soft rounded-xl px-4 py-4 text-center">
                            <Music size={18} className="mx-auto text-muted/30 mb-1.5" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                                Sem resultados Spotify/YouTube
                            </p>
                            <p className="text-[8px] text-muted/60 mt-0.5">
                                Usa os links directos acima ou preenche manualmente
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
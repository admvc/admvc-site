'use client'
// components/louvor/ModalEditarLinksMusica.tsx

import { useState, useTransition } from 'react'
import {
    X, Save, Loader2, Youtube, Music, FileText,
    Guitar, Headphones, Hash, Gauge, ExternalLink,
    CheckCircle2, Link as LinkIcon
} from 'lucide-react'
import { atualizarLinksMusica } from '@/actions/louvor-actions'
import Portal from '@/components/ui/Portal'
import PesquisarLinksMusica from '@/components/louvor/PesquisarLinksMusica'

interface Musica {
    id: string
    titulo: string
    artista?: string | null
    tom?: string | null
    bpm?: number | null
    link_video?: string | null
    link_letra?: string | null
    link_cifra?: string | null
    link_audio?: string | null
    holyrics_id?: string | null
}

interface Props {
    musica: Musica
    onSucesso?: (musicaActualizada: Musica) => void
}

function isUrl(str: string) {
    try { new URL(str); return true } catch { return false }
}

// Campo de URL compacto com indicador de preenchido
function CampoLink({ label, icon, value, onChange, placeholder, corFocus }: {
    label: string
    icon: React.ReactNode
    value: string
    onChange: (v: string) => void
    placeholder: string
    corFocus: string
}) {
    const preenchido = value && isUrl(value)
    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all
            ${preenchido ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-bg border border-soft'}`}>
            <span className="shrink-0 opacity-70">{icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-muted w-9 shrink-0">{label}</span>
            <input
                type="url"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`flex-1 min-w-0 bg-transparent text-[10px] font-medium text-fg outline-none placeholder:text-muted/30 ${corFocus}`}
            />
            {preenchido ? (
                <a href={value} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-emerald-500 hover:text-figueira transition-colors" title="Abrir link">
                    <ExternalLink size={11} />
                </a>
            ) : (
                <div className="w-4 shrink-0" />
            )}
        </div>
    )
}

export default function ModalEditarLinksMusica({ musica, onSucesso }: Props) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [sucesso, setSucesso] = useState(false)

    const [linkLetra, setLinkLetra] = useState(musica.link_letra || '')
    const [linkCifra, setLinkCifra] = useState(musica.link_cifra || '')
    const [linkAudio, setLinkAudio] = useState(musica.link_audio || '')
    const [linkVideo, setLinkVideo] = useState(musica.link_video || '')
    const [tomOriginal, setTomOriginal] = useState(musica.tom || '')
    const [bpm, setBpm] = useState(musica.bpm?.toString() || '')
    const [artista, setArtista] = useState(musica.artista || '')

    async function handleSalvar() {
        startTransition(async () => {
            const res = await atualizarLinksMusica(musica.id, {
                link_video: linkVideo || null,
                link_letra: linkLetra || null,
                link_cifra: linkCifra || null,
                link_audio: linkAudio || null,
                tom: tomOriginal || null,
                bpm: bpm ? Number(bpm) : null,
                artista: artista || null,
            })
            if (res.success) {
                setSucesso(true)
                onSucesso?.(res.data as Musica)
                setTimeout(() => { setSucesso(false); setIsOpen(false) }, 1500)
            }
        })
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)}
                className="p-2 rounded-xl text-muted hover:text-figueira hover:bg-figueira/10 transition-all"
                title="Editar links da música">
                <LinkIcon size={14} />
            </button>

            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        {/* max-w-2xl — mais largo que antes (era max-w-lg) */}
                        <div className="bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden">

                            {/* HEADER */}
                            <div className="flex items-center justify-between px-7 py-5 border-b border-soft bg-bg2 shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 bg-figueira/10 text-figueira rounded-xl flex items-center justify-center shrink-0">
                                        <Music size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none truncate">
                                            {musica.titulo}
                                        </h3>
                                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                            {musica.artista || 'Links e metadados'}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsOpen(false)}
                                    className="w-8 h-8 bg-soft/20 rounded-full flex items-center justify-center text-muted hover:bg-red-500 hover:text-white transition-all shrink-0 ml-3">
                                    <X size={15} />
                                </button>
                            </div>

                            <div className="px-7 py-5 overflow-y-auto space-y-5">

                                {/* METADADOS — linha única compacta */}
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest">Artista</label>
                                        <input value={artista} onChange={e => setArtista(e.target.value)}
                                            placeholder="Ex: Hillsong United"
                                            className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest flex items-center gap-1">
                                            <Hash size={8} /> Tom
                                        </label>
                                        <input value={tomOriginal} onChange={e => setTomOriginal(e.target.value)}
                                            placeholder="G, Am..." maxLength={5}
                                            className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase text-muted tracking-widest flex items-center gap-1">
                                            <Gauge size={8} /> BPM
                                        </label>
                                        <input type="number" value={bpm} onChange={e => setBpm(e.target.value)}
                                            placeholder="72" min={40} max={240}
                                            className="w-full bg-bg2 border border-soft rounded-xl px-3 py-2 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                    </div>
                                </div>

                                {/* PESQUISA AUTOMÁTICA */}
                                <div className="border-t border-soft pt-4">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-3">
                                        Pesquisa Automatica
                                    </p>
                                    <PesquisarLinksMusica
                                        titulo={musica.titulo}
                                        artista={artista || musica.artista || ''}
                                        onSelectCifra={setLinkCifra}
                                        onSelectLetra={setLinkLetra}
                                        onSelectAudio={setLinkAudio}
                                        onSelectVideo={setLinkVideo}
                                    />
                                </div>

                                {/* CAMPOS DE LINKS — compactos, numa coluna */}
                                <div className="border-t border-soft pt-4 space-y-2">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-muted mb-2">
                                        Links
                                    </p>
                                    <CampoLink label="Letra" icon={<FileText size={13} className="text-blue-500" />}
                                        value={linkLetra} onChange={setLinkLetra}
                                        placeholder="letras.mus.br/..." corFocus="focus:outline-none" />
                                    <CampoLink label="Cifra" icon={<Guitar size={13} className="text-orange-500" />}
                                        value={linkCifra} onChange={setLinkCifra}
                                        placeholder="cifraclub.com.br/..." corFocus="focus:outline-none" />
                                    <CampoLink label="Audio" icon={<Headphones size={13} className="text-green-500" />}
                                        value={linkAudio} onChange={setLinkAudio}
                                        placeholder="open.spotify.com/..." corFocus="focus:outline-none" />
                                    <CampoLink label="Video" icon={<Youtube size={13} className="text-red-500" />}
                                        value={linkVideo} onChange={setLinkVideo}
                                        placeholder="youtube.com/watch?v=..." corFocus="focus:outline-none" />
                                </div>
                            </div>

                            {/* FOOTER */}
                            <div className="px-7 py-5 border-t border-soft shrink-0">
                                <button onClick={handleSalvar} disabled={isPending}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all
                                        ${sucesso ? 'bg-emerald-500 text-white'
                                            : 'bg-fg text-bg hover:bg-figueira active:scale-95 disabled:opacity-50'}`}>
                                    {isPending ? <><Loader2 size={13} className="animate-spin" /> A guardar...</>
                                        : sucesso ? <><CheckCircle2 size={13} /> Guardado!</>
                                            : <><Save size={13} /> Guardar Links</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </>
    )
}
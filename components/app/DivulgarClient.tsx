'use client'

// Página aberta "Divulgar": separadores com os cultos, carrossel das artes, Partilhar / Descarregar e os textos prontos.
import { useState } from 'react'
import { Copy, Download, Send, Share2 } from 'lucide-react'
import type { CultoPublicado } from '@/lib/divulgacao-publica'
import { linkWhatsApp } from '@/lib/whatsapp'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { diaCurto, hora } from './datas'

type Culto = Omit<CultoPublicado, 'telao'>

const proporcao = (id: string) => (id === 'post' ? '4 / 5' : id === 'story' ? '9 / 16' : '16 / 9')
const nomeFicheiro = (c: Culto, id: string) => `${c.nome.normalize('NFD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 30) || 'culto'}-${id}.png`

function Texto({ titulo, valor, whatsapp }: { titulo: string; valor: string; whatsapp?: boolean }) {
    const [copiado, setCopiado] = useState(false)
    if (!valor) return null
    return (
        <div className="a-card space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[16px] font-semibold">{titulo}</span>
                <span className="flex gap-2">
                    <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 2000) } catch { /* sem área de transferência */ } }}
                        className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[14px]">
                        <Copy size={16} aria-hidden /> {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    {whatsapp && <a href={linkWhatsApp(valor)} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-principal !min-h-[44px] !px-3 text-[14px]"><Send size={16} aria-hidden /> Enviar no WhatsApp</a>}
                </span>
            </div>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed">{valor}</pre>
        </div>
    )
}

export default function DivulgarClient({ cultos }: { cultos: Culto[] }) {
    const [i, setI] = useState(0)
    const [aviso, setAviso] = useState('')
    const [aPartilhar, setAPartilhar] = useState('')

    if (cultos.length === 0) {
        return <p className="a-card p-4 text-[16px] a-suave">Ainda não há artes para os próximos dias. Volta a abrir esta página mais perto do culto.</p>
    }
    const c = cultos[Math.min(i, cultos.length - 1)]

    async function partilhar(arte: Culto['artes'][number]) {
        setAviso(''); setAPartilhar(arte.id)
        const r = await partilharArte(arte.url, nomeFicheiro(c, arte.id), c.textos.whatsapp)
        setAviso(AVISO_PARTILHA[r])
        setAPartilhar('')
    }

    return (
        <div className="space-y-4">
            {cultos.length > 1 && (
                <nav aria-label="Cultos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                    {cultos.map((x, n) => (
                        <button key={x.id} type="button" onClick={() => { setI(n); setAviso('') }} aria-current={n === i ? 'true' : undefined}
                            className="a-foco flex min-h-[56px] shrink-0 flex-col justify-center rounded-[14px] border px-3 text-left text-[15px] leading-tight aria-[current=true]:ring-2 aria-[current=true]:ring-[var(--a-acento,#f5a524)]"
                            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                            <span className="font-semibold">{diaCurto(x.data)} · {hora(x.data)}</span>
                            <span className="max-w-[12rem] truncate a-suave">{x.nome}</span>
                        </button>
                    ))}
                </nav>
            )}

            <section aria-label={`Artes: ${c.nome}`} className="space-y-2">
                <h2 className="text-[19px] font-bold">{c.nome} <span className="text-[15px] font-normal a-suave">· {diaCurto(c.data)}, {hora(c.data)}</span></h2>
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2">
                    {c.artes.map((a) => (
                        <figure key={a.id} className={`flex shrink-0 snap-center flex-col gap-2 ${a.id === 'youtube' ? 'w-[85vw] max-w-[560px]' : ''}`}>
                            <figcaption className="truncate text-[15px] font-semibold">{a.nome}</figcaption>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={a.url} alt={`${c.nome} — ${a.nome}`} loading="lazy"
                                className={`rounded-xl border ${a.id === 'youtube' ? 'w-full' : 'h-[min(46vh,400px)] w-auto'}`}
                                style={{ borderColor: 'var(--a-borda)', aspectRatio: proporcao(a.id), background: 'var(--a-card)' }} />
                            <div className="mt-auto flex gap-2">
                                <button type="button" onClick={() => partilhar(a)} disabled={aPartilhar === a.id} className="a-botao a-botao-principal !min-h-[48px] min-w-0 flex-1 !px-3">
                                    <Share2 size={18} className="shrink-0" aria-hidden /> {aPartilhar === a.id ? 'A abrir…' : 'Partilhar'}
                                </button>
                                <a href={a.url} download={nomeFicheiro(c, a.id)} target="_blank" rel="noopener noreferrer" aria-label={`Descarregar ${a.nome}`} className="a-botao a-botao-secundario !min-h-[48px] !px-3">
                                    <Download size={18} aria-hidden />
                                </a>
                            </div>
                        </figure>
                    ))}
                </div>
                {aviso && <p role="status" className="text-[15px] a-suave">{aviso}</p>}
            </section>

            <Texto titulo="Mensagem de WhatsApp" valor={c.textos.whatsapp} whatsapp />
            <Texto titulo="Legenda para Instagram / Facebook" valor={c.textos.legenda} />

            <div className="a-card space-y-2 p-4">
                <p className="text-[16px] font-semibold">Passa esta página a outros irmãos</p>
                <p className="text-[15px] a-suave">Quanto mais gente partilhar, mais longe chega o convite.</p>
                <a href={linkWhatsApp(`📣 Ajuda a divulgar os cultos da ADMVC: as artes e as mensagens estão prontas aqui 👉 https://app.igrejaadmvc.org/divulgar`)}
                    target="_blank" rel="noopener noreferrer" className="a-botao a-botao-secundario !min-h-[48px] w-full">
                    <Send size={18} aria-hidden /> Enviar o link no WhatsApp
                </a>
            </div>
        </div>
    )
}

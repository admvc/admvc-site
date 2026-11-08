'use client'

// Ecrã dos banners da cantina, pensado para o telemóvel: 1. modelo (galeria com a imagem verdadeira de cada um), 2. texto,
// 3. foto no centro (zoom e foco: arrasta-se na pré-visualização), 4. ver e descarregar. A última escolha fica neste aparelho.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, ImagePlus, RotateCcw, Share2, Trash2 } from 'lucide-react'
import PublicarNoCulto, { type CultoParaPublicar } from '@/components/encerramento/PublicarNoCulto'
import { publicarBannerNoCulto, retirarBannerDoCulto } from './publicar-actions'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { reduzirImagem } from '@/lib/reduzir-imagem'
import {
    AMOSTRA, DISPOSICAO, FORMATOS, LIMITES, MODELOS, arrastarFoco, formatarPreco, lerFormato, lerModelo, recorteQuadrado,
    type FormatoId, type ModeloId,
} from '@/lib/cantina-banners'

type Produto = { id: number; nome: string; preco: number; imagem: string | null }
type Foto = { url: string; w: number; h: number }
type Estado = {
    modelo: ModeloId; formato: FormatoId
    titulo: string; subtitulo: string; preco: string; nota: string
    foto: Foto | null; zoom: number; fx: number; fy: number; tirarBranco: boolean
}

const CHAVE = 'cantina-banner-v1'
const INICIAL: Estado = {
    modelo: 'toldo', formato: 'telao', titulo: AMOSTRA.titulo, subtitulo: AMOSTRA.subtitulo, preco: AMOSTRA.preco, nota: AMOSTRA.nota,
    foto: null, zoom: 1, fx: 0.5, fy: 0.5, tirarBranco: false,
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const chip = 'flex min-h-[48px] shrink-0 cursor-pointer items-center gap-2 rounded-[14px] border px-4 text-[16px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-destaque)] has-[:focus-visible]:ring-2'

function paraTexto(v: unknown, max: number): string { return typeof v === 'string' ? v.slice(0, max) : '' }
function lerGuardado(): Estado | null {
    try {
        const j = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
        if (!j || typeof j !== 'object') return null
        const n = (v: unknown, d: number, a: number, b: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d)
        const f = j.foto && typeof j.foto.url === 'string' ? { url: j.foto.url as string, w: n(j.foto.w, 0, 0, 20000), h: n(j.foto.h, 0, 0, 20000) } : null
        return {
            modelo: lerModelo(j.modelo), formato: lerFormato(j.formato),
            titulo: paraTexto(j.titulo, LIMITES.titulo), subtitulo: paraTexto(j.subtitulo, LIMITES.subtitulo), preco: paraTexto(j.preco, 14), nota: paraTexto(j.nota, LIMITES.nota),
            foto: f, zoom: n(j.zoom, 1, LIMITES.zoom[0], LIMITES.zoom[1]), fx: n(j.fx, 0.5, 0, 1), fy: n(j.fy, 0.5, 0, 1), tirarBranco: j.tirarBranco === true,
        }
    } catch { return null }
}

function useAssente<T>(valor: T, ms = 350): T {
    const [v, setV] = useState(valor)
    useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
    return v
}

function paramsBanner(e: Estado, formato: FormatoId): string {
    const q = new URLSearchParams({ modelo: e.modelo, formato, t: e.titulo, s: e.subtitulo, p: e.preco, n: e.nota })
    if (e.foto) {
        q.set('foto', e.foto.url); q.set('zoom', e.zoom.toFixed(2)); q.set('fx', e.fx.toFixed(3)); q.set('fy', e.fy.toFixed(3))
        if (e.tirarBranco) q.set('tb', '1')
    }
    return q.toString()
}

/** Vai buscar a imagem ao servidor (para poder mostrar a mensagem de erro, se houver). A antiga fica à vista enquanto a nova chega. */
function useImagem(url: string, grupo: string) {
    const [atual, setAtual] = useState<{ src: string; grupo: string } | null>(null)
    const [erro, setErro] = useState('')
    const [aCarregar, setACarregar] = useState(true)
    useEffect(() => {
        const ctl = new AbortController()
        setACarregar(true); setErro('')
        fetch(url, { signal: ctl.signal })
            .then(async (r) => {
                if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Não foi possível desenhar a imagem.')
                const obj = URL.createObjectURL(await r.blob())
                setAtual((antigo) => { if (antigo) URL.revokeObjectURL(antigo.src); return { src: obj, grupo } })
                setACarregar(false)
            })
            .catch((e) => { if (e?.name !== 'AbortError') { setErro(e instanceof Error ? e.message : 'Não foi possível desenhar a imagem.'); setACarregar(false) } })
        return () => ctl.abort()
    }, [url, grupo])
    // a imagem de outro formato (outro tamanho) não serve: fica escondida até chegar a nova
    const src = atual && atual.grupo === grupo ? atual.src : null
    return { src, erro, aCarregar: aCarregar || !src }
}

/** Miniatura da galeria: o modelo verdadeiro com o texto de exemplo. */
function Miniatura({ modelo, nome, ativo, onEscolher }: { modelo: ModeloId; nome: string; ativo: boolean; onEscolher: () => void }) {
    const [pronta, setPronta] = useState(false)
    const ref = useRef<HTMLImageElement>(null)
    const q = new URLSearchParams({ modelo, formato: 'telao', t: AMOSTRA.titulo, s: AMOSTRA.subtitulo, p: AMOSTRA.preco, n: AMOSTRA.nota, previa: '1' })
    const src = `/api/cantina/banner?${q}`
    useEffect(() => { const i = ref.current; if (i && i.complete && i.naturalWidth > 0) setPronta(true) }, [])
    return (
        <label className="relative block cursor-pointer overflow-hidden rounded-[14px] border-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--a-destaque)]"
            style={{ borderColor: ativo ? 'var(--a-destaque)' : 'var(--a-borda)', background: 'var(--a-card)' }}>
            <input type="radio" name="modelo" checked={ativo} onChange={onEscolher} className="sr-only" />
            <span className="relative block w-full" style={{ aspectRatio: '16 / 9', background: 'var(--a-bg)' }}>
                {!pronta && <span className="absolute inset-0 flex items-center justify-center text-[13px] a-suave">A desenhar…</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img ref={ref} src={src} alt={`Modelo ${nome}`} loading="lazy" onLoad={() => setPronta(true)} className="block h-full w-full object-cover" style={{ opacity: pronta ? 1 : 0 }} />
            </span>
            <span className="block px-2 py-2">
                <span className="block text-[15px] font-semibold leading-tight">{nome}</span>
                <span className="block text-[13px]" style={{ color: ativo ? 'var(--a-destaque)' : undefined }}>{ativo ? '✓ Escolhido' : 'Escolher'}</span>
            </span>
        </label>
    )
}

/** Arrastar com o dedo/rato sobre o círculo da foto muda o ponto da foto que fica no centro. */
function useArrastar(e: Estado, aoMudar: (fx: number, fy: number) => void) {
    const inicio = useRef<{ x: number; y: number; fx: number; fy: number; d: number } | null>(null)
    const f = e.foto
    return {
        onPointerDown: (ev: React.PointerEvent<HTMLElement>) => {
            if (!f || !f.w || !f.h) return
            ev.currentTarget.setPointerCapture(ev.pointerId)
            inicio.current = { x: ev.clientX, y: ev.clientY, fx: e.fx, fy: e.fy, d: ev.currentTarget.getBoundingClientRect().width }
        },
        onPointerMove: (ev: React.PointerEvent<HTMLElement>) => {
            const i = inicio.current
            if (!i || !f) return
            const r = arrastarFoco(f.w, f.h, { zoom: e.zoom, fx: i.fx, fy: i.fy }, ev.clientX - i.x, ev.clientY - i.y, i.d)
            aoMudar(r.fx, r.fy)
        },
        onPointerUp: () => { inicio.current = null },
        onPointerCancel: () => { inicio.current = null },
    }
}

/** Pequeno círculo com a foto como vai ficar (resposta imediata; a imagem grande demora um instante). */
function Enquadrador({ e, aoMudar }: { e: Estado; aoMudar: (fx: number, fy: number) => void }) {
    const f = e.foto!
    const D = 200
    const arrastar = useArrastar(e, aoMudar)
    const r = f.w && f.h ? recorteQuadrado(f.w, f.h, { zoom: e.zoom, fx: e.fx, fy: e.fy }) : null
    const k = r ? D / r.lado : 1
    function tecla(ev: React.KeyboardEvent) {
        const passo = 0.03 / e.zoom
        const mapa: Record<string, [number, number]> = { ArrowLeft: [-passo, 0], ArrowRight: [passo, 0], ArrowUp: [0, -passo], ArrowDown: [0, passo] }
        const m = mapa[ev.key]
        if (!m) return
        ev.preventDefault()
        aoMudar(Math.min(1, Math.max(0, e.fx + m[0])), Math.min(1, Math.max(0, e.fy + m[1])))
    }
    return (
        <div role="group" aria-label="Foto no círculo. Arraste ou use as setas para escolher o ponto." tabIndex={0} onKeyDown={tecla} {...arrastar}
            className="a-foco relative mx-auto shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-full border-2 active:cursor-grabbing"
            style={{ width: D, height: D, borderColor: 'var(--a-borda)', background: 'var(--a-bg)' }}>
            {r && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.url} alt="" draggable={false} className="pointer-events-none absolute max-w-none" style={{ width: f.w * k, height: f.h * k, left: -r.left * k, top: -r.top * k }} />
            )}
            {!r && <span className="absolute inset-0 flex items-center justify-center text-[13px] a-suave">A abrir…</span>}
        </div>
    )
}

export default function DivulgarClient({ produtos, cultos }: { produtos: Produto[]; cultos: CultoParaPublicar[] }) {
    const [e, setE] = useState<Estado>(INICIAL)
    const [pronto, setPronto] = useState(false)
    const [aEnviar, setAEnviar] = useState(false)
    const [avisoFoto, setAvisoFoto] = useState('')
    const [aPartilhar, setAPartilhar] = useState(false)
    const [aviso, setAviso] = useState('')
    const ficheiro = useRef<HTMLInputElement>(null)

    useEffect(() => { const g = lerGuardado(); if (g) setE(g); setPronto(true) }, [])
    useEffect(() => { if (pronto) { try { localStorage.setItem(CHAVE, JSON.stringify(e)) } catch { /* sem armazenamento */ } } }, [e, pronto])
    // fotos de produtos chegam sem tamanho: ler as medidas no browser
    const fotoUrl = e.foto?.url, fotoSemMedidas = e.foto ? !e.foto.w || !e.foto.h : false
    useEffect(() => {
        if (!fotoUrl || !fotoSemMedidas) return
        const img = new window.Image()
        img.onload = () => setE((x) => (x.foto?.url === fotoUrl ? { ...x, foto: { url: fotoUrl, w: img.naturalWidth, h: img.naturalHeight } } : x))
        img.onerror = () => setAvisoFoto('Não consegui abrir esta foto. Escolha outra.')
        img.src = fotoUrl
    }, [fotoUrl, fotoSemMedidas])

    const mudar = useCallback((p: Partial<Estado>) => setE((x) => ({ ...x, ...p })), [])
    const preco = formatarPreco(e.preco)
    const urlImagem = `/api/cantina/banner?${paramsBanner(e, e.formato)}`
    const urlAssente = useAssente(urlImagem)
    const previa = useImagem(`${urlAssente}&previa=1`, e.formato)
    const comFoto = !!e.foto
    const { w: W, h: H } = FORMATOS[e.formato], disp = DISPOSICAO[e.formato]
    const arrastarPrevia = useArrastar(e, (fx, fy) => mudar({ fx, fy }))
    const nomeFicheiro = `cantina-${e.modelo}-${e.formato}.png`
    const modelo = MODELOS.find((m) => m.id === e.modelo)!

    async function enviar(file: File | undefined) {
        if (!file) return
        setAvisoFoto(''); setAEnviar(true)
        try {
            const fd = new FormData()
            fd.set('file', await reduzirImagem(file, 2000))
            const res = await fetch('/api/upload/cantina-banner-foto', { method: 'POST', body: fd })
            const j = await res.json().catch(() => ({}))
            if (!res.ok || !j.url) throw new Error(j.error ?? 'Não foi possível enviar a foto.')
            mudar({ foto: { url: j.url, w: j.largura, h: j.altura }, zoom: 1, fx: 0.5, fy: 0.5 })
        } catch (err) {
            setAvisoFoto(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
        } finally {
            setAEnviar(false)
            if (ficheiro.current) ficheiro.current.value = ''
        }
    }

    function escolherProduto(id: string) {
        const p = produtos.find((x) => String(x.id) === id)
        if (!p) return
        setAvisoFoto('')
        const novo: Partial<Estado> = { subtitulo: p.nome.slice(0, LIMITES.subtitulo), preco: p.preco.toFixed(2).replace('.', ',') }
        if (p.imagem) Object.assign(novo, { foto: { url: p.imagem, w: 0, h: 0 }, zoom: 1, fx: 0.5, fy: 0.5 })
        else setAvisoFoto('Este produto não tem foto. Pode enviar uma abaixo.')
        mudar(novo)
    }

    async function partilhar() {
        setAviso(''); setAPartilhar(true)
        const r = await partilharArte(urlImagem, nomeFicheiro, '')
        setAPartilhar(false)
        if (r !== 'cancelada') setAviso(r === 'partilhada' ? 'Partilhado.' : AVISO_PARTILHA[r])
    }

    const contador = (n: number, max: number) => <span className={`text-[13px] ${n >= max ? 'font-semibold' : 'a-suave'}`}>{n}/{max}</span>

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
            <div className="min-w-0 space-y-7">
                {/* 1. Modelo */}
                <fieldset className="min-w-0 space-y-2">
                    <legend className="text-[19px] font-bold">1. Modelo</legend>
                    <div className="grid grid-cols-2 gap-3">
                        {MODELOS.map((m) => <Miniatura key={m.id} modelo={m.id} nome={m.nome} ativo={e.modelo === m.id} onEscolher={() => mudar({ modelo: m.id })} />)}
                    </div>
                </fieldset>

                {/* 2. Texto */}
                <section className="min-w-0 space-y-3" aria-label="Texto">
                    <h2 className="text-[19px] font-bold">2. Texto</h2>
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Título</span>{contador(e.titulo.length, LIMITES.titulo)}</span>
                        <input value={e.titulo} maxLength={LIMITES.titulo} onChange={(ev) => mudar({ titulo: ev.target.value })} placeholder="Cantina aberta!" className={campo} style={estiloCampo} />
                    </label>
                    {produtos.length > 0 && (
                        <label className="block space-y-1">
                            <span className="text-[15px] font-semibold">Escolher um produto da cantina</span>
                            <select value="" onChange={(ev) => escolherProduto(ev.target.value)} className={campo} style={estiloCampo}>
                                <option value="">Preenche o texto, o preço e a foto…</option>
                                {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome} · {formatarPreco(p.preco) || '—'}{p.imagem ? ' · com foto' : ''}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">O que se vende</span>{contador(e.subtitulo.length, LIMITES.subtitulo)}</span>
                        <input value={e.subtitulo} maxLength={LIMITES.subtitulo} onChange={(ev) => mudar({ subtitulo: ev.target.value })} placeholder="Bifana + sumo natural" className={campo} style={estiloCampo} />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-[15px] font-semibold">Preço</span>
                        <input value={e.preco} maxLength={14} inputMode="decimal" onChange={(ev) => mudar({ preco: ev.target.value })} placeholder="2,50" className={campo} style={estiloCampo} aria-describedby="ajuda-preco" />
                        <span id="ajuda-preco" className="block text-[14px] a-suave">
                            {!e.preco.trim() ? 'Vazio: o banner fica sem preço.' : preco ? `No banner: ${preco}` : 'Escreva só números, por exemplo 2,50.'}
                        </span>
                    </label>
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Texto pequeno (opcional)</span>{contador(e.nota.length, LIMITES.nota)}</span>
                        <input value={e.nota} maxLength={LIMITES.nota} onChange={(ev) => mudar({ nota: ev.target.value })} placeholder="Depois do culto · Sala 2" className={campo} style={estiloCampo} />
                    </label>
                </section>

                {/* 3. Foto */}
                <section className="min-w-0 space-y-3" aria-label="Foto no centro">
                    <h2 className="text-[19px] font-bold">3. Foto no centro</h2>
                    {!comFoto && <p className="text-[15px] a-suave">Sem foto, o centro leva o desenho do modelo. Com foto, ela aparece num círculo.</p>}
                    <div className="flex flex-wrap gap-2">
                        <input ref={ficheiro} type="file" accept="image/*" onChange={(ev) => enviar(ev.target.files?.[0])} className="sr-only" id="foto-banner" />
                        <label htmlFor="foto-banner" className="a-botao a-botao-secundario !min-h-[48px] flex-1 cursor-pointer" aria-disabled={aEnviar}>
                            <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : comFoto ? 'Trocar a foto' : 'Enviar uma foto'}
                        </label>
                        {comFoto && (
                            <button type="button" onClick={() => { mudar({ foto: null, zoom: 1, fx: 0.5, fy: 0.5 }); setAvisoFoto('') }} className="a-botao a-botao-secundario !min-h-[48px]">
                                <Trash2 size={18} aria-hidden /> Tirar a foto
                            </button>
                        )}
                    </div>
                    {avisoFoto && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{avisoFoto}</p>}
                    {comFoto && e.foto && (
                        <div className="space-y-3 rounded-[18px] border p-3" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
                            <Enquadrador e={e} aoMudar={(fx, fy) => mudar({ fx, fy })} />
                            <p className="text-center text-[14px] a-suave">Arraste a foto, aqui ou na pré-visualização, para escolher o ponto que fica no centro.</p>
                            <label className="block space-y-1">
                                <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Tamanho (zoom)</span><span className="text-[13px] a-suave">{e.zoom.toFixed(1)}×</span></span>
                                <input type="range" min={LIMITES.zoom[0]} max={LIMITES.zoom[1]} step={0.05} value={e.zoom} onChange={(ev) => mudar({ zoom: Number(ev.target.value) })} className="a-foco h-12 w-full" style={{ accentColor: 'var(--a-destaque)' }} />
                            </label>
                            <label className={chip} style={estiloCampo}>
                                <input type="checkbox" checked={e.tirarBranco} onChange={(ev) => mudar({ tirarBranco: ev.target.checked })} className="h-5 w-5" style={{ accentColor: 'var(--a-destaque)' }} />
                                Tirar o fundo branco
                            </label>
                            <button type="button" onClick={() => mudar({ zoom: 1, fx: 0.5, fy: 0.5 })} className="a-botao a-botao-secundario !min-h-[44px] w-full"><RotateCcw size={16} aria-hidden /> Centrar de novo</button>
                        </div>
                    )}
                </section>
            </div>

            {/* 4. Ver e descarregar */}
            <section aria-label="Pré-visualização" className="min-w-0 space-y-3 lg:sticky lg:top-6">
                <h2 className="text-[19px] font-bold">4. Ver e descarregar</h2>
                <div className="flex gap-2" role="radiogroup" aria-label="Formato">
                    {(Object.keys(FORMATOS) as FormatoId[]).map((f) => (
                        <label key={f} className={chip} style={estiloCampo}>
                            <input type="radio" name="formato" checked={e.formato === f} onChange={() => mudar({ formato: f })} className="sr-only" />
                            <span>{FORMATOS[f].nome}</span><span className="text-[13px] a-suave">{FORMATOS[f].detalhe}</span>
                        </label>
                    ))}
                </div>
                <p className="text-[15px] a-suave">{modelo.nome} · {FORMATOS[e.formato].nome}</p>
                <div className="relative mx-auto w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: FORMATOS[e.formato].razao, maxWidth: e.formato === 'redes' ? 460 : undefined, background: 'var(--a-card)' }}>
                    {previa.src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previa.src} alt="Pré-visualização do banner" className="block h-full w-full object-contain transition-opacity" style={{ opacity: previa.aCarregar ? 0.5 : 1 }} />
                    )}
                    {!previa.src && !previa.erro && <p className="flex h-full items-center justify-center text-[15px] a-suave">A desenhar…</p>}
                    {previa.erro && <p role="alert" className="absolute inset-0 flex items-center justify-center px-4 text-center text-[15px]" style={{ color: 'var(--a-erro)' }}>{previa.erro}</p>}
                    {comFoto && e.foto && e.foto.w > 0 && (
                        <div {...arrastarPrevia} aria-hidden className="absolute cursor-grab touch-none rounded-full active:cursor-grabbing"
                            style={{ left: `${((disp.foto.cx - disp.foto.d / 2) / W) * 100}%`, top: `${((disp.foto.cy - disp.foto.d / 2) / H) * 100}%`, width: `${(disp.foto.d / W) * 100}%`, height: `${(disp.foto.d / H) * 100}%` }} />
                    )}
                </div>
                {comFoto && e.tirarBranco && <p className="text-[14px] a-suave">O fundo branco só se vê tirado na imagem de cima.</p>}
                <PublicarNoCulto cultos={cultos} titulo="Põe o banner do telão em ENCERRAMENTO, no Holyrics, depois da agenda da semana."
                    aoPublicar={(id) => publicarBannerNoCulto(id, paramsBanner(e, 'telao'))} aoRetirar={retirarBannerDoCulto} />
            </section>

            {/* Barra fixa: por cima da barra de baixo da app no telemóvel */}
            <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t px-4 py-2 md:bottom-0 md:left-20 lg:left-64" style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                <div className="mx-auto flex max-w-xl gap-2">
                    <a href={`${urlImagem}&download=1`} className="a-botao a-botao-principal !min-h-[50px] flex-1"><Download size={18} aria-hidden /> Descarregar</a>
                    <button type="button" onClick={partilhar} disabled={aPartilhar} className="a-botao a-botao-secundario !min-h-[50px] flex-1"><Share2 size={18} aria-hidden /> {aPartilhar ? 'A preparar…' : 'Partilhar'}</button>
                </div>
                {aviso && <p role="status" className="mx-auto mt-1 max-w-xl text-[14px] a-suave">{aviso}</p>}
            </div>
        </div>
    )
}

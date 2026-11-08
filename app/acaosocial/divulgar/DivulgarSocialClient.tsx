'use client'

// Ecrã da arte da Assistência Social, telemóvel primeiro: 1. estilo (miniaturas verdadeiras), 2. texto, 3. ver e publicar.
// A imagem vem de /api/acaosocial/arte. A última escolha fica neste aparelho.
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import PublicarNoCulto, { type CultoParaPublicar } from '@/components/encerramento/PublicarNoCulto'
import { AMOSTRA_SOCIAL, ESTILOS_SOCIAL, LIMITES_SOCIAL, lerEstiloSocial, type EstiloSocial } from '@/lib/acaosocial-arte-dados'
import { publicarArteSocialNoCulto, retirarArteSocialDoCulto } from './actions'

type Estado = { estilo: EstiloSocial; titulo: string; texto: string; apelo: string }
const CHAVE = 'acaosocial-arte-v1'
const INICIAL: Estado = { estilo: 'noite', ...AMOSTRA_SOCIAL }

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

function params(e: Estado) {
    return new URLSearchParams({ estilo: e.estilo, t: e.titulo, x: e.texto, a: e.apelo }).toString()
}

function useAssente<T>(valor: T, ms = 350): T {
    const [v, setV] = useState(valor)
    useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
    return v
}

/** Vai buscar a imagem ao servidor (para mostrar a mensagem de erro, se houver); a antiga fica à vista enquanto a nova chega. */
function useImagem(url: string) {
    const [src, setSrc] = useState<string | null>(null)
    const [erro, setErro] = useState('')
    const [aCarregar, setACarregar] = useState(true)
    useEffect(() => {
        const ctl = new AbortController()
        setACarregar(true); setErro('')
        fetch(url, { signal: ctl.signal })
            .then(async (r) => {
                if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Não foi possível desenhar a arte.')
                const obj = URL.createObjectURL(await r.blob())
                setSrc((antigo) => { if (antigo) URL.revokeObjectURL(antigo); return obj })
                setACarregar(false)
            })
            .catch((e) => { if (e?.name !== 'AbortError') { setErro(e instanceof Error ? e.message : 'Não foi possível desenhar a arte.'); setACarregar(false) } })
        return () => ctl.abort()
    }, [url])
    return { src, erro, aCarregar }
}

function Miniatura({ id, nome, ativo, onEscolher }: { id: EstiloSocial; nome: string; ativo: boolean; onEscolher: () => void }) {
    const [pronta, setPronta] = useState(false)
    const q = new URLSearchParams({ estilo: id, t: AMOSTRA_SOCIAL.titulo, x: AMOSTRA_SOCIAL.texto, a: AMOSTRA_SOCIAL.apelo, previa: '1' })
    return (
        <label className="relative block cursor-pointer overflow-hidden rounded-[14px] border-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--a-destaque)]"
            style={{ borderColor: ativo ? 'var(--a-destaque)' : 'var(--a-borda)', background: 'var(--a-card)' }}>
            <input type="radio" name="estilo" checked={ativo} onChange={onEscolher} className="sr-only" />
            <span className="relative block w-full" style={{ aspectRatio: '16 / 9', background: 'var(--a-bg)' }}>
                {!pronta && <span className="absolute inset-0 flex items-center justify-center text-[13px] a-suave">A desenhar…</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/acaosocial/arte?${q}`} alt={`Estilo ${nome}`} loading="lazy" onLoad={() => setPronta(true)} className="block h-full w-full object-cover" style={{ opacity: pronta ? 1 : 0 }} />
            </span>
            <span className="block px-2 py-2">
                <span className="block text-[15px] font-semibold leading-tight">{nome}</span>
                <span className="block text-[13px]" style={{ color: ativo ? 'var(--a-destaque)' : undefined }}>{ativo ? '✓ Escolhido' : 'Escolher'}</span>
            </span>
        </label>
    )
}

export default function DivulgarSocialClient({ cultos }: { cultos: CultoParaPublicar[] }) {
    const [e, setE] = useState<Estado>(INICIAL)
    const [pronto, setPronto] = useState(false)

    useEffect(() => {
        try {
            const j = JSON.parse(localStorage.getItem(CHAVE) ?? 'null')
            if (j && typeof j === 'object') setE({ estilo: lerEstiloSocial(j.estilo), titulo: txt(j.titulo, LIMITES_SOCIAL.titulo), texto: txt(j.texto, LIMITES_SOCIAL.texto), apelo: txt(j.apelo, LIMITES_SOCIAL.apelo) })
        } catch { /* sem armazenamento */ }
        setPronto(true)
    }, [])
    useEffect(() => { if (pronto) { try { localStorage.setItem(CHAVE, JSON.stringify(e)) } catch { /* sem armazenamento */ } } }, [e, pronto])

    const q = params(e)
    const assente = useAssente(q)
    const previa = useImagem(`/api/acaosocial/arte?${assente}&previa=1`)
    const mudar = (p: Partial<Estado>) => setE((x) => ({ ...x, ...p }))
    const contador = (n: number, max: number) => <span className={`text-[13px] ${n >= max ? 'font-semibold' : 'a-suave'}`}>{n}/{max}</span>

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
            <div className="min-w-0 space-y-7">
                <fieldset className="min-w-0 space-y-2">
                    <legend className="text-[19px] font-bold">1. Estilo</legend>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {ESTILOS_SOCIAL.map((s) => <Miniatura key={s.id} id={s.id} nome={s.nome} ativo={e.estilo === s.id} onEscolher={() => mudar({ estilo: s.id })} />)}
                    </div>
                </fieldset>

                <section className="min-w-0 space-y-3" aria-label="Texto">
                    <h2 className="text-[19px] font-bold">2. Texto</h2>
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Título</span>{contador(e.titulo.length, LIMITES_SOCIAL.titulo)}</span>
                        <input value={e.titulo} maxLength={LIMITES_SOCIAL.titulo} onChange={(ev) => mudar({ titulo: ev.target.value })} placeholder="Campanha de alimentos" className={campo} style={estiloCampo} />
                    </label>
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Texto</span>{contador(e.texto.length, LIMITES_SOCIAL.texto)}</span>
                        <textarea value={e.texto} maxLength={LIMITES_SOCIAL.texto} rows={4} onChange={(ev) => mudar({ texto: ev.target.value })} className={`${campo} py-2`} style={estiloCampo} />
                    </label>
                    <label className="block space-y-1">
                        <span className="flex items-baseline justify-between"><span className="text-[15px] font-semibold">Apelo (opcional)</span>{contador(e.apelo.length, LIMITES_SOCIAL.apelo)}</span>
                        <input value={e.apelo} maxLength={LIMITES_SOCIAL.apelo} onChange={(ev) => mudar({ apelo: ev.target.value })} placeholder="Entregue na Assistência Social" className={campo} style={estiloCampo} />
                    </label>
                </section>
            </div>

            <section aria-label="Pré-visualização" className="min-w-0 space-y-3 lg:sticky lg:top-6">
                <h2 className="text-[19px] font-bold">3. Ver e publicar</h2>
                <div className="relative w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9', background: 'var(--a-card)' }}>
                    {previa.src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previa.src} alt="Pré-visualização da arte" className="block h-full w-full object-contain transition-opacity" style={{ opacity: previa.aCarregar ? 0.5 : 1 }} />
                    )}
                    {!previa.src && !previa.erro && <p className="flex h-full items-center justify-center text-[15px] a-suave">A desenhar…</p>}
                    {previa.erro && <p role="alert" className="absolute inset-0 flex items-center justify-center px-4 text-center text-[15px]" style={{ color: 'var(--a-erro)' }}>{previa.erro}</p>}
                </div>
                <a href={`/api/acaosocial/arte?${q}&download=1`} className="a-botao a-botao-secundario !min-h-[48px] w-full"><Download size={18} aria-hidden /> Descarregar (telão 1920×1080)</a>
                <PublicarNoCulto cultos={cultos} titulo="Põe esta arte do telão em ENCERRAMENTO, no Holyrics, depois da agenda da semana."
                    aoPublicar={(id) => publicarArteSocialNoCulto(id, q)} aoRetirar={retirarArteSocialDoCulto} />
            </section>
        </div>
    )
}

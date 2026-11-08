'use client'

// Agenda para divulgar, pensada para o telemóvel: 1. o modelo (galeria com a imagem verdadeira de cada um),
// 2. o tamanho, 3. a pré-visualização; setas para mudar de semana/mês e uma barra fixa com Descarregar e Partilhar.
// Os "Cartões com fotos" são editáveis: o que se muda fica SÓ neste aparelho (localStorage), com "Repor".
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, EyeOff, ImagePlus, RotateCcw, Share2, Eye } from 'lucide-react'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { enviarImagem } from '@/components/app/enviar-imagem'

type Tema = { id: string; nome: string; amostra: [string, string] }
type Cartao = { dia: string; nomeDia: string; linhas: string[]; preletor: string | null; foto: { url: string } | null }
type FotoDia = { modo: 'sem' } | { modo: 'outra'; url: string; w: number; h: number; recorte: boolean }
type EdicaoDia = { esconder?: boolean; linha?: string; preletor?: string; foto?: FotoDia }
type Edicao = { titulo: string; rodape: string; dias: Record<string, EdicaoDia> }
const EDICAO_VAZIA: Edicao = { titulo: '', rodape: '', dias: {} }

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10)
const mesVizinho = (mes: string, d: number) => { const [a, m] = mes.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1 + d, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}` }
const nomeMes = (mes: string) => new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const curto = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}`

function useAssente<T>(valor: T, ms = 400): T {
    const [v, setV] = useState(valor)
    useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
    return v
}

/** A imagem muda só quando a nova já chegou (a antiga fica à vista, mais clara, enquanto carrega). */
function Previa({ src, razao, alt, maxLargura }: { src: string; razao: string; alt: string; maxLargura?: number }) {
    const [atual, setAtual] = useState<string | null>(null)
    const [aCarregar, setACarregar] = useState(true)
    const [erro, setErro] = useState(false)
    useEffect(() => {
        let vivo = true
        setACarregar(true); setErro(false)
        const img = new window.Image()
        img.onload = () => { if (vivo) { setAtual(src); setACarregar(false) } }
        img.onerror = () => { if (vivo) { setErro(true); setACarregar(false) } }
        img.src = src
        return () => { vivo = false }
    }, [src])
    return (
        <div className="mx-auto w-full overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: razao, maxWidth: maxLargura, background: 'var(--a-card)' }}>
            {atual && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={atual} alt={alt} className="block h-full w-full object-contain transition-opacity" style={{ opacity: aCarregar ? 0.45 : 1 }} />
            )}
            {!atual && !erro && <p className="flex h-full items-center justify-center text-[15px] a-suave">A desenhar…</p>}
            {erro && <p role="alert" className="flex h-full items-center justify-center px-4 text-center text-[15px]" style={{ color: 'var(--a-erro)' }}>Não foi possível desenhar a imagem. Tente de novo.</p>}
        </div>
    )
}

function Navegador({ texto, onAnterior, onSeguinte, rotuloAnterior, rotuloSeguinte }: { texto: string; onAnterior: () => void; onSeguinte: () => void; rotuloAnterior: string; rotuloSeguinte: string }) {
    const seta = 'a-foco flex h-12 w-12 shrink-0 items-center justify-center rounded-full border'
    return (
        <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={onAnterior} className={seta} style={{ borderColor: 'var(--a-borda)' }} aria-label={rotuloAnterior}><ChevronLeft size={22} aria-hidden /></button>
            <p className="min-w-0 flex-1 truncate text-center text-[18px] font-bold first-letter:uppercase">{texto}</p>
            <button type="button" onClick={onSeguinte} className={seta} style={{ borderColor: 'var(--a-borda)' }} aria-label={rotuloSeguinte}><ChevronRight size={22} aria-hidden /></button>
        </div>
    )
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const chip = 'flex min-h-[48px] shrink-0 cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[15px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]'

// Modelos: os "Cartões com fotos" (claro/escuro, editáveis) e os modelos de cores (Clássico, Noite…).
// Cada modelo diz que tamanhos tem: os de fotos fazem Telão, Post e Story da semana; os de cores fazem o Telão da semana
// e o Post do mês (calendário ou cartões).
type Saida = 'telao' | 'post' | 'story' | 'mes'
const SAIDAS: Record<Saida, { nome: string; razao: string }> = {
    telao: { nome: 'Telão (16:9)', razao: '1920 / 1080' },
    post: { nome: 'Post (4:5)', razao: '1080 / 1350' },
    story: { nome: 'Story (9:16)', razao: '1080 / 1920' },
    mes: { nome: 'Mês inteiro (post)', razao: '1080 / 1350' },
}
const ehFotos = (m: string) => m === 'fotos-claro' || m === 'fotos-escuro'
const saidasDe = (m: string): Saida[] => (ehFotos(m) ? ['telao', 'post', 'story'] : ['telao', 'mes'])
const CHAVE_ESCOLHA = 'agenda-divulgar:escolha'

export default function AgendaDivulgarClient({ hoje, segundaHoje, c, congregacoes, temas, moradas }: {
    hoje: string; segundaHoje: string; c: number | null
    congregacoes: { id: number; nome: string }[]; temas: Tema[]; moradas: Record<string, string>
}) {
    const [semana, setSemana] = useState(segundaHoje)
    const [mes, setMes] = useState(hoje.slice(0, 7))
    const [casa, setCasa] = useState<number | null>(c)
    const [modelo, setModelo] = useState('fotos-claro')
    const [saida, setSaida] = useState<Saida>('post')
    const [disposicao, setDisposicao] = useState('')
    const [cartoes, setCartoes] = useState<Cartao[] | null>(null)
    const [edicao, setEdicao] = useState<Edicao>(EDICAO_VAZIA)
    const [editar, setEditar] = useState(false)
    const [aviso, setAviso] = useState('')
    const [aPartilhar, setAPartilhar] = useState(false)
    const carregada = useRef<string | null>(null)   // semana cuja edição já foi lida do aparelho

    const modelos = useMemo(() => [
        { id: 'fotos-claro', nome: 'Cartões com fotos', sub: 'Claro (creme)' },
        { id: 'fotos-escuro', nome: 'Cartões com fotos', sub: 'Escuro' },
        ...temas.map((t) => ({ id: t.id, nome: t.nome, sub: 'Cores, sem fotos' })),
    ], [temas])

    // A última escolha (modelo e tamanho) fica neste aparelho
    useEffect(() => {
        try {
            const e = JSON.parse(localStorage.getItem(CHAVE_ESCOLHA) ?? 'null')
            if (e && modelos.some((m) => m.id === e.modelo) && saidasDe(e.modelo).includes(e.saida)) { setModelo(e.modelo); setSaida(e.saida) }
        } catch { /* sem armazenamento */ }
    }, [modelos])
    function guardarEscolha(m: string, s: Saida) {
        try { localStorage.setItem(CHAVE_ESCOLHA, JSON.stringify({ modelo: m, saida: s })) } catch { /* só nesta visita */ }
    }
    function escolherModelo(m: string) {
        const s = saidasDe(m).includes(saida) ? saida : saidasDe(m)[0]
        setModelo(m); setSaida(s); setAviso(''); guardarEscolha(m, s)
    }
    function escolherSaida(s: Saida) {
        setSaida(s); setAviso(''); guardarEscolha(modelo, s)
    }

    // Os eventos e as fotos da semana (vêm da Agenda e dos kits de Divulgação)
    useEffect(() => {
        let vivo = true
        setCartoes(null)
        fetch(`/api/agenda/semana?semana=${semana}${casa ? `&c=${casa}` : ''}`)
            .then((r) => r.json())
            .then((j) => { if (vivo) setCartoes(Array.isArray(j.cartoes) ? j.cartoes : []) })
            .catch(() => { if (vivo) setCartoes([]) })
        return () => { vivo = false }
    }, [semana, casa])

    // As mudanças à mão, deste aparelho, por semana
    useEffect(() => {
        let lida = EDICAO_VAZIA
        try { const t = localStorage.getItem(`agenda-semana:${semana}`); if (t) lida = { ...EDICAO_VAZIA, ...JSON.parse(t) } } catch { /* sem armazenamento */ }
        setEdicao(lida); carregada.current = semana
    }, [semana])
    useEffect(() => {
        if (carregada.current !== semana) return
        try {
            if (JSON.stringify(edicao) === JSON.stringify(EDICAO_VAZIA)) localStorage.removeItem(`agenda-semana:${semana}`)
            else localStorage.setItem(`agenda-semana:${semana}`, JSON.stringify(edicao))
        } catch { /* só nesta visita */ }
    }, [edicao, semana])

    const moradaDaCasa = moradas[casa ? String(casa) : ''] ?? moradas[''] ?? ''
    const alterado = JSON.stringify(edicao) !== JSON.stringify(EDICAO_VAZIA)
    const mudarDia = (dia: string, p: Partial<EdicaoDia>) => setEdicao((e) => ({ ...e, dias: { ...e.dias, [dia]: { ...e.dias[dia], ...p } } }))

    /** O endereço da imagem escolhida (sem previa=1): o que se descarrega e partilha. */
    const urlImagem = useMemo(() => {
        const q = new URLSearchParams()
        if (casa) q.set('c', String(casa))
        if (ehFotos(modelo)) {
            q.set('formato', 'semana'); q.set('semana', semana); q.set('tamanho', saida === 'mes' ? 'post' : saida); q.set('variante', modelo === 'fotos-escuro' ? 'escuro' : 'claro')
            if (edicao.titulo.trim()) q.set('t', edicao.titulo.trim().slice(0, 40))
            const r = (edicao.rodape.trim() || moradaDaCasa).slice(0, 90)
            if (r) q.set('r', r)
            for (const [dia, d] of Object.entries(edicao.dias)) {
                if (d.esconder) q.set(`x_${dia}`, '1')
                if (d.linha?.trim()) q.set(`l_${dia}`, d.linha.trim())
                if (d.preletor !== undefined && d.preletor !== '') q.set(`p_${dia}`, d.preletor.trim() || '-')
                if (d.foto?.modo === 'sem') q.set(`f_${dia}`, '-')
                if (d.foto?.modo === 'outra') { q.set(`f_${dia}`, d.foto.url); q.set(`fd_${dia}`, `${d.foto.w}x${d.foto.h}`); if (d.foto.recorte) q.set(`fr_${dia}`, '1') }
            }
        } else if (saida === 'mes') {
            q.set('formato', 'redes'); q.set('mes', mes); q.set('tema', modelo)
            if (disposicao) q.set('disposicao', disposicao)
        } else {
            q.set('formato', 'telao'); q.set('semana', semana); q.set('tema', modelo)
        }
        return `/api/agenda/imagem?${q}`
    }, [modelo, saida, casa, semana, mes, disposicao, edicao, moradaDaCasa])

    const urlAssente = useAssente(urlImagem)
    // As miniaturas da galeria: cada modelo no tamanho escolhido (ou no primeiro que tem), sem as mudanças à mão
    // (para não as redesenhar a cada letra)
    const saidaDe = (m: string): Saida => (saidasDe(m).includes(saida) ? saida : saidasDe(m)[0])
    const miniaturas = useMemo(() => {
        const q = casa ? `&c=${casa}` : ''
        return Object.fromEntries(modelos.map((m) => {
            const s = saidaDe(m.id)
            const base = ehFotos(m.id)
                ? `/api/agenda/imagem?formato=semana&semana=${semana}&tamanho=${s}&variante=${m.id === 'fotos-escuro' ? 'escuro' : 'claro'}`
                : s === 'mes' ? `/api/agenda/imagem?formato=redes&mes=${mes}&tema=${m.id}${disposicao ? `&disposicao=${disposicao}` : ''}` : `/api/agenda/imagem?formato=telao&semana=${semana}&tema=${m.id}`
            return [m.id, { src: `${base}${q}&previa=1` }]
        }))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelos, semana, mes, casa, saida, disposicao])
    const nomeModelo = modelos.find((m) => m.id === modelo)
    const ficheiro = `agenda-${saida === 'mes' ? mes : semana}-${modelo}-${saida}.png`

    async function partilhar() {
        setAviso(''); setAPartilhar(true)
        const r = await partilharArte(urlImagem, ficheiro, '')
        setAPartilhar(false)
        if (r !== 'cancelada') setAviso(r === 'partilhada' ? 'Partilhada.' : AVISO_PARTILHA[r])
    }
    const casaQ = casa ? `&c=${casa}` : ''

    return (
        <div className="space-y-6">
            {congregacoes.length > 1 && (
                <label className="block space-y-1"><span className="block text-[15px] font-semibold">Casa</span>
                    <select value={casa ?? ''} onChange={(e) => setCasa(Number(e.target.value) || null)} className={campo} style={estiloCampo}>
                        <option value="">Todas</option>
                        {congregacoes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select></label>
            )}

            {saida === 'mes'
                ? <Navegador texto={nomeMes(mes)} onAnterior={() => setMes(mesVizinho(mes, -1))} onSeguinte={() => setMes(mesVizinho(mes, 1))} rotuloAnterior="Mês anterior" rotuloSeguinte="Mês seguinte" />
                : <Navegador texto={`Semana de ${curto(semana)}${semana === segundaHoje ? ' (esta)' : ''}`} onAnterior={() => setSemana(somarDias(semana, -7))} onSeguinte={() => setSemana(somarDias(semana, 7))} rotuloAnterior="Semana anterior" rotuloSeguinte="Semana seguinte" />}

            {/* 1. Modelo: galeria com a imagem verdadeira de cada um */}
            <fieldset className="min-w-0 space-y-2">
                <legend className="text-[19px] font-bold">1. Modelo</legend>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {modelos.map((m) => {
                        const ativo = modelo === m.id
                        return (
                            <label key={m.id} className="relative cursor-pointer overflow-hidden rounded-[14px] border-2 has-[:focus-visible]:ring-2"
                                style={{ borderColor: ativo ? 'var(--a-destaque)' : 'var(--a-borda)', background: 'var(--a-card)' }}>
                                <input type="radio" name="modelo" checked={ativo} onChange={() => escolherModelo(m.id)} className="sr-only" />
                                <Miniatura src={miniaturas[m.id].src} alt={`Modelo ${m.nome} (${m.sub})`} />
                                <span className="block px-2 py-2">
                                    <span className="block text-[15px] font-semibold leading-tight">{m.nome}</span>
                                    <span className="block text-[13px]" style={{ color: ativo ? 'var(--a-destaque)' : undefined }}>{ativo ? '✓ Escolhido' : m.sub}</span>
                                </span>
                            </label>
                        )
                    })}
                </div>
            </fieldset>

            {/* 2. Tamanho */}
            <fieldset className="min-w-0 space-y-2">
                <legend className="text-[19px] font-bold">2. Tamanho</legend>
                <div className="flex flex-wrap gap-2">
                    {saidasDe(modelo).map((s) => (
                        <label key={s} className={chip} style={estiloCampo}><input type="radio" name="saida" checked={saida === s} onChange={() => escolherSaida(s)} className="sr-only" />{SAIDAS[s].nome}</label>
                    ))}
                </div>
                {saida === 'mes' && (
                    <label className="block space-y-1 pt-1"><span className="block text-[15px] font-semibold">Disposição</span>
                        <select value={disposicao} onChange={(e) => setDisposicao(e.target.value)} className={campo} style={estiloCampo}>
                            <option value="">Calendário do mês</option>
                            <option value="cartoes">Cartões (só os dias com eventos)</option>
                        </select></label>
                )}
            </fieldset>

            {/* 3. Pré-visualização */}
            <section aria-label="Pré-visualização" className="space-y-2">
                <h2 className="text-[19px] font-bold">3. Ver e descarregar</h2>
                <p className="text-[15px] a-suave">{nomeModelo?.nome} · {nomeModelo?.sub} · {SAIDAS[saida].nome}</p>
                <Previa src={`${urlAssente}&previa=1`} razao={SAIDAS[saida].razao} alt="Pré-visualização da arte" maxLargura={saida === 'story' ? 360 : saida === 'telao' ? undefined : 460} />
            </section>

            {/* Editar a semana (só nos cartões com fotos) */}
            {ehFotos(modelo) ? (
                <section className="space-y-4" aria-label="Editar a semana">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setEditar(!editar)} aria-expanded={editar} className="a-botao a-botao-secundario !min-h-[48px] flex-1">
                            {editar ? 'Fechar a edição' : 'Editar textos, fotos e dias'}
                        </button>
                        {alterado && (
                            <button type="button" onClick={() => setEdicao(EDICAO_VAZIA)} className="a-botao a-botao-secundario !min-h-[48px]"><RotateCcw size={16} aria-hidden /> Repor o automático</button>
                        )}
                    </div>
                    {editar && (<>
                        <p className="text-[14px] a-suave">Os eventos vêm da Agenda da igreja; os pregadores e as fotos, dos kits de Divulgação de cada culto. O que mudar aqui fica só neste aparelho e vale para os dois modelos com fotos.</p>
                        <label className="block space-y-1"><span className="block text-[15px] font-semibold">Título</span>
                            <input value={edicao.titulo} maxLength={40} onChange={(e) => setEdicao((x) => ({ ...x, titulo: e.target.value }))} placeholder="Programação da semana" className={campo} style={estiloCampo} /></label>
                        <label className="block space-y-1"><span className="block text-[15px] font-semibold">Rodapé (morada, contacto…)</span>
                            <input value={edicao.rodape} maxLength={90} onChange={(e) => setEdicao((x) => ({ ...x, rodape: e.target.value }))} placeholder={moradaDaCasa || 'Morada da igreja'} className={campo} style={estiloCampo} /></label>
                        {cartoes === null && <p className="a-card p-4 text-[16px] a-suave">A procurar os eventos…</p>}
                        {cartoes?.length === 0 && <p className="a-card p-4 text-[16px]">Não há eventos nesta semana. Marque-os na Agenda da igreja e volte aqui.</p>}
                        <ul className="space-y-3">
                            {cartoes?.map((k) => (
                                <DiaEditor key={k.dia} k={k} d={edicao.dias[k.dia] ?? {}} onMudar={(p) => mudarDia(k.dia, p)} />
                            ))}
                        </ul>
                    </>)}
                </section>
            ) : (
                <p className="text-[14px] a-suave">Este modelo usa os eventos da Agenda tal como estão. Para mudar textos e fotos ou esconder dias, escolha um dos &quot;Cartões com fotos&quot;.</p>
            )}

            {/* Imprimir */}
            <section className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--a-borda)' }} aria-label="Imprimir">
                <h2 className="text-[19px] font-bold first-letter:uppercase">Imprimir o mês ({nomeMes(mes)})</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/midia/agenda/imprimir?formato=visitante&mes=${mes}${casaQ}`} className="a-botao a-botao-secundario !min-h-[52px] w-full">Para visitantes (por semanas)</Link>
                    <Link href={`/midia/agenda/imprimir?formato=relatorio&mes=${mes}${casaQ}`} className="a-botao a-botao-secundario !min-h-[52px] w-full">Relatório (tabela)</Link>
                </div>
            </section>

            {/* Barra fixa: por cima da barra de baixo da app no telemóvel */}
            <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t px-4 py-2 md:bottom-0 md:left-20 lg:left-64"
                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                <div className="mx-auto flex max-w-xl gap-2">
                    <a href={`${urlImagem}&download=1`} className="a-botao a-botao-principal !min-h-[50px] flex-1"><Download size={18} aria-hidden /> Descarregar</a>
                    <button type="button" onClick={partilhar} disabled={aPartilhar} className="a-botao a-botao-secundario !min-h-[50px] flex-1"><Share2 size={18} aria-hidden /> {aPartilhar ? 'A preparar…' : 'Partilhar'}</button>
                </div>
                {aviso && <p role="status" className="mx-auto mt-1 max-w-xl text-[14px] a-suave">{aviso}</p>}
            </div>
        </div>
    )
}

/** Miniatura de um modelo na galeria (a imagem verdadeira no tamanho escolhido, inteira numa caixa 4:3; carrega só quando aparece). */
function Miniatura({ src, alt }: { src: string; alt: string }) {
    const [pronta, setPronta] = useState(false)
    const ref = useRef<HTMLImageElement>(null)
    // se a imagem chegou antes de a página ficar pronta, o onLoad já passou: ver se já está completa
    useEffect(() => { const i = ref.current; setPronta(!!i && i.complete && i.naturalWidth > 0) }, [src])
    return (
        <span className="relative block w-full" style={{ aspectRatio: '4 / 3', background: 'var(--a-bg)' }}>
            {!pronta && <span className="absolute inset-0 flex items-center justify-center text-[13px] a-suave">A desenhar…</span>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={ref} src={src} alt={alt} loading="lazy" onLoad={() => setPronta(true)} className="block h-full w-full object-contain" style={{ opacity: pronta ? 1 : 0 }} />
        </span>
    )
}

/** Um dia da semana: esconder, mudar a linha, o preletor e a foto. Vazio = o automático. */
function DiaEditor({ k, d, onMudar }: { k: Cartao; d: EdicaoDia; onMudar: (p: Partial<EdicaoDia>) => void }) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    const escondido = !!d.esconder
    const modoFoto = d.foto?.modo === 'sem' ? 'sem' : d.foto?.modo === 'outra' ? 'outra' : 'auto'

    async function enviar(file: File | undefined) {
        if (!file) return
        setErro(''); setAEnviar(true)
        try {
            const j = await enviarImagem(file, 'foto')
            onMudar({ foto: { modo: 'outra', url: j.url, w: j.largura, h: j.altura, recorte: j.recorte } })
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.')
        } finally { setAEnviar(false) }
    }

    return (
        <li className="a-card space-y-3 p-4" style={{ opacity: escondido ? 0.6 : 1 }}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-[18px] font-bold">{k.nomeDia} <span className="text-[15px] font-normal a-suave">{curto(k.dia)}</span></p>
                <button type="button" onClick={() => onMudar({ esconder: !escondido })} aria-pressed={!escondido}
                    className="a-botao a-botao-secundario !min-h-[44px]">
                    {escondido ? <><EyeOff size={16} aria-hidden /> Escondido</> : <><Eye size={16} aria-hidden /> Aparece</>}
                </button>
            </div>
            {!escondido && (<>
                <label className="block space-y-1"><span className="block text-[15px] font-semibold">Evento e hora</span>
                    <input value={d.linha ?? ''} maxLength={70} onChange={(e) => onMudar({ linha: e.target.value })} placeholder={k.linhas.join(' + ')} className={campo} style={estiloCampo} /></label>
                <label className="block space-y-1"><span className="block text-[15px] font-semibold">Na Palavra</span>
                    <div className="flex gap-2">
                        <input value={d.preletor === '-' ? '' : d.preletor ?? ''} maxLength={50} disabled={d.preletor === '-'}
                            onChange={(e) => onMudar({ preletor: e.target.value })} placeholder={k.preletor ?? 'Sem preletor'} className={campo} style={estiloCampo} />
                        <button type="button" className="a-botao a-botao-secundario !min-h-[48px] shrink-0"
                            onClick={() => onMudar({ preletor: d.preletor === '-' ? '' : '-' })}>{d.preletor === '-' ? 'Pôr' : 'Tirar'}</button>
                    </div></label>
                <fieldset className="min-w-0 space-y-2"><legend className="text-[15px] font-semibold">Foto</legend>
                    <div className="flex flex-wrap gap-2">
                        <label className={chip} style={estiloCampo}><input type="radio" checked={modoFoto === 'auto'} onChange={() => onMudar({ foto: undefined })} className="sr-only" />{k.foto ? 'A do culto' : 'Automática (não há)'}</label>
                        <label className={chip} style={estiloCampo}><input type="radio" checked={modoFoto === 'sem'} onChange={() => onMudar({ foto: { modo: 'sem' } })} className="sr-only" />Sem foto</label>
                        <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                            <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : modoFoto === 'outra' ? 'Trocar a foto' : 'Enviar outra'}
                            <input type="file" accept="image/*" className="sr-only" disabled={aEnviar} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = '' }} />
                        </label>
                    </div>
                    {d.foto?.modo === 'outra' && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.foto.url} alt="Foto escolhida" className="h-24 w-auto rounded-lg border" style={{ borderColor: 'var(--a-borda)' }} />
                    )}
                    {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
                </fieldset>
            </>)}
        </li>
    )
}

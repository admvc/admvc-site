'use client'

// Agenda para divulgar, pensada para o telemóvel: quatro separadores (Semana com fotos · Telão · Redes · Imprimir),
// setas para mudar de semana/mês (sem campos de data nem botão "Atualizar": a pré-visualização muda sozinha),
// uma coluna só, e uma barra fixa em baixo com Descarregar e Partilhar.
// "Semana com fotos" é editável: o que se muda fica SÓ neste aparelho (localStorage), com "Repor" para voltar ao automático.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Download, EyeOff, ImagePlus, RotateCcw, Share2, Eye } from 'lucide-react'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { enviarImagem } from '@/components/app/enviar-imagem'

type Tema = { id: string; nome: string; amostra: [string, string] }
type Cartao = { dia: string; nomeDia: string; linhas: string[]; preletor: string | null; foto: { url: string } | null }
type Tamanho = 'post' | 'story' | 'telao'
type Variante = 'claro' | 'escuro'
type Aba = 'semana' | 'telao' | 'redes' | 'imprimir'

type FotoDia = { modo: 'sem' } | { modo: 'outra'; url: string; w: number; h: number; recorte: boolean }
type EdicaoDia = { esconder?: boolean; linha?: string; preletor?: string; foto?: FotoDia }
type Edicao = { titulo: string; rodape: string; dias: Record<string, EdicaoDia> }
const EDICAO_VAZIA: Edicao = { titulo: '', rodape: '', dias: {} }

const FORMATOS: Record<Tamanho, { nome: string; razao: string }> = {
    post: { nome: 'Post (4:5)', razao: '1080 / 1350' },
    story: { nome: 'Story (9:16)', razao: '1080 / 1920' },
    telao: { nome: 'Telão (16:9)', razao: '1920 / 1080' },
}

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

export default function AgendaDivulgarClient({ hoje, segundaHoje, c, congregacoes, temas, moradas }: {
    hoje: string; segundaHoje: string; c: number | null
    congregacoes: { id: number; nome: string }[]; temas: Tema[]; moradas: Record<string, string>
}) {
    const [aba, setAba] = useState<Aba>('semana')
    const [semana, setSemana] = useState(segundaHoje)
    const [mes, setMes] = useState(hoje.slice(0, 7))
    const [casa, setCasa] = useState<number | null>(c)
    const [tamanho, setTamanho] = useState<Tamanho>('post')
    const [variante, setVariante] = useState<Variante>('claro')
    const [modeloTelao, setModeloTelao] = useState('fotos-claro')   // temas antigos, ou fotos-claro / fotos-escuro
    const [modeloRedes, setModeloRedes] = useState('fotos-claro')
    const [tamanhoRedes, setTamanhoRedes] = useState<'post' | 'story'>('post')
    const [disposicao, setDisposicao] = useState('')
    const [cartoes, setCartoes] = useState<Cartao[] | null>(null)
    const [edicao, setEdicao] = useState<Edicao>(EDICAO_VAZIA)
    const [aviso, setAviso] = useState('')
    const [aPartilhar, setAPartilhar] = useState(false)
    const carregada = useRef<string | null>(null)   // semana cuja edição já foi lida do aparelho

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

    /** O endereço da imagem (sem previa=1): o que se descarrega e partilha. */
    const urlImagem = useMemo(() => {
        const q = new URLSearchParams()
        if (casa) q.set('c', String(casa))
        const semFotos = (aba === 'telao' && !modeloTelao.startsWith('fotos')) || (aba === 'redes' && !modeloRedes.startsWith('fotos'))
        if (aba === 'imprimir') return ''
        if (!semFotos) {
            q.set('formato', 'semana'); q.set('semana', semana)
            const t = aba === 'semana' ? tamanho : aba === 'telao' ? 'telao' : tamanhoRedes
            const v = aba === 'semana' ? variante : (aba === 'telao' ? modeloTelao : modeloRedes) === 'fotos-escuro' ? 'escuro' : 'claro'
            q.set('tamanho', t); q.set('variante', v)
            q.set('t', edicao.titulo.trim().slice(0, 40)); if (!edicao.titulo.trim()) q.delete('t')
            q.set('r', (edicao.rodape.trim() || moradaDaCasa).slice(0, 90)); if (!q.get('r')) q.delete('r')
            for (const [dia, d] of Object.entries(edicao.dias)) {
                if (d.esconder) q.set(`x_${dia}`, '1')
                if (d.linha?.trim()) q.set(`l_${dia}`, d.linha.trim())
                if (d.preletor !== undefined && d.preletor !== '') q.set(`p_${dia}`, d.preletor.trim() || '-')
                if (d.foto?.modo === 'sem') q.set(`f_${dia}`, '-')
                if (d.foto?.modo === 'outra') { q.set(`f_${dia}`, d.foto.url); q.set(`fd_${dia}`, `${d.foto.w}x${d.foto.h}`); if (d.foto.recorte) q.set(`fr_${dia}`, '1') }
            }
        } else if (aba === 'telao') {
            q.set('formato', 'telao'); q.set('semana', semana); q.set('tema', modeloTelao)
        } else {
            q.set('formato', 'redes'); q.set('mes', mes); q.set('tema', modeloRedes)
            if (disposicao) q.set('disposicao', disposicao)
        }
        return `/api/agenda/imagem?${q}`
    }, [aba, casa, semana, mes, tamanho, variante, modeloTelao, modeloRedes, tamanhoRedes, disposicao, edicao, moradaDaCasa])

    const urlAssente = useAssente(urlImagem)
    const razao = aba === 'semana' ? FORMATOS[tamanho].razao : aba === 'telao' ? (modeloTelao.startsWith('fotos') ? FORMATOS.telao.razao : '16 / 9')
        : modeloRedes.startsWith('fotos') ? FORMATOS[tamanhoRedes].razao : '1080 / 1350'
    const ficheiro = `agenda-${aba === 'redes' ? mes : semana}${aba === 'semana' ? `-${tamanho}-${variante}` : ''}.png`

    async function partilhar() {
        setAviso(''); setAPartilhar(true)
        const r = await partilharArte(urlImagem, ficheiro, '')
        setAPartilhar(false)
        if (r !== 'cancelada') setAviso(r === 'partilhada' ? 'Partilhada.' : AVISO_PARTILHA[r])
    }

    const abas: { id: Aba; texto: string }[] = [
        { id: 'semana', texto: 'Semana com fotos' }, { id: 'telao', texto: 'Telão' }, { id: 'redes', texto: 'Redes' }, { id: 'imprimir', texto: 'Imprimir' },
    ]
    const mostrarSemana = aba === 'semana' || (aba === 'telao' && modeloTelao.startsWith('fotos')) || (aba === 'redes' && modeloRedes.startsWith('fotos'))
    const casaQ = casa ? `&c=${casa}` : ''

    return (
        <div className="space-y-5">
            <div role="tablist" aria-label="Que arte fazer" className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {abas.map((a) => (
                    <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => { setAba(a.id); setAviso('') }}
                        className="a-foco min-h-[48px] shrink-0 rounded-full px-4 text-[16px] font-semibold"
                        style={aba === a.id ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' } : { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                        {a.texto}
                    </button>
                ))}
            </div>

            {congregacoes.length > 1 && (
                <label className="block space-y-1"><span className="block text-[15px] font-semibold">Casa</span>
                    <select value={casa ?? ''} onChange={(e) => setCasa(Number(e.target.value) || null)} className={campo} style={estiloCampo}>
                        <option value="">Todas</option>
                        {congregacoes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select></label>
            )}

            {aba !== 'imprimir' && (aba === 'redes' && !modeloRedes.startsWith('fotos')
                ? <Navegador texto={nomeMes(mes)} onAnterior={() => setMes(mesVizinho(mes, -1))} onSeguinte={() => setMes(mesVizinho(mes, 1))} rotuloAnterior="Mês anterior" rotuloSeguinte="Mês seguinte" />
                : <Navegador texto={`Semana de ${curto(semana)}${semana === segundaHoje ? ' (esta)' : ''}`} onAnterior={() => setSemana(somarDias(semana, -7))} onSeguinte={() => setSemana(somarDias(semana, 7))} rotuloAnterior="Semana anterior" rotuloSeguinte="Semana seguinte" />)}

            {/* Modelos */}
            {aba === 'semana' && (
                <div className="space-y-3">
                    <fieldset className="min-w-0 space-y-1"><legend className="text-[15px] font-semibold">Tamanho</legend>
                        <div className="flex flex-wrap gap-2">
                            {(Object.keys(FORMATOS) as Tamanho[]).map((t) => (
                                <label key={t} className={chip} style={estiloCampo}><input type="radio" name="tamanho" checked={tamanho === t} onChange={() => setTamanho(t)} className="sr-only" />{FORMATOS[t].nome}</label>
                            ))}
                        </div></fieldset>
                    <fieldset className="min-w-0 space-y-1"><legend className="text-[15px] font-semibold">Aspeto</legend>
                        <div className="flex gap-2">
                            {(['claro', 'escuro'] as Variante[]).map((v) => (
                                <label key={v} className={chip} style={estiloCampo}><input type="radio" name="variante" checked={variante === v} onChange={() => setVariante(v)} className="sr-only" />{v === 'claro' ? 'Claro (creme)' : 'Escuro'}</label>
                            ))}
                        </div></fieldset>
                </div>
            )}
            {(aba === 'telao' || aba === 'redes') && (
                <fieldset className="min-w-0 space-y-1"><legend className="text-[15px] font-semibold">Modelo</legend>
                    <div className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
                        {[{ id: 'fotos-claro', nome: 'Cartões com fotos (claro)', amostra: ['#efe6d8', '#b4532a'] as [string, string] }, { id: 'fotos-escuro', nome: 'Cartões com fotos (escuro)', amostra: ['#0d0d0f', '#e3a33b'] as [string, string] }, ...temas].map((t) => {
                            const ativo = (aba === 'telao' ? modeloTelao : modeloRedes) === t.id
                            return (
                                <label key={t.id} className={chip} style={estiloCampo}>
                                    <input type="radio" name={`modelo-${aba}`} checked={ativo} onChange={() => (aba === 'telao' ? setModeloTelao(t.id) : setModeloRedes(t.id))} className="sr-only" />
                                    <span aria-hidden className="flex h-7 w-10 overflow-hidden rounded-md border" style={{ borderColor: 'var(--a-borda)' }}><span className="flex-1" style={{ background: t.amostra[0] }} /><span className="w-3" style={{ background: t.amostra[1] }} /></span>
                                    <span className="whitespace-nowrap">{t.nome}</span>
                                </label>
                            )
                        })}
                    </div>
                    {aba === 'redes' && modeloRedes.startsWith('fotos') && (
                        <div className="flex gap-2 pt-1">
                            {(['post', 'story'] as const).map((t) => (
                                <label key={t} className={chip} style={estiloCampo}><input type="radio" name="tamanho-redes" checked={tamanhoRedes === t} onChange={() => setTamanhoRedes(t)} className="sr-only" />{FORMATOS[t].nome}</label>
                            ))}
                        </div>
                    )}
                    {aba === 'redes' && !modeloRedes.startsWith('fotos') && (
                        <label className="block space-y-1 pt-1"><span className="block text-[15px] font-semibold">Disposição</span>
                            <select value={disposicao} onChange={(e) => setDisposicao(e.target.value)} className={campo} style={estiloCampo}>
                                <option value="">Calendário do mês</option>
                                <option value="cartoes">Cartões (só os dias com eventos)</option>
                            </select></label>
                    )}
                </fieldset>
            )}

            {/* Pré-visualização */}
            {aba !== 'imprimir' && (
                <section aria-label="Pré-visualização" className="space-y-2">
                    <Previa src={`${urlAssente}${urlAssente.includes('?') ? '&' : '?'}previa=1`} razao={razao} alt="Pré-visualização da arte" maxLargura={razao === '1080 / 1920' ? 360 : razao === '1920 / 1080' || razao === '16 / 9' ? undefined : 460} />
                    {mostrarSemana && aba !== 'semana' && <p className="text-[14px] a-suave">Para mudar fotos, textos e dias, use o separador &quot;Semana com fotos&quot;: as mudanças valem aqui também.</p>}
                </section>
            )}

            {/* Editor da semana com fotos */}
            {aba === 'semana' && (
                <section className="space-y-4" aria-labelledby="editar">
                    <div className="flex items-center justify-between gap-2">
                        <h2 id="editar" className="text-[19px] font-bold">Editar a semana</h2>
                        {alterado && (
                            <button type="button" onClick={() => setEdicao(EDICAO_VAZIA)} className="a-botao a-botao-secundario !min-h-[44px]"><RotateCcw size={16} aria-hidden /> Repor o automático</button>
                        )}
                    </div>
                    <p className="text-[14px] a-suave">Os eventos vêm da Agenda da igreja; os pregadores e as fotos, dos kits de Divulgação de cada culto. O que mudar aqui fica só neste aparelho.</p>
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
                </section>
            )}

            {aba === 'imprimir' && (
                <section className="space-y-3" aria-labelledby="imprimir">
                    <Navegador texto={nomeMes(mes)} onAnterior={() => setMes(mesVizinho(mes, -1))} onSeguinte={() => setMes(mesVizinho(mes, 1))} rotuloAnterior="Mês anterior" rotuloSeguinte="Mês seguinte" />
                    <h2 id="imprimir" className="text-[19px] font-bold">Imprimir o mês</h2>
                    <div className="grid gap-2">
                        <Link href={`/midia/agenda/imprimir?formato=visitante&mes=${mes}${casaQ}`} className="a-botao a-botao-secundario !min-h-[52px] w-full">Para visitantes (bonita, por semanas)</Link>
                        <Link href={`/midia/agenda/imprimir?formato=relatorio&mes=${mes}${casaQ}`} className="a-botao a-botao-secundario !min-h-[52px] w-full">Relatório (tabela)</Link>
                    </div>
                </section>
            )}

            {/* Barra fixa: por cima da barra de baixo da app no telemóvel */}
            {aba !== 'imprimir' && (
                <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 border-t px-4 py-2 md:bottom-0 md:left-20 lg:left-64"
                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                    <div className="mx-auto flex max-w-xl gap-2">
                        <a href={`${urlImagem}${urlImagem.includes('?') ? '&' : '?'}download=1`} className="a-botao a-botao-principal !min-h-[50px] flex-1"><Download size={18} aria-hidden /> Descarregar</a>
                        <button type="button" onClick={partilhar} disabled={aPartilhar} className="a-botao a-botao-secundario !min-h-[50px] flex-1"><Share2 size={18} aria-hidden /> {aPartilhar ? 'A preparar…' : 'Partilhar'}</button>
                    </div>
                    {aviso && <p role="status" className="mx-auto mt-1 max-w-xl text-[14px] a-suave">{aviso}</p>}
                </div>
            )}
        </div>
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

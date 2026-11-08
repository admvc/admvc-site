'use client'

// Kit de artes de um culto: escolher estilo + cores, marcar as artes do telão e das redes, pôr a foto do preletor,
// ver, guardar e descarregar, e copiar a legenda e a mensagem de WhatsApp.
// As imagens vêm de /api/divulgacao/imagem (geradas na hora; a pré-visualização é uma versão pequena); o que fica guardado é só a receita.
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Check, ChevronDown, Copy, Download, Eraser, ImagePlus, Layers, Megaphone, Save, Share2, Trash2, Send } from 'lucide-react'
import { concluirPublicacao, guardarKitDivulgacao, guardarPadraoDivulgacao, retirarPublicacao } from '@/actions/divulgacao-actions'
import { ALVOS, ESTILOS, FUNDOS_PRONTOS, MODELOS_REDES, PALETAS, PECAS, REDES, redesDoEstilo, type EstiloId, type PecaId, type RedeId } from '@/lib/divulgacao'
import { ibanValido } from '@/lib/oferta'
import { FORMATOS_TEXTO, LIMITES_TEXTO, modeloDasRedes, nomeDaPeca, nomeDaRede, paramsDaPeca, paramsDaRede, quandoDoEvento, semDestaque, type CamposTexto, type FormatoTexto, type FotoKit, type Receita, type TextosAfinados } from '@/lib/divulgacao-kit'
import { textosDoCulto } from '@/lib/divulgacao-textos'
import { linkWhatsApp } from '@/lib/whatsapp'
import { enviarImagem } from './enviar-imagem'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { criarZip } from '@/lib/zip'
import AjustarFoto from './AjustarFoto'
import BancoDeFundos from '@/components/midia/EscolherFundo'
import type { CategoriaFundo } from '@/lib/fundos'
import { limitarAjuste, type Ajuste } from '@/lib/divulgacao-enquadrar'

type Props = {
    eventoId: number
    eventoNome: string
    dataISO: string                               // data/hora do culto (Lisboa "escrita" em UTC)
    hojeISO: string                               // agora, no mesmo formato (para "Hoje" / "Amanhã" nos textos)
    local: string                                 // cidade da igreja, para a legenda
    receitaInicial: Receita
    guardado: boolean
    contas: { nome: string; iban: string }[]
    publicadoEm: string | null                    // quando foi publicado para a igreja (ISO) ou null
    publicadoJson: string                         // a receita desse momento (para saber se mudou depois)
    padrao: string                                // a receita-padrão da igreja (JSON) ou ''
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const miniatura = 'block cursor-pointer overflow-hidden rounded-[14px] border text-left'
const chip = 'flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[15px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]'

// Texto que só conta quando se sai do campo (cada mudança volta a desenhar as imagens)
function CampoTexto({ valor, onCommit, ...resto }: { valor: string; onCommit: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>) {
    const [v, setV] = useState(valor)
    useEffect(() => setV(valor), [valor])
    return (
        <input {...resto} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== valor && onCommit(v)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (v !== valor) onCommit(v) } }}
            className={campo} style={estiloCampo} />
    )
}

// Uma foto do preletor: carregar, clicar na imagem para dizer onde está o rosto (o corte segue esse ponto), tirar
function CampoFoto({ titulo, ajuda, foto, onChange }: { titulo: string; ajuda: string; foto: FotoKit | null; onChange: (f: FotoKit | null) => void }) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    // a última foto escolhida (para voltar a enviar sem o fundo branco) e se o servidor viu um fundo claro
    const [original, setOriginal] = useState<{ file: File; claro: boolean } | null>(null)
    const [antes, setAntes] = useState<FotoKit | null>(null)   // a foto com fundo, para desfazer o recorte
    const [aTirar, setATirar] = useState(false)
    const [aviso, setAviso] = useState('')

    async function enviar(file: File | undefined, tirarBranco = false) {
        if (!file) return
        setErro(''); setAEnviar(true); setAntes(null)
        try {
            const j = await enviarImagem(file, 'foto', tirarBranco)
            setOriginal({ file, claro: !!j.fundoClaro })
            onChange({ url: j.url, foco: '50% 30%', w: j.largura, h: j.altura, recorte: j.recorte })
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível enviar a foto.')
        } finally {
            setAEnviar(false)
        }
    }

    // "Tirar fundo branco": serve para a foto que acabou de ser escolhida e também para uma que já estava guardada
    async function tirarFundo() {
        if (!foto) return
        setErro(''); setAviso(''); setATirar(true)
        try {
            let file = original?.file
            if (!file) {
                const res = await fetch(foto.url)
                if (!res.ok) throw new Error('Não consegui abrir a foto. Escolha-a outra vez.')
                const blob = await res.blob()
                file = new File([blob], 'foto.jpg', { type: blob.type || 'image/jpeg' })
            }
            const j = await enviarImagem(file, 'foto', true)
            if (!j.recorte) { setAviso('Não encontrei um fundo branco para tirar nesta foto.'); return }
            setAntes(foto)
            onChange({ url: j.url, foco: '50% 30%', w: j.largura, h: j.altura, recorte: true })
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não foi possível tirar o fundo.')
        } finally {
            setATirar(false)
        }
    }

    const [fx, fy] = (foto?.foco ?? '50% 30%').split(' ').map((n) => parseInt(n, 10))
    return (
        <div className="space-y-2">
            <span className="block text-[15px] font-semibold">{titulo}</span>
            <p className="text-[14px] a-suave">{ajuda}</p>
            {foto ? (
                <div className="space-y-2">
                    <div className="relative max-w-xs overflow-hidden rounded-xl border" style={{ borderColor: 'var(--a-borda)' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={foto.url} alt={titulo} className="block w-full cursor-crosshair"
                            onClick={(e) => {
                                const r = e.currentTarget.getBoundingClientRect()
                                const x = Math.round(((e.clientX - r.left) / r.width) * 100), y = Math.round(((e.clientY - r.top) / r.height) * 100)
                                onChange({ ...foto, foco: `${x}% ${y}%` })
                            }} />
                        <span aria-hidden className="pointer-events-none absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: `${fx}%`, top: `${fy}%`, background: 'rgba(0,0,0,0.25)' }} />
                    </div>
                    {foto.recorte
                        ? <p className="text-[14px] font-semibold">Recorte (fundo transparente): o preletor aparece de pé sobre o fundo.</p>
                        : <p className="text-[14px] a-suave">Clique na cara do preletor: o corte das artes fica à volta desse ponto.</p>}
                    {!foto.recorte && (
                        <div className="space-y-1">
                            <button type="button" disabled={aEnviar || aTirar} onClick={tirarFundo} className={`a-botao ${original?.claro ? 'a-botao-principal' : 'a-botao-secundario'} !min-h-[48px] w-full max-w-xs`}>
                                <Eraser size={18} aria-hidden /> {aTirar ? 'A tirar o fundo…' : 'Tirar fundo branco'}
                            </button>
                            <p className="text-[13px] a-suave">Para fotos tiradas contra uma parede ou pano branco: o preletor fica recortado, de pé sobre o fundo da arte.</p>
                        </div>
                    )}
                    {antes && foto.recorte && (
                        <button type="button" onClick={() => { onChange(antes); setAntes(null) }} className="a-botao a-botao-secundario !min-h-[44px]">Voltar à foto com fundo</button>
                    )}
                    {aviso && <p role="status" className="text-[14px] font-semibold">{aviso}</p>}
                    <button type="button" onClick={() => onChange(null)} className="a-botao a-botao-secundario !min-h-[44px]"><Trash2 size={18} aria-hidden /> Tirar a foto</button>
                </div>
            ) : (
                <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                    <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : 'Escolher foto'}
                    <input type="file" accept="image/*" className="sr-only" disabled={aEnviar} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = '' }} />
                </label>
            )}
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
        </div>
    )
}

/** A categoria do banco de fundos que faz sentido abrir para este culto (pelo nome do culto). */
function categoriaDoCulto(nome: string): CategoriaFundo {
    const n = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    if (/mulher|senhora/.test(n)) return 'MULHERES'
    if (/jove|adolesc/.test(n)) return 'JOVENS'
    if (/homen|varo/.test(n)) return 'HOMENS'
    if (/famil|casa/.test(n)) return 'FAMILIA'
    if (/louvor|adora/.test(n)) return 'LOUVOR'
    return 'ADMVC'
}

// Fundo da arte: só cores, um dos prontos, um do banco de fundos da Mídia ou um enviado (fica no Blob público)
function EscolherFundo({ valor, onChange, nomeCulto = '' }: { valor: string; onChange: (v: string) => void; nomeCulto?: string }) {
    const [aEnviar, setAEnviar] = useState(false)
    const [erro, setErro] = useState('')
    const [banco, setBanco] = useState(false)
    const proprio = valor.startsWith('https://')
    async function enviar(file: File | undefined) {
        if (!file) return
        setErro(''); setAEnviar(true)
        try { onChange((await enviarImagem(file, 'fundo')).url) }
        catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível enviar o fundo.') }
        finally { setAEnviar(false) }
    }
    return (
        <fieldset className="space-y-2">
            <legend className="text-[17px] font-bold">Imagem de fundo</legend>
            <p className="text-[14px] a-suave">No telão aparece no estilo &quot;Foto de fundo&quot;; nas redes fica atrás do preletor.</p>
            <div className="flex flex-wrap items-center gap-2">
                <label className={chip} style={estiloCampo}>
                    <input type="radio" name="fundo" checked={!valor} onChange={() => onChange('')} className="sr-only" /> Só cores
                </label>
                {FUNDOS_PRONTOS.map((f) => (
                    <label key={f.id} className={chip} style={estiloCampo}>
                        <input type="radio" name="fundo" checked={valor === f.id} onChange={() => onChange(f.id)} className="sr-only" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/images/divulgacao/fundos/${f.ficheiro}`} alt="" className="h-8 w-14 rounded object-cover" /> {f.nome}
                    </label>
                ))}
                {proprio && (
                    <label className={chip} style={estiloCampo}>
                        <input type="radio" name="fundo" checked readOnly className="sr-only" />
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={valor} alt="" className="h-8 w-14 rounded object-cover" /> O meu fundo
                    </label>
                )}
                <label className="a-botao a-botao-secundario !min-h-[48px] cursor-pointer">
                    <ImagePlus size={18} aria-hidden /> {aEnviar ? 'A enviar…' : proprio ? 'Trocar o meu fundo' : 'Enviar um fundo'}
                    <input type="file" accept="image/*" className="sr-only" disabled={aEnviar} onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = '' }} />
                </label>
                <button type="button" className="a-botao a-botao-secundario !min-h-[48px]" aria-expanded={banco} onClick={() => setBanco((b) => !b)}>
                    <Layers size={18} aria-hidden /> {banco ? 'Fechar o banco de fundos' : 'Escolher do banco de fundos'}
                </button>
            </div>
            {banco && (
                <BancoDeFundos
                    categoria={categoriaDoCulto(nomeCulto)}
                    onEscolher={(f) => { onChange(f.url); setBanco(false) }}
                />
            )}
            {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
        </fieldset>
    )
}

function CaixaTexto({ titulo, valor, onChange, onRefazer, whatsapp }: { titulo: string; valor: string; onChange: (v: string) => void; onRefazer: () => void; whatsapp?: boolean }) {
    const [copiado, setCopiado] = useState(false)
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[16px] font-semibold">{titulo}</span>
                <span className="flex gap-2">
                    <button type="button" onClick={onRefazer} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">Refazer</button>
                    <button type="button" onClick={async () => { await navigator.clipboard?.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">
                        <Copy size={16} aria-hidden /> {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    {whatsapp && <a href={linkWhatsApp(valor)} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-principal !min-h-[40px] !px-3 text-[14px]"><Send size={16} aria-hidden /> Enviar no WhatsApp</a>}
                </span>
            </div>
            <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={12} aria-label={titulo} className="a-foco w-full rounded-[14px] border p-3 text-[16px] leading-relaxed" style={estiloCampo} />
        </div>
    )
}

const PADRAO_CAMPOS = ['estilo', 'paleta', 'redes', 'fundo', 'tinta', 'modeloRedes', 'estilosSeparados', 'cantina'] as const
const doPadrao = (x: Partial<Receita>) => JSON.stringify(PADRAO_CAMPOS.map((k) => x[k]))

// O padrão de publicação da ADMVC: as cores e as letras das artes, as regras de desenho, e o botão para o fixar como início de cada kit
function PadraoAdmvc({ r, padraoJson, onGuardar, aGuardar }: { r: Receita; padraoJson: string; onGuardar: () => void; aGuardar: boolean }) {
    const p = PALETAS.find((x) => x.id === r.paleta) ?? PALETAS[0]
    const [copiada, setCopiada] = useState('')
    const eOPadrao = !!padraoJson && doPadrao(JSON.parse(padraoJson)) === doPadrao(r)
    const cores: [string, string][] = [['Fundo', p.fundo], ['Cor 1', p.c1], ['Cor 2', p.c2], ['Texto', p.texto], ['Destaque', p.acento]]
    return (
        <details className="rounded-[14px] border" style={{ borderColor: 'var(--a-borda)' }}>
            <summary className="a-foco flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0"><span className="block text-[16px] font-bold">Padrão da ADMVC</span><span className="block truncate text-[14px] a-suave">Cores, letras e regras das artes</span></span>
                <ChevronDown size={20} className="shrink-0 a-suave" aria-hidden />
            </summary>
            <div className="space-y-3 border-t p-3" style={{ borderColor: 'var(--a-borda)' }}>
                <div>
                    <p className="mb-1 text-[15px] font-semibold">Cores · {p.nome} <span className="font-normal a-suave">(toque para copiar o código)</span></p>
                    <div className="flex flex-wrap gap-2">
                        {cores.map(([nome, hex]) => (
                            <button key={nome} type="button" onClick={async () => { try { await navigator.clipboard.writeText(hex); setCopiada(hex); setTimeout(() => setCopiada(''), 1500) } catch { /* copiar à mão */ } }}
                                className="a-foco flex items-center gap-2 rounded-[12px] border py-1 pl-1 pr-3 text-left" style={{ borderColor: 'var(--a-borda)' }}>
                                <span aria-hidden className="h-9 w-9 shrink-0 rounded-[8px] border" style={{ background: hex, borderColor: 'var(--a-borda)' }} />
                                <span className="text-[13px] leading-tight"><span className="block font-semibold">{nome}</span><span className="block a-suave">{copiada === hex ? 'Copiado' : hex}</span></span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-1 text-[15px]">
                    <p><strong>Letras:</strong> títulos em <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700 }}>CINZEL</span>, textos e datas em <strong style={{ fontFamily: 'Montserrat, sans-serif' }}>Montserrat</strong>; nos estilos claros, <em style={{ fontFamily: 'Playfair Display, serif' }}>Playfair</em> e escrita à mão para a Palavra.</p>
                    <p><a href="/images/pomba_admvc.png" download="logotipo-admvc.png" className="a-foco underline" style={{ color: 'var(--a-destaque)' }}>Descarregar o logótipo (pomba, PNG)</a></p>
                </div>
                <ul className="list-disc space-y-0.5 pl-5 text-[15px]">
                    <li>Logótipo ADMVC sempre no topo, pequeno.</li>
                    <li>A data e a hora vão na faixa de cor de destaque.</li>
                    <li>O preletor fica em baixo, com a foto de pé e fundo recortado, sem nada encostado às margens.</li>
                    <li>Uma ideia por arte: título grande e pouco texto.</li>
                </ul>
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onGuardar} disabled={aGuardar || eOPadrao} className="a-botao a-botao-secundario !min-h-[44px]">
                        {aGuardar ? 'A guardar…' : eOPadrao ? '✓ É o padrão da igreja' : 'Usar como padrão da igreja'}
                    </button>
                    <span className="text-[14px] a-suave">Os kits novos começam com este estilo, estas cores, as redes e o fundo.</span>
                </div>
            </div>
        </details>
    )
}

// Uma linha de texto para a equipa das redes: título, contador de caracteres, "repor o automático" e a pré-visualização
// ao vivo (a imagem segue o que se escreve, depois de um instante). Cada mudança vale logo na receita.
function CampoLinha({ id, rotulo, ajuda, valor, onChange, max, placeholder, multi }: {
    id: string; rotulo: string; ajuda?: string; valor: string; onChange: (v: string) => void; max: number; placeholder?: string; multi?: boolean
}) {
    const quase = valor.length >= max * 0.9
    return (
        <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={id} className="text-[15px] font-semibold">{rotulo}</label>
                <span className={`shrink-0 text-[13px] ${quase ? 'font-semibold' : 'a-suave'}`} style={quase ? { color: 'var(--a-aviso, #b45309)' } : undefined} aria-live="polite">{valor.length}/{max}</span>
            </div>
            {multi
                ? <textarea id={id} value={valor} rows={2} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="a-foco w-full rounded-[14px] border px-3 py-2 text-[16px]" style={estiloCampo} />
                : <input id={id} value={valor} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={campo} style={estiloCampo} />}
            <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-[13px] a-suave">{ajuda}</p>
                {valor && <button type="button" onClick={() => onChange('')} className="a-foco inline-flex min-h-[32px] shrink-0 items-center text-[13px] underline" style={{ color: 'var(--a-destaque)' }}>Repor o automático</button>}
            </div>
        </div>
    )
}

type FormatoTab = FormatoTexto

// "Escrever nas artes": os campos ao lado de UMA arte ao vivo. O que se escreve vale para o telão e para as redes;
// "Só para este formato" afina um texto num formato (o resto continua igual).
function EditorTextos({ r, rv, mudar, ev, dia, meuVerso, setMeuVerso, ativo }: {
    ativo: boolean; r: Receita; rv: Receita; mudar: (p: Partial<Receita>) => void; ev: { nome: string; data: Date }; dia: string; meuVerso: boolean; setMeuVerso: (v: boolean) => void
}) {
    const tabs: FormatoTab[] = ['telao', ...r.redes]
    const [formato, setFormato] = useState<FormatoTab>(r.redes[0] ?? 'telao')
    const atual: FormatoTab = tabs.includes(formato) ? formato : 'telao'
    const [afinandoEm, setAfinandoEm] = useState<Partial<Record<FormatoTab, boolean>>>({})
    const afinando = afinandoEm[atual] ?? !!r.afinar[atual]
    const nomeFormato = FORMATOS_TEXTO.find((f) => f.id === atual)?.nome ?? ''

    const geral = (k: CamposTexto) => (k === 'quando' ? r.quandoTexto : k === 'livre' ? r.textoLivre : r[k])
    const valor = (k: CamposTexto) => (afinando ? r.afinar[atual]?.[k] ?? '' : geral(k))
    function gravar(k: CamposTexto, v: string) {
        if (afinando) {
            const f: TextosAfinados = { ...(r.afinar[atual] ?? {}), [k]: v }
            if (!v) delete f[k]
            const afinar = { ...r.afinar }
            if (Object.keys(f).length) afinar[atual] = f; else delete afinar[atual]
            mudar({ afinar })
        } else mudar(k === 'quando' ? { quandoTexto: v } : k === 'livre' ? { textoLivre: v } : { [k]: v } as Partial<Receita>)
    }
    function alternarAfinar(ligar: boolean) {
        setAfinandoEm((x) => ({ ...x, [atual]: ligar }))
        if (!ligar && r.afinar[atual]) { const afinar = { ...r.afinar }; delete afinar[atual]; mudar({ afinar }) }
    }
    const auto = quandoDoEvento(ev.data)
    const marca = (k: CamposTexto, auto: string) => (afinando && geral(k) ? `Igual ao geral: ${geral(k)}` : auto)
    const q = atual === 'telao' ? paramsDaPeca(rv, 'capa', dia, ev) : paramsDaRede(rv, atual, ev)
    const vertical = atual === 'post' || atual === 'story'

    return (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,380px)]">
            <div className="order-2 space-y-4 md:order-1">
                <p className="text-[15px] a-suave">O que escrever aqui vale para o telão e para as redes. Veja o resultado ao lado.</p>
                <label className="a-foco flex min-h-[48px] cursor-pointer items-start gap-3 rounded-[14px] border px-3 py-2 text-[15px]" style={estiloCampo}>
                    <input type="checkbox" checked={afinando} onChange={(e) => alternarAfinar(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
                    <span><strong>Só para {atual === 'telao' ? 'o telão' : `o ${nomeFormato}`}</strong><span className="block text-[13px] a-suave">{afinando ? 'O que escrever fica só nesta arte; o resto segue o texto geral. Desligar volta ao geral.' : 'Ligue para este formato ter textos diferentes.'}</span></span>
                </label>

                <CampoLinha id="t-titulo" rotulo="Título" valor={valor('titulo')} onChange={(v) => gravar('titulo', v)} max={LIMITES_TEXTO.titulo}
                    placeholder={marca('titulo', ev.nome)} ajuda="O nome do culto. Pode usar | para mudar de linha." />
                <CampoLinha id="t-sub" rotulo="Linha de cima" valor={valor('subtitulo')} onChange={(v) => gravar('subtitulo', v)} max={LIMITES_TEXTO.subtitulo}
                    placeholder={marca('subtitulo', 'Ex.: Jovens & Gerações')} ajuda="Uma frase pequena por cima do título." />
                <CampoLinha id="t-tema" rotulo="Tema da mensagem" valor={valor('tema')} onChange={(v) => gravar('tema', v)} max={LIMITES_TEXTO.tema}
                    placeholder={marca('tema', 'Ex.: O fruto do Espírito')} ajuda="Ponha entre *asteriscos* a parte a destacar. Vazio = o título é o texto grande." />
                <CampoLinha id="t-quando" rotulo="Data e hora" valor={valor('quando')} onChange={(v) => gravar('quando', v)} max={LIMITES_TEXTO.quando}
                    placeholder={marca('quando', `${auto.quando} · ${auto.hora}`)} ajuda="Vazio = a data e a hora do culto. Separe com um ponto: Sábado, 14 nov · 19h30." />
                <CampoLinha id="t-livre" rotulo="Texto livre" multi valor={valor('livre')} onChange={(v) => gravar('livre', v)} max={LIMITES_TEXTO.livre}
                    placeholder={marca('livre', 'Ex.: Traz um amigo!')} ajuda="Uma frase a mais (convite, aviso…). Vazio = não aparece." />
                {(r.textoLivre || r.afinar[atual]?.livre) && (
                    <fieldset className="space-y-1">
                        <legend className="text-[15px] font-semibold">Tamanho do texto livre</legend>
                        <div className="flex gap-2">
                            {([['p', 'Pequeno'], ['m', 'Normal'], ['g', 'Grande']] as const).map(([id, nome]) => (
                                <label key={id} className={`${chip} flex-1 justify-center`} style={estiloCampo}>
                                    <input type="radio" name="livre-tam" checked={r.textoLivreTam === id} onChange={() => mudar({ textoLivreTam: id })} className="sr-only" />{nome}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <div className="space-y-1">
                    <label htmlFor="t-preletor" className="block text-[15px] font-semibold">Preletor</label>
                    <input id="t-preletor" value={r.preletor} maxLength={60} placeholder="Ex.: Irmão Genesis (vazio se ainda não sabe)" onChange={(e) => mudar({ preletor: e.target.value })} className={campo} style={estiloCampo} />
                </div>

                <fieldset className="space-y-2">
                    <legend className="text-[15px] font-semibold">Versículo no rodapé do telão</legend>
                    <select value={r.semVersiculo ? 'sem' : meuVerso ? 'meu' : 'auto'} aria-label="Versículo no rodapé do telão"
                        onChange={(e) => {
                            const v = e.target.value
                            setMeuVerso(v === 'meu')
                            mudar(v === 'sem' ? { semVersiculo: true } : v === 'meu' ? { semVersiculo: false } : { semVersiculo: false, verso: '', versoRef: '' })
                        }}
                        className={campo} style={estiloCampo}>
                        <option value="auto">Um da lista (muda de culto para culto)</option>
                        <option value="meu">Escolher eu</option>
                        <option value="sem">Sem versículo</option>
                    </select>
                    {!r.semVersiculo && meuVerso && (
                        <>
                            <CampoLinha id="t-verso" rotulo="Texto do versículo" multi valor={r.verso} onChange={(v) => mudar({ verso: v })} max={220} placeholder="Ex.: O Senhor é o meu pastor; nada me faltará." />
                            <CampoLinha id="t-verso-ref" rotulo="Referência" valor={r.versoRef} onChange={(v) => mudar({ versoRef: v })} max={60} placeholder="Ex.: Salmos 23:1" />
                        </>
                    )}
                </fieldset>
            </div>

            <div className="order-1 md:order-2">
                <div className="space-y-2 md:sticky md:top-4">
                    <div role="tablist" aria-label="Formato da pré-visualização" className="flex gap-1 overflow-x-auto">
                        {tabs.map((id) => (
                            <button key={id} type="button" role="tab" aria-selected={id === atual} onClick={() => setFormato(id)}
                                className="a-foco min-h-[44px] shrink-0 rounded-full border px-4 text-[15px] font-semibold aria-selected:ring-2 aria-selected:ring-[var(--a-acento,#f5a524)]" style={estiloCampo}>
                                {FORMATOS_TEXTO.find((f) => f.id === id)?.nome}{r.afinar[id] ? ' ✎' : ''}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-center rounded-[14px] border p-2" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
                        {/* só desenha quando este bloco está aberto */}
                        {ativo && /* eslint-disable-next-line @next/next/no-img-element */
                        <img key={atual} src={`/api/divulgacao/imagem?${q}&previa=1`} alt={`Pré-visualização: ${nomeFormato}`} className={`rounded-lg ${vertical ? 'h-[min(46vh,420px)] w-auto' : 'w-full'}`}
                            style={{ aspectRatio: atual === 'post' ? '4 / 5' : atual === 'story' ? '9 / 16' : '16 / 9' }} />}
                    </div>
                    <p className="text-[13px] a-suave">{atual === 'telao' ? 'Mostra a capa do culto no telão.' : `Mostra o ${nomeFormato} das redes.`} Atualiza uns instantes depois de parar de escrever.</p>
                </div>
            </div>
        </div>
    )
}

type BlocoId = 'estilo' | 'escrita' | 'artes' | 'fotos' | 'textos'
type Escopo = 'tudo' | 'telao' | 'redes'

// Bloco que abre e fecha (só um aberto de cada vez); o conteúdo fica montado para não perder o que se escreveu
function Bloco({ id, titulo, resumo, aberto, abrir, children }: { id: BlocoId; titulo: string; resumo: string; aberto: BlocoId | null; abrir: (id: BlocoId | null) => void; children: React.ReactNode }) {
    const ligado = aberto === id
    return (
        <section className="a-card overflow-hidden">
            <button type="button" onClick={() => abrir(ligado ? null : id)} aria-expanded={ligado} aria-controls={`bloco-${id}`} className="a-foco flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left">
                <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-bold">{titulo}</span>
                    <span className="block truncate text-[14px] a-suave">{resumo}</span>
                </span>
                <ChevronDown size={22} className={`shrink-0 a-suave transition-transform ${ligado ? 'rotate-180' : ''}`} aria-hidden />
            </button>
            <div id={`bloco-${id}`} hidden={!ligado} className="space-y-4 border-t p-4" style={{ borderColor: 'var(--a-borda)' }}>{children}</div>
        </section>
    )
}

// Faixa que desliza de lado (uma arte por ecrã no telemóvel)
function Carrossel({ children }: { children: React.ReactNode }) {
    return <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:px-0">{children}</div>
}

// O valor só "assenta" depois de uns instantes sem mudar (evita desenhar 9 imagens a cada clique)
function useAssente<T>(valor: T, ms = 600): T {
    const [v, setV] = useState(valor)
    useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
    return v
}

export default function DivulgacaoKit({ eventoId, eventoNome, dataISO, hojeISO, local, receitaInicial, guardado, contas, publicadoEm: publicadoEmInicial, publicadoJson: publicadoJsonInicial, padrao: padraoInicial }: Props) {
    const [r, setR] = useState<Receita>(receitaInicial)
    const [guardadoJson, setGuardadoJson] = useState(guardado ? JSON.stringify(receitaInicial) : '')
    const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
    const [meuVerso, setMeuVerso] = useState(!!receitaInicial.verso)   // "Escolher eu": os campos aparecem antes de haver texto
    const [aGuardar, iniciar] = useTransition()
    const [editado, setEditado] = useState<{ legenda?: string; whatsapp?: string }>({})
    const [aberto, setAberto] = useState<BlocoId | null>(guardado ? null : 'estilo')
    const [aPreparar, setAPreparar] = useState(false)
    const [progresso, setProgresso] = useState('')
    const [publicadoEm, setPublicadoEm] = useState(publicadoEmInicial)
    const [publicadoJson, setPublicadoJson] = useState(publicadoJsonInicial)
    const [aPublicar, setAPublicar] = useState(false)
    // O grupo "Telão" começa fechado (só a capa); abre-se para ver as outras artes. Fica lembrado neste aparelho.
    const [telaoAberto, setTelaoAberto] = useState(false)
    useEffect(() => { try { setTelaoAberto(localStorage.getItem('admvc-divulgacao-telao') === '1') } catch { /* sem armazenamento */ } }, [])
    const alternarTelao = () => setTelaoAberto((v) => { const n = !v; try { localStorage.setItem('admvc-divulgacao-telao', n ? '1' : '0') } catch { /* sem armazenamento */ } return n })

    const atual = JSON.stringify(r)
    const alterado = atual !== guardadoJson
    const data = useMemo(() => new Date(dataISO), [dataISO])
    const mudar = (p: Partial<Receita>) => { setR((x) => ({ ...x, ...p })); setMsg(null) }
    // Escolher o estilo muda o telão e as redes (a não ser que estejam separados)
    const escolherEstilo = (id: EstiloId) => mudar(r.estilosSeparados ? { estilo: id } : { estilo: id, modeloRedes: redesDoEstilo(id) })
    const alternarPeca = (id: PecaId) => mudar({ pecas: PECAS.map((p) => p.id).filter((x) => (x === id ? !r.pecas.includes(x) : r.pecas.includes(x))) })
    const alternarRede = (id: RedeId) => mudar({ redes: REDES.map((p) => p.id).filter((x) => (x === id ? !r.redes.includes(x) : r.redes.includes(x))) })

    const gravar = async (): Promise<boolean> => {
        const res = await guardarKitDivulgacao(eventoId, r)
        if (res.ok) { setGuardadoJson(atual); setMsg({ ok: true, texto: 'Artes guardadas.' }); return true }
        setMsg({ ok: false, texto: 'error' in res ? res.error : 'Não foi possível guardar.' })
        return false
    }
    const guardar = () => iniciar(async () => { await gravar() })
    const semArtes = r.pecas.length === 0 && r.redes.length === 0

    const paleta = PALETAS.find((p) => p.id === r.paleta) ?? PALETAS[0]
    const dia = dataISO.slice(0, 10)
    const rv = useAssente(r)   // as pré-visualizações seguem a receita só depois de um instante sem mexer
    const ev = { nome: eventoNome, data }
    const lista = rv.pecas.map((id, i) => ({ id, n: i + 1, q: paramsDaPeca(rv, id, dia, ev) }))
    const nomeRede = (id: RedeId) => REDES.find((x) => x.id === id)?.nome ?? id

    // Publicar para a igreja: grava se preciso, desenha cada arte inteira no servidor (uma de cada vez) e junta a lista
    async function publicar() {
        setMsg(null)
        if (alterado && !(await gravar())) return
        setAPublicar(true)
        try {
            const lote = String(Date.now())
            const itens = [...r.pecas.map((id) => ({ tipo: 'peca', id })), ...r.redes.map((id) => ({ tipo: 'rede', id }))]
            const feitos: { tipo: string; id: string; url: string }[] = []
            for (const [i, it] of itens.entries()) {
                setProgresso(`A publicar ${i + 1} de ${itens.length}…`)
                const res = await fetch('/api/divulgacao/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ evento: eventoId, item: `${it.tipo}:${it.id}`, lote }) })
                const j = await res.json().catch(() => ({}))
                if (!res.ok || !j.url) throw new Error(j.error ?? 'Não foi possível publicar uma das artes.')
                feitos.push({ ...it, url: j.url })
            }
            // textos sem "Hoje/Amanhã" (ficam certos nos dias seguintes), a não ser que tenham sido editados
            const neutros = textosDoCulto({ nome: semDestaque(r.titulo) || eventoNome, data, preletor: r.preletor, local, hoje: new Date(data.getTime() - 3 * 86400000) })
            const fim = await concluirPublicacao(eventoId, lote, feitos, { legenda: editado.legenda ?? neutros.legenda, whatsapp: editado.whatsapp ?? neutros.whatsapp })
            if ('error' in fim) throw new Error(fim.error)
            setPublicadoEm(new Date().toISOString()); setPublicadoJson(atual)
            setMsg(null)   // o cartão "Página Divulgar e Holyrics" já diz "Publicado a …"
        } catch (e) {
            setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível publicar.' })
        } finally {
            setAPublicar(false); setProgresso('')
        }
    }
    async function retirar() {
        setMsg(null); setAPublicar(true)
        const res = await retirarPublicacao(eventoId)
        setAPublicar(false)
        if (res.ok) { setPublicadoEm(null); setPublicadoJson(''); setMsg({ ok: true, texto: 'Retirado da página Divulgar.' }) }
        else setMsg({ ok: false, texto: 'error' in res ? res.error : 'Não foi possível retirar.' })
    }
    const publicadoEmDia = !!publicadoEm && publicadoJson === atual
    const ocupado = aGuardar || aPreparar || aPublicar
    const [aPartilhar, setAPartilhar] = useState('')
    const [ajustando, setAjustando] = useState<RedeId | null>(null)
    // a foto que cada formato usa (a deitada na capa, a ao alto no resto), como em paramsDaRede
    const fotoDa = (id: RedeId) => { const x = id === 'youtube' ? r.fotoH ?? r.fotoV : r.fotoV ?? r.fotoH; return x && x.w && x.h ? x : null }
    function guardarAjuste(id: RedeId, a: Ajuste | null) {
        const foto = fotoDa(id)
        const resto = { ...r.ajustes }; delete resto[id]
        mudar({ ajustes: a && foto ? { ...resto, [id]: { url: foto.url, ...limitarAjuste(a, !!foto.recorte) } } : resto })
        setAjustando(null)
    }
    const [padraoJson, setPadraoJson] = useState(padraoInicial)
    const [aGuardarPadrao, setAGuardarPadrao] = useState(false)
    async function usarComoPadrao() {
        setAGuardarPadrao(true); setMsg(null)
        const res = await guardarPadraoDivulgacao(r)
        setAGuardarPadrao(false)
        if (res.ok) { setPadraoJson(JSON.stringify(r)); setMsg({ ok: true, texto: 'Padrão da igreja guardado: os kits novos começam assim.' }) }
        else setMsg({ ok: false, texto: 'error' in res ? res.error : 'Não foi possível guardar o padrão.' })
    }
    async function partilharRede(id: RedeId, q: URLSearchParams) {
        setMsg(null); setAPartilhar(id)
        const texto = editado.whatsapp ?? textosDoCulto({ nome: semDestaque(r.titulo) || eventoNome, data, preletor: r.preletor, local, hoje: new Date(hojeISO) }).whatsapp
        const res = await partilharArte(`/api/divulgacao/imagem?${q}`, nomeDaRede(id), texto)
        if (res !== 'cancelada') setMsg({ ok: res === 'partilhada', texto: AVISO_PARTILHA[res] })
        setAPartilhar('')
    }

    // Descarregar tudo: grava se preciso, pede cada imagem inteira (uma de cada vez, sem limite de tempo) e monta o ZIP aqui
    async function descarregarTudo(escopo: Escopo = 'tudo') {
        setMsg(null)
        if (alterado && !(await gravar())) return
        setAPreparar(true)
        try {
            const itens = [
                ...(escopo !== 'redes' ? r.pecas.map((id, i) => ({ nome: nomeDaPeca(r, id, i + 1), q: paramsDaPeca(r, id, dia, ev) })) : []),
                ...(escopo !== 'telao' ? r.redes.map((id) => ({ nome: nomeDaRede(id), q: paramsDaRede(r, id, ev) })) : []),
            ]
            const ficheiros: { nome: string; dados: Uint8Array }[] = []
            for (const [i, it] of itens.entries()) {
                setProgresso(`A preparar ${i + 1} de ${itens.length}…`)
                const res = await fetch(`/api/divulgacao/imagem?${it.q}`)
                if (!res.ok) throw new Error('Não foi possível preparar uma das artes.')
                ficheiros.push({ nome: it.nome, dados: new Uint8Array(await res.arrayBuffer()) })
            }
            setProgresso('A juntar…')
            const url = URL.createObjectURL(new Blob([criarZip(ficheiros) as BlobPart], { type: 'application/zip' }))
            const a = document.createElement('a')
            a.href = url; a.download = `artes-culto-${dia}${escopo === 'tudo' ? '' : `-${escopo}`}.zip`; document.body.appendChild(a); a.click(); a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 10000)
            setMsg({ ok: true, texto: `${itens.length} artes descarregadas.` })
        } catch (e) {
            setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Não foi possível descarregar.' })
        } finally {
            setAPreparar(false); setProgresso('')
        }
    }

    // Legenda e WhatsApp: saem do culto e do preletor; podem editar-se (a edição fica até carregar em "Refazer")
    const gerados = useMemo(() => textosDoCulto({ nome: semDestaque(r.titulo) || eventoNome, data, preletor: r.preletor, local, hoje: new Date(hojeISO) }), [r.titulo, r.preletor, eventoNome, data, local, hojeISO])

    return (
        <div className="space-y-4 pb-24 md:pb-0">
            <Bloco id="estilo" titulo="Estilo e cores" resumo={`${ESTILOS.find((e) => e.id === r.estilo)?.nome}${r.estilosSeparados ? ` · redes: ${MODELOS_REDES.find((m) => m.id === r.modeloRedes)?.nome}` : ''} · ${paleta.nome}`} aberto={aberto} abrir={setAberto}>
                <PadraoAdmvc r={r} padraoJson={padraoJson} onGuardar={usarComoPadrao} aGuardar={aGuardarPadrao} />
                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Estilo {r.estilosSeparados ? 'do telão' : '(telão e redes)'}</legend>
                    {!r.estilosSeparados && <p className="text-[14px] a-suave">Cada estilo tem a versão do telão e a das redes (o quadradinho no canto): escolher um muda as duas.</p>}
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                        {ESTILOS.map((e) => (
                            <label key={e.id} className={`${miniatura} ${r.estilo === e.id ? 'ring-2 ring-[var(--a-acento,#f5a524)]' : ''}`} style={estiloCampo}>
                                <input type="radio" name="estilo" checked={r.estilo === e.id} onChange={() => escolherEstilo(e.id)} className="sr-only" />
                                <span className="relative block">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/images/divulgacao/amostras/${e.id}-${r.paleta}.jpg`} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: '16 / 9', background: 'var(--a-borda)' }} />
                                    {!r.estilosSeparados && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={`/images/divulgacao/amostras/redes-${e.redes}.jpg`} alt="" loading="lazy" className="absolute bottom-1 right-1 w-[36%] rounded border-2 border-white shadow" style={{ aspectRatio: '16 / 9', objectFit: 'cover', background: 'var(--a-borda)' }} />
                                    )}
                                </span>
                                <span className="block px-2 py-1.5 text-[14px] font-semibold">{e.nome}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <label className="a-foco flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[14px] border px-3 py-2 text-[15px]" style={estiloCampo}>
                    <input type="checkbox" checked={r.estilosSeparados} className="h-5 w-5 shrink-0"
                        onChange={(e) => mudar(e.target.checked ? { estilosSeparados: true } : { estilosSeparados: false, modeloRedes: redesDoEstilo(r.estilo) })} />
                    <span><strong>Estilos diferentes no telão e nas redes</strong><span className="block text-[13px] a-suave">Desligado: o mesmo estilo nos dois.</span></span>
                </label>

                {r.estilosSeparados && (
                    <fieldset className="space-y-2">
                        <legend className="text-[17px] font-bold">Estilo das redes</legend>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                            {MODELOS_REDES.map((m) => (
                                <label key={m.id} className={`${miniatura} ${r.modeloRedes === m.id ? 'ring-2 ring-[var(--a-acento,#f5a524)]' : ''}`} style={estiloCampo}>
                                    <input type="radio" name="modeloRedes" checked={r.modeloRedes === m.id} onChange={() => mudar({ modeloRedes: m.id })} className="sr-only" />
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/images/divulgacao/amostras/redes-${m.id}.jpg`} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: '16 / 9', background: 'var(--a-borda)', objectFit: 'cover' }} />
                                    <span className="block px-2 py-1.5 text-[14px] font-semibold">{m.nome}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                )}

                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Cores · {paleta.nome}</legend>
                    <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                        {PALETAS.map((p) => (
                            <label key={p.id} title={p.nome} className={`${miniatura} ${r.paleta === p.id ? 'ring-2 ring-[var(--a-acento,#f5a524)]' : ''}`} style={estiloCampo}>
                                <input type="radio" name="paleta" checked={r.paleta === p.id} onChange={() => mudar({ paleta: p.id })} className="sr-only" />
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={`/images/divulgacao/amostras/${r.estilo}-${p.id}.jpg`} alt="" loading="lazy" className="block w-full" style={{ aspectRatio: '16 / 9', background: p.fundo }} />
                                <span className="block truncate px-1.5 py-1 text-[12px] font-semibold">{p.nome}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <EscolherFundo nomeCulto={eventoNome} valor={r.fundo} onChange={(v) => mudar(v ? { fundo: v, estilo: 'foto', ...(r.estilosSeparados ? {} : { modeloRedes: redesDoEstilo('foto') }) } : { fundo: '' })} />
            </Bloco>

            <Bloco id="escrita" titulo="Escrever nas artes" resumo={`${r.titulo || eventoNome}${r.textoLivre ? ' · com texto livre' : ''}`} aberto={aberto} abrir={setAberto}>
                <EditorTextos ativo={aberto === 'escrita'} r={r} rv={rv} mudar={mudar} ev={ev} dia={dia} meuVerso={meuVerso} setMeuVerso={setMeuVerso} />
            </Bloco>

            <Bloco id="artes" titulo="Artes" resumo={`${r.pecas.length} no telão · ${r.redes.length} nas redes`} aberto={aberto} abrir={setAberto}>
                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Artes para o telão</legend>
                    <div className="flex flex-wrap gap-2">
                        {PECAS.map((p) => {
                            const ligada = r.pecas.includes(p.id)
                            return (
                                <label key={p.id} className={chip} style={estiloCampo}>
                                    <input type="checkbox" checked={ligada} onChange={() => alternarPeca(p.id)} className="sr-only" />
                                    <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: 'var(--a-borda)' }}>{ligada && <Check size={14} />}</span>
                                    {p.nome}
                                </label>
                            )
                        })}
                    </div>
                </fieldset>

                <fieldset className="space-y-2">
                    <legend className="text-[17px] font-bold">Artes para as redes sociais</legend>
                    <div className="flex flex-wrap gap-2">
                        {REDES.map((p) => {
                            const ligada = r.redes.includes(p.id)
                            return (
                                <label key={p.id} className={chip} style={estiloCampo}>
                                    <input type="checkbox" checked={ligada} onChange={() => alternarRede(p.id)} className="sr-only" />
                                    <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: 'var(--a-borda)' }}>{ligada && <Check size={14} />}</span>
                                    {p.nome}
                                </label>
                            )
                        })}
                    </div>
                </fieldset>

                <div className="grid gap-3 md:grid-cols-2">
                    {r.redes.length === 0 && r.pecas.length === 0 && <p className="a-suave md:col-span-2">Marque pelo menos uma arte.</p>}
                    {r.pecas.includes('oracao-dirigida') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Oração por…</span>
                            <select value={r.alvoTexto ? '' : r.alvo} onChange={(e) => mudar({ alvo: e.target.value, alvoTexto: '' })} className={campo} style={estiloCampo}>
                                {Object.entries(ALVOS).map(([id, [, nome]]) => <option key={id} value={id}>{nome}</option>)}
                                {r.alvoTexto && <option value="">Outro: {r.alvoTexto}</option>}
                            </select>
                            <CampoTexto valor={r.alvoTexto} onCommit={(v) => mudar({ alvoTexto: v })} placeholder="Ou escreva outro (ex.: Enfermos)" maxLength={40} />
                        </div>
                    )}
                    {r.pecas.includes('palavra') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Palavra no telão (o tema escreve-se em &quot;Escrever nas artes&quot;)</span>
                            <CampoTexto valor={r.ref} onCommit={(v) => mudar({ ref: v })} placeholder="Texto bíblico (ex.: 1 Samuel 17:22-26)" maxLength={80} />
                            {(r.fotoV ?? r.fotoH)?.recorte && (
                                <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                                    <input type="checkbox" checked={r.palavraComFoto} onChange={(e) => mudar({ palavraComFoto: e.target.checked })} className="h-5 w-5" />
                                    Pôr o preletor (recorte) ao lado do tema
                                </label>
                            )}
                        </div>
                    )}
                    {r.pecas.includes('oferta') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">IBAN da oferta</span>
                            {contas.length > 0 && (
                                <select value={contas.find((c) => c.iban === r.iban)?.iban ?? ''} onChange={(e) => e.target.value && mudar({ iban: e.target.value })} className={campo} style={estiloCampo}>
                                    <option value="">Escolher uma conta da igreja…</option>
                                    {contas.map((c) => <option key={c.iban} value={c.iban}>{c.nome}</option>)}
                                </select>
                            )}
                            <CampoTexto valor={r.iban} onCommit={(v) => mudar({ iban: v })} placeholder="PT50 0000 0000 0000 0000 0000 0" maxLength={40} />
                            {r.iban && !ibanValido(r.iban) && <p className="text-[14px] font-semibold" style={{ color: 'var(--a-erro)' }}>Este IBAN não parece certo (confira os números).</p>}
                            <span className="block pt-1 text-[15px] font-semibold">MB WAY (só aparece escrito, não há QR para MB WAY)</span>
                            <CampoTexto valor={r.mbway} onCommit={(v) => mudar({ mbway: v })} placeholder="+351 9xx xxx xxx" maxLength={20} inputMode="tel" />
                            <span className="block pt-1 text-[15px] font-semibold">QR na oferta</span>
                            <select value={r.qrOferta} onChange={(e) => mudar({ qrOferta: e.target.value as typeof r.qrOferta })} className={campo} style={estiloCampo}>
                                <option value="nenhum">Sem QR</option>
                                <option value="banco">QR de transferência (a app do banco preenche o IBAN)</option>
                                <option value="pagina">QR para uma página com o IBAN e o botão Copiar</option>
                            </select>
                            {r.qrOferta === 'banco' && (
                                <>
                                    <CampoTexto valor={r.titular} onCommit={(v) => mudar({ titular: v })} placeholder="Nome do titular da conta (como no banco)" maxLength={70} />
                                    <p className="text-[13px] a-suave">Teste com a app de 2 ou 3 bancos antes de pôr no telão: nem todas leem este QR. Se alguma falhar, use a página com o botão Copiar.</p>
                                </>
                            )}
                        </div>
                    )}
                    {r.pecas.includes('cantina') && (
                        <div className="space-y-2 md:col-span-2">
                            <span className="block text-[15px] font-semibold">Capa da Cantina</span>
                            <div className="grid gap-2 md:grid-cols-2">
                                <CampoTexto valor={r.cantina.titulo} onCommit={(v) => mudar({ cantina: { ...r.cantina, titulo: v } })} placeholder="Título (ex.: Cantina)" maxLength={40} />
                                <CampoTexto valor={r.cantina.subtitulo} onCommit={(v) => mudar({ cantina: { ...r.cantina, subtitulo: v } })} placeholder="Linha por baixo (ex.: Aberta depois do culto)" maxLength={60} />
                            </div>
                            <span className="block text-[15px] font-semibold">Textos legais (até 4, pequenos em baixo da arte)</span>
                            {r.cantina.textos.map((t, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <CampoTexto valor={t} maxLength={90} placeholder="Ex.: Preços com IVA incluído"
                                            onCommit={(v) => mudar({ cantina: { ...r.cantina, textos: r.cantina.textos.map((x, j) => (j === i ? v : x)).filter((x) => x.trim()) } })} />
                                    </div>
                                    <button type="button" aria-label="Tirar este texto" className="a-botao a-botao-secundario !min-h-[48px] !px-3"
                                        onClick={() => mudar({ cantina: { ...r.cantina, textos: r.cantina.textos.filter((_, j) => j !== i) } })}>
                                        <Trash2 size={18} aria-hidden />
                                    </button>
                                </div>
                            ))}
                            {r.cantina.textos.length < 4 && (
                                <CampoTexto key={`novo-${r.cantina.textos.length}`} valor="" maxLength={90} placeholder="Escreva um texto e prima Enter (ex.: Contém glúten e lactose)"
                                    onCommit={(v) => v.trim() && mudar({ cantina: { ...r.cantina, textos: [...r.cantina.textos, v.trim()] } })} />
                            )}
                            <CampoFoto titulo="Foto da Cantina (opcional)" ajuda="Aparece num círculo ao lado do título. Clique na parte da foto que deve ficar no centro."
                                foto={r.cantina.foto} onChange={(f) => mudar({ cantina: { ...r.cantina, foto: f } })} />
                            <p className="text-[13px] a-suave">Dica: carregue em &quot;Usar como padrão da igreja&quot; para a Cantina sair igual em todos os cultos.</p>
                        </div>
                    )}
                    {r.pecas.includes('boas-vindas') && (
                        <div className="space-y-1">
                            <span className="block text-[15px] font-semibold">Endereço do QR (boas-vindas)</span>
                            <CampoTexto valor={r.qr} onCommit={(v) => mudar({ qr: v })} maxLength={300} inputMode="url" />
                        </div>
                    )}
                </div>
            </Bloco>

            {r.redes.length > 0 && (
                <Bloco id="fotos" titulo="Foto do preletor" resumo={r.fotoV || r.fotoH ? "Com foto" : "Sem foto"} aberto={aberto} abrir={setAberto}>
                        <p className="text-[14px] a-suave">Uma foto recortada (PNG com fundo transparente, do remove.bg ou do Canva) fica muito melhor: o preletor aparece de pé sobre o fundo, e também na Palavra do telão.</p>
                        <div className="grid gap-4 md:grid-cols-2">
                            <CampoFoto titulo="Foto ao alto (post e story)" ajuda="Uma foto em pé, do preletor da cintura para cima, funciona melhor." foto={r.fotoV} onChange={(f) => mudar({ fotoV: f })} />
                            <CampoFoto titulo="Foto deitada (capa da live)" ajuda="Opcional: sem ela, a capa usa a foto ao alto." foto={r.fotoH} onChange={(f) => mudar({ fotoH: f })} />
                        </div>
                        {(r.fotoH || r.fotoV) && (
                            <label className="block max-w-xs space-y-1">
                                <span className="block text-[15px] font-semibold">Véu de cor sobre a foto</span>
                                <select value={String(r.tinta)} onChange={(e) => mudar({ tinta: Number(e.target.value) })} className={campo} style={estiloCampo}>
                                    <option value="0">Nenhum</option><option value="0.15">Leve</option><option value="0.25">Médio</option><option value="0.4">Forte (camisas de cor que destoam)</option>
                                </select>
                            </label>
                        )}
                </Bloco>
            )}

            <section className="a-card flex items-start gap-3 p-4" aria-labelledby="h-publicar">
                <Megaphone size={22} className="mt-0.5 shrink-0" aria-hidden style={{ color: 'var(--a-destaque)' }} />
                <div className="min-w-0 flex-1 space-y-0.5">
                    <h2 id="h-publicar" className="text-[17px] font-bold">Página Divulgar e Holyrics</h2>
                    <p className="text-[15px]" role="status">
                        {!publicadoEm ? <span className="a-suave">Ainda não publicado. &quot;Publicar&quot; põe as artes das redes na página Divulgar (para os irmãos partilharem) e as do telão no Holyrics.</span>
                            : publicadoEmDia
                                ? <span suppressHydrationWarning>✓ Publicado a {new Date(publicadoEm).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}, em dia.</span>
                                : <strong style={{ color: 'var(--a-aviso, #b45309)' }}>Mudou depois de publicar: carregue em &quot;Publicar&quot; outra vez.</strong>}
                    </p>
                    {publicadoEm && (
                        <p className="flex flex-wrap gap-x-4 text-[14px]">
                            <a href="/divulgar" target="_blank" rel="noopener noreferrer" className="a-foco underline" style={{ color: 'var(--a-destaque)' }}>Ver a página Divulgar</a>
                            <button type="button" onClick={retirar} disabled={ocupado} className="a-foco underline a-suave">Retirar</button>
                        </p>
                    )}
                </div>
            </section>

            {msg && <p role="status" className="text-[15px]" style={{ color: msg.ok ? 'var(--a-ok, #16a34a)' : 'var(--a-erro, #dc2626)' }}>{msg.texto}</p>}

            {lista.length > 0 && (() => {
                const capa = lista.find((x) => x.id === 'capa') ?? lista[0]
                return (
                    <section className="space-y-2" aria-labelledby="h-telao">
                        <div className="flex items-center justify-between gap-2">
                            <button type="button" onClick={alternarTelao} aria-expanded={telaoAberto} aria-controls="telao-artes" className="a-foco flex min-h-[48px] min-w-0 flex-1 items-center gap-2 text-left">
                                <ChevronDown size={22} className={`shrink-0 a-suave transition-transform ${telaoAberto ? 'rotate-180' : '-rotate-90'}`} aria-hidden />
                                <h2 id="h-telao" className="text-[19px] font-bold">Telão <span className="text-[15px] font-normal a-suave">· {lista.length} {lista.length === 1 ? 'arte' : 'artes'}</span></h2>
                            </button>
                            <button type="button" onClick={() => descarregarTudo('telao')} disabled={ocupado} className="a-foco inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}><Download size={16} aria-hidden /> ZIP</button>
                        </div>
                        <div id="telao-artes">
                            {!telaoAberto ? (
                                <button type="button" onClick={alternarTelao} className="a-foco flex w-full max-w-md items-center gap-3 rounded-[14px] border p-2 text-left" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/divulgacao/imagem?${capa.q}&previa=1`} alt={`${PECAS.find((p) => p.id === capa.id)?.nome} (pré-visualização)`} className="w-[46%] shrink-0 rounded-lg border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9', background: 'var(--a-card)' }} />
                                    <span className="min-w-0 text-[15px]"><strong className="block">{PECAS.find((p) => p.id === capa.id)?.nome}</strong><span className="a-suave">Toque para ver as {lista.length} artes.</span></span>
                                </button>
                            ) : (
                                <Carrossel>
                                    {lista.map(({ id, n, q }) => (
                                        <figure key={id} className="w-[85%] shrink-0 snap-center space-y-2 md:w-[calc(50%-8px)]">
                                            <figcaption className="text-[16px] font-semibold">{PECAS.find((p) => p.id === id)?.nome}</figcaption>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={`/api/divulgacao/imagem?${q}&previa=1`} alt={PECAS.find((p) => p.id === id)?.nome} loading="lazy" className="w-full rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9', background: 'var(--a-card)' }} />
                                            <a href={`/api/divulgacao/imagem?${q}&download=1`} download={nomeDaPeca(rv, id, n)} className="a-botao a-botao-secundario !min-h-[44px]"><Download size={18} aria-hidden /> Descarregar (1920×1080)</a>
                                        </figure>
                                    ))}
                                </Carrossel>
                            )}
                        </div>
                    </section>
                )
            })()}

            {rv.redes.length > 0 && (
                <section className="space-y-2" aria-labelledby="h-redes">
                    <div className="flex items-center justify-between gap-2">
                        <h2 id="h-redes" className="text-[19px] font-bold">Redes sociais</h2>
                        <button type="button" onClick={() => descarregarTudo('redes')} disabled={ocupado} className="a-foco inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}><Download size={16} aria-hidden /> ZIP</button>
                    </div>
                    <Carrossel>
                        {rv.redes.map((id) => {
                            const q = paramsDaRede(rv, id, ev)
                            return (
                                <figure key={id} className={`shrink-0 snap-center space-y-2 ${id === 'youtube' ? 'w-[85%] md:w-[calc(50%-8px)]' : 'w-[62%] md:w-[calc(25%-10px)]'}`}>
                                    <figcaption className="text-[16px] font-semibold">{nomeRede(id)}</figcaption>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/divulgacao/imagem?${q}&previa=1`} alt={nomeRede(id)} loading="lazy" className="w-full rounded-xl border"
                                        style={{ borderColor: 'var(--a-borda)', aspectRatio: id === 'post' ? '4 / 5' : id === 'story' ? '9 / 16' : '16 / 9', background: 'var(--a-card)' }} />
                                    <div className="flex gap-2">
                                        {fotoDa(id) && <button type="button" onClick={() => setAjustando(id)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[14px]">{r.ajustes[id] && r.ajustes[id]!.url === fotoDa(id)!.url ? 'Foto ✓' : 'Foto'}</button>}
                                        <button type="button" onClick={() => partilharRede(id, q)} disabled={aPartilhar === id} className="a-botao a-botao-principal !min-h-[44px] min-w-0 flex-1 !px-3"><Share2 size={18} className="shrink-0" aria-hidden /> {aPartilhar === id ? 'A abrir…' : 'WhatsApp'}</button>
                                        <a href={`/api/divulgacao/imagem?${q}&download=1`} download={nomeDaRede(id)} aria-label={`Descarregar ${nomeRede(id)}`} className="a-botao a-botao-secundario !min-h-[44px] !px-3"><Download size={18} aria-hidden /></a>
                                    </div>
                                </figure>
                            )
                        })}
                    </Carrossel>
                </section>
            )}

            {r.redes.length > 0 && (
                <Bloco id="textos" titulo="Textos para publicar" resumo="Legenda e WhatsApp" aberto={aberto} abrir={setAberto}>
                    <div className="grid gap-4 md:grid-cols-2">
                        <CaixaTexto titulo="Legenda Instagram / Facebook" valor={editado.legenda ?? gerados.legenda} onChange={(v) => setEditado((x) => ({ ...x, legenda: v }))} onRefazer={() => setEditado((x) => ({ ...x, legenda: undefined }))} />
                        <CaixaTexto whatsapp titulo="Mensagem de WhatsApp" valor={editado.whatsapp ?? gerados.whatsapp} onChange={(v) => setEditado((x) => ({ ...x, whatsapp: v }))} onRefazer={() => setEditado((x) => ({ ...x, whatsapp: undefined }))} />
                    </div>
                </Bloco>
            )}

            {ajustando && fotoDa(ajustando) && (
                <AjustarFoto formato={ajustando} modelo={modeloDasRedes(r)} foto={fotoDa(ajustando)!} paleta={paleta}
                    inicial={r.ajustes[ajustando] && r.ajustes[ajustando]!.url === fotoDa(ajustando)!.url ? r.ajustes[ajustando]! : null}
                    onFeito={(a) => guardarAjuste(ajustando, a)} onFechar={() => setAjustando(null)} />
            )}

            {/* BARRA: fixa em baixo no telemóvel (por cima da barra do menu), no fim da página no computador */}
            <div className="fixed inset-x-0 z-40 px-3 bottom-[calc(72px+env(safe-area-inset-bottom))] md:static md:px-0">
                <div className="a-card flex items-center gap-2 p-2 shadow-lg md:shadow-none">
                    <button type="button" onClick={guardar} disabled={ocupado || !alterado || semArtes} className="a-botao a-botao-secundario !min-h-[48px] !px-3 shrink-0">
                        <Save size={18} aria-hidden /> {aGuardar ? 'A guardar…' : alterado ? 'Guardar' : 'Guardado'}
                    </button>
                    <button type="button" onClick={() => descarregarTudo()} disabled={ocupado || semArtes} aria-label="Descarregar todas as artes (ZIP)" className="a-botao a-botao-secundario !min-h-[48px] !px-3 shrink-0">
                        <Download size={18} aria-hidden /> ZIP
                    </button>
                    <button type="button" onClick={publicar} disabled={ocupado || semArtes || publicadoEmDia} className="a-botao a-botao-principal !min-h-[48px] !px-3 min-w-0 flex-1">
                        <Megaphone size={18} className="shrink-0" aria-hidden />
                        <span className="truncate">{progresso || (publicadoEmDia ? 'Publicado' : publicadoEm ? 'Publicar outra vez' : 'Publicar')}</span>
                    </button>
                </div>
            </div>
        </div>
    )
}

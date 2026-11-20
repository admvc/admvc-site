'use client'

// Kit de artes de um culto em 5 PASSOS (?passo=N): 1 Estilo e cores · 2 Imagem de fundo · 3 Escrever nas artes · 4 Preletor e prévia · 5 Resumo
// (no 5, os separadores Telão · Redes · YouTube, ?aba=). "Como vai ficar" flutuante nos passos 1–3; nos 4 e 5 as prévias estão na página.
// Guardar, descarregar (ZIP), publicar, copiar a legenda e a mensagem de WhatsApp, a capa e as lives do YouTube.
// As imagens vêm de /api/divulgacao/imagem (geradas na hora; a pré-visualização é uma versão pequena); o que fica guardado é só a receita.
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, Download, Eraser, ImagePlus, Layers, Megaphone, Save, Settings, Share2, Trash2, Send } from 'lucide-react'
import { concluirPublicacao, guardarKitDivulgacao, guardarPadraoDivulgacao, retirarPublicacao } from '@/actions/divulgacao-actions'
import { ALVOS, FUNDOS_PRONTOS, MODELOS_REDES, PALETAS, PECAS, REDES, redesDoEstilo, type EstiloId, type PecaId, type RedeId } from '@/lib/divulgacao'
import { nomeDoEstilo, padraoPorId } from '@/lib/divulgacao-padroes'
import { ibanValido } from '@/lib/oferta'
import { LIMITES_TEXTO, REDES_DAS_ARTES, modeloDasRedes, nomeDaPeca, nomeDaRede, paramsDaPeca, paramsDaRede, quandoDoEvento, redesAtivas, semDestaque, type AbaDivulgacao, type CamposTexto, type FormatoTexto, type FotoKit, type Receita, type TextosAfinados } from '@/lib/divulgacao-kit'
import { textosDoCulto } from '@/lib/divulgacao-textos'
import { linkWhatsApp } from '@/lib/whatsapp'
import { enviarImagem } from './enviar-imagem'
import { AVISO_PARTILHA, partilharArte } from '@/lib/partilhar-arte'
import { criarZip } from '@/lib/zip'
import AjustarFoto from './AjustarFoto'
import EstiloECores from './DivulgacaoEstilo'
import Gaveta from './Gaveta'
import JanelaGrande from './JanelaGrande'
import { JanelaDaArte, PreviaFlutuante, type ItemPrevia } from './DivulgacaoPrevia'
import LivesDaSemana from '@/components/midia/LivesDaSemana'
import { enderecoDaCapa } from '@/lib/youtube-capa-dados'
import YoutubeCapa, { HistoricoCapa, NOME_LIVE, useCapaYoutube, type CapaYoutube } from '@/components/midia/YoutubeLivePainel'
import CampoPreletor from '@/components/midia/CampoPreletor'
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
    abaInicial?: AbaDivulgacao                    // o separador do endereço (?aba=)
    passoInicial?: number | null                  // o passo do endereço (?passo=) ou, com ?aba=, o 5; null = decidir aqui
    padraoAuto?: string | null                    // o padrão que o nome do culto escolheu sozinho (kit ainda sem escolha guardada)
}

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const chip = 'relative flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[14px] border px-3 text-[15px] has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]'

// Texto que conta enquanto se escreve (as miniaturas esperam um instante); com vivo={false} só conta ao sair do campo ou com Enter
function CampoTexto({ valor, onCommit, vivo = true, ...resto }: { valor: string; onCommit: (v: string) => void; vivo?: boolean } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>) {
    const [v, setV] = useState(valor)
    useEffect(() => setV(valor), [valor])
    return (
        <input {...resto} value={v} onChange={(e) => { setV(e.target.value); if (vivo) onCommit(e.target.value) }} onBlur={() => v !== valor && onCommit(v)}
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
            <legend className="sr-only">Imagem de fundo</legend>
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
                <span className="flex flex-wrap gap-2">
                    <button type="button" onClick={onRefazer} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">Refazer</button>
                    <button type="button" onClick={async () => { await navigator.clipboard?.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 2000) }} className="a-botao a-botao-secundario !min-h-[40px] !px-3 text-[14px]">
                        <Copy size={16} aria-hidden /> {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    {whatsapp && <a href={linkWhatsApp(valor)} target="_blank" rel="noopener noreferrer" className="a-botao a-botao-principal !min-h-[40px] !px-3 text-[14px]"><Send size={16} aria-hidden /> Enviar no WhatsApp</a>}
                </span>
            </div>
            <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={8} aria-label={titulo} className="a-foco w-full rounded-[14px] border p-3 text-[16px] leading-relaxed" style={estiloCampo} />
        </div>
    )
}

const PADRAO_CAMPOS = ['estilo', 'paleta', 'redes', 'fundo', 'tinta', 'modeloRedes', 'estilosSeparados', 'cantina', 'iban', 'mbway', 'titular', 'qrOferta'] as const
const doPadrao = (x: Partial<Receita>) => JSON.stringify(PADRAO_CAMPOS.map((k) => x[k]))

// "Definições da Igreja" (janela aberta pelo botão no topo): as cores e as letras das artes, as regras de desenho, e o botão para fixar este kit como início dos kits novos
function PadraoAdmvc({ r, padraoJson, onGuardar, aGuardar }: { r: Receita; padraoJson: string; onGuardar: () => void; aGuardar: boolean }) {
    const p = PALETAS.find((x) => x.id === r.paleta) ?? PALETAS[0]
    const [copiada, setCopiada] = useState('')
    const eOPadrao = !!padraoJson && doPadrao(JSON.parse(padraoJson)) === doPadrao(r)
    const cores: [string, string][] = [['Fundo', p.fundo], ['Cor 1', p.c1], ['Cor 2', p.c2], ['Texto', p.texto], ['Destaque', p.acento]]
    return (
        <div className="space-y-3">
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
                    <span className="text-[14px] a-suave">Os kits novos começam com este estilo, estas cores, as redes, o fundo e os dados da oferta (IBAN, MB WAY, QR).</span>
                </div>
        </div>
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
const NOME_FORMATO: Record<FormatoTab, string> = { telao: 'Telão', post: 'Post 4:5', story: 'Story 9:16', youtube: 'Capa YouTube' }
const COLUNAS_AFINAR: { k: CamposTexto; nome: string }[] = [
    { k: 'titulo', nome: 'Título' }, { k: 'quando', nome: 'Data e hora' }, { k: 'tema', nome: 'Tema' }, { k: 'subtitulo', nome: 'Linha de cima' },
]
const PECAS_COM_DADOS: PecaId[] = ['oracao-dirigida', 'palavra', 'oferta', 'cantina', 'boas-vindas']

// "Escrever nas artes": um formulário que não muda de sítio.
// A: os dados do culto (valem para todas as artes) · B: os dados próprios das artes do telão marcadas (todos visíveis, em lista)
// · C: texto diferente numa arte (opcional, fechado). Cada mudança vale logo na receita (r.afinar guarda os textos por formato).
/** Oferta (20/11): cada forma de dar liga-se com uma caixa; os campos só aparecem quando ligada. */
function OfertaCompacta({ r, mudar, contas, titulo }: { r: Receita; mudar: (p: Partial<Receita>) => void; contas: { nome: string; iban: string }[]; titulo: React.ReactNode }) {
    const [usaIban, setUsaIban] = useState(!!r.iban)
    const [usaMb, setUsaMb] = useState(!!r.mbway)
    const [guardado, setGuardado] = useState({ iban: r.iban, mbway: r.mbway })   // desligar e voltar a ligar não perde o que estava
    const conta = contas.find((c) => c.iban === r.iban)
    const [outro, setOutro] = useState(!!r.iban && !conta)
    const caixa = 'flex min-h-[44px] cursor-pointer items-center gap-2 text-[15px] font-semibold'
    function ligarIban(v: boolean) {
        setUsaIban(v)
        if (v) mudar({ iban: guardado.iban || contas[0]?.iban || '' })
        else { setGuardado((g) => ({ ...g, iban: r.iban })); mudar({ iban: '', qrOferta: 'nenhum' }) }
    }
    function ligarMb(v: boolean) {
        setUsaMb(v)
        if (v) mudar({ mbway: guardado.mbway })
        else { setGuardado((g) => ({ ...g, mbway: r.mbway })); mudar({ mbway: '' }) }
    }
    const QR: [Receita['qrOferta'], string][] = [['nenhum', 'Sem QR'], ['banco', 'QR do banco'], ['pagina', 'QR para página']]
    return (
        <div className="space-y-2 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
            {titulo}
            <div className="grid items-center gap-2 md:grid-cols-[150px_minmax(0,1fr)]">
                <label className={caixa}><input type="checkbox" checked={usaIban} onChange={(e) => ligarIban(e.target.checked)} className="h-5 w-5" /> IBAN</label>
                {usaIban && (
                    <div className="min-w-0 space-y-1">
                        {contas.length > 0 && !outro ? (
                            <select aria-label="Conta da igreja" value={conta?.iban ?? ''} onChange={(e) => (e.target.value === '__outro' ? setOutro(true) : mudar({ iban: e.target.value }))} className={campo} style={estiloCampo}>
                                {!conta && <option value="">Escolher uma conta…</option>}
                                {contas.map((c) => <option key={c.iban} value={c.iban}>{c.nome} · {c.iban.replace(/\s/g, '').slice(-4)}</option>)}
                                <option value="__outro">Outro IBAN…</option>
                            </select>
                        ) : (
                            <CampoTexto aria-label="IBAN" valor={r.iban} onCommit={(v) => mudar({ iban: v })} placeholder="PT50 0000 0000 0000 0000 0000 0" maxLength={40} />
                        )}
                        {r.iban && !ibanValido(r.iban) && <p className="text-[13px] font-semibold" style={{ color: 'var(--a-erro)' }}>Este IBAN não parece certo (confira os números).</p>}
                    </div>
                )}
                <label className={caixa}><input type="checkbox" checked={usaMb} onChange={(e) => ligarMb(e.target.checked)} className="h-5 w-5" /> MB WAY</label>
                {usaMb && <CampoTexto aria-label="Número MB WAY" valor={r.mbway} onCommit={(v) => mudar({ mbway: v })} placeholder="+351 912 345 678 (aparece escrito)" maxLength={20} inputMode="tel" />}
            </div>
            {usaIban && (
                <div className="flex flex-wrap items-center gap-2 pt-1" role="radiogroup" aria-label="QR na oferta">
                    {QR.map(([v, nome]) => (
                        <button key={v} type="button" role="radio" aria-checked={r.qrOferta === v} onClick={() => mudar({ qrOferta: v })}
                            className="a-foco min-h-[40px] rounded-full border px-3 text-[14px] font-semibold aria-checked:ring-2 aria-checked:ring-[var(--a-destaque)]" style={estiloCampo}>{nome}</button>
                    ))}
                    {r.qrOferta === 'banco' && <CampoTexto aria-label="Titular da conta" valor={r.titular} onCommit={(v) => mudar({ titular: v })} placeholder="Titular, como no banco" maxLength={70} />}
                </div>
            )}
            {r.qrOferta === 'banco' && usaIban && <p className="text-[13px] a-suave">Teste com 2 ou 3 apps de bancos antes de pôr no telão; se alguma falhar, use o QR para página.</p>}
            <p className="text-[13px] a-suave">As contas vêm de Financeiro → Reconciliação. Para não escrever todas as vezes: Definições da Igreja → guardar como padrão.</p>
        </div>
    )
}

function EditorArtes({ r, mudar, ev, meuVerso, setMeuVerso, contas, redesOk }: {
    r: Receita; mudar: (p: Partial<Receita>) => void; ev: { nome: string; data: Date }; meuVerso: boolean; setMeuVerso: (v: boolean) => void
    contas: { nome: string; iban: string }[]; redesOk: RedeId[]
}) {
    const geral = (k: CamposTexto) => (k === 'quando' ? r.quandoTexto : k === 'livre' ? r.textoLivre : r[k])
    const gravarGeral = (k: CamposTexto, v: string) => mudar(k === 'quando' ? { quandoTexto: v } : k === 'livre' ? { textoLivre: v } : { [k]: v } as Partial<Receita>)
    function gravarAfinado(formato: FormatoTab, k: CamposTexto, v: string) {
        const f: TextosAfinados = { ...(r.afinar[formato] ?? {}), [k]: v }
        if (!v) delete f[k]
        const afinar = { ...r.afinar }
        if (Object.keys(f).length) afinar[formato] = f; else delete afinar[formato]
        mudar({ afinar })
    }
    const auto = quandoDoEvento(ev.data)
    const autoDe: Record<CamposTexto, string> = { titulo: ev.nome, quando: `${auto.quando} · ${auto.hora}`, tema: 'Ex.: O fruto do Espírito', subtitulo: 'Ex.: Jovens & Gerações', livre: '' }
    const formatos: FormatoTab[] = [...(r.pecas.length ? ['telao' as const] : []), ...redesOk, 'youtube']
    const emUso = formatos.filter((f) => r.afinar[f] && Object.keys(r.afinar[f]!).length).length
    const peca = (id: PecaId) => r.pecas.includes(id)
    const temB = PECAS_COM_DADOS.some(peca)
    const titulo = (t: string) => <h4 className="text-[15px] font-bold">{t}</h4>

    return (
        <div className="space-y-5">
            {/* A. Dados do culto */}
            <section aria-labelledby="ed-comum" className="space-y-3">
                <h3 id="ed-comum" className="text-[17px] font-bold">Dados do culto <span className="text-[14px] font-normal a-suave">· valem para todas as artes</span></h3>
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                    <CampoLinha id="t-titulo" rotulo="Título" valor={r.titulo} onChange={(v) => gravarGeral('titulo', v)} max={LIMITES_TEXTO.titulo}
                        placeholder={autoDe.titulo} ajuda="Vazio = o nome do culto. Use | para mudar de linha." />
                    <CampoLinha id="t-quando" rotulo="Data e hora" valor={r.quandoTexto} onChange={(v) => gravarGeral('quando', v)} max={LIMITES_TEXTO.quando}
                        placeholder={autoDe.quando} ajuda="Vazio = a data e a hora do culto. Ex.: Sábado, 14 nov · 19h30." />
                    <CampoLinha id="t-tema" rotulo="Tema" valor={r.tema} onChange={(v) => gravarGeral('tema', v)} max={LIMITES_TEXTO.tema}
                        placeholder={autoDe.tema} ajuda="Ponha entre *asteriscos* a parte a destacar." />
                    <div className="space-y-1">
                        <label htmlFor="t-preletor" className="block text-[15px] font-semibold">Preletor</label>
                        <CampoPreletor id="t-preletor" value={r.preletor} maxLength={60} placeholder="Ex.: Pastor João Silva (vazio se ainda não sabe)" onChange={(t) => mudar({ preletor: t })} />
                    </div>
                    <div className="md:col-span-2">
                        <CampoLinha id="t-sub" rotulo="Linha de cima" valor={r.subtitulo} onChange={(v) => gravarGeral('subtitulo', v)} max={LIMITES_TEXTO.subtitulo}
                            placeholder={autoDe.subtitulo} ajuda="Uma frase pequena por cima do título." />
                    </div>
                </div>
                <div className="grid gap-x-4 gap-y-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <CampoLinha id="t-livre" rotulo="Texto livre (opcional)" multi valor={r.textoLivre} onChange={(v) => gravarGeral('livre', v)} max={LIMITES_TEXTO.livre}
                            placeholder="Ex.: Traz um amigo!" ajuda="Uma frase a mais (convite, aviso…). Vazio = não aparece." />
                        {r.textoLivre && (
                            <fieldset className="space-y-1">
                                <legend className="text-[15px] font-semibold">Tamanho do texto livre</legend>
                                <div className="flex gap-2">
                                    {([['p', 'Pequeno'], ['m', 'Normal'], ['g', 'Grande']] as const).map(([i, nome]) => (
                                        <label key={i} className={`${chip} flex-1 justify-center`} style={estiloCampo}>
                                            <input type="radio" name="livre-tam" checked={r.textoLivreTam === i} onChange={() => mudar({ textoLivreTam: i })} className="sr-only" />{nome}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        )}
                    </div>
                    {r.pecas.length > 0 && (
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
                                <div className="space-y-3">
                                    <CampoLinha id="t-verso" rotulo="Texto do versículo" multi valor={r.verso} onChange={(v) => mudar({ verso: v })} max={220} placeholder="Ex.: O Senhor é o meu pastor; nada me faltará." />
                                    <CampoLinha id="t-verso-ref" rotulo="Referência" valor={r.versoRef} onChange={(v) => mudar({ versoRef: v })} max={60} placeholder="Ex.: Salmos 23:1" />
                                </div>
                            )}
                        </fieldset>
                    )}
                </div>
            </section>

            {/* B. Dados das artes do telão (só as marcadas que precisam) */}
            {temB && (
                <section aria-labelledby="ed-telao" className="space-y-4 border-t pt-4" style={{ borderColor: 'var(--a-borda)' }}>
                    <h3 id="ed-telao" className="text-[17px] font-bold">Dados de artes do telão <span className="text-[14px] font-normal a-suave">· só das artes marcadas</span></h3>

                    {peca('palavra') && (
                        <div className="space-y-2 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
                            {titulo('Palavra')}
                            <div className="space-y-1">
                                <label htmlFor="ed-ref" className="block text-[15px] font-semibold">Texto bíblico</label>
                                <CampoTexto id="ed-ref" valor={r.ref} onCommit={(v) => mudar({ ref: v })} placeholder="Ex.: 1 Samuel 17:22-26" maxLength={80} />
                            </div>
                            {(r.fotoV ?? r.fotoH)?.recorte && (
                                <label className="flex min-h-[44px] items-center gap-2 text-[15px]">
                                    <input type="checkbox" checked={r.palavraComFoto} onChange={(e) => mudar({ palavraComFoto: e.target.checked })} className="h-5 w-5" />
                                    Pôr o preletor (recorte) ao lado do tema
                                </label>
                            )}
                        </div>
                    )}

                    {peca('oracao-dirigida') && (
                        <div className="space-y-1 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
                            {titulo('Oração por…')}
                            <label htmlFor="ed-alvo" className="sr-only">Oração por…</label>
                            <select id="ed-alvo" value={r.alvoTexto ? '' : r.alvo} onChange={(e) => mudar({ alvo: e.target.value, alvoTexto: '' })} className={campo} style={estiloCampo}>
                                {Object.entries(ALVOS).map(([i, [, nome]]) => <option key={i} value={i}>{nome}</option>)}
                                {r.alvoTexto && <option value="">Outro: {r.alvoTexto}</option>}
                            </select>
                            <CampoTexto valor={r.alvoTexto} onCommit={(v) => mudar({ alvoTexto: v })} placeholder="Ou escreva outro (ex.: Enfermos)" maxLength={40} aria-label="Outra oração por…" />
                        </div>
                    )}

                    {peca('oferta') && <OfertaCompacta r={r} mudar={mudar} contas={contas} titulo={titulo('Oferta')} />}

                    {peca('cantina') && (
                        <div className="space-y-2 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
                            {titulo('Cantina')}
                            <div className="grid gap-2 md:grid-cols-2">
                                <div className="space-y-1">
                                    <label htmlFor="ed-ct" className="block text-[15px] font-semibold">Título</label>
                                    <CampoTexto id="ed-ct" valor={r.cantina.titulo} onCommit={(v) => mudar({ cantina: { ...r.cantina, titulo: v } })} placeholder="Ex.: Cantina" maxLength={40} />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="ed-cs" className="block text-[15px] font-semibold">Linha por baixo</label>
                                    <CampoTexto id="ed-cs" valor={r.cantina.subtitulo} onCommit={(v) => mudar({ cantina: { ...r.cantina, subtitulo: v } })} placeholder="Ex.: Aberta depois do culto" maxLength={60} />
                                </div>
                            </div>
                            <span className="block text-[15px] font-semibold">Menu <span className="font-normal a-suave">(até 4 linhas; com preço no fim fica um prato do menu, ex.: Sopa do dia 1€)</span></span>
                            {r.cantina.textos.map((t, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className="min-w-0 flex-1">
                                        <CampoTexto valor={t} maxLength={90} placeholder="Ex.: Bifana no pão 3,50€" aria-label={`Linha do menu ${i + 1}`}
                                            onCommit={(v) => mudar({ cantina: { ...r.cantina, textos: r.cantina.textos.map((x, j) => (j === i ? v : x)).filter((x) => x.trim()) } })} />
                                    </div>
                                    <button type="button" aria-label="Tirar este texto" className="a-botao a-botao-secundario !min-h-[48px] !px-3"
                                        onClick={() => mudar({ cantina: { ...r.cantina, textos: r.cantina.textos.filter((_, j) => j !== i) } })}>
                                        <Trash2 size={18} aria-hidden />
                                    </button>
                                </div>
                            ))}
                            {r.cantina.textos.length < 4 && (
                                <CampoTexto key={`novo-${r.cantina.textos.length}`} vivo={false} valor="" maxLength={90} placeholder="Escreva e prima Enter (ex.: Bolo caseiro 2€ ou Contém glúten)" aria-label="Nova linha do menu"
                                    onCommit={(v) => v.trim() && mudar({ cantina: { ...r.cantina, textos: [...r.cantina.textos, v.trim()] } })} />
                            )}
                            <CampoFoto titulo="Foto da Cantina (opcional)" ajuda="Aparece num círculo ao lado do título. Clique na parte da foto que deve ficar no centro."
                                foto={r.cantina.foto} onChange={(f) => mudar({ cantina: { ...r.cantina, foto: f } })} />
                        </div>
                    )}

                    {peca('boas-vindas') && (
                        <div className="space-y-1 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
                            {titulo('Boas-vindas')}
                            <label htmlFor="ed-qr" className="block text-[15px] font-semibold">Endereço do QR</label>
                            <CampoTexto id="ed-qr" valor={r.qr} onCommit={(v) => mudar({ qr: v })} maxLength={300} inputMode="url" placeholder="Ex.: https://www.igrejaadmvc.org/boasvindas" />
                        </div>
                    )}
                </section>
            )}

            {/* C. Texto diferente numa arte */}
            <details className="rounded-[14px] border" style={{ borderColor: 'var(--a-borda)' }}>
                <summary className="a-foco flex min-h-[48px] cursor-pointer items-center px-3 text-[15px] font-semibold">Texto diferente numa arte (opcional){emUso ? ` · ${emUso} em uso` : ''}</summary>
                <div className="space-y-3 border-t p-3" style={{ borderColor: 'var(--a-borda)' }}>
                    <p className="text-[14px] a-suave">Em branco = a arte usa o texto de cima. O que escrever aqui vale só para essa arte.</p>
                    <div className="hidden md:block">
                        <table className="w-full border-collapse text-left text-[14px]">
                            <thead>
                                <tr>
                                    <th scope="col" className="p-1 font-semibold a-suave">Arte</th>
                                    {COLUNAS_AFINAR.map((c) => <th key={c.k} scope="col" className="p-1 font-semibold a-suave">{c.nome}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {formatos.map((f) => (
                                    <tr key={f} className="border-t" style={{ borderColor: 'var(--a-borda)' }}>
                                        <th scope="row" className="whitespace-nowrap p-1 pr-2 font-semibold">{NOME_FORMATO[f]}</th>
                                        {COLUNAS_AFINAR.map((c) => (
                                            <td key={c.k} className="p-1">
                                                <input value={r.afinar[f]?.[c.k] ?? ''} maxLength={LIMITES_TEXTO[c.k]} aria-label={`${c.nome} — ${NOME_FORMATO[f]}`}
                                                    placeholder={geral(c.k) || autoDe[c.k]} onChange={(e) => gravarAfinado(f, c.k, e.target.value)}
                                                    className="a-foco min-h-[44px] w-full min-w-0 rounded-[12px] border px-2 text-[15px]" style={estiloCampo} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="space-y-3 md:hidden">
                        {formatos.map((f) => (
                            <fieldset key={f} className="space-y-2 rounded-[12px] border p-3" style={{ borderColor: 'var(--a-borda)' }}>
                                <legend className="px-1 text-[15px] font-bold">{NOME_FORMATO[f]}</legend>
                                {COLUNAS_AFINAR.map((c) => (
                                    <label key={c.k} className="block space-y-1">
                                        <span className="block text-[14px] font-semibold">{c.nome}</span>
                                        <input value={r.afinar[f]?.[c.k] ?? ''} maxLength={LIMITES_TEXTO[c.k]} placeholder={geral(c.k) || autoDe[c.k]}
                                            onChange={(e) => gravarAfinado(f, c.k, e.target.value)} className={campo} style={estiloCampo} />
                                    </label>
                                ))}
                            </fieldset>
                        ))}
                    </div>
                </div>
            </details>
        </div>
    )
}

// O valor só "assenta" depois de uns instantes sem mudar (evita desenhar as imagens a cada tecla)
function useAssente<T>(valor: T, ms = 250): T {
    const [v, setV] = useState(valor)
    useEffect(() => { const t = setTimeout(() => setV(valor), ms); return () => clearTimeout(t) }, [valor, ms])
    return v
}

const PASSOS = ['Estilo e cores', 'Imagem de fundo', 'Escrever nas artes', 'Preletor e prévia', 'Resumo'] as const

const ABAS: { id: AbaDivulgacao; nome: string }[] = [{ id: 'telao', nome: 'Telão' }, { id: 'redes', nome: 'Redes' }, { id: 'youtube', nome: 'YouTube' }]

/** Linha de estado no topo: publicado ou não · live · capa. */
function LinhaEstado({ publicadoEm, emDia, yt, ocupado, retirar }: { publicadoEm: string | null; emDia: boolean; yt: CapaYoutube; ocupado: boolean; retirar: () => void }) {
    const Ponto = ({ cor }: { cor: string }) => <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor }} />
    const OK = 'var(--a-ok, #16a34a)', AVISO = 'var(--a-aviso, #b45309)', NEUTRO = 'var(--a-borda)'
    const ver = yt.dados?.ver
    const ligado = !!ver && ver.ligado
    const live = ver && ver.ligado ? ver.live : null
    const ultima = yt.registos.find((x) => x.ok)
    const quandoCapa = ultima ? new Date(ultima.quando).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
    const itens: { cor: string; texto: React.ReactNode }[] = [
        !publicadoEm ? { cor: NEUTRO, texto: 'Não publicado' }
            : emDia ? { cor: OK, texto: <span suppressHydrationWarning>Publicado a {new Date(publicadoEm).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> }
                : { cor: AVISO, texto: <strong>Mudou depois de publicar</strong> },
    ]
    if (!yt.dados && !yt.erro) itens.push({ cor: NEUTRO, texto: 'YouTube: a ver…' })
    else if (yt.erro && !yt.dados) itens.push({ cor: AVISO, texto: 'YouTube: não consegui ver agora' })
    else if (!ligado) itens.push({ cor: NEUTRO, texto: 'YouTube por ligar' })
    else {
        itens.push(live ? { cor: live.estado === 'direto' ? '#c0392b' : OK, texto: `Live ${NOME_LIVE[live.estado].toLowerCase()}` } : { cor: AVISO, texto: 'Live por criar' })
        itens.push(ultima ? { cor: OK, texto: <span suppressHydrationWarning>Capa aplicada · {quandoCapa}</span> } : { cor: NEUTRO, texto: 'Capa por aplicar' })
    }
    return (
        <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
            {itens.map((i, n) => <span key={n} className="inline-flex items-center gap-1.5"><Ponto cor={i.cor} />{i.texto}</span>)}
            {publicadoEm && (
                <span className="inline-flex items-center gap-3">
                    <a href="/divulgar" target="_blank" rel="noopener noreferrer" className="a-foco inline-flex min-h-[32px] items-center underline" style={{ color: 'var(--a-destaque)' }}>Ver a página Divulgar</a>
                    <button type="button" onClick={retirar} disabled={ocupado} className="a-foco inline-flex min-h-[32px] items-center underline a-suave">Retirar</button>
                </span>
            )}
        </div>
    )
}

export default function DivulgacaoKit({ eventoId, eventoNome, dataISO, hojeISO, local, receitaInicial, guardado, contas, publicadoEm: publicadoEmInicial, publicadoJson: publicadoJsonInicial, padrao: padraoInicial, abaInicial = 'telao', passoInicial = null, padraoAuto = null }: Props) {
    const [r, setR] = useState<Receita>(receitaInicial)
    const [guardadoJson, setGuardadoJson] = useState(guardado ? JSON.stringify(receitaInicial) : '')
    const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
    const [meuVerso, setMeuVerso] = useState(!!receitaInicial.verso)   // "Escolher eu": os campos aparecem antes de haver texto
    const [aGuardar, iniciar] = useTransition()
    const [editado, setEditado] = useState<{ legenda?: string; whatsapp?: string }>({})
    const [passo, setPasso] = useState(() => (passoInicial && passoInicial >= 1 && passoInicial <= 5 ? passoInicial : guardado ? 5 : 1))
    const [visitados, setVisitados] = useState<number[]>([])
    const [definicoes, setDefinicoes] = useState(false)
    const topoRef = useRef<HTMLDivElement>(null)
    const passoAnt = useRef(passo)
    const [aPreparar, setAPreparar] = useState(false)
    const [progresso, setProgresso] = useState('')
    const [publicadoEm, setPublicadoEm] = useState(publicadoEmInicial)
    const [publicadoJson, setPublicadoJson] = useState(publicadoJsonInicial)
    const [aPublicar, setAPublicar] = useState(false)
    const [aba, setAba] = useState<AbaDivulgacao>(abaInicial)
    const [ytVisto, setYtVisto] = useState(abaInicial === 'youtube')   // o separador YouTube só se monta quando se abre (não chama o YouTube à toa)
    const [grande, setGrande] = useState<string | null>(null)
    const yt = useCapaYoutube(eventoId)

    // passo no endereço (?passo=3), sem recarregar a página nem saltar; ao mudar, volta ao topo do assistente
    function irParaPasso(n: number) {
        if (n < 1 || n > 5 || n === passo) return
        setVisitados((v) => (v.includes(passo) ? v : [...v, passo]))
        setPasso(n)
        try {
            const u = new URL(window.location.href)
            u.searchParams.set('passo', String(n))
            window.history.replaceState(null, '', u)
        } catch { /* sem endereço */ }
    }
    useEffect(() => {
        if (passoAnt.current === passo) return
        passoAnt.current = passo
        topoRef.current?.scrollIntoView({ block: 'start' })
    }, [passo])

    // separador na endereço (?aba=redes), sem recarregar a página
    function irParaAba(a: AbaDivulgacao) {
        setAba(a)
        if (a === 'youtube') setYtVisto(true)
        try {
            const u = new URL(window.location.href)
            if (a === 'telao') u.searchParams.delete('aba'); else u.searchParams.set('aba', a)
            window.history.replaceState(null, '', u)
        } catch { /* sem endereço */ }
    }
    function teclasDasAbas(e: React.KeyboardEvent) {
        const i = ABAS.findIndex((x) => x.id === aba)
        const n = e.key === 'ArrowRight' ? (i + 1) % ABAS.length : e.key === 'ArrowLeft' ? (i + ABAS.length - 1) % ABAS.length : e.key === 'Home' ? 0 : e.key === 'End' ? ABAS.length - 1 : -1
        if (n < 0) return
        e.preventDefault()
        irParaAba(ABAS[n].id)
        document.getElementById(`aba-${ABAS[n].id}`)?.focus()
    }

    const atual = JSON.stringify(r)
    const alterado = atual !== guardadoJson
    const data = useMemo(() => new Date(dataISO), [dataISO])
    const mudar = (p: Partial<Receita>) => { setR((x) => ({ ...x, ...p })); setMsg(null) }
    // Escolher o estilo muda o telão e as redes (a não ser que estejam separados)
    const escolherEstilo = (id: EstiloId) => mudar(r.estilosSeparados ? { estilo: id } : { estilo: id, modeloRedes: redesDoEstilo(id) })
    const alternarPeca = (id: PecaId) => mudar({ pecas: PECAS.map((p) => p.id).filter((x) => (x === id ? !r.pecas.includes(x) : r.pecas.includes(x))) })
    // As redes que se fazem aqui são só o post e o story (a capa 16:9 vive no separador YouTube)
    const redesOk = redesAtivas(r)
    const alternarRede = (id: RedeId) => mudar({ redes: REDES.map((p) => p.id).filter((x) => (x === id ? !r.redes.includes(x) : r.redes.includes(x))) })

    const gravar = async (): Promise<boolean> => {
        const res = await guardarKitDivulgacao(eventoId, r)
        if (res.ok) { setGuardadoJson(atual); setMsg({ ok: true, texto: 'Artes guardadas.' }); yt.atualizarCapas(); void yt.recarregar(); return true }
        setMsg({ ok: false, texto: 'error' in res ? res.error : 'Não foi possível guardar.' })
        return false
    }
    const guardar = () => iniciar(async () => { await gravar() })
    const semArtes = r.pecas.length === 0 && redesOk.length === 0

    const paleta = PALETAS.find((p) => p.id === r.paleta) ?? PALETAS[0]
    const dia = dataISO.slice(0, 10)
    const rv = useAssente(r)   // as pré-visualizações seguem a receita só depois de um instante sem mexer
    const aAtualizar = atual !== JSON.stringify(rv)
    const ev = { nome: eventoNome, data }
    const lista = rv.pecas.map((id, i) => ({ id, n: i + 1, q: paramsDaPeca(rv, id, dia, ev) }))
    const nomeRede = (id: RedeId) => REDES.find((x) => x.id === id)?.nome ?? id
    const srcDe = (q: URLSearchParams) => `/api/divulgacao/imagem?${q}&previa=1&w=400`
    const itensPrevia: ItemPrevia[] = [
        { id: 'telao', nome: 'Telão', src: srcDe(paramsDaPeca(rv, 'capa', dia, ev)), aspecto: '16 / 9' },
        { id: 'youtube', nome: 'Capa YouTube', src: enderecoDaCapa(eventoId, rv, yt.estado, { w: 400 }), aspecto: '16 / 9' },
        { id: 'post', nome: 'Post 4:5', src: srcDe(paramsDaRede(rv, 'post', ev)), aspecto: '4 / 5' },
        { id: 'story', nome: 'Story 9:16', src: srcDe(paramsDaRede(rv, 'story', ev)), aspecto: '9 / 16' },
    ]
    const itemGrande = itensPrevia.find((i) => i.id === grande) ?? null

    // Publicar para a igreja: grava se preciso, desenha cada arte inteira no servidor (uma de cada vez) e junta a lista
    async function publicar() {
        setMsg(null)
        if (alterado && !(await gravar())) return
        setAPublicar(true)
        try {
            const lote = String(Date.now())
            const itens = [...r.pecas.map((id) => ({ tipo: 'peca', id })), ...redesOk.map((id) => ({ tipo: 'rede', id }))]
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
            setMsg(null)   // a linha de estado já diz "Publicado a …"
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
    async function descarregarTudo(escopo: 'tudo' | 'telao' | 'redes' = 'tudo') {
        setMsg(null)
        if (alterado && !(await gravar())) return
        setAPreparar(true)
        try {
            const itens = [
                ...(escopo !== 'redes' ? r.pecas.map((id, i) => ({ nome: nomeDaPeca(r, id, i + 1), q: paramsDaPeca(r, id, dia, ev) })) : []),
                ...(escopo !== 'telao' ? redesOk.map((id) => ({ nome: nomeDaRede(id), q: paramsDaRede(r, id, ev) })) : []),
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
    const auto = padraoPorId(padraoAuto)
    const botaoZip = (escopo: 'telao' | 'redes') => (
        <button type="button" onClick={() => descarregarTudo(escopo)} disabled={ocupado} className="a-foco inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold disabled:opacity-50" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}><Download size={16} aria-hidden /> ZIP</button>
    )

    const itemDe = (id: string) => itensPrevia.find((i) => i.id === id)!
    const nomeFundo = r.fundo ? (r.fundo.startsWith('https://') ? 'O meu fundo' : FUNDOS_PRONTOS.find((f) => f.id === r.fundo)?.nome ?? 'Com imagem') : 'Só cores'
    const cartoes: { passo: number; rotulo: string; valor: string; extra?: string }[] = [
        { passo: 1, rotulo: 'Estilo', valor: `${nomeDoEstilo(r.estilo)}${r.estilosSeparados ? ` · redes: ${MODELOS_REDES.find((m) => m.id === r.modeloRedes)?.nome}` : ''}`, extra: paleta.nome },
        { passo: 2, rotulo: 'Fundo', valor: nomeFundo },
        { passo: 3, rotulo: 'Texto', valor: r.titulo || eventoNome, extra: r.tema ? r.tema.replace(/[*|]/g, '') : undefined },
        { passo: 4, rotulo: 'Preletor', valor: r.preletor || 'Sem nome', extra: r.fotoV || r.fotoH ? 'Com foto' : 'Sem foto' },
    ]
    const textoMsg = msg && <p role="status" className="text-[15px]" style={{ color: msg.ok ? 'var(--a-ok, #16a34a)' : 'var(--a-erro, #dc2626)' }}>{msg.texto}</p>

    return (
        <div className="space-y-3 pb-[176px] md:pb-4">
            <PreviaFlutuante itens={itensPrevia} aAtualizar={aAtualizar} onAbrir={setGrande} recolher={passo === 3} esconder={passo >= 4} />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <LinhaEstado publicadoEm={publicadoEm} emDia={publicadoEmDia} yt={yt} ocupado={ocupado} retirar={retirar} />
                <button type="button" onClick={() => setDefinicoes(true)} aria-haspopup="dialog" className="a-botao a-botao-secundario !min-h-[44px] shrink-0 !px-3 text-[14px]">
                    <Settings size={18} aria-hidden /> Definições da Igreja
                </button>
            </div>

            <div ref={topoRef} className="scroll-mt-20 space-y-3 md:scroll-mt-4">
                {/* Barra de passos: clicável sempre */}
                <nav aria-label="Passos" className="space-y-1">
                    <ol className="grid grid-cols-5 gap-1.5 md:gap-2">
                        {PASSOS.map((nome, i) => {
                            const n = i + 1
                            const atual = n === passo
                            const feito = !atual && visitados.includes(n)
                            return (
                                <li key={nome} className="min-w-0">
                                    <button type="button" onClick={() => irParaPasso(n)} aria-current={atual ? 'step' : undefined} aria-label={`Passo ${n}: ${nome}${feito ? ' (visto)' : ''}`}
                                        className="a-foco flex min-h-[52px] w-full flex-col items-start justify-center rounded-[12px] border px-2 py-1 text-left aria-[current=step]:ring-2 aria-[current=step]:ring-[var(--a-acento,#f5a524)] md:px-3" style={estiloCampo}>
                                        <span className="text-[12px] font-semibold a-suave" aria-hidden>Passo {n}{feito && <span className="ml-1" style={{ color: 'var(--a-ok, #16a34a)' }}>✓</span>}</span>
                                        <span className="hidden w-full truncate text-[14px] font-bold md:block" aria-hidden>{nome}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ol>
                </nav>

                {passo === 1 && (
                    <section className="a-card space-y-3 p-4" aria-labelledby="h-passo">
                        <h2 id="h-passo" className="text-[18px] font-bold">1. Estilo e cores</h2>
                        <EstiloECores r={r} rv={rv} mudar={mudar} escolherEstilo={escolherEstilo} escolhidoAuto={!guardado ? auto : null} dia={dia} ev={ev} />
                    </section>
                )}

                {passo === 2 && (
                    <section className="a-card space-y-3 p-4" aria-labelledby="h-passo">
                        <h2 id="h-passo" className="text-[18px] font-bold">2. Imagem de fundo</h2>
                        <EscolherFundo nomeCulto={eventoNome} valor={r.fundo} onChange={(v) => mudar(v ? { fundo: v, estilo: 'foto', ...(r.estilosSeparados ? {} : { modeloRedes: redesDoEstilo('foto') }) } : { fundo: '' })} />
                        <p className="text-[14px] a-suave">As cores escolhem-se no passo 1 (<button type="button" onClick={() => irParaPasso(1)} className="a-foco underline" style={{ color: 'var(--a-destaque)' }}>ir para as cores</button>).</p>
                    </section>
                )}

                {passo === 3 && (
                    <section className="a-card space-y-3 p-4" aria-labelledby="h-passo">
                        <h2 id="h-passo" className="text-[18px] font-bold">3. Escrever nas artes</h2>
                        <EditorArtes r={r} mudar={mudar} ev={ev} meuVerso={meuVerso} setMeuVerso={setMeuVerso} contas={contas} redesOk={redesOk} />
                    </section>
                )}

                {passo === 4 && (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
                        <section className="a-card space-y-4 p-4" aria-labelledby="h-passo">
                            <h2 id="h-passo" className="text-[18px] font-bold">4. Preletor</h2>
                            <p className="text-[14px] a-suave">Uma foto recortada (PNG com fundo transparente, do remove.bg ou do Canva) fica muito melhor: o preletor aparece de pé sobre o fundo, e também na Palavra do telão. Sem foto, as artes ficam sem retrato.</p>
                            <CampoFoto titulo="Foto ao alto (post e story)" ajuda="Uma foto em pé, do preletor da cintura para cima, funciona melhor." foto={r.fotoV} onChange={(f) => mudar({ fotoV: f })} />
                            <CampoFoto titulo="Foto deitada (capa da live)" ajuda="Opcional: sem ela, a capa usa a foto ao alto." foto={r.fotoH} onChange={(f) => mudar({ fotoH: f })} />
                            {(r.fotoH || r.fotoV) && (
                                <label className="block max-w-xs space-y-1">
                                    <span className="block text-[15px] font-semibold">Véu de cor sobre a foto</span>
                                    <select value={String(r.tinta)} onChange={(e) => mudar({ tinta: Number(e.target.value) })} className={campo} style={estiloCampo}>
                                        <option value="0">Nenhum</option><option value="0.15">Leve</option><option value="0.25">Médio</option><option value="0.4">Forte (camisas de cor que destoam)</option>
                                    </select>
                                </label>
                            )}
                        </section>
                        <section className="a-card min-w-0 space-y-3 p-4" aria-labelledby="h-previas">
                            <div className="flex items-baseline justify-between gap-2">
                                <h2 id="h-previas" className="text-[18px] font-bold">Como fica nas redes e no YouTube</h2>
                                <span className="text-[12px] a-suave" role="status">{aAtualizar ? 'A atualizar…' : ''}</span>
                            </div>
                            <p className="text-[14px] a-suave">Toque numa arte para a ver em grande.</p>
                            <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-[4fr_2.6fr_7fr] md:gap-4">
                                {(['post', 'story', 'youtube'] as const).map((id) => {
                                    const it = itemDe(id)
                                    return (
                                        <button key={id} type="button" onClick={() => setGrande(id)} aria-label={`${it.nome}: ver em grande`}
                                            className={`a-foco block min-w-0 text-left ${id === 'youtube' ? 'col-span-2 md:col-span-1' : ''}`}>
                                            <span className="mb-1 block truncate text-[13px] font-semibold a-suave">{it.nome}</span>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={it.src} alt="" decoding="async" className={`block w-full rounded-[10px] border transition-opacity ${aAtualizar ? 'opacity-60' : ''}`}
                                                style={{ aspectRatio: it.aspecto, borderColor: 'var(--a-borda)', background: 'var(--a-card)', objectFit: 'cover' }} />
                                        </button>
                                    )
                                })}
                            </div>
                        </section>
                    </div>
                )}

                {passo === 5 && (
                    <div className="space-y-3">
                        <section className="a-card space-y-3 p-4" aria-labelledby="h-passo">
                            <h2 id="h-passo" className="text-[18px] font-bold">5. Resumo</h2>
                            <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                                {cartoes.map((c) => (
                                    <li key={c.rotulo} className="flex min-w-0 flex-col rounded-[12px] border p-3" style={estiloCampo}>
                                        <span className="text-[12px] font-semibold a-suave">{c.rotulo}</span>
                                        <span className="truncate text-[15px] font-bold">{c.valor}</span>
                                        <span className="truncate text-[13px] a-suave">{c.extra ?? ' '}</span>
                                        <button type="button" onClick={() => irParaPasso(c.passo)} className="a-foco mt-1 inline-flex min-h-[44px] items-center self-start text-[14px] font-semibold underline" style={{ color: 'var(--a-destaque)' }}>Mudar</button>
                                    </li>
                                ))}
                            </ul>
                        </section>

                    {/* Separadores */}
                    <div role="tablist" aria-label="Onde vai ser usado" onKeyDown={teclasDasAbas} className="flex gap-1 border-b" style={{ borderColor: 'var(--a-borda)' }}>
                        {ABAS.map((a) => (
                            <button key={a.id} id={`aba-${a.id}`} type="button" role="tab" aria-selected={aba === a.id} aria-controls={`painel-${a.id}`} tabIndex={aba === a.id ? 0 : -1} onClick={() => irParaAba(a.id)}
                                className="a-foco -mb-px min-h-[48px] flex-1 border-b-[3px] border-transparent px-3 text-[16px] font-semibold aria-selected:border-[var(--a-destaque)] aria-selected:font-bold md:flex-none md:px-6"
                                style={{ color: aba === a.id ? 'var(--a-texto)' : 'var(--a-suave)' }}>{a.nome}</button>
                        ))}
                    </div>

                    {/* TELÃO */}
                    <div role="tabpanel" id="painel-telao" aria-labelledby="aba-telao" hidden={aba !== 'telao'} className="space-y-3">
                        <fieldset className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <legend className="text-[16px] font-bold">Artes do telão <span className="font-normal a-suave">· {lista.length}</span></legend>
                                {botaoZip('telao')}
                            </div>
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

                        {lista.length === 0 && <p className="a-suave">Marque pelo menos uma arte.</p>}
                        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
                            {lista.map(({ id, n, q }) => (
                                <li key={id} className="w-[62%] shrink-0 snap-center space-y-1 md:w-auto">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={`/api/divulgacao/imagem?${q}&previa=1&w=400`} alt={PECAS.find((p) => p.id === id)?.nome} loading="lazy" decoding="async" fetchPriority="low" className={`w-full rounded-[10px] border transition-opacity ${aAtualizar ? 'opacity-60' : ''}`} style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9', background: 'var(--a-card)' }} />
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="min-w-0 truncate text-[14px] font-semibold">{PECAS.find((p) => p.id === id)?.nome}</span>
                                        <a href={`/api/divulgacao/imagem?${q}&download=1`} download={nomeDaPeca(rv, id, n)} aria-label={`Descarregar ${PECAS.find((p) => p.id === id)?.nome} (1920×1080)`} className="a-foco flex h-11 w-11 shrink-0 items-center justify-center rounded-full"><Download size={18} aria-hidden /></a>
                                    </div>
                                </li>
                            ))}
                        </ul>

                    </div>

                    {/* REDES */}
                    <div role="tabpanel" id="painel-redes" aria-labelledby="aba-redes" hidden={aba !== 'redes'} className="space-y-3">
                        <fieldset className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <legend className="text-[16px] font-bold">Artes para as redes sociais</legend>
                                {botaoZip('redes')}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {REDES_DAS_ARTES.map((id) => {
                                    const ligada = r.redes.includes(id)
                                    return (
                                        <label key={id} className={chip} style={estiloCampo}>
                                            <input type="checkbox" checked={ligada} onChange={() => alternarRede(id)} className="sr-only" />
                                            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded border" style={{ borderColor: 'var(--a-borda)' }}>{ligada && <Check size={14} />}</span>
                                            {nomeRede(id)}
                                        </label>
                                    )
                                })}
                            </div>
                        </fieldset>
                        {redesOk.length === 0 && <p className="a-suave">Marque o post ou o story.</p>}
                        <div className="grid grid-cols-2 items-start gap-4">
                            {redesOk.map((id) => {
                                const q = paramsDaRede(rv, id, ev)
                                return (
                                    <figure key={id} className="min-w-0 space-y-2">
                                        <figcaption className="text-[15px] font-semibold">{nomeRede(id)}</figcaption>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={`/api/divulgacao/imagem?${q}&previa=1&w=400`} alt={nomeRede(id)} loading="lazy" decoding="async" fetchPriority="low" className={`mx-auto w-auto max-w-full rounded-[10px] border transition-opacity ${aAtualizar ? 'opacity-60' : ''}`}
                                            style={{ borderColor: 'var(--a-borda)', aspectRatio: id === 'post' ? '4 / 5' : '9 / 16', maxHeight: 280, background: 'var(--a-card)' }} />
                                        <div className="flex flex-col gap-2">
                                            <button type="button" onClick={() => partilharRede(id, paramsDaRede(r, id, ev))} disabled={aPartilhar === id} className="a-botao a-botao-principal !min-h-[44px] !px-3"><Share2 size={18} className="shrink-0" aria-hidden /> {aPartilhar === id ? 'A abrir…' : 'WhatsApp'}</button>
                                            <div className="flex gap-2">
                                                {fotoDa(id) && <button type="button" onClick={() => setAjustando(id)} className="a-botao a-botao-secundario !min-h-[44px] flex-1 !px-3 text-[14px]">{r.ajustes[id] && r.ajustes[id]!.url === fotoDa(id)!.url ? 'Foto ✓' : 'Ajustar foto'}</button>}
                                                <a href={`/api/divulgacao/imagem?${paramsDaRede(r, id, ev)}&download=1`} download={nomeDaRede(id)} aria-label={`Descarregar ${nomeRede(id)}`} className="a-botao a-botao-secundario !min-h-[44px] flex-1 !px-3"><Download size={18} aria-hidden /> <span className="text-[14px]">Descarregar</span></a>
                                            </div>
                                        </div>
                                    </figure>
                                )
                            })}
                        </div>

                        <section className="a-card space-y-3 p-4" aria-labelledby="h-textos">
                            <h2 id="h-textos" className="text-[17px] font-bold">Textos para publicar</h2>
                            <div className="grid gap-4 md:grid-cols-2">
                                <CaixaTexto titulo="Legenda Instagram / Facebook" valor={editado.legenda ?? gerados.legenda} onChange={(v) => setEditado((x) => ({ ...x, legenda: v }))} onRefazer={() => setEditado((x) => ({ ...x, legenda: undefined }))} />
                                <CaixaTexto whatsapp titulo="Mensagem de WhatsApp" valor={editado.whatsapp ?? gerados.whatsapp} onChange={(v) => setEditado((x) => ({ ...x, whatsapp: v }))} onRefazer={() => setEditado((x) => ({ ...x, whatsapp: undefined }))} />
                            </div>
                        </section>
                    </div>

                    {/* YOUTUBE */}
                    <div role="tabpanel" id="painel-youtube" aria-labelledby="aba-youtube" hidden={aba !== 'youtube'} className="space-y-3">
                        {ytVisto && (
                            <>
                                <YoutubeCapa eventoId={eventoId} yt={yt} guardado={!alterado} r={r} rv={rv} mudar={mudar} eventoNome={eventoNome} dataISO={dataISO} aAtualizar={aAtualizar} garantirGuardado={async () => (alterado ? gravar() : true)} />
                                <LivesDaSemana />
                                <Gaveta titulo="Histórico" resumo={yt.registos.length ? `${yt.registos.length} ${yt.registos.length === 1 ? 'capa aplicada' : 'capas aplicadas'} neste culto` : 'Ainda nada aplicado neste culto'}>
                                    <HistoricoCapa registos={yt.registos} />
                                </Gaveta>
                            </>
                        )}
                    </div>

                    </div>
                )}
            </div>

            {textoMsg}

            {/* BARRA: fixa em baixo no telemóvel (por cima da barra do menu; a página tem espaço no fim), colada ao fundo da coluna no computador */}
            <div className="fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-40 px-3 md:sticky md:inset-x-auto md:bottom-3 md:z-20 md:px-0">
                <div className="a-card flex items-center gap-1.5 p-2 shadow-lg md:gap-2">
                    <button type="button" onClick={() => irParaPasso(passo - 1)} disabled={passo === 1} aria-label="Voltar ao passo anterior" className="a-botao a-botao-secundario !min-h-[48px] !px-3 shrink-0">
                        <ChevronLeft size={18} aria-hidden /> <span className="hidden md:inline">Voltar</span>
                    </button>
                    <button type="button" onClick={guardar} disabled={ocupado || !alterado || semArtes} aria-label={aGuardar ? 'A guardar…' : alterado ? 'Guardar' : 'Guardado'} className="a-botao a-botao-secundario relative !min-h-[48px] !px-3 shrink-0">
                        <Save size={18} aria-hidden />
                        <span className="hidden sm:inline">{aGuardar ? 'A guardar…' : alterado ? 'Guardar' : 'Guardado'}</span>
                        {alterado && !aGuardar && <span aria-hidden className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full sm:hidden" style={{ background: 'var(--a-aviso, #b45309)' }} />}
                    </button>
                    <button type="button" onClick={() => descarregarTudo()} disabled={ocupado || semArtes} aria-label="Descarregar todas as artes (ZIP)" className="a-botao a-botao-secundario !min-h-[48px] !px-3 shrink-0">
                        <Download size={18} aria-hidden /> <span className="hidden sm:inline">ZIP</span>
                    </button>
                    <button type="button" onClick={publicar} disabled={ocupado || semArtes || publicadoEmDia} aria-label={progresso || (publicadoEmDia ? 'Publicado' : publicadoEm ? 'Publicar outra vez' : 'Publicar')}
                        className={`a-botao a-botao-principal !min-h-[48px] !px-3 min-w-0 ${passo === 5 ? 'flex-1' : 'shrink-0'}`}>
                        <Megaphone size={18} className="shrink-0" aria-hidden />
                        <span className={`truncate ${passo === 5 ? '' : 'hidden md:inline'}`}>{progresso || (publicadoEmDia ? 'Publicado' : publicadoEm ? 'Publicar outra vez' : 'Publicar')}</span>
                    </button>
                    {passo < 5 && (
                        <button type="button" onClick={() => irParaPasso(passo + 1)} className="a-botao a-botao-principal !min-h-[48px] min-w-0 flex-1 !px-3 font-bold">
                            <span className="truncate">AVANÇAR</span> <ChevronRight size={18} className="shrink-0" aria-hidden />
                        </button>
                    )}
                </div>
            </div>

            {definicoes && (
                <JanelaGrande titulo="Definições da Igreja" onFechar={() => setDefinicoes(false)}>
                    <PadraoAdmvc r={r} padraoJson={padraoJson} onGuardar={usarComoPadrao} aGuardar={aGuardarPadrao} />
                </JanelaGrande>
            )}

            {itemGrande && <JanelaDaArte item={itemGrande} srcGrande={itemGrande.src.replace('&previa=1&w=400', '')} onFechar={() => setGrande(null)} />}

            {ajustando && fotoDa(ajustando) && (
                <AjustarFoto formato={ajustando} modelo={modeloDasRedes(r)} foto={fotoDa(ajustando)!} paleta={paleta}
                    inicial={r.ajustes[ajustando] && r.ajustes[ajustando]!.url === fotoDa(ajustando)!.url ? r.ajustes[ajustando]! : null}
                    onFeito={(a) => guardarAjuste(ajustando, a)} onFechar={() => setAjustando(null)} />
            )}
        </div>
    )
}

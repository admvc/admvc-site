// O que decide a capa e o título de uma live (funções puras, sem desenho nem base de dados).
// Estados: agendada ("Domingo · 10h00"), direto ("EM DIRETO · AGORA", rodapé vermelho), arquivo (a data; título final
// "Tema | Culto | Preletor | Data") e reserva ("Culto em direto": quando ninguém preencheu nada).
import { PALETAS } from '@/lib/divulgacao'
import { modeloDasRedes, paramsDaRede, quandoDoEvento, type Receita } from '@/lib/divulgacao-kit'
import type { CapaYt, PadraoCapa } from '@/lib/youtube-capa-receita'
import { LIMITE_CAPA_BYTES } from '@/lib/youtube'

export const ESTADOS_CAPA = ['agendada', 'direto', 'arquivo', 'reserva'] as const
export type EstadoCapa = (typeof ESTADOS_CAPA)[number]
export const lerEstadoCapa = (v: unknown): EstadoCapa | null => (ESTADOS_CAPA.find((e) => e === v) ?? null)

export const NOME_DO_ESTADO: Record<EstadoCapa, string> = { agendada: 'Agendada', direto: 'Em direto', arquivo: 'Arquivo (depois do culto)', reserva: 'Reserva (Culto em direto)' }

/** Categoria visual do evento: cada uma tem a sua paleta (as da identidade ADMVC). */
export type CategoriaCapa = 'regular' | 'jovens' | 'mulheres' | 'formacao' | 'profetica'

export type PaletaCapa = { fundo: string; luz: string; sombra: string; acento: string; texto: string; sobreAcento: string }

export const PALETAS_CAPA: Record<CategoriaCapa, PaletaCapa> = {
    regular: { fundo: '#1A3C34', luz: '#2E5A4C', sombra: '#0B1C18', acento: '#D4AF37', texto: '#F9F6F0', sobreAcento: '#1A3C34' },
    profetica: { fundo: '#0C1D19', luz: '#1F4A3F', sombra: '#07120F', acento: '#D4AF37', texto: '#F9F6F0', sobreAcento: '#0C1D19' },
    jovens: { fundo: '#1D2D50', luz: '#5A4580', sombra: '#141F3A', acento: '#EBB035', texto: '#F9F6F0', sobreAcento: '#1D2D50' },
    mulheres: { fundo: '#3a1c14', luz: '#C06C54', sombra: '#2a1510', acento: '#E8C8B8', texto: '#F9F6F0', sobreAcento: '#6E3626' },
    formacao: { fundo: '#14181f', luz: '#2C4A5E', sombra: '#0c0f14', acento: '#8EAEBD', texto: '#FFFFFF', sobreAcento: '#14181f' },
}

/**
 * A categoria pelo nome do evento (como a Divulgação já faz com o "oração por…"), pelo tipo, ou pela paleta que a Mídia escolheu
 * no kit se for uma das da identidade. Cultos regulares e o resto: verde e dourado (a marca).
 */
export function categoriaDaCapa(nome: string, tipo: string | null, paletaDoKit?: string | null): CategoriaCapa {
    if (/prof[ée]tic/i.test(nome)) return 'profetica'
    if (/jovens/i.test(nome) || paletaDoKit === 'jovens') return 'jovens'
    if (/mulher/i.test(nome) || paletaDoKit === 'mulheres') return 'mulheres'
    if (/forma[cç]/i.test(nome) || tipo === 'FORMACAO' || paletaDoKit === 'formacao') return 'formacao'
    return 'regular'
}

/** O estado pela hora do culto (instante real em ms): antes = agendada; do arranque (-15 min) a +3 h = em direto; depois = arquivo. */
export function estadoSugeridoPelaHora(cultoMs: number, agoraMs: number): EstadoCapa {
    if (agoraMs < cultoMs - 15 * 60000) return 'agendada'
    if (agoraMs <= cultoMs + 3 * 3600000) return 'direto'
    return 'arquivo'
}

/** O estado que a live já tem no YouTube manda; sem live, vale a hora. */
export function estadoSugerido(liveEstado: 'agendada' | 'direto' | 'terminada' | null, cultoMs: number, agoraMs: number): EstadoCapa {
    if (liveEstado === 'direto') return 'direto'
    if (liveEstado === 'terminada') return 'arquivo'
    if (liveEstado === 'agendada') return 'agendada'
    return estadoSugeridoPelaHora(cultoMs, agoraMs)
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "22 NOV 2026" */
export const dataDoArquivo = (data: Date) => `${data.getUTCDate()} ${MESES[data.getUTCMonth()].toUpperCase()} ${data.getUTCFullYear()}`
/** "22/11/2026" (para o título) */
export const dataNoTitulo = (data: Date) => `${String(data.getUTCDate()).padStart(2, '0')}/${String(data.getUTCMonth() + 1).padStart(2, '0')}/${data.getUTCFullYear()}`

/**
 * O rodapé da capa agendada: "DOMINGO · 10H00" se for nos próximos 6 dias, senão com a data ("SÁBADO, 14 NOV · 19H30").
 * `data` = hora de Lisboa "escrita" em UTC; `hojeMs` = o dia de hoje em Lisboa "escrito" em UTC (para contar os dias).
 */
export function rodapeAgendada(data: Date, hojeMs: number): string {
    const q = quandoDoEvento(data)
    const dias = (Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) - Date.UTC(new Date(hojeMs).getUTCFullYear(), new Date(hojeMs).getUTCMonth(), new Date(hojeMs).getUTCDate())) / 86400000
    const dia = dias >= 0 && dias < 7 ? q.quando.split(',')[0] : q.quando
    return `${dia} · ${q.hora}`.toUpperCase()
}

export type DadosTitulo = { tema: string; culto: string; preletor: string; data: Date }

const semMarcas = (t: string) => t.replace(/\*/g, '').replace(/\s*\|\s*/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * O título da live: `Tema | Culto | Preletor` (agendada e em direto) e `Tema | Culto | Preletor | Data` (arquivo).
 * Sem tema, o nome do culto vem à frente; nunca repete o mesmo texto; reserva = só o culto e a data.
 */
export function tituloDaLive(estado: EstadoCapa, d: DadosTitulo): string {
    const tema = semMarcas(d.tema), culto = semMarcas(d.culto), preletor = semMarcas(d.preletor)
    const partes = estado === 'reserva' ? [culto] : [tema, culto, preletor]
    if (estado === 'arquivo' || estado === 'reserva') partes.push(dataNoTitulo(d.data))
    const vistas = new Set<string>()
    const unicas = partes.filter((p) => { const k = p.toLowerCase(); if (!p || vistas.has(k)) return false; vistas.add(k); return true })
    return unicas.join(' | ').slice(0, 100).trim()
}

/** "2026-11-22T10:00" a partir de um instante real: a hora de Lisboa "escrita" (como o portal mostra os cultos). */
export function lisboaEscrita(instanteMs: number): string {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(instanteMs)).map((x) => [x.type, x.value]))
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** Tudo o que a capa precisa para ser desenhada (o desenho está em lib/youtube-capa.tsx). */
export type DadosCapa = {
    estado: EstadoCapa
    categoria: CategoriaCapa
    titulo: string               // o tema (ou o nome do culto); *assim* fica em destaque, | muda de linha
    culto: string                // linha pequena (nome do culto)
    preletor: string
    rodape: string               // agendada: "DOMINGO · 10H00"; arquivo: "22 NOV 2026"; os outros não usam
    foto: { url: string; w: number; h: number; recorte: boolean } | null
    // o padrão e a edição (sem eles: "Profundidade com foto" com as cores da categoria, como antes do editor da capa)
    padrao?: PadraoCapa
    cores?: PaletaCapa           // as cores já escolhidas (ver coresDaCapa)
    fotoLado?: 'esquerda' | 'direita'
    fundo?: string | null        // imagem de fundo (um dos prontos ou do Blob público); null = só cores
    igual?: string | null        // padrão "igual às artes do culto": o pedido (URLSearchParams em texto) da arte 16:9 do kit
}

/** A parte da receita que a capa usa (para o endereço da pré-visualização: a receita do ecrã, ainda por guardar). */
export function receitaParaCapa(r: Receita): string {
    const { estilo, paleta, estilosSeparados, modeloRedes, tinta, fundo, tema, preletor, quandoTexto, textoLivre, textoLivreTam, fotoH, fotoV, ajustes, capaYt } = r
    return JSON.stringify({ estilo, paleta, estilosSeparados, modeloRedes, tinta, fundo, tema, preletor, quandoTexto, textoLivre, textoLivreTam, fotoH, fotoV, ajustes, capaYt })
}

/** O endereço da capa de um estado, com a receita do ecrã. `w` = pré-visualização pequena (JPEG); sem `w` o PNG inteiro. */
export function enderecoDaCapa(eventoId: number, r: Receita, estado: EstadoCapa, o: { w?: number; descarregar?: boolean } = {}): string {
    return `/api/divulgacao/capa-live?evento=${eventoId}&estado=${estado}&receita=${encodeURIComponent(receitaParaCapa(r))}${o.w ? `&previa=1&w=${o.w}` : ''}${o.descarregar ? '&download=1' : ''}`
}

/** Marca verde e dourado (a de sempre nos cultos normais). */
export const CORES_MARCA = PALETAS_CAPA.regular

/**
 * As cores da capa de um padrão. `paletaId` vazio = a do padrão: o evento usa a da categoria, o editorial a marca em papel claro,
 * os outros a marca verde e dourado. Com uma paleta escolhida, valem as cores dela (o editorial usa as claras).
 */
export function coresDaCapa(padrao: PadraoCapa, categoria: CategoriaCapa, paletaId: string): PaletaCapa {
    const p = PALETAS.find((x) => x.id === paletaId) ?? (padrao === 'editorial' ? PALETAS.find((x) => x.id === 'verde-dourado')! : null)
    if (padrao === 'editorial' && p) return { fundo: p.claro[1], luz: p.claro[0], sombra: p.claro[2], acento: p.c1, texto: p.claroTexto, sobreAcento: '#FFFFFF' }
    if (p) return { fundo: p.fundo, luz: p.c1, sombra: p.fundo, acento: p.acento, texto: p.texto, sobreAcento: p.fundo }
    return padrao === 'evento' ? PALETAS_CAPA[categoria] : CORES_MARCA
}

/**
 * O pedido da arte 16:9 do kit com o selo do estado (o padrão "igual às artes do culto"; desenhado por lib/divulgacao-redes.tsx).
 * Agendada: sem selo (a arte já diz o dia e a hora). Em direto: selo vermelho. Arquivo: a data. Reserva: "Culto em direto" sem tema, foto nem preletor.
 */
export function pedidoIgual(kit: Receita, capa: CapaYt, c: { nome: string; data: Date; tema: string }, estado: EstadoCapa, rodape: string): string {
    const k: Receita = { ...kit, quandoTexto: capa.quando || kit.quandoTexto, afinar: {}, preletor: capa.preletor || kit.preletor }
    const q = paramsDaRede(k, 'youtube', { nome: c.nome, data: c.data })
    const reserva = estado === 'reserva'
    const grande = reserva ? 'Culto *em direto*' : capa.titulo || c.tema || c.nome
    const pequeno = reserva ? '' : capa.subtitulo || (semMarcas(grande).toLowerCase() === semMarcas(c.nome).toLowerCase() ? '' : c.nome)
    q.delete('tema'); q.delete('subtitulo'); q.delete('titulo')
    if (!pequeno) q.set('titulo', grande)
    else if (modeloDasRedes(kit) === 'classico') { q.set('titulo', grande); q.set('subtitulo', pequeno) }
    else { q.set('titulo', pequeno); q.set('tema', grande) }
    if (reserva) q.delete('preletor')
    if (capa.paleta) q.set('paleta', capa.paleta)
    if (capa.fundo === 'cores') q.delete('fundo')
    if (capa.foto === 'sem' || reserva) for (const k2 of ['foto', 'foco', 'fw', 'fh', 'recorte', 'aj']) q.delete(k2)
    q.set('estadoCapa', estado)
    if (estado === 'direto') q.set('selo', 'EM DIRETO · AGORA')
    else if (estado === 'arquivo') q.set('selo', rodape)
    else if (reserva) q.set('selo', 'EM DIRETO')
    return q.toString()
}

const FOTO_NO_PEDIDO = ['foto', 'foco', 'fw', 'fh', 'recorte', 'aj']
const temFoto = (d: DadosCapa) => !!d.foto || (!!d.igual && new URLSearchParams(d.igual).has('foto'))
/** A mesma capa sem a foto do preletor (e sem a imagem de fundo, que também pesa). */
export function semFoto(d: DadosCapa): DadosCapa {
    let igual = d.igual
    if (igual) { const q = new URLSearchParams(igual); for (const k of [...FOTO_NO_PEDIDO, 'fundo']) q.delete(k); igual = q.toString() }
    return { ...d, foto: null, fundo: null, igual }
}

/** O PNG da capa em bytes, garantido ≤ 2 MB: se a foto a fizer passar o limite (ou não se conseguir buscar), refaz sem ela. */
export async function capaEmBytes(d: DadosCapa, desenhar: (d: DadosCapa) => Promise<Response>): Promise<Uint8Array> {
    const bytes = async (x: DadosCapa) => new Uint8Array(await (await desenhar(x)).arrayBuffer())
    const comImagens = temFoto(d) || !!d.fundo
    let png: Uint8Array | null = null
    try { png = await bytes(d) } catch { if (!comImagens) throw new Error('Não consegui desenhar a capa.') }
    if ((!png || png.length > LIMITE_CAPA_BYTES) && comImagens) png = await bytes(semFoto(d))
    if (!png || png.length > LIMITE_CAPA_BYTES) throw new Error('A capa ficou com mais de 2 MB.')
    return png
}

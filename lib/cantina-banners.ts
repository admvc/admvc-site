// Banners de divulgação da cantina: modelos, formatos, limites, formatação do preço e as contas do enquadramento da foto.
// Tudo puro (sem servidor nem browser): o desenho (lib/cantina-banners-imagem.tsx), a rota /api/cantina/banner e o ecrã
// /cantina/divulgar usam as MESMAS contas, por isso o que se vê ao ajustar é o que sai no PNG.

import { CARACTERES, LARGURAS, type FonteCantina } from '@/lib/cantina-banners-fontes'
export type { FonteCantina }

export type ModeloId = 'toldo' | 'giz' | 'cafe' | 'festa'
export type FormatoId = 'telao' | 'redes'

export const MODELOS: { id: ModeloId; nome: string; descricao: string; amostra: [string, string] }[] = [
    { id: 'toldo', nome: 'Toldo', descricao: 'Toldo às riscas e fundo mostarda', amostra: ['#D8281F', '#F6B91B'] },
    { id: 'giz', nome: 'Quadro de giz', descricao: 'Quadro verde com letras a giz', amostra: ['#1F3B33', '#F3EFE0'] },
    { id: 'cafe', nome: 'Café', descricao: 'Madeira quente e toldo verde-água', amostra: ['#7CC6BD', '#A8622E'] },
    { id: 'festa', nome: 'Festa', descricao: 'Laranja e rosa com raios e confetes', amostra: ['#FF8A1F', '#FF3D7F'] },
]
export const MODELO_IDS = MODELOS.map((m) => m.id)
export const lerModelo = (v: unknown): ModeloId => (MODELO_IDS.includes(v as ModeloId) ? (v as ModeloId) : 'toldo')

export const FORMATOS: Record<FormatoId, { nome: string; detalhe: string; w: number; h: number; razao: string }> = {
    telao: { nome: 'Telão', detalhe: '1920×1080', w: 1920, h: 1080, razao: '1920 / 1080' },
    redes: { nome: 'Redes', detalhe: '1080×1350', w: 1080, h: 1350, razao: '1080 / 1350' },
}
export const lerFormato = (v: unknown): FormatoId => (v === 'redes' ? 'redes' : 'telao')

export const LIMITES = {
    titulo: 28,
    subtitulo: 48,
    preco: 9,        // já formatado: "12,50 €"
    nota: 44,
    zoom: [1, 3] as const,
    precoMax: 999.99,
}

export const AMOSTRA = { titulo: 'Cantina aberta!', subtitulo: 'Bifana + sumo natural', preco: '2,50', nota: 'Depois do culto · Sala 2' }

/** Texto de uma linha: sem caracteres de controlo, espaços normalizados, cortado no limite. */
export function limparTexto(v: unknown, max: number): string {
    if (typeof v !== 'string') return ''
    // eslint-disable-next-line no-control-regex
    return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
}

/** "2.5", "2,5", "€ 2,50", 2.5 → "2,50 €". Vazio, zero, negativo ou acima de 999,99 → '' (o selo some). */
export function formatarPreco(v: string | number | null | undefined): string {
    let n: number
    if (typeof v === 'number') n = v
    else {
        if (typeof v !== 'string') return ''
        let s = v.replace(/€|eur(os?)?/gi, '').replace(/\s+/g, '')
        if (!s || !/^\d[\d.,]*$/.test(s)) return ''
        const ponto = s.lastIndexOf('.'), virgula = s.lastIndexOf(',')
        if (ponto >= 0 && virgula >= 0) {
            // o separador decimal é o último; o outro é de milhares
            s = virgula > ponto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
        } else if (virgula >= 0) {
            s = s.replace(',', '.')
        } else if (ponto >= 0 && s.length - ponto - 1 === 3 && s.indexOf('.') === ponto) {
            s = s.replace('.', '') // "1.000" = mil
        }
        if ((s.match(/\./g) ?? []).length > 1) return ''
        n = Number(s)
    }
    if (!Number.isFinite(n) || n <= 0 || n > LIMITES.precoMax) return ''
    return `${(Math.round(n * 100) / 100).toFixed(2).replace('.', ',')} €`
}

// ---------------------------------------------------------------------------------------------------------------------
// Texto que se ajusta: tamanho de letra maior que caiba na caixa

export type CaixaTexto = { x: number; y: number; w: number; h: number }

/** Largura do texto em "em" (múltiplos do tamanho da letra), com as medidas reais da fonte e 4% de folga. */
export function larguraEm(fonte: FonteCantina, texto: string): number {
    const { media, w } = LARGURAS[fonte]
    let soma = 0
    for (const ch of texto) {
        const i = CARACTERES.indexOf(ch)
        soma += i >= 0 && w[i] >= 0 ? w[i] : media
    }
    return (soma / 1000) * 1.04
}

/** Quantas linhas ocupa o texto num tamanho, pondo as palavras numa linha enquanto couberem. null = uma palavra sozinha não cabe. */
export function linhasDoTexto(texto: string, tamanho: number, largura: number, medir: (s: string) => number): number | null {
    const palavras = texto.split(' ').filter(Boolean)
    if (!palavras.length) return 0
    const larg = (s: string) => medir(s) * tamanho
    let linhas = 1, atual = ''
    for (const p of palavras) {
        if (larg(p) > largura) return null
        const com = atual ? `${atual} ${p}` : p
        if (larg(com) <= largura) atual = com
        else { linhas++; atual = p }
    }
    return linhas
}

/** O maior tamanho (entre max e min) em que o texto cabe na caixa. Se nem no mínimo cabe, devolve o mínimo (cabe: false). */
export function ajustarFonte(texto: string, caixa: { w: number; h: number }, o: { max: number; min: number; medir: (s: string) => number; altura?: number; passo?: number }): { tamanho: number; linhas: number; cabe: boolean } {
    const alt = o.altura ?? 1.1, passo = o.passo ?? 2
    for (let t = o.max; t >= o.min; t -= passo) {
        const linhas = linhasDoTexto(texto, t, caixa.w, o.medir)
        if (linhas !== null && linhas * t * alt <= caixa.h) return { tamanho: t, linhas, cabe: true }
    }
    return { tamanho: o.min, linhas: linhasDoTexto(texto, o.min, caixa.w, o.medir) ?? 1, cabe: false }
}

// ---------------------------------------------------------------------------------------------------------------------
// Onde fica cada coisa (px do banner). Os textos nunca se sobrepõem entre si nem à foto/selo; o selo pode tapar a borda da foto.

type Redondo = { cx: number; cy: number; d: number }
export type Disposicao = {
    titulo: CaixaTexto & { alinhar: 'left' | 'center' }
    subtitulo: CaixaTexto & { alinhar: 'left' | 'center' }
    nota: CaixaTexto & { alinhar: 'left' | 'center' }
    marca: CaixaTexto
    foto: Redondo
    selo: Redondo          // quadrado de lado d, centrado em (cx, cy)
    toldo: number          // altura reservada em cima (toldo, moldura)
}

export const DISPOSICAO: Record<FormatoId, Disposicao> = {
    telao: {
        titulo: { x: 100, y: 240, w: 800, h: 330, alinhar: 'left' },
        subtitulo: { x: 100, y: 590, w: 800, h: 235, alinhar: 'left' },
        nota: { x: 100, y: 845, w: 800, h: 70, alinhar: 'left' },
        marca: { x: 1440, y: 975, w: 420, h: 64 },
        foto: { cx: 1340, cy: 610, d: 590 },
        selo: { cx: 1045, cy: 840, d: 250 },
        toldo: 210,
    },
    redes: {
        titulo: { x: 70, y: 190, w: 940, h: 255, alinhar: 'center' },
        subtitulo: { x: 70, y: 1104, w: 940, h: 122, alinhar: 'center' },
        nota: { x: 150, y: 1238, w: 780, h: 54, alinhar: 'center' },
        marca: { x: 60, y: 1232, w: 64, h: 64 },
        foto: { cx: 540, cy: 752, d: 580 },
        selo: { cx: 838, cy: 982, d: 220 },
        toldo: 190,
    },
}

const caixaDe = (r: Redondo): CaixaTexto => ({ x: r.cx - r.d / 2, y: r.cy - r.d / 2, w: r.d, h: r.d })
export const caixaFoto = (f: FormatoId) => caixaDe(DISPOSICAO[f].foto)
export const caixaSelo = (f: FormatoId) => caixaDe(DISPOSICAO[f].selo)

export const sobrepoe = (a: CaixaTexto, b: CaixaTexto) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
export const dentroDe = (a: CaixaTexto, W: number, H: number) => a.x >= 0 && a.y >= 0 && a.x + a.w <= W && a.y + a.h <= H

// ---------------------------------------------------------------------------------------------------------------------
// Foto no centro: recorte quadrado (depois círculo) com zoom e foco

export type AjusteFoto = { zoom: number; fx: number; fy: number }
const entre = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const num = (v: unknown, omissao: number) => { const n = typeof v === 'number' ? v : Number(v); return Number.isFinite(n) && v !== '' && v !== null ? n : omissao }

/** Limita o que vem do browser: zoom entre 1 e 3, foco entre 0 e 1. */
export function lerAjuste(zoom: unknown, fx: unknown, fy: unknown): AjusteFoto {
    return { zoom: entre(num(zoom, 1), LIMITES.zoom[0], LIMITES.zoom[1]), fx: entre(num(fx, 0.5), 0, 1), fy: entre(num(fy, 0.5), 0, 1) }
}

/**
 * O quadrado da foto (em px da foto original) que fica no círculo. Zoom 1 = o maior quadrado que cabe; mais zoom = mais perto.
 * O centro (fx, fy) é o ponto da foto que o utilizador escolheu; o quadrado nunca sai da foto (por isso nada fica esticado).
 */
export function recorteQuadrado(largura: number, altura: number, a: AjusteFoto): { left: number; top: number; lado: number } {
    const lado = Math.max(1, Math.floor(Math.min(largura, altura) / a.zoom))
    const left = Math.round(entre(a.fx * largura - lado / 2, 0, largura - lado))
    const top = Math.round(entre(a.fy * altura - lado / 2, 0, altura - lado))
    return { left, top, lado }
}

/** Arrastar o dedo/rato dx, dy (px) sobre um círculo de diâmetro dPx: devolve o novo foco (a foto acompanha o dedo). */
export function arrastarFoco(largura: number, altura: number, a: AjusteFoto, dx: number, dy: number, dPx: number): { fx: number; fy: number } {
    const lado = Math.min(largura, altura) / a.zoom
    const k = lado / Math.max(1, dPx) // px da foto por px do ecrã
    const folgaX = lado / 2 / largura, folgaY = lado / 2 / altura
    return {
        fx: entre(a.fx - (dx * k) / largura, folgaX, 1 - folgaX),
        fy: entre(a.fy - (dy * k) / altura, folgaY, 1 - folgaY),
    }
}

/** Só fotos do nosso Blob público ou de um endereço https "normal" (nunca IPs nem endereços da rede interna). */
export function enderecoDeFotoPermitido(u: unknown, dev = false): string | null {
    if (typeof u !== 'string' || u.length > 600) return null
    let url: URL
    try { url = new URL(u) } catch { return null }
    if (url.username || url.password) return null
    if (dev && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.href
    if (url.protocol !== 'https:') return null
    const h = url.hostname.toLowerCase()
    if (!h.includes('.') || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return null
    return url.href
}

// ---------------------------------------------------------------------------------------------------------------------
// O pedido todo (a mesma leitura no servidor e no ecrã)

export type PedidoBanner = {
    modelo: ModeloId; formato: FormatoId
    titulo: string; subtitulo: string; preco: string; nota: string
    foto: string | null; ajuste: AjusteFoto; tirarBranco: boolean
}

export function lerPedido(q: URLSearchParams, dev = false): PedidoBanner {
    return {
        modelo: lerModelo(q.get('modelo')),
        formato: lerFormato(q.get('formato')),
        titulo: limparTexto(q.get('t'), LIMITES.titulo),
        subtitulo: limparTexto(q.get('s'), LIMITES.subtitulo),
        preco: formatarPreco(limparTexto(q.get('p'), 14)),
        nota: limparTexto(q.get('n'), LIMITES.nota),
        foto: enderecoDeFotoPermitido(q.get('foto'), dev),
        ajuste: lerAjuste(q.get('zoom'), q.get('fx'), q.get('fy')),
        tirarBranco: q.get('tb') === '1',
    }
}

/** Gerador pseudo-aleatório determinístico (os confetes são sempre os mesmos para o mesmo banner). */
export function aleatorio(semente: number): () => number {
    let s = semente >>> 0
    return () => {
        s = (s + 0x6d2b79f5) >>> 0
        let t = s
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

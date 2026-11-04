// Desenha os banners da cantina (next/og). Cada modelo é um fundo em SVG (toldo, quadro, madeira, raios…), uma moldura para a
// foto, um selo de preço e os textos por cima (letra que se ajusta). As posições vêm de DISPOSICAO (lib/cantina-banners.ts).
// Os SVG vão como imagens (data:) — assim o satori não precisa de entender cada atributo e o resvg desenha filtros e padrões.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { tirarFundoBranco } from '@/lib/tirar-fundo'
import {
    DISPOSICAO, FORMATOS, ajustarFonte, aleatorio, caixaFoto, caixaSelo, larguraEm, recorteQuadrado, sobrepoe,
    type CaixaTexto, type FonteCantina, type FormatoId, type ModeloId, type PedidoBanner,
} from '@/lib/cantina-banners'

// ---------------------------------------------------------------------------------------------------------------------
// Letras (OFL, em public/fontes/cantina) e a pomba

// Só o nome do ficheiro: a pasta fica escrita no path.join, para a Vercel levar estas letras para a função
// (com o caminho todo numa variável, o rastreio não as encontra e o banner falha em produção).
const FONTES = [
    ['Titan', 'TitanOne-Regular.ttf'],
    ['Lilita', 'LilitaOne-Regular.ttf'],
    ['Gochi', 'GochiHand-Regular.ttf'],
    ['Pacifico', 'Pacifico-Regular.ttf'],
] as const
type Fonte = { name: string; data: Buffer; weight: 400 | 700 | 900; style: 'normal' }
let fontes: Promise<Fonte[]> | null = null
const carregarFontes = () => (fontes ??= (async () => {
    const dos400 = await Promise.all(FONTES.map(async ([name, f]) => ({ name, weight: 400 as const, style: 'normal' as const, data: await readFile(path.join(process.cwd(), 'public', 'fontes', 'cantina', f)) })))
    const mont = await Promise.all([700, 900].map(async (w) => ({ name: 'Montserrat', weight: w as 700 | 900, style: 'normal' as const, data: await readFile(path.join(process.cwd(), 'public', 'fonts', 'divulgacao', `Montserrat-${w}.ttf`)) })))
    return [...dos400, ...mont]
})().catch((e) => { fontes = null; throw e }))   // uma falha não fica guardada para sempre

let pomba: Promise<string | null> | null = null
const carregarPomba = () => (pomba ??= readFile(path.join(process.cwd(), 'public', 'images', 'pomba_admvc.png'))
    .then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null))

// ---------------------------------------------------------------------------------------------------------------------
// Pequenas ajudas de SVG

const svg = (w: number, h: number, inner: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`
const uri = (s: string) => `data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}`
const r1 = (n: number) => Math.round(n * 10) / 10

function Camada({ s, w, h, x = 0, y = 0, rodar = 0 }: { s: string; w: number; h: number; x?: number; y?: number; rodar?: number }) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={uri(s)} width={w} height={h} style={{ position: 'absolute', left: x, top: y, ...(rodar ? { transform: `rotate(${rodar}deg)` } : {}) }} />
}

/** Estrela de 4 pontas (brilho). */
const brilho = (cx: number, cy: number, r: number, cor: string, op = 1) =>
    `<path d="M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r}Z" fill="${cor}" opacity="${op}"/>`

/** Estrela de burst (selo): n pontas, raio exterior R e interior r. */
function burst(cx: number, cy: number, n: number, R: number, r: number): string {
    const p: string[] = []
    for (let i = 0; i < n * 2; i++) {
        const a = (Math.PI * i) / n - Math.PI / 2, rr = i % 2 ? r : R
        p.push(`${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr)}`)
    }
    return `<polygon points="${p.join(' ')}" stroke-linejoin="round"`
}

// ---------------------------------------------------------------------------------------------------------------------
// Fundos

function fundoToldo(w: number, h: number, f: FormatoId): string {
    const L = DISPOSICAO[f], ft = L.foto
    const n = f === 'telao' ? 16 : 10, sw = w / n, corpo = L.toldo - 46
    let listas = ''
    for (let i = 0; i < n; i++) {
        const x = r1(i * sw), x2 = r1((i + 1) * sw + 0.6), m = r1(x + sw / 2)
        listas += `<path d="M${x} 0H${x2}V${corpo}Q${x2} ${corpo + 30} ${m} ${corpo + 46}Q${x} ${corpo + 30} ${x} ${corpo}Z" fill="${i % 2 ? '#FFF6E3' : '#D8281F'}"/>`
    }
    const brilhos = [[0.08, 0.5, 20], [0.9, 0.34, 26], [0.2, 0.9, 16], [0.8, 0.84, 20]]
        .map(([fx, fy, r]) => brilho(r1(fx * w), r1(L.toldo + fy * (h - L.toldo)), r, '#FFF6E3', 0.85)).join('')
    return svg(w, h, `
<defs>
<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${ft.cx}" cy="${ft.cy}" r="${Math.max(w, h) * 0.75}"><stop offset="0" stop-color="#FFD84E"/><stop offset="1" stop-color="#EFA20C"/></radialGradient>
<pattern id="p" width="96" height="96" patternUnits="userSpaceOnUse"><circle cx="24" cy="24" r="11" fill="#FFF0A6" opacity=".6"/><circle cx="72" cy="72" r="11" fill="#FFF0A6" opacity=".6"/></pattern>
<radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${ft.cx}" cy="${ft.cy}" r="${ft.d * 0.95}"><stop offset=".45" stop-color="#FFF4B8" stop-opacity=".95"/><stop offset="1" stop-color="#FFF4B8" stop-opacity="0"/></radialGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".7" stop-color="#7a1008" stop-opacity=".0"/><stop offset="1" stop-color="#7a1008" stop-opacity=".16"/></linearGradient>
<filter id="sh" x="-5%" y="-5%" width="110%" height="130%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#5a2a00" flood-opacity=".45"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><rect width="${w}" height="${h}" fill="url(#p)"/>
<circle cx="${ft.cx}" cy="${ft.cy}" r="${ft.d * 0.95}" fill="url(#h)"/>
${brilhos}
<g filter="url(#sh)">${listas}<path d="M0 0H${w}V${corpo}H0Z" fill="url(#s)"/><rect width="${w}" height="16" fill="#9C150E"/></g>`)
}

function fundoCafe(w: number, h: number, f: FormatoId): string {
    const L = DISPOSICAO[f], ft = L.foto
    const n = f === 'telao' ? 14 : 8, sw = w / n, corpo = L.toldo - 38
    let listas = '', arcos = ''
    for (let i = 0; i < n; i++) {
        const x = r1(i * sw), x2 = r1((i + 1) * sw + 0.6)
        listas += `<rect x="${x}" y="0" width="${r1(x2 - x)}" height="${corpo}" fill="${i % 2 ? '#F6FBF8' : '#6FC3B8'}"/>`
        arcos += `<path d="M${x} ${corpo}A${r1(sw / 2)} 38 0 0 0 ${x2} ${corpo}Z" fill="${i % 2 ? '#F6FBF8' : '#6FC3B8'}" stroke="#3F8F86" stroke-width="3"/>`
    }
    // tábuas de madeira
    const tabuas = f === 'telao' ? 6 : 8, th = (h - L.toldo + 30) / tabuas
    let madeira = ''
    for (let i = 0; i < tabuas; i++) {
        const y = r1(L.toldo - 30 + i * th)
        madeira += `<rect y="${y}" width="${w}" height="${r1(th + 1)}" fill="${['#B97536', '#AB6A2E', '#C0803F', '#A8662B'][i % 4]}"/><rect y="${r1(y + th - 3)}" width="${w}" height="3" fill="#6B3A15" opacity=".55"/>`
    }
    // grãos de café espalhados
    const alea = aleatorio(11)
    let graos = ''
    const livres: CaixaTexto[] = [L.titulo, L.subtitulo, L.nota, L.marca, caixaFoto(f), caixaSelo(f)]
    for (let i = 0, t = 0; i < 26 && t < 400; t++) {
        const x = alea() * w, y = L.toldo + 40 + alea() * (h - L.toldo - 60), rot = Math.round(alea() * 180)
        if (livres.some((c) => sobrepoe({ x: x - 40, y: y - 40, w: 80, h: 80 }, { x: c.x - 24, y: c.y - 24, w: c.w + 48, h: c.h + 48 }))) continue
        i++
        graos += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot})"><ellipse rx="19" ry="12" fill="#4A2A17" opacity=".75"/><path d="M-17 0Q0 -6 17 0" stroke="#B97536" stroke-width="3" fill="none" opacity=".8"/></g>`
    }
    return svg(w, h, `
<defs>
<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.2" numOctaves="3" seed="8"/><feColorMatrix type="matrix" values="0 0 0 0 .25  0 0 0 0 .12  0 0 0 0 .04  1.3 0 0 0 -.42"/></filter>
<radialGradient id="v" gradientUnits="userSpaceOnUse" cx="${ft.cx}" cy="${ft.cy}" r="${Math.max(w, h) * 0.8}"><stop offset=".25" stop-color="#FFD28A" stop-opacity=".45"/><stop offset="1" stop-color="#2B1204" stop-opacity=".55"/></radialGradient>
<filter id="sh" x="-5%" y="-5%" width="110%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="9" flood-color="#2b1204" flood-opacity=".5"/></filter>
</defs>
${madeira}<rect width="${w}" height="${h}" filter="url(#gr)"/><rect width="${w}" height="${h}" fill="url(#v)"/>
${graos}
<g filter="url(#sh)">${listas}${arcos}<rect width="${w}" height="14" fill="#3F8F86"/></g>`)
}

function fundoGiz(w: number, h: number, f: FormatoId): string {
    const m = 40, ft = DISPOSICAO[f].foto
    // riscos de giz (apagador) e pó
    const alea = aleatorio(5)
    let manchas = ''
    for (let i = 0; i < 9; i++) manchas += `<ellipse cx="${r1(alea() * w)}" cy="${r1(alea() * h)}" rx="${r1(120 + alea() * 260)}" ry="${r1(30 + alea() * 70)}" fill="#fff" opacity="${r1(0.035 + alea() * 0.03)}" transform="rotate(${r1(alea() * 40 - 20)} ${w / 2} ${h / 2})"/>`
    return svg(w, h, `
<defs>
<filter id="mad" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.005 0.2" numOctaves="3" seed="4"/><feColorMatrix type="matrix" values="0 0 0 0 .24  0 0 0 0 .11  0 0 0 0 .03  1.5 0 0 0 -.5"/></filter>
<filter id="po" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 0 0 0 -.46"/></filter>
<filter id="bl"><feGaussianBlur stdDeviation="28"/></filter>
<radialGradient id="q" gradientUnits="userSpaceOnUse" cx="${ft.cx}" cy="${ft.cy}" r="${Math.max(w, h) * 0.7}"><stop offset="0" stop-color="#2F5A4C"/><stop offset="1" stop-color="#1B352D"/></radialGradient>
<clipPath id="c"><rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="10"/></clipPath>
<linearGradient id="mo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B07A44"/><stop offset="1" stop-color="#8A5A2C"/></linearGradient>
<filter id="in"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#mo)"/><rect width="${w}" height="${h}" filter="url(#mad)"/>
<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="10" fill="url(#q)"/>
<g clip-path="url(#c)"><g filter="url(#bl)">${manchas}</g><rect width="${w}" height="${h}" filter="url(#po)"/>
<rect x="${m - 6}" y="${m - 6}" width="${w - 2 * m + 12}" height="${h - 2 * m + 12}" rx="14" fill="none" stroke="#000" stroke-opacity=".5" stroke-width="22" filter="url(#in)"/></g>
<rect x="${m}" y="${m}" width="${w - 2 * m}" height="${h - 2 * m}" rx="10" fill="none" stroke="#5E3A17" stroke-width="3" opacity=".8"/>
<rect x="3" y="3" width="${w - 6}" height="${h - 6}" fill="none" stroke="#D9A86A" stroke-opacity=".5" stroke-width="3"/>`)
}

function fundoFesta(w: number, h: number, f: FormatoId): string {
    const L = DISPOSICAO[f], ft = L.foto
    // raios de sol a partir da foto
    const n = 30, R = 2600
    let raios = ''
    for (let i = 0; i < n; i += 2) {
        const a1 = (Math.PI * 2 * i) / n, a2 = (Math.PI * 2 * (i + 1)) / n
        raios += `<polygon points="${ft.cx},${ft.cy} ${r1(ft.cx + Math.cos(a1) * R)},${r1(ft.cy + Math.sin(a1) * R)} ${r1(ft.cx + Math.cos(a2) * R)},${r1(ft.cy + Math.sin(a2) * R)}" fill="#fff" opacity=".13"/>`
    }
    // confetes (fora dos textos, da foto e do selo)
    const alea = aleatorio(21)
    const cores = ['#FFE45C', '#FFFFFF', '#6FF2E0', '#8E5BFF', '#FFD0E4', '#FFB020']
    const proibidas: CaixaTexto[] = [L.titulo, L.subtitulo, L.nota, L.marca, caixaFoto(f), caixaSelo(f)]
    let confetes = ''
    for (let i = 0, t = 0; i < (f === 'telao' ? 70 : 60) && t < 3000; t++) {
        const x = alea() * w, y = alea() * h, s = 14 + alea() * 22
        if (proibidas.some((c) => sobrepoe({ x: x - s, y: y - s, w: 2 * s, h: 2 * s }, { x: c.x - 18, y: c.y - 18, w: c.w + 36, h: c.h + 36 }))) continue
        i++
        const cor = cores[Math.floor(alea() * cores.length)], rot = Math.round(alea() * 360), tipo = Math.floor(alea() * 4)
        const forma = tipo === 0 ? `<rect x="${-s / 2}" y="${-s / 4}" width="${s}" height="${r1(s / 2)}" rx="3" fill="${cor}"/>`
            : tipo === 1 ? `<circle r="${r1(s / 2.4)}" fill="${cor}"/>`
                : tipo === 2 ? `<polygon points="0,${-s / 2} ${s / 2},${s / 2} ${-s / 2},${s / 2}" fill="${cor}"/>`
                    : `<path d="M${-s} 0q${r1(s / 2)} ${-s} ${s} 0t${s} 0" stroke="${cor}" stroke-width="7" fill="none" stroke-linecap="round"/>`
        confetes += `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${rot})" opacity=".92">${forma}</g>`
    }
    return svg(w, h, `
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9A1F"/><stop offset=".55" stop-color="#FF5B5B"/><stop offset="1" stop-color="#F72E8F"/></linearGradient>
<radialGradient id="s" gradientUnits="userSpaceOnUse" cx="${ft.cx}" cy="${ft.cy}" r="${ft.d * 1.1}"><stop offset="0" stop-color="#FFE45C" stop-opacity=".85"/><stop offset="1" stop-color="#FFE45C" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#g)"/>${raios}<circle cx="${ft.cx}" cy="${ft.cy}" r="${ft.d * 1.1}" fill="url(#s)"/>${confetes}`)
}

const FUNDOS: Record<ModeloId, (w: number, h: number, f: FormatoId) => string> = { toldo: fundoToldo, giz: fundoGiz, cafe: fundoCafe, festa: fundoFesta }

// ---------------------------------------------------------------------------------------------------------------------
// Rabiscos a giz (só no quadro): garfo, chávena, estrelas

function rabiscosGiz(f: FormatoId): string {
    const giz = 'stroke="#F5F1E3" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"'
    const amarelo = 'stroke="#FFE27A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"'
    const garfo = (x: number, y: number, rot: number) => `<g transform="translate(${x} ${y}) rotate(${rot})" ${giz}><path d="M-22 -80V-30M0 -80V-30M22 -80V-30M-22 -30Q-22 0 0 0Q22 0 22 -30M0 0V86"/></g>`
    const faca = (x: number, y: number, rot: number) => `<g transform="translate(${x} ${y}) rotate(${rot})" ${giz}><path d="M-6 -86Q24 -66 16 -14H-6ZM-6 -14V86"/></g>`
    const chavena = (x: number, y: number, rot: number) => `<g transform="translate(${x} ${y}) rotate(${rot})"><g ${giz}><path d="M-52 -20H44V30Q44 58 16 58H-24Q-52 58 -52 30Z M44 -4Q78 -4 78 22Q78 44 40 44M-70 70Q-4 88 62 70"/></g><g ${amarelo}><path d="M-26 -38Q-40 -56 -26 -74M0 -38Q-14 -56 0 -74M24 -38Q10 -56 24 -74"/></g></g>`
    const coracao = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})" ${amarelo}><path d="M0 18C-30 -4 -22 -30 -6 -26Q0 -24 0 -16Q0 -24 6 -26C22 -30 30 -4 0 18Z"/></g>`
    const estrela = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})" ${giz}><path d="M0 -22L6 -7L22 -6L10 5L14 21L0 12L-14 21L-10 5L-22 -6L-6 -7Z"/></g>`
    const onda = (x: number, y: number, larg: number) => { let d = `M${x} ${y}`; for (let i = 0; i < larg / 40; i++) d += `q10 -14 20 0t20 0`; return `<path d="${d}" ${amarelo}/>` }
    if (f === 'telao') {
        return garfo(1775, 330, 14) + faca(1840, 360, 10) + chavena(1760, 680, -8) + coracao(1730, 880, 1.1) + estrela(130, 130, 1.2) + estrela(1000, 120, 0.9) + estrela(1830, 130, 1) + onda(100, 985, 880) + coracao(1560, 160, 0.8)
    }
    return garfo(130, 560, -10) + faca(190, 590, -6) + chavena(950, 590, 8) + estrela(110, 920, 1.1) + estrela(950, 790, 0.9) + estrela(990, 160, 1) + estrela(100, 160, 0.9) + coracao(960, 1090, 0.9)
}

// ---------------------------------------------------------------------------------------------------------------------
// Moldura da foto: o que fica por baixo e à volta do círculo da foto (SVG centrado em (cx, cy), lado = d*1.4)

function moldura(modelo: ModeloId, d: number): { svg: string; lado: number; disco: string } {
    const lado = Math.ceil(d * 1.42), c = lado / 2, r = d / 2
    const f = (inner: string, defs = '') => svg(lado, lado, `<defs>${defs}</defs>${inner}`)
    const sombra = (id: string, dy: number, desf: number, op: number) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${dy}" stdDeviation="${desf}" flood-color="#000" flood-opacity="${op}"/></filter>`
    if (modelo === 'toldo') {
        return { disco: '#FFF6E3', lado, svg: f(
            `<circle cx="${c}" cy="${c}" r="${r + 34}" fill="#FFF6E3" filter="url(#s)"/><circle cx="${c}" cy="${c}" r="${r + 15}" fill="none" stroke="#D8281F" stroke-width="16"/><circle cx="${c}" cy="${c}" r="${r + 29}" fill="none" stroke="#D8281F" stroke-width="5" stroke-dasharray="1 15" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="${r}" fill="#FFF6E3"/>`,
            sombra('s', 14, 12, 0.35)) }
    }
    if (modelo === 'giz') {
        return { disco: '#2A5245', lado, svg: f(
            `<circle cx="${c}" cy="${c}" r="${r}" fill="#2A5245"/><circle cx="${c}" cy="${c}" r="${r + 14}" fill="none" stroke="#F5F1E3" stroke-width="6" stroke-dasharray="52 7" stroke-linecap="round" opacity=".95"/><circle cx="${c}" cy="${c}" r="${r + 32}" fill="none" stroke="#FFE27A" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round"/>`) }
    }
    if (modelo === 'cafe') {
        return { disco: '#F4EBD8', lado, svg: f(
            `<circle cx="${c}" cy="${c}" r="${r + 54}" fill="#FBF6EA" stroke="#DCCFB4" stroke-width="3" filter="url(#s)"/><circle cx="${c}" cy="${c}" r="${r + 30}" fill="#F1E8D4" stroke="#E2D6BC" stroke-width="3"/><circle cx="${c}" cy="${c}" r="${r + 8}" fill="none" stroke="#fff" stroke-width="5" opacity=".9"/><circle cx="${c}" cy="${c}" r="${r}" fill="#F4EBD8"/>`,
            sombra('s', 18, 13, 0.45)) }
    }
    return { disco: '#FFF4C6', lado, svg: f(
        `<circle cx="${c}" cy="${c}" r="${r + 38}" fill="none" stroke="#FFE45C" stroke-width="9" stroke-dasharray="1 24" stroke-linecap="round"/><circle cx="${c}" cy="${c}" r="${r + 17}" fill="#fff" filter="url(#s)"/><circle cx="${c}" cy="${c}" r="${r}" fill="#FFF4C6"/>`,
        sombra('s', 12, 10, 0.3)) }
}

// ---------------------------------------------------------------------------------------------------------------------
// Desenhos do centro (quando não há foto)

function desenhoCentro(modelo: ModeloId): string {
    const sombra = '<ellipse cx="200" cy="352" rx="150" ry="16" fill="#000" opacity=".13"/>'
    if (modelo === 'toldo') { // hambúrguer
        const alface = 'M54 226' + 'q18 -24 36 0'.repeat(1) + 'q18 -24 36 0'.repeat(7) + 'V242H54Z'
        return svg(400, 400, `${sombra}
<path d="M70 292H330Q330 338 288 338H112Q70 338 70 292Z" fill="#E39A36"/><path d="M70 292H330" stroke="#C97F1F" stroke-width="4"/>
<rect x="60" y="246" width="280" height="50" rx="25" fill="#6B3A1E"/><path d="M92 262q36 -9 72 0M200 260q40 -9 80 0" stroke="#8F5430" stroke-width="5" fill="none" stroke-linecap="round"/>
<rect x="56" y="228" width="288" height="22" rx="5" fill="#FFC928"/><path d="M118 250l18 32l18 -32ZM252 250l14 26l14 -26Z" fill="#FFC928"/>
<rect x="68" y="214" width="264" height="24" rx="12" fill="#E5412D"/>
<path d="${alface}" fill="#5BB23B"/><path d="M54 226H342" stroke="#3F8F28" stroke-width="3" opacity=".4"/>
<path d="M62 204Q62 82 200 82Q338 82 338 204Z" fill="#F0B14F"/><path d="M62 204Q62 82 200 82Q338 82 338 204Z" fill="url(#hl)"/>
<defs><linearGradient id="hl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
<g fill="#FFF3D0"><ellipse cx="150" cy="128" rx="11" ry="6" transform="rotate(-25 150 128)"/><ellipse cx="205" cy="108" rx="11" ry="6" transform="rotate(10 205 108)"/><ellipse cx="262" cy="136" rx="11" ry="6" transform="rotate(30 262 136)"/><ellipse cx="120" cy="172" rx="11" ry="6" transform="rotate(-10 120 172)"/><ellipse cx="190" cy="160" rx="11" ry="6" transform="rotate(20 190 160)"/><ellipse cx="258" cy="182" rx="11" ry="6" transform="rotate(-20 258 182)"/></g>`)
    }
    if (modelo === 'giz') { // chávena e talheres a giz
        const g = 'stroke="#F5F1E3" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"'
        const y = 'stroke="#FFE27A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"'
        return svg(400, 400, `
<g ${g}><path d="M112 168H262V268Q262 312 220 312H154Q112 312 112 268Z M262 192Q324 192 324 236Q324 280 260 280M84 332Q188 358 292 332"/><path d="M40 110V160M58 110V160M76 110V160M40 160Q58 184 76 160M58 184V322"/><path d="M350 106Q384 140 350 220V322"/></g>
<g ${y}><path d="M152 138Q134 114 152 90Q170 66 152 42M196 138Q178 114 196 90Q214 66 196 42M240 138Q222 114 240 90"/><path d="M186 214C150 190 160 160 178 166Q186 169 186 178Q186 169 194 166C212 160 222 190 186 214Z"/></g>`)
    }
    if (modelo === 'cafe') { // caneca de café
        return svg(400, 400, `
<defs><clipPath id="c"><path d="M92 176V270Q92 332 160 332H220Q288 332 288 270V176Z"/></clipPath><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#F4EBD8"/><stop offset="1" stop-color="#D9CBB0"/></linearGradient></defs>
<ellipse cx="190" cy="344" rx="150" ry="26" fill="#E7DCC4" stroke="#CDBE9F" stroke-width="3"/><ellipse cx="190" cy="338" rx="118" ry="17" fill="#F7F0E0"/>
<path d="M284 206Q352 206 352 254Q352 302 276 298" fill="none" stroke="#CDBE9F" stroke-width="30" stroke-linecap="round"/><path d="M284 206Q352 206 352 254Q352 302 276 298" fill="none" stroke="#FBF6EA" stroke-width="22" stroke-linecap="round"/>
<path d="M92 176V270Q92 332 160 332H220Q288 332 288 270V176Z" fill="url(#b)"/>
<g clip-path="url(#c)"><rect x="80" y="222" width="220" height="34" fill="#6FC3B8"/><rect x="80" y="262" width="220" height="8" fill="#6FC3B8" opacity=".7"/></g>
<ellipse cx="190" cy="176" rx="98" ry="26" fill="#F4EBD8" stroke="#D9CBB0" stroke-width="3"/><ellipse cx="190" cy="178" rx="86" ry="19" fill="#5A3219"/>
<path d="M190 190C164 174 170 158 182 162Q190 165 190 172Q190 165 198 162C210 158 216 174 190 190Z" fill="#F7EBD3"/>
<g fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" opacity=".92"><path d="M146 128Q124 100 146 76Q166 52 146 26"/><path d="M196 124Q174 96 196 72Q216 48 196 22"/><path d="M246 128Q224 100 246 76Q266 52 246 26"/></g>`)
    }
    // festa: queque
    return svg(400, 400, `
<ellipse cx="200" cy="356" rx="140" ry="15" fill="#000" opacity=".13"/>
<path d="M104 244H296L270 344H130Z" fill="#FF8FB1"/><path d="M134 244L148 344M166 244L172 344M200 244V344M234 244L228 344M266 244L252 344" stroke="#E86A92" stroke-width="5"/>
<ellipse cx="200" cy="238" rx="112" ry="38" fill="#FFD3E2"/><ellipse cx="200" cy="200" rx="86" ry="33" fill="#FFB9D0"/><ellipse cx="200" cy="164" rx="58" ry="27" fill="#FF9DBF"/>
<path d="M170 144Q200 96 230 144Z" fill="#FF86B0"/>
<circle cx="200" cy="108" r="21" fill="#E01E4D"/><path d="M200 88Q206 70 222 64" stroke="#3F8F28" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="193" cy="101" rx="6" ry="9" fill="#fff" opacity=".6" transform="rotate(35 193 101)"/>
<g stroke-linecap="round" stroke-width="7"><path d="M130 232l12 -5" stroke="#6FF2E0"/><path d="M168 246l-4 -12" stroke="#FFE45C"/><path d="M236 240l12 6" stroke="#8E5BFF"/><path d="M270 228l8 -10" stroke="#fff"/><path d="M150 200l10 -4" stroke="#FFE45C"/><path d="M226 204l-4 -11" stroke="#6FF2E0"/><path d="M254 192l11 3" stroke="#8E5BFF"/><path d="M190 160l-9 -5" stroke="#fff"/><path d="M216 168l9 -4" stroke="#FFE45C"/></g>
${brilho(88, 120, 16, '#FFE45C')}${brilho(318, 100, 20, '#fff')}${brilho(330, 210, 12, '#FFE45C')}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// Selo do preço (cabe num quadrado de lado s). O texto vai por cima, em HTML.

type SeloDef = { svg: string; texto: { x: number; y: number; w: number; h: number }; cor: string; fonte: FonteCantina; rodar: number }
const MARGEM = 0.15
/** SVG do selo com margem à volta (a sombra não fica cortada): lado s*1.3, o desenho fica no meio. */
const svgSelo = (s: number, inner: string) => svg(Math.round(s * (1 + 2 * MARGEM)), Math.round(s * (1 + 2 * MARGEM)), `<g transform="translate(${r1(s * MARGEM)} ${r1(s * MARGEM)})">${inner}</g>`)

function selo(modelo: ModeloId, s: number): SeloDef {
    const c = s / 2
    if (modelo === 'toldo') {
        const R = s * 0.5 - 6, r = s * 0.43
        const forma = burst(c, c, 16, R, r)
        return { rodar: -9, cor: '#FFF6E3', fonte: 'Titan', texto: { x: s * 0.17, y: s * 0.3, w: s * 0.66, h: s * 0.4 },
            svg: svgSelo(s, `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#5a0d08" flood-opacity=".5"/></filter></defs>${forma} fill="#D8281F" stroke="#FFF6E3" stroke-width="${s * 0.035}" filter="url(#s)"/><circle cx="${c}" cy="${c}" r="${s * 0.35}" fill="none" stroke="#FFF6E3" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`) }
    }
    if (modelo === 'giz') { // etiqueta pendurada
        const w = s * 0.86, h = s * 1.0, x0 = (s - w) / 2, y0 = s * 0.0
        const forma = `M${x0 + w * 0.2} ${y0 + 0}H${x0 + w * 0.8}L${x0 + w} ${y0 + h * 0.18}V${y0 + h}H${x0}V${y0 + h * 0.18}Z`
        return { rodar: 6, cor: '#2A2118', fonte: 'Gochi', texto: { x: s * 0.14, y: s * 0.3, w: s * 0.72, h: s * 0.5 },
            svg: svgSelo(s, `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter></defs>
<path d="${forma}" fill="#F3E7C4" stroke="#C7B27E" stroke-width="3" stroke-linejoin="round" filter="url(#s)"/><path d="M${x0 + 10} ${y0 + h - 10}H${x0 + w - 10}" stroke="#C7B27E" stroke-width="2" stroke-dasharray="5 6" opacity=".7"/>
<circle cx="${c}" cy="${s * 0.1}" r="${s * 0.04}" fill="#2A5245" stroke="#C7B27E" stroke-width="2"/><path d="M${c} ${s * 0.1}C${c - s * 0.12} ${-s * 0.0} ${c - s * 0.16} ${s * 0.0} ${c - s * 0.05} ${s * 0.1}" stroke="#E7D6A8" stroke-width="4" fill="none" stroke-linecap="round"/>`) }
    }
    if (modelo === 'cafe') { // placa creme com prego
        const w = s * 1.0, h = s * 0.74, x0 = (s - w) / 2, y0 = s * 0.1
        return { rodar: -3, cor: '#5B3317', fonte: 'Pacifico', texto: { x: s * 0.12, y: y0 + h * 0.2, w: s * 0.76, h: h * 0.62 },
            svg: svgSelo(s, `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#2b1204" flood-opacity=".55"/></filter></defs>
<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h * 0.16}" fill="#FBF3DF" stroke="#8B5A2B" stroke-width="5" filter="url(#s)"/><rect x="${x0 + 12}" y="${y0 + 12}" width="${w - 24}" height="${h - 24}" rx="${h * 0.1}" fill="none" stroke="#C69A62" stroke-width="3"/>
<circle cx="${c}" cy="${y0 + 15}" r="9" fill="#4B2E1A"/><circle cx="${c - 3}" cy="${y0 + 12}" r="3.4" fill="#C69A62"/>`) }
    }
    // festa: balão amarelo
    const bw = s * 0.88, bh = s * 0.8, cy = bh / 2 + 4
    return { rodar: 7, cor: '#B3125A', fonte: 'Lilita', texto: { x: s * 0.2, y: cy - bh * 0.2, w: s * 0.6, h: bh * 0.4 },
        svg: svgSelo(s, `<defs><radialGradient id="b" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#FFF28A"/><stop offset=".6" stop-color="#FFD21F"/><stop offset="1" stop-color="#FFA800"/></radialGradient><filter id="s" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#7a0a40" flood-opacity=".4"/></filter></defs>
<path d="M${c} ${bh + 4}C${c - 6} ${bh + 22} ${c + 14} ${bh + 34} ${c - 2} ${s * 0.93} S${c + 8} ${s * 0.99} ${c} ${s}" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".9"/>
<ellipse cx="${c}" cy="${cy}" rx="${bw / 2}" ry="${bh / 2}" fill="url(#b)" filter="url(#s)"/><path d="M${c - 9} ${bh + 12}L${c} ${bh - 2}L${c + 9} ${bh + 12}Z" fill="#FFA800"/>
<path d="M${c - bw * 0.32} ${cy - bh * 0.1}Q${c - bw * 0.3} ${cy - bh * 0.34} ${c - bw * 0.08} ${cy - bh * 0.4}" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".7"/>`) }
}

// ---------------------------------------------------------------------------------------------------------------------
// Estilo dos textos de cada modelo

type Tipo = {
    titulo: { f: FonteCantina; caps: boolean; cor: string; sombra?: (t: number) => string; max: [number, number]; min: number; folga?: number }
    sub: { f: FonteCantina; caps: boolean; cor: string; sombra?: (t: number) => string; max: [number, number]; min: number }
    nota: { f: string; cor: string; fundo?: string; borda?: string; tam: number; peso: 400 | 700 | 900 }
    marca: { fundo: string; texto: string }
}
const TIPO: Record<ModeloId, Tipo> = {
    toldo: {
        titulo: { f: 'Titan', caps: true, cor: '#D8281F', sombra: (t) => `${r1(t * 0.035)}px ${r1(t * 0.05)}px 0 #FFF6E3, ${r1(t * 0.07)}px ${r1(t * 0.095)}px 0 #7A1008`, max: [150, 128], min: 48 },
        sub: { f: 'Lilita', caps: false, cor: '#4A230C', max: [76, 66], min: 34 },
        nota: { f: 'Montserrat', cor: '#8A1B12', fundo: '#FFF6E3', borda: '#D8281F', tam: 30, peso: 700 },
        marca: { fundo: '#7A1008', texto: '#7A1008' },
    },
    giz: {
        titulo: { f: 'Gochi', caps: false, cor: '#F7F3E6', sombra: (t) => `0 0 ${r1(t * 0.05)}px rgba(255,255,255,.45), ${r1(t * 0.02)}px ${r1(t * 0.02)}px 0 rgba(0,0,0,.25)`, max: [190, 160], min: 56 },
        sub: { f: 'Gochi', caps: false, cor: '#FFE27A', sombra: () => '0 0 8px rgba(255,226,122,.35)', max: [88, 76], min: 38 },
        nota: { f: 'Gochi', cor: '#F7F3E6', tam: 40, peso: 400 },
        marca: { fundo: '#13241E', texto: '#F7F3E6' },
    },
    cafe: {
        titulo: { f: 'Pacifico', caps: false, cor: '#FFF7E6', sombra: (t) => `${r1(t * 0.03)}px ${r1(t * 0.045)}px 0 #5B3317, 0 ${r1(t * 0.07)}px ${r1(t * 0.14)}px rgba(0,0,0,.45)`, max: [140, 118], min: 48 },
        sub: { f: 'Lilita', caps: false, cor: '#FFE9B8', sombra: () => '0 3px 0 rgba(60,25,5,.7)', max: [76, 66], min: 34 },
        nota: { f: 'Montserrat', cor: '#5B3317', fundo: '#FBF3DF', borda: '#C69A62', tam: 30, peso: 700 },
        marca: { fundo: '#3F8F86', texto: '#FFF7E6' },
    },
    festa: {
        titulo: { f: 'Lilita', caps: true, cor: '#FFFFFF', sombra: (t) => `${r1(t * 0.04)}px ${r1(t * 0.06)}px 0 #C0185E, ${r1(t * 0.08)}px ${r1(t * 0.12)}px ${r1(t * 0.1)}px rgba(110,10,60,.55)`, max: [190, 160], min: 56 },
        sub: { f: 'Lilita', caps: false, cor: '#FFF06A', sombra: () => '2px 3px 0 #C0185E, 0 6px 12px rgba(110,10,60,.35)', max: [84, 72], min: 36 },
        nota: { f: 'Montserrat', cor: '#B3125A', fundo: '#FFFFFF', tam: 30, peso: 900 },
        marca: { fundo: '#B3125A', texto: '#FFFFFF' },
    },
}

function Texto({ caixa, alinhar, vertical, tamanho, linha, children, estilo }: { caixa: CaixaTexto; alinhar: 'left' | 'center'; vertical: 'flex-start' | 'center' | 'flex-end'; tamanho: number; linha: number; children: string; estilo: Record<string, string | number | undefined> }) {
    return (
        <div style={{ position: 'absolute', left: caixa.x, top: caixa.y, width: caixa.w, height: caixa.h, display: 'flex', alignItems: vertical, justifyContent: alinhar === 'center' ? 'center' : 'flex-start', overflow: 'hidden' }}>
            <div style={{ display: 'flex', maxWidth: caixa.w, fontSize: tamanho, lineHeight: linha, textAlign: alinhar, wordBreak: 'break-word', ...Object.fromEntries(Object.entries(estilo).filter(([, v]) => v !== undefined)) }}>{children}</div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// Foto → círculo (sharp): recorte quadrado com zoom e foco, sem distorcer

const cacheFotos = new Map<string, Buffer>()
export class ErroFoto extends Error {}

async function descarregarFoto(url: string): Promise<Buffer> {
    const guardada = cacheFotos.get(url)
    if (guardada) return guardada
    let resp: Response
    try { resp = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' }) } catch { throw new ErroFoto('Não consegui abrir a foto. Escolha-a outra vez.') }
    if (!resp.ok) throw new ErroFoto('Não consegui abrir a foto. Escolha-a outra vez.')
    const tipo = resp.headers.get('content-type') ?? ''
    if (!/^image\/(jpeg|png|webp)/.test(tipo)) throw new ErroFoto('A foto tem de ser JPG, PNG ou WEBP.')
    const tam = Number(resp.headers.get('content-length') ?? 0)
    if (tam > 12 * 1024 * 1024) throw new ErroFoto('Foto demasiado grande.')
    const buf = Buffer.from(await resp.arrayBuffer())
    if (buf.length > 12 * 1024 * 1024) throw new ErroFoto('Foto demasiado grande.')
    if (cacheFotos.size >= 12) cacheFotos.delete(cacheFotos.keys().next().value as string)
    cacheFotos.set(url, buf)
    return buf
}

const cacheSemFundo = new Map<string, Buffer>()

/** A foto escolhida, já recortada em círculo (PNG com transparência) com o diâmetro d. */
export async function fotoEmCirculo(pedido: PedidoBanner, d: number): Promise<string> {
    if (!pedido.foto) throw new ErroFoto('Sem foto.')
    let buf = await descarregarFoto(pedido.foto)
    try {
        if (pedido.tirarBranco) {
            const chave = pedido.foto
            const guardado = cacheSemFundo.get(chave)
            if (guardado) buf = guardado
            else {
                buf = await tirarFundoBranco(buf, 1400)
                if (cacheSemFundo.size >= 6) cacheSemFundo.delete(cacheSemFundo.keys().next().value as string)
                cacheSemFundo.set(chave, buf)
            }
        }
        const { data, info } = await sharp(buf, { limitInputPixels: 60_000_000 }).rotate().toBuffer({ resolveWithObject: true })
        const { left, top, lado } = recorteQuadrado(info.width, info.height, pedido.ajuste)
        const mascara = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2}" fill="#fff"/></svg>`)
        const png = await sharp(data).extract({ left, top, width: lado, height: lado })
            .resize(d, d, { fit: 'fill', kernel: 'lanczos3' }).ensureAlpha()
            .composite([{ input: mascara, blend: 'dest-in' }]).png({ compressionLevel: 6 }).toBuffer()
        return `data:image/png;base64,${png.toString('base64')}`
    } catch (e) {
        if (e instanceof ErroFoto) throw e
        throw new ErroFoto('Não consegui ler esta foto. Experimente outra.')
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// O banner

export async function desenharBanner(pedido: PedidoBanner): Promise<ImageResponse> {
    const { modelo, formato } = pedido
    const { w: W, h: H } = FORMATOS[formato]
    const L = DISPOSICAO[formato], T = TIPO[modelo], ft = L.foto
    const [fontes, pombaUri] = await Promise.all([carregarFontes(), carregarPomba()])
    const mold = moldura(modelo, ft.d)
    const fotoUri = pedido.foto ? await fotoEmCirculo(pedido, ft.d) : null

    const titulo = T.titulo.caps ? pedido.titulo.toUpperCase() : pedido.titulo
    const tit = ajustarFonte(titulo, L.titulo, { max: T.titulo.max[formato === 'telao' ? 0 : 1], min: T.titulo.min, medir: (x) => larguraEm(T.titulo.f, x), altura: 1.08 })
    const subt = pedido.subtitulo ? ajustarFonte(pedido.subtitulo, L.subtitulo, { max: T.sub.max[formato === 'telao' ? 0 : 1], min: T.sub.min, medir: (x) => larguraEm(T.sub.f, x), altura: 1.15 }) : null
    const notaTam = formato === 'telao' ? T.nota.tam : Math.round(T.nota.tam * 0.9)
    const sl = selo(modelo, L.selo.d)
    const precoTam = pedido.preco ? ajustarFonte(pedido.preco, sl.texto, { max: Math.round(sl.texto.h * 1.05), min: 24, medir: (x) => larguraEm(sl.fonte, x), altura: 1 }) : null

    const sx = L.selo.cx - L.selo.d / 2, sy = L.selo.cy - L.selo.d / 2
    const alinhar = L.titulo.alinhar
    // no telão a nota sobe para junto do subtítulo (nunca mais abaixo do que a caixa prevista)
    const notaY = formato === 'telao' ? Math.min(L.nota.y, L.subtitulo.y + (subt ? subt.linhas * subt.tamanho * 1.15 : 0) + 34) : L.nota.y
    const discoRaio = ft.d * 0.9

    const img = (
        <div style={{ position: 'relative', display: 'flex', width: W, height: H, background: '#fff', fontFamily: 'Montserrat' }}>
            <Camada s={FUNDOS[modelo](W, H, formato)} w={W} h={H} />
            {modelo === 'giz' && <Camada s={svg(W, H, rabiscosGiz(formato))} w={W} h={H} />}

            {/* moldura + foto (ou o desenho do modelo) */}
            <Camada s={mold.svg} w={mold.lado} h={mold.lado} x={ft.cx - mold.lado / 2} y={ft.cy - mold.lado / 2} />
            {fotoUri
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={fotoUri} width={ft.d} height={ft.d} style={{ position: 'absolute', left: ft.cx - ft.d / 2, top: ft.cy - ft.d / 2 }} />
                : <Camada s={desenhoCentro(modelo)} w={Math.round(discoRaio)} h={Math.round(discoRaio)} x={ft.cx - Math.round(discoRaio) / 2} y={ft.cy - Math.round(discoRaio) / 2 + ft.d * 0.015} />}

            {/* textos */}
            {pedido.titulo && (
                <Texto caixa={L.titulo} alinhar={alinhar} vertical={formato === 'telao' ? 'flex-end' : 'center'} tamanho={tit.tamanho} linha={1.08}
                    estilo={{ fontFamily: T.titulo.f, color: T.titulo.cor, textShadow: T.titulo.sombra?.(tit.tamanho), letterSpacing: T.titulo.caps ? 1 : 0 }}>{titulo}</Texto>
            )}
            {subt && (
                <Texto caixa={L.subtitulo} alinhar={L.subtitulo.alinhar} vertical="flex-start" tamanho={subt.tamanho} linha={1.15}
                    estilo={{ fontFamily: T.sub.f, color: T.sub.cor, textShadow: T.sub.sombra?.(subt.tamanho) }}>{pedido.subtitulo}</Texto>
            )}
            {pedido.nota && (
                <div style={{ position: 'absolute', left: L.nota.x, top: notaY, width: L.nota.w, height: L.nota.h, display: 'flex', alignItems: 'center', justifyContent: L.nota.alinhar === 'center' ? 'center' : 'flex-start', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', maxWidth: L.nota.w, fontFamily: T.nota.f, fontWeight: T.nota.peso, fontSize: notaTam, color: T.nota.cor, ...(T.nota.fundo ? { background: T.nota.fundo, padding: '4px 26px' } : { padding: '0 4px' }), ...(T.nota.borda ? { border: `3px solid ${T.nota.borda}` } : {}), borderRadius: 999, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{pedido.nota}</div>
                </div>
            )}

            {/* selo do preço */}
            {pedido.preco && precoTam && (
                <div style={{ position: 'absolute', left: sx, top: sy, width: L.selo.d, height: L.selo.d, display: 'flex', transform: `rotate(${sl.rodar}deg)` }}>
                    <Camada s={sl.svg} w={Math.round(L.selo.d * 1.3)} h={Math.round(L.selo.d * 1.3)} x={-L.selo.d * MARGEM} y={-L.selo.d * MARGEM} />
                    <div style={{ position: 'absolute', left: sl.texto.x, top: sl.texto.y, width: sl.texto.w, height: sl.texto.h, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', fontFamily: sl.fonte, fontSize: precoTam.tamanho, lineHeight: 1, color: sl.cor, whiteSpace: 'nowrap' }}>{pedido.preco}</div>
                    </div>
                </div>
            )}

            {/* marca discreta */}
            <div style={{ position: 'absolute', left: L.marca.x, top: L.marca.y, width: L.marca.w, height: L.marca.h, display: 'flex', alignItems: 'center', justifyContent: formato === 'telao' ? 'flex-end' : 'flex-start', gap: 14 }}>
                {formato === 'telao' && <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 900, fontSize: 26, color: T.marca.texto, opacity: 0.9, letterSpacing: 1, whiteSpace: 'nowrap' }}>Cantina ADMVC</div>}
                {pombaUri && (
                    <div style={{ display: 'flex', width: 64, height: 64, borderRadius: 32, background: T.marca.fundo, alignItems: 'center', justifyContent: 'center', opacity: 0.92 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pombaUri} width={44} height={37} />
                    </div>
                )}
            </div>
        </div>
    )
    return new ImageResponse(img, { width: W, height: H, fonts: fontes })
}

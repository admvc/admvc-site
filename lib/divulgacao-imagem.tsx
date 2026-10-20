// Desenha as artes do telão (PNG 1920×1080) nos estilos que a Mídia usa no Holyrics. Usado pela rota
// /api/divulgacao/imagem (uma peça) e pelo ZIP do kit. Parâmetros (URLSearchParams):
//   peca=oracao|oracao-dirigida|neutro|boas-vindas|oferta|palavra
//   estilo=manchas|foto|capsula|pastel · paleta=<id em lib/divulgacao.ts>
//   alvo=familia|jovens|…  ou alvoTexto=…          (oração dirigida)
//   tema= ref= preletor=                           (palavra; sem tema = "Momento da Palavra")
//   iban= (oferta) · qr=<link> (boas-vindas) · fundo=palco|<imagem do Blob público> (estilo foto)
//   retrato=<recorte PNG do preletor>&rw=&rh= (palavra: o preletor ao lado do texto)
//   verso=<texto>&verso_ref=<ref> ou verso=- (sem versículo) · dia=AAAA-MM-DD (roda o versículo)
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import type { CSSProperties, ReactNode } from 'react'
import { FUNDOS_PRONTOS, conteudoDaPeca, lerEstilo, lerPaleta, lerPeca, type ConteudoArte, type EstiloId, type Paleta } from '@/lib/divulgacao'
import { qrSvg } from '@/lib/qr-svg'


const W = 1920, H = 1080

const FONTES = [
    ['Montserrat', 'Montserrat-500.ttf', 500, 'normal'], ['Montserrat', 'Montserrat-700.ttf', 700, 'normal'], ['Montserrat', 'Montserrat-900.ttf', 900, 'normal'],
    ['Oswald', 'Oswald-500.ttf', 500, 'normal'], ['Oswald', 'Oswald-700.ttf', 700, 'normal'],
    ['Playfair', 'Playfair-700.ttf', 700, 'normal'], ['Playfair', 'Playfair-700i.ttf', 700, 'italic'],
    ['GreatVibes', 'GreatVibes-400.ttf', 400, 'normal'], ['Cinzel', 'Cinzel-700.ttf', 700, 'normal'],
] as const
type Fonte = { name: string; data: Buffer; weight: 400 | 500 | 700 | 900; style: 'normal' | 'italic' }
let fontes: Promise<Fonte[]> | null = null
export const carregarFontes = () => (fontes ??= Promise.all(FONTES.map(async ([name, f, weight, style]) => ({
    name, weight, style, data: await readFile(path.join(process.cwd(), 'public', 'fonts', 'divulgacao', f)),
}))))

let pomba: Promise<string | null> | null = null
export const carregarPomba = () => (pomba ??= readFile(path.join(process.cwd(), 'public', 'images', 'pomba_admvc.png'))
    .then((b) => `data:image/png;base64,${b.toString('base64')}`).catch(() => null))

// Fundo: um dos prontos (lido do disco, como data URL) ou uma imagem do nosso Blob público
const fundosLidos = new Map<string, Promise<string | null>>()
export async function lerFundo(v: string | null): Promise<string | null> {
    const pronto = FUNDOS_PRONTOS.find((f) => f.id === v)
    if (!pronto) return fotoPermitida(v)
    if (!fundosLidos.has(pronto.id)) {
        fundosLidos.set(pronto.id, readFile(path.join(process.cwd(), 'public', 'images', 'divulgacao', 'fundos', pronto.ficheiro))
            .then((b) => `data:image/jpeg;base64,${b.toString('base64')}`).catch(() => null))
    }
    return fundosLidos.get(pronto.id)!
}

/** Recorte do preletor (PNG transparente) para pôr ao lado do texto na peça "Palavra". */
export type Retrato = { src: string; w: number; h: number }
export function lerRetrato(q: URLSearchParams): Retrato | null {
    const src = fotoPermitida(q.get('retrato'))
    const w = Number(q.get('rw')), h = Number(q.get('rh'))
    return src && w > 0 && h > 0 ? { src, w, h } : null
}

export const rgba = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

// Tipografia de cada estilo. porLetra = largura média de uma letra em "em", para o título caber numa linha por palavra.
const TIPO: Record<EstiloId, { titulo: CSSProperties; base: number; porLetra: number; pequena: CSSProperties; corpo: string }> = {
    manchas: {
        titulo: { fontFamily: 'Oswald', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.05 }, base: 250, porLetra: 0.5,
        pequena: { fontFamily: 'Oswald', fontWeight: 500, textTransform: 'uppercase', fontSize: 110, lineHeight: 1, marginBottom: 14 }, corpo: 'Oswald',
    },
    foto: {
        titulo: { fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'uppercase', lineHeight: 0.92, letterSpacing: -4 }, base: 200, porLetra: 0.78,
        pequena: { fontFamily: 'GreatVibes', fontSize: 130, lineHeight: 1, marginBottom: -30 }, corpo: 'Montserrat',
    },
    capsula: {
        titulo: { fontFamily: 'Playfair', fontWeight: 700, lineHeight: 1 }, base: 180, porLetra: 0.56,
        pequena: { fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'uppercase', fontSize: 46, letterSpacing: 14 }, corpo: 'Montserrat',
    },
    pastel: {
        titulo: { fontFamily: 'Playfair', fontWeight: 700, fontStyle: 'italic', lineHeight: 1 }, base: 210, porLetra: 0.52,
        pequena: { fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', fontSize: 40, letterSpacing: 12 }, corpo: 'Montserrat',
    },
}

function tamanhoTitulo(t: string, base: number, porLetra: number, largura: number) {
    const maior = Math.max(...t.split(/\s+/).map((p) => p.length))
    const total = t.length > 12 ? base * Math.sqrt(12 / t.length) : base
    return Math.round(Math.max(80, Math.min(base, largura / (maior * porLetra), total)))
}

function Fundo({ estilo, p, foto, largo, comRetrato }: { estilo: EstiloId; p: Paleta; foto: string | null; largo: boolean; comRetrato: boolean }) {
    const cheio: CSSProperties = { position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }
    if (estilo === 'manchas') return (
        <div style={{
            ...cheio, backgroundColor: p.fundo,
            backgroundImage: `radial-gradient(circle at 0% 55%, ${rgba(p.c1, 0.9)} 0%, ${rgba(p.c1, 0)} 30%), radial-gradient(circle at 50% -8%, ${rgba(p.c1, 0.75)} 0%, ${rgba(p.c1, 0)} 24%), radial-gradient(circle at 94% 84%, ${rgba(p.c2, 0.9)} 0%, ${rgba(p.c2, 0)} 30%)`,
        }} />
    )
    if (estilo === 'foto') return (
        <div style={{ ...cheio, backgroundColor: p.fundo }}>
            {foto
                ? <img alt="" src={foto} width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
                : <div style={{ ...cheio, backgroundImage: `radial-gradient(circle at 78% 40%, ${rgba(p.c1, 0.75)} 0%, ${rgba(p.c2, 0.25)} 28%, ${rgba(p.fundo, 0)} 55%)` }} />}
            <div style={{ ...cheio, backgroundImage: `linear-gradient(90deg, ${rgba(p.fundo, 0.92)} 0%, ${rgba(p.fundo, 0.6)} 50%, ${rgba(p.fundo, 0.2)} 100%)` }} />
        </div>
    )
    if (estilo === 'capsula') return (
        <div style={{ ...cheio, backgroundColor: p.fundo, backgroundImage: `radial-gradient(circle at 85% 0%, ${rgba(p.c1, 0.35)} 0%, ${rgba(p.c1, 0)} 40%), linear-gradient(160deg, ${rgba('#ffffff', 0.05)} 0%, ${rgba('#000000', 0.2)} 100%)` }}>
            <div style={{ position: 'absolute', left: -320, top: 640, width: 700, height: 700, borderRadius: 350, border: `2px solid ${rgba(p.c2, 0.35)}`, display: 'flex' }} />
            <div style={{ position: 'absolute', left: 1580, top: -380, width: 700, height: 700, borderRadius: 350, border: `2px solid ${rgba(p.c2, 0.35)}`, backgroundColor: rgba(p.c1, 0.25), display: 'flex' }} />
            <div style={{ position: 'absolute', left: comRetrato ? 110 : largo ? 160 : 310, top: 230, width: comRetrato ? 1100 : largo ? 1600 : 1300, height: 560, borderRadius: 280, backgroundImage: `linear-gradient(110deg, ${rgba(p.c1, 0.95)} 0%, ${rgba(p.c2, 0.45)} 100%)`, display: 'flex' }} />
        </div>
    )
    return (
        <div style={{
            ...cheio, backgroundColor: p.claro[1],
            backgroundImage: `radial-gradient(circle at 12% 18%, ${rgba(p.claro[0], 1)} 0%, ${rgba(p.claro[0], 0)} 45%), radial-gradient(circle at 88% 80%, ${rgba(p.claro[2], 1)} 0%, ${rgba(p.claro[2], 0)} 48%), radial-gradient(circle at 72% 8%, ${rgba(p.claro[0], 0.7)} 0%, ${rgba(p.claro[0], 0)} 35%)`,
        }}>
            <div style={{ position: 'absolute', left: 44, top: 44, width: W - 88, height: H - 88, borderRadius: 28, border: `2px solid ${rgba(p.claroTexto, 0.45)}`, display: 'flex' }} />
        </div>
    )
}

function Arte({ estilo, p, c, foto, marca, retrato }: { estilo: EstiloId; p: Paleta; c: ConteudoArte; foto: string | null; marca: string | null; retrato: Retrato | null }) {
    const tipo = TIPO[estilo]
    const claro = estilo === 'pastel'
    const cor = claro ? p.claroTexto : p.texto
    const acento = claro ? p.claroTexto : p.acento
    const aEsquerda = estilo === 'foto'
    const largura = retrato ? (estilo === 'capsula' ? 950 : 1050) : c.qr ? (estilo === 'capsula' ? 900 : 1050) : estilo === 'capsula' ? 1150 : aEsquerda ? 1250 : 1450
    const tam = c.titulo ? tamanhoTitulo(c.titulo, c.qr ? tipo.base * 0.8 : tipo.base, tipo.porLetra, largura) : 0
    const somb: CSSProperties = claro ? {} : { textShadow: '0 6px 30px rgba(0,0,0,0.45)' } // satori rebenta com textShadow: undefined
    // IBAN e afins numa só linha: a letra encolhe para caber
    const tamDestaque = c.destaque ? Math.min(estilo === 'manchas' ? 76 : 58, Math.floor(largura / (c.destaque.length * (estilo === 'manchas' ? 0.5 : 0.68)))) : 0
    const corPequena = estilo === 'manchas' ? cor : estilo === 'capsula' ? rgba(p.texto, 0.85) : acento
    const espSub = estilo === 'pastel' ? 4 : estilo === 'capsula' ? 1 : 0
    const tamSub = c.subtitulo ? Math.min(estilo === 'manchas' ? 60 : 44, Math.floor((largura - c.subtitulo.length * espSub) / (c.subtitulo.length * (estilo === 'manchas' ? 0.42 : 0.62)))) : 0

    const texto: ReactNode = (c.titulo || c.linhaPequena) && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: aEsquerda ? 'flex-start' : 'center', maxWidth: largura }}>
            {c.linhaPequena && (
                <div style={{ display: 'flex', color: corPequena, ...somb, ...tipo.pequena, ...(estilo === 'manchas' ? { fontSize: Math.round(tam * 0.45), marginBottom: Math.round(tam * 0.16) } : {}) }}>{c.linhaPequena}</div>
            )}
            {c.titulo && (
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: aEsquerda ? 'flex-start' : 'center', textAlign: aEsquerda ? 'left' : 'center', color: cor, fontSize: tam, ...somb, ...tipo.titulo }}>{c.titulo}</div>
            )}
            {c.subtitulo && (
                <div style={{ display: 'flex', marginTop: 18, color: cor, fontFamily: tipo.corpo, fontWeight: 500, fontSize: tamSub, textTransform: estilo === 'pastel' ? 'uppercase' : 'none', letterSpacing: espSub, textAlign: aEsquerda ? 'left' : 'center', whiteSpace: 'nowrap' }}>{c.subtitulo}</div>
            )}
            {c.destaque && (
                <div style={{ display: 'flex', marginTop: 22, color: cor, fontFamily: estilo === 'manchas' ? 'Oswald' : 'Montserrat', fontWeight: estilo === 'manchas' ? 500 : 700, fontSize: tamDestaque, letterSpacing: 2, whiteSpace: 'nowrap' }}>{c.destaque}</div>
            )}
            {c.preletor && (
                <div style={{ display: 'flex', marginTop: 46, color: acento, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 44, letterSpacing: 6, textTransform: 'uppercase' }}>{c.preletor}</div>
            )}
        </div>
    )

    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', fontFamily: 'Montserrat' }}>
            <Fundo estilo={estilo} p={p} foto={foto} largo={!!c.qr} comRetrato={!!retrato} />
            {retrato && (() => {
                // o preletor em pé, à direita, assente no fundo da imagem, com uma luz da cor da paleta atrás
                let h = 960, w = Math.round(retrato.w * h / retrato.h)
                if (w > 820) { w = 820; h = Math.round(retrato.h * w / retrato.w) }
                const cx = W - 80 - w / 2
                return (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }}>
                        {!claro && <div style={{ position: 'absolute', left: cx - 520, top: H - h - 120, width: 1040, height: 1040, borderRadius: 520, display: 'flex', backgroundImage: `radial-gradient(circle, ${rgba(p.c1, 0.55)} 0%, ${rgba(p.c1, 0)} 65%)` }} />}
                        <img alt="" src={retrato.src} width={w} height={h} style={{ position: 'absolute', left: Math.round(cx - w / 2), top: H - h }} />
                    </div>
                )
            })()}
            {/* cabeçalho: pomba à esquerda, IGREJA ADMVC ao centro */}
            {marca && (
                <div style={{ position: 'absolute', left: claro ? 86 : 70, top: claro ? 80 : 56, display: 'flex', width: claro ? 96 : 100, height: claro ? 96 : 100, borderRadius: 48, backgroundColor: claro ? p.claroTexto : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    <img alt="" src={marca} width={claro ? 66 : 100} height={claro ? 66 : 100} style={{ objectFit: 'contain' }} />
                </div>
            )}
            <div style={{ position: 'absolute', left: 0, top: claro ? 104 : 86, width: W, display: 'flex', justifyContent: 'center', color: cor, fontSize: 30, letterSpacing: 3 }}>
                <span style={{ fontWeight: 500 }}>IGREJA</span><span style={{ fontWeight: 900, marginLeft: 10 }}>ADMVC</span>
            </div>
            {/* conteúdo */}
            {texto && (
                <div style={{ position: 'absolute', left: 0, top: 0, width: retrato ? 1240 : W, height: H, display: 'flex', alignItems: 'center', justifyContent: aEsquerda ? 'flex-start' : 'center', padding: aEsquerda ? '0 0 40px 150px' : '0 0 40px 0', gap: 90 }}>
                    {texto}
                    {c.qr && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ display: 'flex', padding: 18, borderRadius: 24, backgroundColor: '#ffffff' }}>
                                <img alt="" src={qrSvg(c.qr, claro ? p.claroTexto : '#000000')} width={300} height={300} />
                            </div>
                            <div style={{ display: 'flex', marginTop: 18, color: cor, fontSize: 28, fontWeight: 700, letterSpacing: 1 }}>Primeira vez? Aponte a câmara</div>
                        </div>
                    )}
                </div>
            )}
            {/* rodapé: versículo */}
            {c.versiculo && (
                <div style={{ position: 'absolute', left: retrato ? 120 : 260, bottom: claro ? 100 : 80, width: retrato ? 1000 : W - 520, display: 'flex', flexDirection: 'column', alignItems: 'center', color: cor }}>
                    <div style={{ display: 'flex', textAlign: 'center', fontSize: 28, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{`“${c.versiculo.texto}”`}</div>
                    <div style={{ display: 'flex', marginTop: 6, fontSize: 24, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{c.versiculo.ref}</div>
                </div>
            )}
        </div>
    )
}

// Só imagens do nosso Blob público (o servidor vai buscá-las; não aceitar endereços quaisquer)
export function fotoPermitida(u: string | null): string | null {
    if (!u) return null
    try {
        const url = new URL(u)
        return url.protocol === 'https:' && url.hostname.endsWith('.public.blob.vercel-storage.com') ? url.href : null
    } catch { return null }
}

export async function desenharArte(q: URLSearchParams): Promise<ImageResponse> {
    const peca = lerPeca(q.get('peca'))
    const estilo = lerEstilo(q.get('estilo'))
    const p = lerPaleta(q.get('paleta'))
    const corta = (k: string, max = 80) => q.get(k)?.trim().slice(0, max) || undefined
    const verso = corta('verso', 220)
    const dia = q.get('dia') && /^\d{4}-\d{2}-\d{2}$/.test(q.get('dia')!) ? q.get('dia')! : new Date().toISOString().slice(0, 10)

    const c = conteudoDaPeca(peca, {
        alvo: corta('alvo', 20), alvoTexto: corta('alvoTexto', 40),
        tema: corta('tema'), ref: corta('ref'), preletor: corta('preletor', 60),
        iban: corta('iban', 40), qr: corta('qr', 300),
        versiculo: verso === '-' ? null : verso ? { texto: verso, ref: corta('verso_ref', 60) ?? '' } : undefined,
        semente: `${dia}-${peca}`,
    })

    const [fonts, marca, fundo] = await Promise.all([carregarFontes(), carregarPomba(), estilo === 'foto' ? lerFundo(q.get('fundo')) : null])
    return new ImageResponse(
        <Arte estilo={estilo} p={p} c={c} foto={fundo} marca={marca} retrato={peca === 'palavra' ? lerRetrato(q) : null} />,
        { width: W, height: H, fonts },
    )
}

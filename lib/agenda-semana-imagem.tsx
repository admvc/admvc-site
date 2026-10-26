// Desenho da "Programação da semana" com cartões e fotos (lib/agenda-semana.ts): post 4:5, story 9:16 e telão 16:9,
// em claro (papel creme e cápsula terracota, como o exemplo) ou escuro. Letras das artes do culto (Oswald + Montserrat).
import { ImageResponse } from 'next/og'
import type { ReactNode } from 'react'
import { carregarFontes, carregarPomba } from '@/lib/divulgacao-imagem'
import { ajustePorOmissao, enquadrarFoto, enquadrarRecorte } from '@/lib/divulgacao-enquadrar'
import { linhasDaGrelha, type Cartao } from '@/lib/agenda-semana'

export type TamanhoSemana = 'post' | 'story' | 'telao'
export type VarianteSemana = 'claro' | 'escuro'
export const TAMANHOS_SEMANA: Record<TamanhoSemana, { w: number; h: number; nome: string }> = {
    post: { w: 1080, h: 1350, nome: 'Post (4:5)' },
    story: { w: 1080, h: 1920, nome: 'Story / WhatsApp (9:16)' },
    telao: { w: 1920, h: 1080, nome: 'Telão (16:9)' },
}

const CORES: Record<VarianteSemana, { fundo: string; cartao: string; titulo: string; tituloTexto: string; dia: string; texto: string; suave: string; rodape: string; logo: string }> = {
    claro: { fundo: '#efe6d8', cartao: '#151413', titulo: '#b4532a', tituloTexto: '#f6efe4', dia: '#f3ece0', texto: '#f3ece0', suave: '#c9bfae', rodape: '#2a2420', logo: '#151413' },
    escuro: { fundo: '#0d0d0f', cartao: '#1d1d21', titulo: '#e3a33b', tituloTexto: '#17120a', dia: '#ffffff', texto: '#f1f1f1', suave: '#a9a9b2', rodape: '#e9e9ee', logo: '#1d1d21' },
}

const rgba = (hex: string, a: number) => {
    const n = parseInt(hex.slice(1), 16)
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

/** Letra que cabe: a maior que deixa a palavra mais comprida caber na largura (porLetra = largura média de uma letra em "em"). */
const caber = (texto: string, largura: number, max: number, porLetra: number, min = 18) =>
    Math.round(Math.max(min, Math.min(max, largura / Math.max(1, texto.length * porLetra))))

/** A foto ocupa a parte direita do cartão: metade nos cartões largos, mais nos estreitos. */
const larguraFoto = (w: number, h: number) => Math.round(w * (w > h * 1.6 ? 0.5 : 0.6))
/** Largura livre para o nome do dia (sem passar por cima da cara). */
const larguraTexto = (c: Cartao, w: number, h: number, pad: number) => (c.foto ? w - larguraFoto(w, h) * 0.42 - pad * 1.2 : w - pad * 2)
const padDe = (w: number, h: number) => Math.round(Math.min(w, h) * 0.09)

function Foto({ c, w, h, cor }: { c: Cartao; w: number; h: number; cor: string }) {
    if (!c.foto) return null
    const f = c.foto
    // O recorte (pessoa de pé) assenta no fundo, mais para a direita, para não tapar o nome do dia
    const caixa = { width: larguraFoto(w, h), height: h }
    let img: ReactNode
    if (f.recorte && f.w && f.h) {
        const p = enquadrarRecorte(f.w, f.h, caixa, { ...ajustePorOmissao(true), x: w > h * 1.2 ? 0.6 : 0.7, zoom: 0.98 })
        img = <img alt="" src={f.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} />
    } else if (f.w && f.h) {
        const p = enquadrarFoto(f.w, f.h, caixa, ajustePorOmissao(false, f.foco))
        img = <img alt="" src={f.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} />
    } else {
        img = <img alt="" src={f.url} width={caixa.width} height={caixa.height} style={{ position: 'absolute', left: 0, top: 0, objectFit: 'cover' }} />
    }
    return (
        <div style={{ position: 'absolute', right: 0, top: 0, width: caixa.width, height: h, display: 'flex', overflow: 'hidden' }}>
            {img}
            {/* a foto desaparece para o lado do texto */}
            <div style={{ position: 'absolute', left: 0, top: 0, width: caixa.width, height: h, display: 'flex', backgroundImage: `linear-gradient(90deg, ${cor} 0%, ${rgba(cor, f.recorte ? 0 : 0.55)} 35%, ${rgba(cor, 0)} 70%)` }} />
        </div>
    )
}

function CartaoDia({ c, w, h, v, escala, tamDia, marca }: { c: Cartao; w: number; h: number; v: VarianteSemana; escala: number; tamDia: number; marca: string | null }) {
    const k = CORES[v]
    const pad = padDe(w, h)
    const livre = larguraTexto(c, w, h, pad)
    const linhas = c.linhas.slice(0, 2)
    const tamLinha = Math.min(Math.round(26 * escala), ...linhas.map((l) => caber(l.toUpperCase(), w - pad * 2 - 40, 26 * escala, 0.66, 13)))
    return (
        <div style={{ width: w, height: h, borderRadius: Math.round(34 * escala), backgroundColor: k.cartao, display: 'flex', position: 'relative', overflow: 'hidden' }}>
            <Foto c={c} w={w} h={h} cor={k.cartao} />
            {!c.foto && marca && (
                <img alt="" src={marca} width={Math.round(h * 0.9)} height={Math.round(h * 0.9)} style={{ position: 'absolute', right: -Math.round(h * 0.12), top: Math.round(h * 0.05), objectFit: 'contain', opacity: 0.07 }} />
            )}
            <div style={{ position: 'absolute', left: pad, top: 0, height: h, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingBottom: Math.round(h * 0.2) }}>
                <div style={{ display: 'flex', fontFamily: 'Oswald', fontWeight: 700, fontSize: tamDia, lineHeight: 1.1, color: k.dia, textTransform: 'uppercase', letterSpacing: -1, textShadow: `0 4px 28px ${rgba(k.cartao, 0.8)}` }}>{c.nomeDia}</div>
                {c.preletor && (
                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: Math.round(tamDia * 0.06), fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', fontSize: Math.round(19 * escala), lineHeight: 1.15, color: k.suave, maxWidth: livre }}>
                        <span>Na Palavra:</span>
                        <span style={{ color: k.texto }}>{c.preletor}</span>
                    </div>
                )}
            </div>
            {/* cápsulas: evento | horas */}
            <div style={{ position: 'absolute', left: pad, bottom: Math.round(pad * 0.7), display: 'flex', flexDirection: 'column', gap: Math.round(8 * escala), maxWidth: w - pad * 2 }}>
                {linhas.map((l, i) => (
                    <div key={i} style={{ display: 'flex', alignSelf: 'flex-start', border: `${Math.max(2, Math.round(2.5 * escala))}px solid ${rgba(k.texto, 0.9)}`, borderRadius: 999, padding: `${Math.round(6 * escala)}px ${Math.round(18 * escala)}px`, fontFamily: 'Montserrat', fontWeight: 700, fontSize: tamLinha, color: k.texto, textTransform: 'uppercase', whiteSpace: 'nowrap', backgroundColor: rgba(k.cartao, 0.55) }}>{l}</div>
                ))}
            </div>
        </div>
    )
}

function Semana({ cartoes, tamanho, v, titulo, rodape, marca }: { cartoes: Cartao[]; tamanho: TamanhoSemana; v: VarianteSemana; titulo: string; rodape: string; marca: string | null }) {
    const k = CORES[v]
    const { w: W, h: H } = TAMANHOS_SEMANA[tamanho]
    const horizontal = tamanho === 'telao'
    const escala = tamanho === 'story' ? 1.15 : 1
    const margem = horizontal ? 64 : 56
    const gap = horizontal ? 26 : 24
    const altTitulo = horizontal ? 110 : tamanho === 'story' ? 150 : 124
    const altRodape = horizontal ? 96 : tamanho === 'story' ? 170 : 130
    const larguraUtil = W - margem * 2
    const alturaGrelha = H - margem * 2 - altTitulo - altRodape - gap * 2
    const grelha = linhasDaGrelha(cartoes.length, horizontal)
    const altLinha = grelha.length ? Math.floor((alturaGrelha - gap * (grelha.length - 1)) / grelha.length) : 0
    const altPill = Math.round(altTitulo * 0.84)
    const tamTitulo = caber(titulo.toUpperCase(), (horizontal ? 1150 : larguraUtil) - altPill * 0.7, Math.round(altPill * 0.72), 0.56)
    // Onde fica cada cartão, e a letra do dia igual em todos
    let n = 0
    const filas = grelha.map((porLinha) => {
        const largura = Math.floor((larguraUtil - gap * (porLinha - 1)) / porLinha)
        const desta = cartoes.slice(n, n + porLinha); n += porLinha
        const tamDia = Math.round(Math.min(
            altLinha * (horizontal ? 0.34 : 0.46),
            ...desta.map((c) => caber(c.nomeDia.toUpperCase(), larguraTexto(c, largura, altLinha, padDe(largura, altLinha)), 400, 0.5)),
        ))
        return { largura, desta, tamDia, escala: escala * (porLinha > 1 && !horizontal ? 0.82 : 1) }
    })

    return (
        <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', backgroundColor: k.fundo, padding: margem, fontFamily: 'Montserrat' }}>
            <div style={{ display: 'flex', height: altTitulo, alignItems: 'center', justifyContent: horizontal ? 'flex-start' : 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', height: altPill, backgroundColor: k.titulo, borderRadius: Math.round(altPill * 0.32), padding: `0 ${Math.round(altPill * 0.35)}px`, fontFamily: 'Oswald', fontWeight: 700, fontSize: tamTitulo, lineHeight: 1, color: k.tituloTexto, textTransform: 'uppercase', letterSpacing: -1, whiteSpace: 'nowrap' }}>{titulo}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap, marginTop: gap, height: alturaGrelha }}>
                {cartoes.length === 0 && (
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 40, color: k.rodape }}>Sem eventos nesta semana.</div>
                )}
                {filas.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap, height: altLinha }}>
                        {f.desta.map((c) => <CartaoDia key={c.dia} c={c} w={f.largura} h={altLinha} v={v} escala={f.escala} tamDia={f.tamDia} marca={marca} />)}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', height: altRodape, marginTop: gap, alignItems: 'center', gap: 28, color: k.rodape }}>
                {marca && (
                    <div style={{ display: 'flex', width: altRodape * 0.72, height: altRodape * 0.72, borderRadius: altRodape, backgroundColor: k.logo, alignItems: 'center', justifyContent: 'center' }}>
                        <img alt="" src={marca} width={Math.round(altRodape * 0.55)} height={Math.round(altRodape * 0.55)} style={{ objectFit: 'contain' }} />
                    </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', fontSize: Math.round(30 * escala), letterSpacing: 3 }}>
                        <span style={{ fontWeight: 500 }}>IGREJA</span><span style={{ fontWeight: 900, marginLeft: 10 }}>ADMVC</span>
                    </div>
                    {rodape && <div style={{ display: 'flex', fontSize: Math.round(20 * escala), fontWeight: 700, textTransform: 'uppercase', marginTop: 4, opacity: 0.85 }}>{rodape}</div>}
                </div>
                <div style={{ display: 'flex', marginLeft: 'auto', fontSize: Math.round(22 * escala), fontWeight: 700, letterSpacing: 1, opacity: 0.85 }}>igrejaadmvc.org</div>
            </div>
        </div>
    )
}

export async function desenharSemana(o: { cartoes: Cartao[]; tamanho: TamanhoSemana; variante: VarianteSemana; titulo: string; rodape: string }): Promise<ImageResponse> {
    const [fonts, marca] = await Promise.all([carregarFontes(), carregarPomba()])
    const { w, h } = TAMANHOS_SEMANA[o.tamanho]
    return new ImageResponse(<Semana {...o} v={o.variante} marca={marca} />, { width: w, height: h, fonts })
}

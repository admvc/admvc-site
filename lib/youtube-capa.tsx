// A capa da live do YouTube (PNG 1280×720, no máximo 2 MB), por estado e por padrão (a escolha e a edição ficam no kit: lib/youtube-capa-receita.ts):
//   igual        → a arte 16:9 do kit (mesmo estilo, cores, fundo e foto), com o selo do estado (lib/divulgacao-redes.tsx)
//   profundidade → título gigante em Cinzel e o preletor (recorte) à frente da luz        · evento = o mesmo com as cores da categoria
//   centrado     → pomba com luz e título ao centro, sem foto
//   faixa        → faixa escura com o título; o preletor sai dela
//   moldura      → dupla moldura dourada e o preletor num medalhão
//   editorial    → papel claro, letra com serifa e um cartão de foto
// Estados: agendada → cápsula "DOMINGO · 10H00" · direto → cápsula vermelha "EM DIRETO · AGORA" · arquivo → a data · reserva → "Culto em direto".
// Para o satori: cada div com mais de um filho tem display flex.
import { ImageResponse } from 'next/og'
import type { CSSProperties, ReactElement, ReactNode } from 'react'
import { carregarFontes, carregarPomba, fotoPermitida, lerFundo, reduzido, rgba } from '@/lib/divulgacao-imagem'
import { desenharRede } from '@/lib/divulgacao-redes'
import { ajustePorOmissao, enquadrarFoto, enquadrarRecorte, type Caixa } from '@/lib/divulgacao-enquadrar'
import { palavrasDoTitulo } from '@/lib/divulgacao-titulo'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { PALETAS_CAPA, capaEmBytes, type DadosCapa, type EstadoCapa, type PaletaCapa } from '@/lib/youtube-capa-dados'

export const LARGURA_CAPA = 1280, ALTURA_CAPA = 720
const W = LARGURA_CAPA, H = ALTURA_CAPA
type C = PaletaCapa
type Foto = NonNullable<DadosCapa['foto']>

/** Letras do título: sem destaque marcado, a segunda metade das palavras fica em destaque (como nas capas aprovadas). */
function linhasDoTitulo(texto: string) {
    const linhas = palavrasDoTitulo(texto)
    const todas = linhas.flat()
    if (todas.length >= 2 && !todas.some((p) => p.destaque)) {
        const de = Math.ceil(todas.length / 2)
        let i = 0
        for (const l of linhas) for (const p of l) { if (i++ >= de) p.destaque = true }
    }
    return linhas
}

/** Quantas linhas ocupa o título com esse tamanho (as palavras passam à linha de baixo quando não cabem; `|` também muda de linha). */
function linhasOcupadas(texto: string, tam: number, largura: number, peso: number): number {
    let n = 0
    for (const parte of texto.replace(/\*/g, '').split('|')) {
        const palavras = parte.split(/\s+/).filter(Boolean)
        if (!palavras.length) continue
        let atual = 0; n++
        for (const w of palavras) {
            const larg = w.length * peso * tam
            if (atual > 0 && atual + tam * 0.25 + larg > largura) { n++; atual = larg } else atual += (atual > 0 ? tam * 0.25 : 0) + larg
        }
    }
    return n
}

/** O maior tamanho de letra com que o título cabe na caixa (`peso` = o que cada letra ocupa, em em: Cinzel em maiúsculas ~0.84, Anton ~0.56, serifa ~0.6). */
function tamanhoTitulo(texto: string, largura: number, altura: number, max: number, min = 44, peso = 0.84, linha = 1.0): number {
    const maior = Math.max(...texto.replace(/[*|]/g, ' ').split(/\s+/).map((w) => w.length), 1)
    for (let t = Math.min(max, Math.floor(largura / (maior * peso))); t > min; t -= 2) {
        if (linhasOcupadas(texto, t, largura, peso) * t * linha <= altura) return t
    }
    return min
}

const Cinzel = { fontFamily: 'Cinzel', fontWeight: 700, textTransform: 'uppercase' } as const
const Anton = { fontFamily: 'Anton', fontWeight: 400, textTransform: 'uppercase', letterSpacing: 2 } as const
const Serifa = { fontFamily: 'DMSerif', fontWeight: 400 } as const

function Titulo({ texto, tam, largura, cor, acento, centro, fonte = Cinzel, italico, linha = 0.98 }: {
    texto: string; tam: number; largura: number; cor: string; acento: string; centro?: boolean; fonte?: CSSProperties; italico?: boolean; linha?: number
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: largura, alignItems: centro ? 'center' : 'flex-start' }}>
            {linhasDoTitulo(texto).map((l, i) => (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: centro ? 'center' : 'flex-start', width: largura, ...fonte, fontSize: tam, lineHeight: linha, color: cor }}>
                    {l.map((p, j) => <span key={j} style={{ marginRight: Math.round(tam * 0.25), color: p.destaque ? acento : cor, ...(p.destaque && italico ? { fontStyle: 'italic' as const } : {}) }}>{p.t}</span>)}
                </div>
            ))}
        </div>
    )
}

function Marca({ pomba, cor, alto = 38, fundoEscuro }: { pomba: string | null; cor: string; alto?: number; fundoEscuro?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {pomba && (fundoEscuro
                ? <div style={{ display: 'flex', width: alto + 14, height: alto + 14, borderRadius: alto, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><img alt="" src={pomba} width={alto - 8} height={alto - 8} style={{ objectFit: 'contain' }} /></div>
                : <img alt="" src={pomba} width={alto} height={alto} style={{ objectFit: 'contain', marginRight: 12 }} />)}
            <div style={{ display: 'flex', ...Cinzel, fontSize: 22, letterSpacing: 5, color: cor }}>ADMVC</div>
        </div>
    )
}

function Capsula({ estado, rodape, c }: { estado: EstadoCapa; rodape: string; c: C }) {
    if (estado === 'direto') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#D32F2F', color: '#fff', padding: '15px 26px', borderRadius: 4, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 28, letterSpacing: 4 }}>
                <div style={{ display: 'flex', width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', marginRight: 14 }} />
                <div style={{ display: 'flex' }}>EM DIRETO · AGORA</div>
            </div>
        )
    }
    if (estado === 'arquivo') {
        return (
            <div style={{ display: 'flex', border: `3px solid ${c.acento}`, color: c.acento, padding: '12px 26px', borderRadius: 4, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 28, letterSpacing: 4 }}>{rodape}</div>
        )
    }
    return (
        <div style={{ display: 'flex', backgroundColor: c.acento, color: c.sobreAcento, padding: '15px 28px', borderRadius: 4, fontFamily: 'Montserrat', fontWeight: 900, fontSize: 28, letterSpacing: 3 }}>{rodape}</div>
    )
}

/** O rodapé: a cápsula do estado e o preletor; na reserva, só o nome da igreja. */
function Rodape({ d, c, centro }: { d: DadosCapa; c: C; centro?: boolean }) {
    if (d.estado === 'reserva') {
        return <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, letterSpacing: 6, color: c.acento, textTransform: 'uppercase' }}>Assembleia de Deus · Ministério Visão de Conquista</div>
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: centro ? 'center' : 'flex-start' }}>
            <Capsula estado={d.estado} rodape={d.rodape} c={c} />
            {d.preletor && <div style={{ display: 'flex', marginLeft: 22, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28, color: c.texto, opacity: 0.92 }}>{d.preletor}</div>}
        </div>
    )
}

function Fundo({ c, luzX, luzY, imagem }: { c: C; luzX: number; luzY: number; imagem: string | null }) {
    return (
        <>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundColor: c.fundo }} />
            {imagem
                ? (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" src={imagem} width={W} height={H} style={{ objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundColor: rgba(c.fundo, 0.6) }} />
                    </div>
                )
                : <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at ${luzX}% ${luzY}%, ${c.luz} 0%, ${rgba(c.luz, 0)} 52%), radial-gradient(circle at 0% 100%, ${c.sombra} 0%, ${rgba(c.sombra, 0)} 55%)` }} />}
        </>
    )
}

/** A foto do preletor dentro de uma caixa (sem a posicionar): recorte de pé assente no fundo, ou foto cortada à medida. */
function fotoNaCaixa(f: Foto, caixa: Pick<Caixa, 'width' | 'height'>, ajusteFoto = 0.3): ReactElement {
    if (f.recorte) { const p = enquadrarRecorte(f.w, f.h, caixa, ajustePorOmissao(true)); return <img alt="" src={f.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} /> }
    const p = enquadrarFoto(f.w, f.h, caixa, ajustePorOmissao(false, `50% ${Math.round(ajusteFoto * 100)}%`))
    return <img alt="" src={f.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} />
}

type Props = { d: DadosCapa; c: C; pomba: string | null; fundoImg: string | null; foto: Foto | null; lado: 'esquerda' | 'direita' }
const raiz = (c: C): CSSProperties => ({ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: c.fundo, color: c.texto })

// ---- reserva (profundidade, centrado, evento): selo com a pomba e "Culto em direto" ----------------------------------------------------
function Reserva({ c, pomba, fundoImg }: Pick<Props, 'c' | 'pomba' | 'fundoImg'>) {
    return (
        <div style={raiz(c)}>
            <Fundo c={c} luzX={50} luzY={45} imagem={fundoImg} />
            {pomba && <img alt="" src={pomba} width={880} height={880} style={{ position: 'absolute', left: -120, top: -60, objectFit: 'contain', opacity: 0.06 }} />}
            <div style={{ position: 'absolute', left: 490, top: 70, width: 300, height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 150, border: `3px solid ${c.acento}` }}>
                <div style={{ display: 'flex', width: 262, height: 262, alignItems: 'center', justifyContent: 'center', borderRadius: 131, border: `1px solid ${rgba(c.acento, 0.45)}` }}>
                    {pomba && <img alt="" src={pomba} width={120} height={120} style={{ objectFit: 'contain' }} />}
                </div>
            </div>
            <div style={{ position: 'absolute', left: 0, top: 430, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', ...Cinzel, fontSize: 88, lineHeight: 1 }}>
                    <span style={{ marginRight: 22 }}>Culto</span><span style={{ color: c.acento }}>em direto</span>
                </div>
                <div style={{ display: 'flex', marginTop: 24, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, letterSpacing: 7, color: c.acento, textTransform: 'uppercase' }}>Assembleia de Deus · Ministério Visão de Conquista</div>
            </div>
        </div>
    )
}

// ---- centrado: pomba com luz, título ao centro --------------------------------------------------------------------------------------------
function Centrado({ d, c, pomba, fundoImg }: Props) {
    const tam = tamanhoTitulo(d.titulo, 1000, 230, 100, 52)
    return (
        <div style={raiz(c)}>
            <Fundo c={c} luzX={50} luzY={8} imagem={fundoImg} />
            <div style={{ position: 'absolute', left: 490, top: 60, width: 300, height: 300, display: 'flex', backgroundImage: `radial-gradient(circle, ${rgba(c.acento, 0.4)} 0%, ${rgba(c.acento, 0)} 65%)` }} />
            {pomba && <img alt="" src={pomba} width={130} height={130} style={{ position: 'absolute', left: 575, top: 62, objectFit: 'contain' }} />}
            <div style={{ position: 'absolute', left: 140, top: 230, width: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {d.culto && <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, letterSpacing: 9, color: c.acento, textTransform: 'uppercase', marginBottom: 20 }}>{d.culto}</div>}
                <Titulo texto={d.titulo} tam={tam} largura={1000} cor={c.texto} acento={c.acento} centro />
            </div>
            <div style={{ position: 'absolute', left: 0, bottom: 52, width: W, display: 'flex', justifyContent: 'center' }}><Rodape d={d} c={c} centro /></div>
            <div style={{ position: 'absolute', left: 54, top: 40, display: 'flex' }}><Marca pomba={null} cor={c.texto} /></div>
        </div>
    )
}

// ---- profundidade (e evento): o título de um lado, o preletor do outro, à frente do círculo de luz -----------------------------------------
function Profundidade(p: Props) {
    const { d, c, pomba, fundoImg, foto, lado } = p
    if (!foto) return <Centrado {...p} />
    const dir = lado === 'direita'
    const caixa = { width: 640, height: H }
    const esq = dir ? 54 : 690
    const tam = tamanhoTitulo(d.titulo, 600, 360, 118, 48)
    return (
        <div style={raiz(c)}>
            <Fundo c={c} luzX={dir ? 76 : 24} luzY={44} imagem={fundoImg} />
            <div style={{ position: 'absolute', left: dir ? 640 : -120, top: -120, width: 760, height: 760, display: 'flex', borderRadius: 380, border: `2px solid ${rgba(c.acento, 0.35)}` }} />
            <div style={{ position: 'absolute', left: dir ? 640 : 0, top: 0, width: 640, height: H, display: 'flex', overflow: 'hidden' }}>
                {fotoNaCaixa(foto, caixa)}
                {!foto.recorte && <div style={{ position: 'absolute', left: 0, top: 0, width: 640, height: H, display: 'flex', backgroundImage: `linear-gradient(${dir ? 90 : 270}deg, ${c.fundo} 0%, ${rgba(c.fundo, 0)} 45%)` }} />}
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: 640, height: 150, display: 'flex', backgroundImage: `linear-gradient(0deg, ${rgba(c.sombra, 0.9)} 0%, ${rgba(c.sombra, 0)} 100%)` }} />
            </div>
            <div style={{ position: 'absolute', left: esq, top: 40, display: 'flex' }}><Marca pomba={pomba} cor={c.texto} /></div>
            {d.culto && <div style={{ position: 'absolute', left: esq, top: 92, display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, letterSpacing: 5, color: c.acento, textTransform: 'uppercase' }}>{d.culto}</div>}
            <div style={{ position: 'absolute', left: esq - 6, top: 140, width: 600, display: 'flex' }}>
                <Titulo texto={d.titulo} tam={tam} largura={600} cor={c.texto} acento={c.acento} />
            </div>
            <div style={{ position: 'absolute', left: esq, bottom: 46, display: 'flex' }}><Rodape d={d} c={c} /></div>
        </div>
    )
}

// ---- faixa: uma faixa escura com o título e o preletor a sair dela ----------------------------------------------------------------------------
function Faixa({ d, c, pomba, fundoImg, foto, lado }: Props) {
    const dir = lado === 'direita'
    const caixa = { width: 560, height: H }
    const esq = foto ? (dir ? 54 : 640) : 54
    const larg = foto ? 590 : 1170
    const tam = tamanhoTitulo(d.titulo, larg, 196, 150, 54, 0.56, 1.02)
    return (
        <div style={raiz(c)}>
            <Fundo c={c} luzX={dir ? 20 : 80} luzY={30} imagem={fundoImg} />
            <div style={{ position: 'absolute', left: 0, top: 236, width: W, height: 238, display: 'flex', backgroundColor: rgba(c.sombra, 0.82), borderTop: `6px solid ${c.acento}`, borderBottom: `6px solid ${c.acento}` }} />
            {foto && (
                <div style={{ position: 'absolute', left: dir ? 720 : 0, top: 0, width: 560, height: H, display: 'flex', overflow: 'hidden' }}>
                    {fotoNaCaixa(foto, caixa)}
                    {!foto.recorte && <div style={{ position: 'absolute', left: 0, top: 0, width: 560, height: H, display: 'flex', backgroundImage: `linear-gradient(${dir ? 90 : 270}deg, ${c.fundo} 0%, ${rgba(c.fundo, 0)} 40%)` }} />}
                </div>
            )}
            <div style={{ position: 'absolute', left: esq, top: 40, display: 'flex' }}><Marca pomba={pomba} cor={c.texto} /></div>
            {d.culto && <div style={{ position: 'absolute', left: esq, top: 168, display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, letterSpacing: 7, color: c.acento, textTransform: 'uppercase' }}>{d.culto}</div>}
            <div style={{ position: 'absolute', left: esq, top: 248, width: larg, height: 214, display: 'flex', alignItems: 'center' }}>
                <Titulo texto={d.titulo} tam={tam} largura={larg} cor={c.texto} acento={c.acento} fonte={Anton} linha={1.02} />
            </div>
            <div style={{ position: 'absolute', left: esq, top: 520, display: 'flex' }}><Rodape d={d} c={c} /></div>
        </div>
    )
}

// ---- moldura dourada: dupla moldura, medalhão com o preletor --------------------------------------------------------------------------------
function Moldura({ d, c, pomba, fundoImg, foto }: Props) {
    const tam = tamanhoTitulo(d.titulo, 880, 200, 84, 44)
    const medalhao = 190
    return (
        <div style={raiz(c)}>
            <Fundo c={c} luzX={50} luzY={30} imagem={fundoImg} />
            <div style={{ position: 'absolute', left: 22, top: 22, width: W - 44, height: H - 44, display: 'flex', border: `3px solid ${c.acento}` }} />
            <div style={{ position: 'absolute', left: 38, top: 38, width: W - 76, height: H - 76, display: 'flex', border: `1px solid ${rgba(c.acento, 0.55)}` }} />
            <div style={{ position: 'absolute', left: (W - medalhao) / 2, top: 62, width: medalhao, height: medalhao, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: medalhao / 2, border: `3px solid ${c.acento}`, overflow: 'hidden', backgroundColor: rgba(c.luz, 0.9) }}>
                {foto
                    ? <div style={{ position: 'absolute', left: 0, top: 0, width: medalhao, height: medalhao, display: 'flex', overflow: 'hidden' }}>{fotoNaCaixa(foto, { width: medalhao, height: medalhao }, 0.25)}</div>
                    : pomba && <img alt="" src={pomba} width={110} height={110} style={{ objectFit: 'contain' }} />}
            </div>
            <div style={{ position: 'absolute', left: 0, top: 276, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {d.culto && <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, letterSpacing: 8, color: c.acento, textTransform: 'uppercase', marginBottom: 14 }}>{d.culto}</div>}
                <Titulo texto={d.titulo} tam={tam} largura={880} cor={c.texto} acento={c.acento} centro />
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
                    <div style={{ display: 'flex', width: 90, height: 2, backgroundColor: c.acento }} />
                    <div style={{ display: 'flex', width: 12, height: 12, margin: '0 14px', backgroundColor: c.acento, transform: 'rotate(45deg)' }} />
                    <div style={{ display: 'flex', width: 90, height: 2, backgroundColor: c.acento }} />
                </div>
            </div>
            <div style={{ position: 'absolute', left: 0, bottom: 66, width: W, display: 'flex', justifyContent: 'center' }}><Rodape d={d} c={c} centro /></div>
        </div>
    )
}

// ---- editorial claro: papel, letra com serifa, cartão de foto ---------------------------------------------------------------------------------
function Editorial({ d, c, pomba, fundoImg, foto, lado }: Props) {
    const dir = lado === 'direita'
    const carta = { left: dir ? 800 : 70, top: 60, width: 410, height: 600 }
    const esq = foto ? (dir ? 70 : 540) : 70
    const larg = foto ? 650 : 1100
    const tam = tamanhoTitulo(d.titulo, larg, 300, 130, 50, 0.58)
    return (
        <div style={raiz(c)}>
            {fundoImg
                ? (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img alt="" src={fundoImg} width={W} height={H} style={{ objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundColor: rgba(c.fundo, 0.8) }} />
                    </div>
                )
                : <div style={{ position: 'absolute', left: dir ? 560 : -300, top: -160, width: 900, height: 900, display: 'flex', borderRadius: 450, backgroundColor: rgba(c.luz, 0.55) }} />}
            {foto && (
                <>
                    <div style={{ position: 'absolute', left: carta.left + 16, top: carta.top + 16, width: carta.width, height: carta.height, display: 'flex', backgroundColor: c.sombra }} />
                    <div style={{ position: 'absolute', left: carta.left, top: carta.top, width: carta.width, height: carta.height, display: 'flex', overflow: 'hidden', backgroundColor: c.luz, border: `4px solid ${c.fundo}` }}>
                        {fotoNaCaixa(foto, { width: carta.width, height: carta.height })}
                    </div>
                </>
            )}
            <div style={{ position: 'absolute', left: esq, top: 48, display: 'flex' }}><Marca pomba={pomba} cor={c.texto} fundoEscuro /></div>
            <div style={{ position: 'absolute', left: esq, top: 140, width: larg, display: 'flex', flexDirection: 'column' }}>
                {d.culto && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
                        <div style={{ display: 'flex', width: 46, height: 4, backgroundColor: c.acento, marginRight: 14 }} />
                        <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 18, letterSpacing: 6, color: c.acento, textTransform: 'uppercase' }}>{d.culto}</div>
                    </div>
                )}
                <Titulo texto={d.titulo} tam={tam} largura={larg} cor={c.texto} acento={c.acento} fonte={{ ...Serifa, textTransform: 'none' }} italico linha={1.0} />
                <div style={{ display: 'flex', width: 90, height: 4, backgroundColor: c.texto, marginTop: 22 }} />
            </div>
            <div style={{ position: 'absolute', left: esq, bottom: 50, display: 'flex' }}>
                {d.estado === 'reserva'
                    ? <Rodape d={d} c={c} />
                    : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Capsula estado={d.estado} rodape={d.rodape} c={c} />
                            {d.preletor && <div style={{ display: 'flex', marginLeft: 22, ...Serifa, fontStyle: 'italic', fontSize: 34, color: c.texto }}>{d.preletor}</div>}
                        </div>
                    )}
            </div>
        </div>
    )
}

function Capa({ d, pomba, fundoImg }: { d: DadosCapa; pomba: string | null; fundoImg: string | null }) {
    // sem tema, o título já é o nome do culto: não o repete na linha pequena
    const dd: DadosCapa = { ...d, culto: d.culto.trim().toLowerCase() === d.titulo.replace(/[*|]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() ? '' : d.culto }
    const padrao = d.padrao ?? 'profundidade'
    const c = d.cores ?? PALETAS_CAPA[d.categoria]
    const foto = dd.foto && dd.foto.w > 0 && dd.foto.h > 0 ? dd.foto : null
    const p: Props = { d: dd, c, pomba, fundoImg, foto, lado: d.fotoLado ?? 'direita' }
    const comSeloDeReserva = d.estado === 'reserva' && (padrao === 'profundidade' || padrao === 'centrado' || padrao === 'evento' || padrao === 'igual')
    if (comSeloDeReserva) return <Reserva c={c} pomba={pomba} fundoImg={fundoImg} />
    switch (padrao) {
        case 'centrado': return <Centrado {...p} />
        case 'faixa': return <Faixa {...p} />
        case 'moldura': return <Moldura {...p} />
        case 'editorial': return <Editorial {...p} />
        default: return <Profundidade {...p} />
    }
}

/** Desenha a capa (`escala` < 1: versão pequena para as miniaturas, desenhada já em ponto pequeno). */
export async function desenharCapaLive(d: DadosCapa, escala = 1): Promise<ImageResponse> {
    // "igual às artes do culto": é a arte 16:9 do kit, desenhada pelas artes das redes (com o selo do estado)
    if (d.padrao === 'igual' && d.igual) return desenharRede(new URLSearchParams(d.igual), escala)
    const [fonts, pomba] = await Promise.all([carregarFontes(), carregarPomba()])
    // só fotos do nosso Blob público (em ensaio, com o YouTube simulado, também uma foto do próprio computador)
    const permitida = (u: string) => !!fotoPermitida(u) || (simuladoAtivo() && /^http:\/\/localhost:\d+\//.test(u))
    const foto = d.foto && permitida(d.foto.url) ? d.foto : null
    const fundoImg = d.fundo ? await lerFundo(d.fundo) : null
    const el: ReactNode = <Capa d={{ ...d, foto }} pomba={pomba} fundoImg={fundoImg} />
    const e = foto || fundoImg ? 1 : escala   // com imagens, em tamanho real (o satori não as encolhe bem); a prévia reduz depois
    return new ImageResponse(reduzido(el as ReactElement, W, H, e), { width: Math.round(W * e), height: Math.round(H * e), fonts })
}

/** O PNG da capa em bytes (≤ 2 MB; ver capaEmBytes). */
export const capaLive = (d: DadosCapa) => capaEmBytes(d, (x) => desenharCapaLive(x))

// A capa da live do YouTube (PNG 1280×720, no máximo 2 MB) por estado, no estilo da ronda 2 aprovada ("Profundidade"):
// título gigante em Cinzel com o resto em dourado, o preletor (recorte) à frente, rodapé que muda com o estado.
//   agendada → cápsula "DOMINGO · 10H00" · direto → cápsula vermelha "EM DIRETO · AGORA" · arquivo → a data · reserva → "Culto em direto".
// Sem foto do preletor usa o desenho centrado (pomba com luz). Para o satori: cada div com mais de um filho tem display flex.
import { ImageResponse } from 'next/og'
import { carregarFontes, carregarPomba, fotoPermitida, rgba } from '@/lib/divulgacao-imagem'
import { ajustePorOmissao, enquadrarFoto, enquadrarRecorte } from '@/lib/divulgacao-enquadrar'
import { palavrasDoTitulo } from '@/lib/divulgacao-titulo'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { PALETAS_CAPA, capaEmBytes, type DadosCapa, type EstadoCapa } from '@/lib/youtube-capa-dados'

export const LARGURA_CAPA = 1280, ALTURA_CAPA = 720

/** Letras do título: sem destaque marcado, a segunda metade das palavras fica a dourado (como nas capas aprovadas). */
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

/** Tamanho do título para caber (Cinzel em maiúsculas pesa ~0.82 em por letra). */
function tamanhoTitulo(texto: string, largura: number, altura: number, max: number, min = 44): number {
    const limpo = texto.replace(/[*|]/g, ' ')
    const letras = Math.max(1, limpo.replace(/\s/g, '').length)
    const maior = Math.max(...limpo.split(/\s+/).map((w) => w.length), 1)
    const pelaArea = Math.sqrt((largura * altura) / (letras * 0.9 * 1.04))
    return Math.round(Math.max(min, Math.min(max, largura / (maior * 0.84), pelaArea)))
}

const Cinzel = { fontFamily: 'Cinzel', fontWeight: 700, textTransform: 'uppercase' } as const

function Titulo({ texto, tam, largura, cor, acento, centro }: { texto: string; tam: number; largura: number; cor: string; acento: string; centro?: boolean }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: largura, alignItems: centro ? 'center' : 'flex-start' }}>
            {linhasDoTitulo(texto).map((linha, i) => (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: centro ? 'center' : 'flex-start', width: largura, ...Cinzel, fontSize: tam, lineHeight: 0.98, color: cor }}>
                    {linha.map((p, j) => <span key={j} style={{ marginRight: Math.round(tam * 0.25), color: p.destaque ? acento : cor }}>{p.t}</span>)}
                </div>
            ))}
        </div>
    )
}

function Marca({ pomba, cor, alto = 38 }: { pomba: string | null; cor: string; alto?: number }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {pomba && <img alt="" src={pomba} width={alto} height={alto} style={{ objectFit: 'contain', marginRight: 12 }} />}
            <div style={{ display: 'flex', ...Cinzel, fontSize: 22, letterSpacing: 5, color: cor }}>ADMVC</div>
        </div>
    )
}

function Capsula({ estado, rodape, c }: { estado: EstadoCapa; rodape: string; c: (typeof PALETAS_CAPA)['regular'] }) {
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

function Fundo({ c, luzX, luzY }: { c: (typeof PALETAS_CAPA)['regular']; luzX: number; luzY: number }) {
    return (
        <>
            <div style={{ position: 'absolute', left: 0, top: 0, width: LARGURA_CAPA, height: ALTURA_CAPA, display: 'flex', backgroundColor: c.fundo }} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: LARGURA_CAPA, height: ALTURA_CAPA, display: 'flex', backgroundImage: `radial-gradient(circle at ${luzX}% ${luzY}%, ${c.luz} 0%, ${rgba(c.luz, 0)} 52%), radial-gradient(circle at 0% 100%, ${c.sombra} 0%, ${rgba(c.sombra, 0)} 55%)` }} />
        </>
    )
}

function Capa({ d: dados, pomba }: { d: DadosCapa; pomba: string | null }) {
    // sem tema, o título já é o nome do culto: não o repete na linha pequena
    const d = { ...dados, culto: dados.culto.trim().toLowerCase() === dados.titulo.replace(/[*|]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase() ? '' : dados.culto }
    const c = PALETAS_CAPA[d.categoria]
    const W = LARGURA_CAPA, H = ALTURA_CAPA

    // Reserva: nada preenchido — selo e "Culto em direto", nunca o fotograma do YouTube
    if (d.estado === 'reserva') {
        return (
            <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: c.fundo, color: c.texto }}>
                <Fundo c={c} luzX={50} luzY={45} />
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

    const caixa = { width: 640, height: H }
    const foto = d.foto && d.foto.w > 0 && d.foto.h > 0 ? d.foto : null

    // Sem foto: desenho centrado (pomba com luz) — o título ocupa a largura toda
    if (!foto) {
        const tam = tamanhoTitulo(d.titulo, 1000, 230, 100, 52)
        return (
            <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: c.fundo, color: c.texto }}>
                <Fundo c={c} luzX={50} luzY={8} />
                <div style={{ position: 'absolute', left: 490, top: 60, width: 300, height: 300, display: 'flex', backgroundImage: `radial-gradient(circle, ${rgba(c.acento, 0.4)} 0%, ${rgba(c.acento, 0)} 65%)` }} />
                {pomba && <img alt="" src={pomba} width={130} height={130} style={{ position: 'absolute', left: 575, top: 62, objectFit: 'contain' }} />}
                <div style={{ position: 'absolute', left: 140, top: 230, width: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {d.culto && <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, letterSpacing: 9, color: c.acento, textTransform: 'uppercase', marginBottom: 20 }}>{d.culto}</div>}
                    <Titulo texto={d.titulo} tam={tam} largura={1000} cor={c.texto} acento={c.acento} centro />
                </div>
                <div style={{ position: 'absolute', left: 0, bottom: 52, width: W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Capsula estado={d.estado} rodape={d.rodape} c={c} />
                    {d.preletor && <div style={{ display: 'flex', marginLeft: 22, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28, opacity: 0.92 }}>{d.preletor}</div>}
                </div>
                <div style={{ position: 'absolute', left: 54, top: 40, display: 'flex' }}><Marca pomba={null} cor={c.texto} /></div>
            </div>
        )
    }

    // Com foto: o título à esquerda, o preletor à direita, à frente do círculo de luz
    const fotoImg = foto.recorte
        ? (() => { const p = enquadrarRecorte(foto.w, foto.h, caixa, ajustePorOmissao(true)); return <img alt="" src={foto.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} /> })()
        : (() => { const p = enquadrarFoto(foto.w, foto.h, caixa, ajustePorOmissao(false)); return <img alt="" src={foto.url} width={p.width} height={p.height} style={{ position: 'absolute', left: p.left, top: p.top }} /> })()
    const tam = tamanhoTitulo(d.titulo, 630, 360, 118, 48)
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: c.fundo, color: c.texto }}>
            <Fundo c={c} luzX={76} luzY={44} />
            <div style={{ position: 'absolute', left: 640, top: -120, width: 760, height: 760, display: 'flex', borderRadius: 380, border: `2px solid ${rgba(c.acento, 0.35)}` }} />
            <div style={{ position: 'absolute', left: 640, top: 0, width: 640, height: H, display: 'flex', overflow: 'hidden' }}>
                {fotoImg}
                {!foto.recorte && <div style={{ position: 'absolute', left: 0, top: 0, width: 640, height: H, display: 'flex', backgroundImage: `linear-gradient(90deg, ${c.fundo} 0%, ${rgba(c.fundo, 0)} 45%)` }} />}
                <div style={{ position: 'absolute', left: 0, bottom: 0, width: 640, height: 150, display: 'flex', backgroundImage: `linear-gradient(0deg, ${rgba(c.sombra, 0.9)} 0%, ${rgba(c.sombra, 0)} 100%)` }} />
            </div>
            <div style={{ position: 'absolute', left: 54, top: 40, display: 'flex' }}><Marca pomba={pomba} cor={c.texto} /></div>
            {d.culto && <div style={{ position: 'absolute', left: 54, top: 92, display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, letterSpacing: 5, color: c.acento, textTransform: 'uppercase' }}>{d.culto}</div>}
            <div style={{ position: 'absolute', left: 48, top: 140, width: 630, display: 'flex' }}>
                <Titulo texto={d.titulo} tam={tam} largura={630} cor={c.texto} acento={c.acento} />
            </div>
            <div style={{ position: 'absolute', left: 54, bottom: 46, display: 'flex', alignItems: 'center' }}>
                <Capsula estado={d.estado} rodape={d.rodape} c={c} />
                {d.preletor && <div style={{ display: 'flex', marginLeft: 22, fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28, opacity: 0.92 }}>{d.preletor}</div>}
            </div>
        </div>
    )
}

export async function desenharCapaLive(d: DadosCapa): Promise<ImageResponse> {
    const [fonts, pomba] = await Promise.all([carregarFontes(), carregarPomba()])
    // só fotos do nosso Blob público (em ensaio, com o YouTube simulado, também uma foto do próprio computador)
    const permitida = (u: string) => !!fotoPermitida(u) || (simuladoAtivo() && /^http:\/\/localhost:\d+\//.test(u))
    const foto = d.foto && permitida(d.foto.url) ? d.foto : null
    return new ImageResponse(<Capa d={{ ...d, foto }} pomba={pomba} />, { width: LARGURA_CAPA, height: ALTURA_CAPA, fonts })
}

/** O PNG da capa em bytes (≤ 2 MB; ver capaEmBytes). */
export const capaLive = (d: DadosCapa) => capaEmBytes(d, desenharCapaLive)

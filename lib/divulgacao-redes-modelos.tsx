// Os estilos novos das artes das redes (capa da live 16:9, post 4:5, story 9:16), além do clássico (lib/divulgacao-redes.tsx):
//  · arcos       — escuro com faixas curvas na cor de destaque, o dia em letras enormes, tema com a parte em *destaque* a cor
//  · arco-claro  — fundo claro com o dia gigante e quase invisível por trás, título alto e estreito, foto num cartão em arco
//  · elegante    — foto a escurecer para a cor de fundo, nome do culto em letra fina, título com a parte em *destaque* em itálico
//  · faixas      — fundo escuro com faixas diagonais de cor (Anton), a foto em cima e o título em letras altas
//  · moldura     — dupla moldura dourada e a foto num medalhão redondo, título em Cinzel com um adorno
//  · horizonte   — um sol a nascer no horizonte, o pregador em frente, título centrado em letras largas
//  · editorial   — papel claro, cartão de foto com sombra de cor, título em serifa grande, estilo revista
// Para o satori: cada div com mais de um filho tem display flex; nada de textShadow indefinido.
import type { CSSProperties, ReactNode } from 'react'
import type { Paleta, RedeId } from '@/lib/divulgacao'
import { rgba } from '@/lib/divulgacao-imagem'
import type { Caixa } from '@/lib/divulgacao-enquadrar'
import { palavrasDoTitulo } from '@/lib/divulgacao-titulo'

export type DadosModelo = {
    grande: string         // o texto principal (o tema da mensagem, senão o título); *assim* fica em destaque; | muda de linha
    pequeno: string        // a linha pequena (o nome do culto, se o principal for o tema; senão o subtítulo)
    quando: string         // "Quarta, 21 out"
    hora: string           // "20h00"
    preletor: string
    livre: string          // texto livre a mais (vazio = sem)
    livreTam: string       // p | m | g
}

type Props = { modelo: string; formato: RedeId; W: number; H: number; p: Paleta; d: DadosModelo; marca: string | null; letras: string; letrasEscuras: string; foto: ReactNode | null; caixa: Caixa }

/** Tamanho de letra para o texto caber numa área (largura × altura), dado o "peso" médio de cada letra (em em). */
function caber(texto: string, largura: number, altura: number, peso: number, min: number, max: number, linhaAlt = 1.08): number {
    const letras = Math.max(1, texto.replace(/[*|]/g, '').length)
    const maiorPalavra = Math.max(...texto.replace(/[*|]/g, ' ').split(/\s+/).map((w) => w.length), 1)
    const pelaArea = Math.sqrt((largura * altura) / (letras * peso * linhaAlt))
    const pelaPalavra = largura / (maiorPalavra * peso)
    return Math.round(Math.max(min, Math.min(max, pelaArea, pelaPalavra)))
}

function Titulo({ texto, tam, cor, destaque, largura, centro, estilo, espaco, linhaAlt = 1.06 }: {
    texto: string; tam: number; cor: string; destaque: CSSProperties; largura: number; centro?: boolean; estilo: CSSProperties; espaco?: number; linhaAlt?: number
}) {
    const linhas = palavrasDoTitulo(texto)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: largura, alignItems: centro ? 'center' : 'flex-start' }}>
            {linhas.map((linha, i) => (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: centro ? 'center' : 'flex-start', width: largura, ...estilo, fontSize: tam, lineHeight: linhaAlt, color: cor }}>
                    {linha.map((w, j) => (
                        <span key={j} style={{ marginRight: Math.round(tam * (espaco ?? 0.26)), ...(w.destaque ? destaque : {}) }}>{w.t}</span>
                    ))}
                </div>
            ))}
        </div>
    )
}

// "Quarta, 21 out" → QUARTA / 21 OUT; escrito à mão sem vírgula ("Sábado 14 nov") também funciona
const parteDia = (q: string) => (q.includes(',') ? q.split(',')[0] : q.split(/\s+/)[0]).trim()
const parteData = (q: string) => (q.includes(',') ? q.split(',').slice(1).join(',') : q.split(/\s+/).slice(1).join(' ')).trim()
const diaGrande = (quando: string) => parteDia(quando).toUpperCase()
const dataCurta = (quando: string) => parteData(quando).toUpperCase()
const horaGrande = (hora: string) => hora.toUpperCase()

/** O texto livre das redes: tamanho p/m/g e encolhe se for comprido; `estilo` dá a letra e a cor, `box` a caixa. */
export function TextoLivre({ texto, tam, base, largura, centro, estilo, box }: { texto: string; tam: string; base: number; largura: number; centro?: boolean; estilo: CSSProperties; box?: CSSProperties }) {
    if (!texto) return null
    const mult = tam === 'p' ? 0.78 : tam === 'g' ? 1.3 : 1
    const fs = Math.round(base * mult * (texto.length > 80 ? 0.82 : texto.length > 50 ? 0.92 : 1))
    return (
        <div style={{ display: 'flex', maxWidth: largura, ...box }}>
            <div style={{ display: 'flex', textAlign: centro ? 'center' : 'left', fontSize: fs, ...estilo }}>{texto}</div>
        </div>
    )
}

function Logo({ marca, letras, alto, escuro }: { marca: string | null; letras: string; alto: number; escuro?: boolean }) {
    // a pomba é branca: em fundo claro vai dentro de um círculo escuro
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            {marca && (escuro
                ? <div style={{ display: 'flex', width: alto * 1.5, height: alto * 1.5, borderRadius: alto, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginRight: alto * 0.45 }}><img alt="" src={marca} width={alto} height={alto} style={{ objectFit: 'contain' }} /></div>
                : <img alt="" src={marca} width={alto * 1.4} height={alto * 1.4} style={{ objectFit: 'contain', marginRight: alto * 0.35 }} />)}
            <img alt="" src={letras} width={Math.round(alto * 4.84)} height={alto} />
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// ARCOS

function Arcos({ formato, W, H, p, d, marca, letras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const destaque = p.c2
    const dia = diaGrande(d.quando)
    const larg = yt ? 640 : 940
    const tamDia = Math.round(Math.min(yt ? 150 : story ? 210 : 190, larg / (dia.length * 0.74)))
    const tamTema = caber(d.grande, larg, yt ? 190 : story ? 330 : 260, 0.58, 34, yt ? 58 : 74)
    const esq = yt ? 64 : 76
    const pilula = (
        <div style={{ display: 'flex', alignItems: 'center', border: `3px solid ${rgba('#ffffff', 0.45)}`, borderRadius: 60, padding: 6, paddingRight: yt ? 22 : 30 }}>
            <div style={{ display: 'flex', backgroundColor: destaque, color: p.fundo, fontFamily: 'Montserrat', fontWeight: 900, fontSize: yt ? 30 : 40, borderRadius: 50, padding: yt ? '6px 18px' : '8px 24px' }}>{dataCurta(d.quando)}</div>
            <div style={{ display: 'flex', marginLeft: 16, color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, fontSize: yt ? 22 : 30, letterSpacing: 1 }}>{yt ? `AO VIVO ÀS ${horaGrande(d.hora)}` : `ÀS ${horaGrande(d.hora)}`}</div>
        </div>
    )
    const fusao = yt
        ? `linear-gradient(90deg, ${p.fundo} 0%, ${rgba(p.fundo, 0.9)} 38%, ${rgba(p.fundo, 0)} 62%)`
        : `linear-gradient(0deg, ${p.fundo} 0%, ${p.fundo} ${story ? 30 : 30}%, ${rgba(p.fundo, 0.75)} ${story ? 40 : 42}%, ${rgba(p.fundo, 0)} ${story ? 52 : 56}%)`
    const anel = (tam: number, left: number, top: number, grossura: number, cor: string): ReactNode => (
        <div style={{ position: 'absolute', left, top, width: tam, height: tam, borderRadius: tam / 2, border: `${grossura}px solid ${cor}`, display: 'flex' }} />
    )
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: p.fundo, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at ${yt ? '78% 45%' : '62% 30%'}, ${rgba(destaque, 0.42)} 0%, ${rgba(destaque, 0)} 46%)` }} />
            {anel(yt ? 1300 : 1700, yt ? -880 : W - 450, yt ? -900 : -1400, yt ? 90 : 120, rgba(destaque, 0.85))}
            {anel(yt ? 1300 : 1700, yt ? -840 : W - 500, yt ? -860 : -1350, yt ? 16 : 22, rgba(p.c1, 0.9))}
            {anel(yt ? 900 : 1200, yt ? 820 : 560, yt ? 420 : (story ? 640 : 420), yt ? 46 : 64, rgba(destaque, 0.75))}
            {foto && <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa }}>{foto}</div>}
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: fusao }} />
            <div style={{ position: 'absolute', left: esq, top: yt ? 46 : story ? 120 : 70, display: 'flex' }}><Logo marca={marca} letras={letras} alto={yt ? 34 : 46} /></div>
            <div style={{ position: 'absolute', left: esq, bottom: yt ? 60 : story ? 220 : 90, width: larg, display: 'flex', flexDirection: 'column' }}>
                {d.pequeno && <div style={{ display: 'flex', color: rgba('#ffffff', 0.85), fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 6, fontSize: yt ? 20 : 26, marginBottom: 6 }}>{d.pequeno}</div>}
                <div style={{ display: 'flex', color: '#fff', fontFamily: 'Montserrat', fontWeight: 900, fontSize: tamDia, lineHeight: 0.95, letterSpacing: -2 }}>{dia}</div>
                <div style={{ display: 'flex', marginTop: yt ? 10 : 16 }}>
                    <Titulo texto={d.grande} tam={tamTema} cor="#fff" destaque={{ color: destaque }} largura={larg} estilo={{ fontFamily: 'Montserrat', fontWeight: 700 }} linhaAlt={1.08} />
                </div>
                <div style={{ display: 'flex', width: yt ? 70 : 90, height: yt ? 5 : 7, backgroundColor: destaque, borderRadius: 4, marginTop: yt ? 16 : 22, marginBottom: yt ? 18 : 26 }} />
                <div style={{ display: 'flex' }}>{pilula}</div>
                {d.preletor && <div style={{ display: 'flex', marginTop: yt ? 14 : 22, color: rgba('#ffffff', 0.9), fontFamily: 'Montserrat', fontWeight: 500, fontSize: yt ? 22 : 30 }}>{d.preletor}</div>}
                <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 24 : 32} largura={larg} box={{ marginTop: yt ? 14 : 22, borderLeft: `6px solid ${destaque}`, paddingLeft: 16 }} estilo={{ color: '#fff', fontFamily: 'Montserrat', fontWeight: 500 }} />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// CLARO COM ARCO

function ArcoClaro({ formato, W, H, p, d, marca, letrasEscuras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const fundo = '#F3F1EC', tinta = p.claroTexto
    const dia = diaGrande(d.quando)
    const meio = Math.ceil(dia.length / 2)
    const larg = yt ? 600 : 900
    const tam = caber(d.grande.toUpperCase(), larg, yt ? 300 : story ? 420 : 230, 0.5, 40, yt ? 96 : story ? 120 : 92, 1.02)
    const colX = yt ? 70 : 90
    const raio = Math.round(caixa.width / 2)
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: fundo, overflow: 'hidden' }}>
            {/* o dia, gigante e quase invisível, por trás */}
            <div style={{ position: 'absolute', left: yt ? -20 : -30, top: yt ? -40 : story ? 1180 : 820, display: 'flex', flexDirection: 'column', fontFamily: 'Oswald', fontWeight: 700, color: rgba(tinta, 0.06), fontSize: yt ? 330 : 420, lineHeight: 0.86 }}>
                <div style={{ display: 'flex' }}>{dia.slice(0, meio)}</div>
                <div style={{ display: 'flex' }}>{dia.slice(meio)}</div>
            </div>
            {/* o cartão em arco com a foto */}
            <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa, borderTopLeftRadius: raio, borderTopRightRadius: raio, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, backgroundColor: p.c1, backgroundImage: `radial-gradient(circle at 50% 35%, ${p.c2} 0%, ${p.c1} 70%)` }}>
                {foto}
            </div>
            <div style={{ position: 'absolute', left: colX, top: yt ? 0 : caixa.top + caixa.height + (story ? 40 : 30), width: larg, ...(yt ? { height: H } : {}), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: yt ? 'center' : 'flex-start' }}>
                <div style={{ display: 'flex', marginBottom: yt ? 26 : 30 }}><Logo marca={marca} letras={letrasEscuras} alto={yt ? 26 : 34} escuro /></div>
                <Titulo texto={d.grande.toUpperCase()} tam={tam} cor={tinta} destaque={{ color: p.c1 }} largura={larg} centro estilo={{ fontFamily: 'Oswald', fontWeight: 700, letterSpacing: 1 }} espaco={0.22} linhaAlt={1.02} />
                {(d.preletor || d.pequeno) && <div style={{ display: 'flex', marginTop: yt ? 22 : 28, color: tinta, fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700, fontSize: yt ? 30 : 40 }}>{d.preletor || d.pequeno}</div>}
                <div style={{ display: 'flex', marginTop: yt ? 22 : 30, border: `3px solid ${tinta}`, borderRadius: 50, padding: yt ? '8px 26px' : '12px 34px', color: tinta, fontFamily: 'Montserrat', fontWeight: 700, fontSize: yt ? 24 : 32, letterSpacing: 1 }}>{`${dataCurta(d.quando)} · ${horaGrande(d.hora)}`}</div>
                <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 24 : 32} largura={larg} centro box={{ marginTop: yt ? 18 : 24 }} estilo={{ color: tinta, fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700 }} />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// ELEGANTE

function Elegante({ formato, W, H, p, d, marca, letras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const base = p.fundo
    const larg = yt ? 620 : 920
    const tam = caber(d.grande, larg, yt ? 200 : story ? 380 : 290, 0.56, 40, yt ? 80 : 104, 1.08)
    const esq = yt ? 64 : 80
    // o texto livre cresce por cima dos botões: o título sobe o mesmo
    const fsLivre = Math.round((yt ? 22 : 30) * (d.livreTam === 'p' ? 0.78 : d.livreTam === 'g' ? 1.3 : 1))
    const extra = d.livre ? Math.round(fsLivre * 1.3 * Math.max(1, Math.ceil(d.livre.length * fsLivre * 0.55 / larg)) + (yt ? 16 : 24)) : 0
    const fusao = yt
        ? `linear-gradient(90deg, ${base} 0%, ${base} 30%, ${rgba(base, 0.75)} 46%, ${rgba(base, 0)} 70%)`
        : `linear-gradient(0deg, ${base} 0%, ${base} ${story ? 26 : 22}%, ${rgba(base, 0.7)} ${story ? 38 : 36}%, ${rgba(base, 0)} ${story ? 52 : 54}%)`
    const pilula = (t: string) => (
        <div style={{ display: 'flex', border: `2px solid ${rgba('#ffffff', 0.7)}`, borderRadius: 30, padding: yt ? '5px 16px' : '8px 22px', color: '#fff', fontFamily: 'Montserrat', fontWeight: 500, fontSize: yt ? 17 : 24, marginRight: 12 }}>{t}</div>
    )
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: base, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at ${yt ? '75% 30%' : '60% 25%'}, ${rgba(p.c1, 0.55)} 0%, ${rgba(p.c1, 0)} 55%)` }} />
            {foto && (
                <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa }}>
                    {foto}
                    <div style={{ position: 'absolute', left: 0, top: 0, width: caixa.width, height: caixa.height, display: 'flex', backgroundColor: rgba(p.c1, 0.22) }} />
                </div>
            )}
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: fusao }} />
            {d.pequeno && <div style={{ position: 'absolute', left: esq, top: yt ? 56 : story ? 130 : 70, display: 'flex', color: rgba('#ffffff', 0.92), fontFamily: 'Montserrat', fontWeight: 500, fontSize: yt ? 24 : 32 }}>{d.pequeno}</div>}
            <div style={{ position: 'absolute', left: esq, bottom: (yt ? 190 : story ? 400 : 250) + extra, width: larg, display: 'flex' }}>
                <Titulo texto={d.grande} tam={tam} cor="#fff" destaque={{ fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700 }} largura={larg} estilo={{ fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: -1 }} linhaAlt={1.1} />
            </div>
            <div style={{ position: 'absolute', left: esq, bottom: yt ? 60 : story ? 200 : 90, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex' }}>
                    {pilula(`${dataCurta(d.quando)} · ${horaGrande(d.hora)}`)}
                    {d.preletor ? pilula(d.preletor) : null}
                </div>
                <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 22 : 30} largura={larg} box={{ marginTop: yt ? 16 : 24 }} estilo={{ color: '#fff', fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700 }} />
                <div style={{ display: 'flex', marginTop: yt ? 22 : 34 }}><Logo marca={marca} letras={letras} alto={yt ? 22 : 30} /></div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// FAIXAS

function Faixas({ formato, W, H, p, d, marca, letras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const base = p.fundo
    const larg = yt ? 560 : 940
    const tam = caber(d.grande.toUpperCase(), larg, yt ? 200 : story ? 300 : 250, 0.46, 50, yt ? 98 : story ? 150 : 112, 1.0)
    const esq = yt ? 64 : 80
    const yBanda = story ? 1050 : 690
    const fusao = yt
        ? `linear-gradient(90deg, ${base} 0%, ${base} 36%, ${rgba(base, 0.7)} 52%, ${rgba(base, 0)} 72%)`
        : `linear-gradient(0deg, ${base} 0%, ${base} ${story ? 38 : 40}%, ${rgba(base, 0.7)} ${story ? 44 : 47}%, ${rgba(base, 0)} ${story ? 52 : 55}%)`
    const data = `${d.quando.toUpperCase()} · ${horaGrande(d.hora)}`
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: base, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at ${yt ? '85% 40%' : '70% 25%'}, ${rgba(p.c1, 0.5)} 0%, ${rgba(p.c1, 0)} 50%)` }} />
            {foto && <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa }}>{foto}</div>}
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: fusao }} />
            {yt ? (
                <div style={{ position: 'absolute', left: 560, top: -140, width: 190, height: H + 280, display: 'flex', transform: 'rotate(9deg)' }}>
                    <div style={{ display: 'flex', width: 14, height: '100%', backgroundColor: p.acento }} />
                    <div style={{ display: 'flex', width: 12 }} />
                    <div style={{ display: 'flex', width: 110, height: '100%', backgroundColor: rgba(p.c1, 0.97) }} />
                    <div style={{ display: 'flex', width: 12 }} />
                    <div style={{ display: 'flex', width: 22, height: '100%', backgroundColor: p.c2 }} />
                </div>
            ) : (
                <div style={{ position: 'absolute', left: -240, top: yBanda - 90, width: W + 480, display: 'flex', flexDirection: 'column', transform: 'rotate(-5deg)' }}>
                    <div style={{ display: 'flex', height: 18, backgroundColor: p.c2 }} />
                    <div style={{ display: 'flex', height: 10 }} />
                    <div style={{ display: 'flex', height: 124, backgroundColor: rgba(p.c1, 0.97), alignItems: 'center', paddingLeft: 240 + esq - 40, fontFamily: 'Anton', textTransform: 'uppercase', letterSpacing: 3, color: '#fff', fontSize: story ? 62 : 58 }}>{data}</div>
                    <div style={{ display: 'flex', height: 10 }} />
                    <div style={{ display: 'flex', height: 12, backgroundColor: p.acento }} />
                </div>
            )}
            <div style={{ position: 'absolute', left: esq, top: yt ? 46 : story ? 130 : 70, display: 'flex' }}><Logo marca={marca} letras={letras} alto={yt ? 32 : 44} /></div>
            <div style={{ position: 'absolute', left: esq, ...(yt ? { top: 120, bottom: 50, justifyContent: 'center' } : { top: yBanda + 165 }), width: larg, display: 'flex', flexDirection: 'column' }}>
                {d.pequeno && <div style={{ display: 'flex', color: p.acento, fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 7, fontSize: yt ? 20 : 26, marginBottom: 8 }}>{d.pequeno}</div>}
                <Titulo texto={d.grande.toUpperCase()} tam={tam} cor="#fff" destaque={{ color: p.acento }} largura={larg} estilo={{ fontFamily: 'Anton', letterSpacing: 1 }} espaco={0.2} linhaAlt={1.02} />
                {yt && <div style={{ display: 'flex', alignSelf: 'flex-start', marginTop: 18, backgroundColor: p.acento, color: base, fontFamily: 'Anton', textTransform: 'uppercase', letterSpacing: 2, fontSize: 30, padding: '4px 16px', borderRadius: 4 }}>{data}</div>}
                {d.preletor && <div style={{ display: 'flex', marginTop: yt ? 16 : 20, color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, fontSize: yt ? 22 : 30 }}>{d.preletor}</div>}
                <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 24 : 32} largura={larg} box={{ marginTop: yt ? 14 : 18, backgroundColor: p.acento, padding: '4px 18px', borderRadius: 4, alignSelf: 'flex-start' }} estilo={{ color: base, fontFamily: 'Anton', textTransform: 'uppercase', letterSpacing: 1 }} />
            </div>
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// MOLDURA

function Moldura({ formato, W, H, p, d, marca, letras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const base = p.fundo
    const larg = yt ? 520 : 900
    const tam = caber(d.grande.toUpperCase(), larg, yt ? 180 : story ? 250 : 200, 0.8, 36, yt ? 56 : story ? 92 : 80, 1.1)
    const canto = (x: number, y: number) => <div key={`${x}-${y}`} style={{ position: 'absolute', left: x - 11, top: y - 11, width: 22, height: 22, transform: 'rotate(45deg)', backgroundColor: p.acento, display: 'flex' }} />
    const m = yt ? 26 : 30
    const raio = caixa.width / 2
    const texto = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: larg }}>
            {d.pequeno && <div style={{ display: 'flex', color: rgba('#ffffff', 0.85), fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 9, fontSize: yt ? 17 : 23, marginBottom: 12 }}>{d.pequeno}</div>}
            <Titulo texto={d.grande.toUpperCase()} tam={tam} cor="#fff" destaque={{ color: p.acento }} largura={larg} centro estilo={{ fontFamily: 'Cinzel', fontWeight: 700, letterSpacing: 3 }} espaco={0.3} linhaAlt={1.08} />
            <div style={{ display: 'flex', alignItems: 'center', marginTop: yt ? 16 : 24 }}>
                <div style={{ display: 'flex', width: yt ? 90 : 140, height: 2, backgroundColor: rgba(p.acento, 0.8) }} />
                <div style={{ display: 'flex', width: 14, height: 14, margin: '0 16px', transform: 'rotate(45deg)', backgroundColor: p.acento }} />
                <div style={{ display: 'flex', width: yt ? 90 : 140, height: 2, backgroundColor: rgba(p.acento, 0.8) }} />
            </div>
            <div style={{ display: 'flex', marginTop: yt ? 16 : 24, color: p.acento, fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 5, fontSize: yt ? 22 : 31 }}>{`${d.quando.toUpperCase()} · ${horaGrande(d.hora)}`}</div>
            {d.preletor && <div style={{ display: 'flex', marginTop: yt ? 10 : 16, color: '#fff', fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700, fontSize: yt ? 26 : 38 }}>{d.preletor}</div>}
            <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 22 : 30} largura={larg} centro box={{ marginTop: yt ? 12 : 18 }} estilo={{ color: rgba('#ffffff', 0.9), fontFamily: 'Montserrat', fontWeight: 500 }} />
        </div>
    )
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: base, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at ${yt ? '75% 45%' : '50% 30%'}, ${rgba(p.c1, 0.55)} 0%, ${rgba(p.c1, 0)} 60%)` }} />
            <div style={{ position: 'absolute', left: m, top: m, width: W - 2 * m, height: H - 2 * m, border: `3px solid ${rgba(p.acento, 0.9)}`, display: 'flex' }} />
            <div style={{ position: 'absolute', left: m + 20, top: m + 20, width: W - 2 * m - 40, height: H - 2 * m - 40, border: `1px solid ${rgba(p.acento, 0.5)}`, display: 'flex' }} />
            {canto(m, m)}{canto(W - m, m)}{canto(m, H - m)}{canto(W - m, H - m)}
            {/* o medalhão: anel fino por fora, foto redonda com anel dourado */}
            <div style={{ position: 'absolute', left: caixa.left - 26, top: caixa.top - 26, width: caixa.width + 52, height: caixa.height + 52, borderRadius: raio + 26, border: `2px solid ${rgba(p.acento, 0.55)}`, display: 'flex' }} />
            <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa, borderRadius: raio, border: `6px solid ${p.acento}`, backgroundColor: p.c1 }}>{foto}</div>
            <div style={{ position: 'absolute', left: 0, top: yt ? 62 : story ? 130 : 78, width: yt ? 640 : W, display: 'flex', justifyContent: 'center' }}><Logo marca={marca} letras={letras} alto={yt ? 26 : 34} /></div>
            {yt
                ? <div style={{ position: 'absolute', left: 90, top: 110, bottom: 60, width: 520, display: 'flex', alignItems: 'center' }}>{texto}</div>
                : <div style={{ position: 'absolute', left: 0, top: caixa.top + caixa.height + (story ? 70 : 62), width: W, display: 'flex', justifyContent: 'center' }}>{texto}</div>}
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// HORIZONTE

const mixHex = (a: string, b: string, t: number) => {
    const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16)
    const c = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t).toString(16).padStart(2, '0')
    return `#${c(16)}${c(8)}${c(0)}`
}

function Horizonte({ formato, W, H, p, d, marca, letras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const base = p.fundo
    const chao = mixHex(base, '#000000', 0.4)
    const hy = yt ? 600 : story ? 1440 : 1000
    const cx = yt ? caixa.left + caixa.width / 2 : W / 2
    const R = yt ? 330 : story ? 480 : 430
    const larg = yt ? 560 : 900
    const tam = caber(d.grande.toUpperCase(), larg, yt ? 190 : story ? 260 : 200, 0.86, 34, yt ? 56 : story ? 90 : 78, 1.05)
    const data = `${d.quando.toUpperCase()} · ${horaGrande(d.hora)}`
    const titulo = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: yt ? 'flex-start' : 'center', width: larg }}>
            {d.pequeno && <div style={{ display: 'flex', color: p.acento, fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 14, fontSize: yt ? 17 : 24, marginBottom: 14 }}>{d.pequeno}</div>}
            <Titulo texto={d.grande.toUpperCase()} tam={tam} cor="#fff" destaque={{ color: p.acento }} largura={larg} centro={!yt} estilo={{ fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 5 }} espaco={0.3} linhaAlt={1.1} />
        </div>
    )
    const pe = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: yt ? 'flex-start' : 'center', width: larg }}>
            <div style={{ display: 'flex', border: `3px solid ${p.acento}`, borderRadius: 50, padding: yt ? '6px 22px' : '10px 32px', color: '#fff', fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: 4, fontSize: yt ? 22 : 31 }}>{data}</div>
            {d.preletor && <div style={{ display: 'flex', marginTop: yt ? 14 : 18, color: p.acento, fontFamily: 'Montserrat', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 6, fontSize: yt ? 20 : 28 }}>{d.preletor}</div>}
            <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 22 : 30} largura={larg} centro={!yt} box={{ marginTop: yt ? 14 : 16 }} estilo={{ color: rgba('#ffffff', 0.92), fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700 }} />
        </div>
    )
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: base, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `linear-gradient(180deg, ${rgba(base, 0)} 30%, ${rgba(p.c1, 0.7)} ${Math.round(hy / H * 100)}%, ${rgba(p.c2, 0.9)} ${Math.round(hy / H * 100) + 4}%)` }} />
            {[R * 1.5, R * 1.25].map((dd, i) => (
                <div key={i} style={{ position: 'absolute', left: cx - dd / 2, top: hy - dd / 2, width: dd, height: dd, borderRadius: dd / 2, display: 'flex', border: `2px solid ${rgba(p.acento, 0.14 + i * 0.1)}` }} />
            ))}
            <div style={{ position: 'absolute', left: cx - R, top: hy - R, width: R * 2, height: R * 2, borderRadius: R, display: 'flex', backgroundImage: `radial-gradient(circle, ${rgba(p.acento, 1)} 0%, ${rgba(p.c2, 0.95)} 45%, ${rgba(p.c1, 0.9)} 100%)` }} />
            <div style={{ position: 'absolute', left: 0, top: hy, width: W, height: H - hy, backgroundColor: chao, borderTop: `3px solid ${rgba(p.acento, 0.9)}`, display: 'flex' }} />
            {foto && (
                <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa, borderTopLeftRadius: caixa.width / 2, borderTopRightRadius: caixa.width / 2, border: `5px solid ${p.acento}`, backgroundColor: p.c1 }}>
                    {foto}
                    <div style={{ position: 'absolute', left: 0, top: caixa.height * 0.78, width: caixa.width, height: caixa.height * 0.22, display: 'flex', backgroundImage: `linear-gradient(0deg, ${chao} 0%, ${rgba(chao, 0)} 100%)` }} />
                </div>
            )}
            {yt ? (
                <>
                    <div style={{ position: 'absolute', left: 70, top: 56, display: 'flex' }}><Logo marca={marca} letras={letras} alto={30} /></div>
                    <div style={{ position: 'absolute', left: 70, top: 130, bottom: 140, width: larg, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 }}>{titulo}{pe}</div>
                </>
            ) : (
                <>
                    <div style={{ position: 'absolute', left: 0, top: story ? 130 : 60, width: W, display: 'flex', justifyContent: 'center' }}><Logo marca={marca} letras={letras} alto={34} /></div>
                    <div style={{ position: 'absolute', left: 0, top: story ? 230 : 140, width: W, display: 'flex', justifyContent: 'center' }}>{titulo}</div>
                    <div style={{ position: 'absolute', left: 0, top: hy + (story ? 50 : 44), width: W, display: 'flex', justifyContent: 'center' }}>{pe}</div>
                </>
            )}
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// EDITORIAL (papel)

function Editorial({ formato, W, H, p, d, marca, letrasEscuras, foto, caixa }: Props) {
    const yt = formato === 'youtube', story = formato === 'story'
    const papel = p.claro[1], tinta = p.claroTexto
    const larg = yt ? 640 : 860
    const tam = caber(d.grande, larg, yt ? 230 : story ? 300 : 240, 0.5, 40, yt ? 84 : story ? 128 : 110, 1.0)
    const esq = yt ? 80 : 110
    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: papel, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 26, height: H, backgroundColor: p.c1, display: 'flex' }} />
            <div style={{ position: 'absolute', left: caixa.left + 24, top: caixa.top + 24, width: caixa.width, height: caixa.height, backgroundColor: p.c2, display: 'flex' }} />
            <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa, backgroundColor: p.claro[0], border: `3px solid ${tinta}` }}>{foto}</div>
            <div style={{ position: 'absolute', left: esq, top: yt ? 52 : story ? 120 : 36, display: 'flex' }}><Logo marca={marca} letras={letrasEscuras} alto={yt ? 24 : 28} escuro /></div>
            <div style={{ position: 'absolute', left: esq, ...(yt ? { top: 130, bottom: 50, justifyContent: 'center' } : { top: caixa.top + caixa.height + (story ? 70 : 56) }), width: larg, display: 'flex', flexDirection: 'column' }}>
                {d.pequeno && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', width: 46, height: 4, backgroundColor: p.c1, marginRight: 14 }} />
                        <div style={{ display: 'flex', color: p.c1, fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 7, fontSize: yt ? 17 : 22 }}>{d.pequeno}</div>
                    </div>
                )}
                <Titulo texto={d.grande} tam={tam} cor={tinta} destaque={{ color: p.c1, fontStyle: 'italic' }} largura={larg} estilo={{ fontFamily: 'DMSerif', letterSpacing: -2 }} espaco={0.22} linhaAlt={1.0} />
                <div style={{ display: 'flex', width: yt ? 90 : 120, height: 4, backgroundColor: tinta, marginTop: yt ? 18 : 24 }} />
                <div style={{ display: 'flex', marginTop: yt ? 14 : 20, color: tinta, fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 4, fontSize: yt ? 21 : 29 }}>{`${d.quando.toUpperCase()} · ${horaGrande(d.hora)}`}</div>
                {d.preletor && <div style={{ display: 'flex', marginTop: yt ? 8 : 12, color: tinta, fontFamily: 'DMSerif', fontStyle: 'italic', fontSize: yt ? 28 : 40 }}>{d.preletor}</div>}
                <TextoLivre texto={d.livre} tam={d.livreTam} base={yt ? 22 : 30} largura={larg} box={{ marginTop: yt ? 14 : 18, borderLeft: `6px solid ${p.c1}`, paddingLeft: 16 }} estilo={{ color: tinta, fontFamily: 'Montserrat', fontWeight: 500 }} />
            </div>
        </div>
    )
}

export function ModeloRede(props: Props) {
    if (props.modelo === 'faixas') return <Faixas {...props} />
    if (props.modelo === 'moldura') return <Moldura {...props} />
    if (props.modelo === 'horizonte') return <Horizonte {...props} />
    if (props.modelo === 'editorial') return <Editorial {...props} />
    if (props.modelo === 'arco-claro') return <ArcoClaro {...props} />
    if (props.modelo === 'elegante') return <Elegante {...props} />
    return <Arcos {...props} />
}

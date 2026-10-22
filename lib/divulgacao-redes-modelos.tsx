// Os estilos novos das artes das redes (capa da live 16:9, post 4:5, story 9:16), além do clássico (lib/divulgacao-redes.tsx):
//  · arcos       — escuro com faixas curvas na cor de destaque, o dia em letras enormes, tema com a parte em *destaque* a cor
//  · arco-claro  — fundo claro com o dia gigante e quase invisível por trás, título alto e estreito, foto num cartão em arco
//  · elegante    — foto a escurecer para a cor de fundo, nome do culto em letra fina, título com a parte em *destaque* em itálico
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

const diaGrande = (quando: string) => quando.split(',')[0].trim().toUpperCase()
const dataCurta = (quando: string) => (quando.split(',')[1] ?? '').trim().toUpperCase()
const horaGrande = (hora: string) => hora.toUpperCase()

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
            <div style={{ position: 'absolute', left: esq, bottom: yt ? 190 : story ? 400 : 250, width: larg, display: 'flex' }}>
                <Titulo texto={d.grande} tam={tam} cor="#fff" destaque={{ fontFamily: 'Playfair', fontStyle: 'italic', fontWeight: 700 }} largura={larg} estilo={{ fontFamily: 'Montserrat', fontWeight: 700, letterSpacing: -1 }} linhaAlt={1.1} />
            </div>
            <div style={{ position: 'absolute', left: esq, bottom: yt ? 60 : story ? 200 : 90, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex' }}>
                    {pilula(`${dataCurta(d.quando)} · ${horaGrande(d.hora)}`)}
                    {d.preletor ? pilula(d.preletor) : null}
                </div>
                <div style={{ display: 'flex', marginTop: yt ? 22 : 34 }}><Logo marca={marca} letras={letras} alto={yt ? 22 : 30} /></div>
            </div>
        </div>
    )
}

export function ModeloRede(props: Props) {
    if (props.modelo === 'arco-claro') return <ArcoClaro {...props} />
    if (props.modelo === 'elegante') return <Elegante {...props} />
    return <Arcos {...props} />
}

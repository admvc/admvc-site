// Desenho da arte da Assistência Social (telão 1920×1080) com next/og. Três estilos sóbrios da ADMVC; letras e pomba das artes do culto.
import { ImageResponse } from 'next/og'
import { carregarFontes, carregarPomba } from '@/lib/divulgacao-imagem'
import { letraDoApelo, letraDoTexto, letraDoTitulo, type EstiloSocial, type PedidoSocial } from '@/lib/acaosocial-arte-dados'

const W = 1920, H = 1080

type Cores = { fundo: string; fundo2: string; titulo: string; texto: string; acento: string; sobreAcento: string; mancha: string; rotulo: string; logoFundo: string }
const CORES: Record<EstiloSocial, Cores> = {
    noite: { fundo: '#14263a', fundo2: '#0c1826', titulo: '#f6efe0', texto: '#d3dae3', acento: '#d9a441', sobreAcento: '#1a1206', mancha: 'rgba(217,164,65,0.12)', rotulo: '#d9a441', logoFundo: 'rgba(255,255,255,0.08)' },
    creme: { fundo: '#f1e8d8', fundo2: '#e7dac2', titulo: '#2a1d14', texto: '#4a3a2e', acento: '#b4532a', sobreAcento: '#fff8ec', mancha: 'rgba(180,83,42,0.10)', rotulo: '#b4532a', logoFundo: '#2a1d14' },
    verde: { fundo: '#1f3b2f', fundo2: '#142a21', titulo: '#f6f0e1', texto: '#d6e0d6', acento: '#e3b95a', sobreAcento: '#1d1606', mancha: 'rgba(227,185,90,0.12)', rotulo: '#e3b95a', logoFundo: 'rgba(255,255,255,0.08)' },
}

export async function desenharArteSocial(p: PedidoSocial): Promise<ImageResponse> {
    const c = CORES[p.estilo]
    const [fonts, pomba] = await Promise.all([carregarFontes(), carregarPomba()])
    return new ImageResponse(
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', background: `linear-gradient(135deg, ${c.fundo} 0%, ${c.fundo2} 100%)`, fontFamily: 'Montserrat' }}>
            {/* arcos de fundo */}
            <div style={{ position: 'absolute', right: -260, top: -260, width: 820, height: 820, borderRadius: 410, background: c.mancha, display: 'flex' }} />
            <div style={{ position: 'absolute', right: 140, bottom: -380, width: 640, height: 640, borderRadius: 320, background: c.mancha, display: 'flex' }} />
            {/* faixa da esquerda */}
            <div style={{ width: 420, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '96px 0', borderRight: `4px solid ${c.acento}` }}>
                {pomba
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <div style={{ display: 'flex', width: 220, height: 220, borderRadius: 110, background: c.logoFundo, alignItems: 'center', justifyContent: 'center' }}><img src={pomba} width={150} height={150} style={{ objectFit: 'contain' }} alt="" /></div>
                    : <div style={{ display: 'flex' }} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', fontFamily: 'Oswald', fontWeight: 700, fontSize: 40, letterSpacing: 10, color: c.rotulo }}>ASSISTÊNCIA</div>
                    <div style={{ display: 'flex', fontFamily: 'Oswald', fontWeight: 700, fontSize: 40, letterSpacing: 10, color: c.rotulo }}>SOCIAL</div>
                    <div style={{ display: 'flex', marginTop: 18, fontFamily: 'Cinzel', fontWeight: 700, fontSize: 30, letterSpacing: 6, color: c.texto }}>ADMVC</div>
                </div>
            </div>
            {/* conteúdo */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 120px 0 110px' }}>
                {p.titulo && <div style={{ display: 'flex', fontFamily: 'Playfair', fontWeight: 700, fontSize: letraDoTitulo(p.titulo.length), lineHeight: 1.08, color: c.titulo }}>{p.titulo}</div>}
                {p.titulo && <div style={{ display: 'flex', width: 140, height: 8, borderRadius: 4, background: c.acento, marginTop: 34 }} />}
                {p.texto && <div style={{ display: 'flex', marginTop: 40, fontWeight: 500, fontSize: letraDoTexto(p.texto.length), lineHeight: 1.4, color: c.texto }}>{p.texto}</div>}
                {p.apelo && (
                    <div style={{ display: 'flex', marginTop: 56 }}>
                        <div style={{ display: 'flex', padding: '20px 44px', borderRadius: 60, background: c.acento, color: c.sobreAcento, fontFamily: 'Oswald', fontWeight: 700, fontSize: letraDoApelo(p.apelo.length), letterSpacing: 3, textTransform: 'uppercase' }}>{p.apelo}</div>
                    </div>
                )}
            </div>
        </div>,
        { width: W, height: H, fonts },
    )
}

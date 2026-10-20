// Artes das redes sociais de um culto (PNG): post 4:5, story 9:16 e capa da live do YouTube 16:9, com a foto do
// preletor. Mesmo desenho da skill divulgacao-admvc: foto + degradê da cor de fundo, título em Cinzel, faixa da data.
// Parâmetros (URLSearchParams): formato=post|story|youtube · paleta · titulo (| = quebra) · subtitulo · quando · hora ·
// preletor · foto=<Blob público> · fw/fh (tamanho da foto) · recorte=1 (PNG transparente) · fundo=palco|<Blob> · foco="x% y%" · tinta=0..0.6 (véu da cor de apoio sobre a foto)
import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import { REDES, lerPaleta, type Paleta, type RedeId } from '@/lib/divulgacao'
import { carregarFontes, carregarPomba, fotoPermitida, lerFundo, rgba } from '@/lib/divulgacao-imagem'

type Dados = { titulo: string; subtitulo: string; quando: string; hora: string; preletor: string; foto: string | null; fw: number; fh: number; foco: string; tinta: number; recorte: boolean; fundo: string | null }

// Maiúsculas em Cinzel são largas (~0.8 em): o título cabe em até 2 linhas no espaço dado
function tamanhoTitulo(titulo: string, max: number, largura: number) {
    const linhas = titulo.split('|')
    const maiorPalavra = Math.max(...linhas.flatMap((l) => l.trim().split(/\s+/)).map((w) => w.length))
    const total = linhas.reduce((s, l) => s + l.trim().length, 0)
    const porLinha = linhas.length > 1 ? Math.max(...linhas.map((l) => l.trim().length)) : Math.ceil(total / 2)
    return Math.round(Math.max(56, Math.min(max, largura / (maiorPalavra * 0.8), largura / (porLinha * 0.8))))
}

const mistura = (cor: string, pct: number) => rgba(cor, pct / 100)

// O satori ignora object-position: corta-se à mão, com o tamanho real da foto. O ponto clicado (a cara) fica
// a meio na largura e a 30% da altura da caixa, sem deixar aparecer fundo. Sem tamanho (receitas antigas): corte ao centro.
function corte(d: Dados, caixa: { width: number; height: number }) {
    if (!d.foto) return null
    if (!d.fw || !d.fh) return <img alt="" src={d.foto} width={caixa.width} height={caixa.height} style={{ objectFit: 'cover' }} />
    const [fx, fy] = d.foco.split(' ').map((n) => parseInt(n, 10) / 100)
    const escala = Math.max(caixa.width / d.fw, caixa.height / d.fh)
    const w = Math.round(d.fw * escala), h = Math.round(d.fh * escala)
    const prender = (v: number, min: number) => Math.round(Math.min(0, Math.max(min, v)))
    const left = prender(caixa.width * 0.5 - fx * w, caixa.width - w)
    const top = prender(caixa.height * 0.3 - fy * h, caixa.height - h)
    return <img alt="" src={d.foto} width={w} height={h} style={{ position: 'absolute', left, top }} />
}

// Recorte (PNG transparente): a pessoa inteira, de pé, assente no fundo da caixa, com uma luz da cor da paleta atrás.
// A parte de baixo desaparece no degradê, onde fica o texto.
function recortado(d: Dados, caixa: { width: number; height: number }, p: Paleta) {
    if (!d.foto || !d.fw || !d.fh) return null
    let h = Math.round(caixa.height * 0.94), w = Math.round(d.fw * h / d.fh)
    // nas artes ao alto, um recorte largo (braços abertos) pode passar das margens: corta-se nos cotovelos, não se encolhe a pessoa
    const maxLarg = caixa.height > caixa.width ? caixa.width * 1.35 : caixa.width * 0.95
    if (w > maxLarg) { w = Math.round(maxLarg); h = Math.round(d.fh * w / d.fw) }
    const left = Math.round((caixa.width - w) / 2), top = caixa.height - h
    const luz = Math.round(Math.max(w, h) * 1.1)
    return (
        <>
            <div style={{ position: 'absolute', left: Math.round(caixa.width / 2 - luz / 2), top: Math.round(top + h * 0.35 - luz / 2), width: luz, height: luz, borderRadius: luz / 2, display: 'flex', backgroundImage: `radial-gradient(circle, ${rgba(p.c1, 0.6)} 0%, ${rgba(p.c1, 0)} 62%)` }} />
            <img alt="" src={d.foto} width={w} height={h} style={{ position: 'absolute', left, top }} />
        </>
    )
}

function Rede({ formato, p, d, marca }: { formato: RedeId; p: Paleta; d: Dados; marca: string | null }) {
    const f = REDES.find((r) => r.id === formato)!
    const W = f.largura, H = f.altura
    const base = p.fundo
    const horizontal = formato === 'youtube'
    const story = formato === 'story'
    const titulo = d.titulo.replace(/\|/g, ' ')

    // Caixa da foto e degradê (o texto fica sobre a cor de fundo, nunca sobre o rosto)
    const caixa = horizontal ? { left: 380, top: 0, width: 900, height: 720 }
        : story ? { left: 0, top: 200, width: 1080, height: 1440 }
        : { left: 0, top: 0, width: 1080, height: 1000 }
    const degrade = horizontal
        ? `linear-gradient(90deg, ${base} 0%, ${base} 40%, ${mistura(base, 65)} 55%, ${rgba(base, 0)} 78%)`
        : `linear-gradient(0deg, ${base} 0%, ${base} ${story ? 36 : 32}%, ${mistura(base, 70)} ${story ? 48 : 44}%, ${rgba(base, 0)} ${story ? 64 : 62}%)`
    const degradeTopo = story ? `, linear-gradient(180deg, ${base} 0%, ${base} 11%, ${rgba(base, 0)} 22%)` : ''

    const larg = horizontal ? 640 : 920
    const tam = tamanhoTitulo(d.titulo, horizontal ? 92 : story ? 132 : 118, larg)
    const centro = story
    const tamFaixa = horizontal ? 30 : story ? 42 : 38
    const tamPreletor = horizontal ? 32 : story ? 44 : 40
    const alinhar: CSSProperties = { alignItems: centro ? 'center' : 'flex-start', textAlign: centro ? 'center' : 'left' }

    const logo = (tamanho: number) => (
        <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'Cinzel', fontWeight: 700, letterSpacing: tamanho * 0.12, color: p.texto, fontSize: tamanho }}>
            {marca && <img alt="" src={marca} width={Math.round(tamanho * 1.9)} height={Math.round(tamanho * 1.9)} style={{ objectFit: 'contain', marginRight: tamanho * 0.4 }} />}
            ADMVC
        </div>
    )

    const texto = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: horizontal ? 22 : 26, width: larg, ...alinhar }}>
            {d.subtitulo && <div style={{ display: 'flex', fontFamily: 'Montserrat', fontWeight: 700, textTransform: 'uppercase', letterSpacing: horizontal ? 7 : 9, color: p.acento, fontSize: horizontal ? 22 : story ? 30 : 26 }}>{d.subtitulo}</div>}
            <div style={{ display: 'flex', fontFamily: 'Cinzel', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1, letterSpacing: 2, color: p.texto, fontSize: tam, width: larg, justifyContent: centro ? 'center' : 'flex-start', textShadow: '0 4px 24px rgba(0,0,0,0.35)' }}>{titulo}</div>
            <div style={{ display: 'flex', backgroundColor: p.acento, color: base, fontFamily: 'Montserrat', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, borderRadius: 6, padding: horizontal ? '10px 20px' : '13px 26px', fontSize: tamFaixa }}>{`${d.quando} · ${d.hora}`}</div>
            {d.preletor && (
                <div style={{ display: 'flex', flexDirection: 'column', fontFamily: 'Montserrat', color: p.texto, ...alinhar }}>
                    <div style={{ display: 'flex', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 7, opacity: 0.8, fontSize: Math.round(tamPreletor * 0.55) }}>Preletor</div>
                    <div style={{ display: 'flex', fontWeight: 700, fontSize: tamPreletor, whiteSpace: 'nowrap' }}>{d.preletor}</div>
                </div>
            )}
        </div>
    )

    return (
        <div style={{ width: W, height: H, display: 'flex', position: 'relative', backgroundColor: base, fontFamily: 'Montserrat' }}>
            {d.fundo
                ? (
                    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex' }}>
                        <img alt="" src={d.fundo} width={W} height={H} style={{ objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundColor: rgba(base, 0.45) }} />
                    </div>
                )
                : !(d.foto && !d.recorte) && <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: `radial-gradient(circle at 80% 22%, ${rgba(p.c1, 0.85)} 0%, ${rgba(p.c1, 0)} 45%), radial-gradient(circle at 15% 70%, ${rgba(p.c2, 0.55)} 0%, ${rgba(p.c2, 0)} 40%)` }} />}
            {d.foto && (
                <div style={{ position: 'absolute', display: 'flex', overflow: 'hidden', ...caixa }}>
                    {d.recorte ? recortado(d, caixa, p) : corte(d, caixa)}
                    {!d.recorte && <div style={{ position: 'absolute', left: 0, top: 0, width: caixa.width, height: caixa.height, display: 'flex', backgroundColor: rgba(p.c1, d.tinta) }} />}
                </div>
            )}
            <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, display: 'flex', backgroundImage: degrade + degradeTopo }} />

            {horizontal && (
                <>
                    <div style={{ position: 'absolute', left: 150, top: 80, bottom: 80, width: larg, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
                        {texto}
                        <div style={{ display: 'flex', marginTop: 6 }}>{logo(20)}</div>
                    </div>
                    <div style={{ position: 'absolute', right: 150, top: 84, display: 'flex', backgroundColor: p.acento, color: base, fontWeight: 900, fontSize: 20, padding: '6px 14px', borderRadius: 6, textTransform: 'uppercase', letterSpacing: 1 }}>● Em direto</div>
                </>
            )}
            {formato === 'post' && (
                <>
                    <div style={{ position: 'absolute', left: 80, top: 70, display: 'flex' }}>{logo(28)}</div>
                    <div style={{ position: 'absolute', left: 80, bottom: 90, width: larg, display: 'flex', flexDirection: 'column' }}>{texto}</div>
                </>
            )}
            {story && (
                <div style={{ position: 'absolute', left: 90, right: 90, bottom: 270, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
                    {texto}
                    <div style={{ display: 'flex', marginTop: 20 }}>{logo(30)}</div>
                </div>
            )}
        </div>
    )
}

export async function desenharRede(q: URLSearchParams): Promise<ImageResponse> {
    const formato = (REDES.find((r) => r.id === q.get('formato'))?.id ?? 'post') as RedeId
    const f = REDES.find((r) => r.id === formato)!
    const p = lerPaleta(q.get('paleta'))
    const corta = (k: string, max: number) => q.get(k)?.trim().slice(0, max) ?? ''
    const foco = /^\d{1,3}% \d{1,3}%$/.test(q.get('foco') ?? '') ? q.get('foco')! : '50% 30%'
    const tinta = Math.min(0.6, Math.max(0, Number(q.get('tinta') ?? 0.25) || 0))
    const d: Dados = {
        titulo: corta('titulo', 60) || 'Culto', subtitulo: corta('subtitulo', 40), quando: corta('quando', 30), hora: corta('hora', 10),
        preletor: corta('preletor', 60), foto: fotoPermitida(q.get('foto')), fw: Number(q.get('fw')) || 0, fh: Number(q.get('fh')) || 0, foco, tinta,
        recorte: q.get('recorte') === '1', fundo: null,
    }
    const [fonts, marca, fundo] = await Promise.all([carregarFontes(), carregarPomba(), lerFundo(q.get('fundo'))])
    d.fundo = fundo
    return new ImageResponse(<Rede formato={formato} p={p} d={d} marca={marca} />, { width: f.largura, height: f.altura, fonts })
}

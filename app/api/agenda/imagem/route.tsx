// Imagens da agenda para a Mídia (PNG, prontas a usar):
//   ?formato=telao&semana=AAAA-MM-DD  → 1920×1080, "Programação da Semana"
//   ?formato=redes&mes=AAAA-MM        → 1080×1350, calendário do mês (D S T Q Q S S); &disposicao=cartoes = o modelo antigo
//   &tema=classico|noite|areia|aurora (lib/agenda-temas.ts) · &c=<id da congregação> · &download=1 para descarregar
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { comoPrevia } from '@/lib/imagem-previa'
import { sessaoDaApi } from '@/lib/api-auth'
import { getTenantClient } from '@/lib/prisma'
import { DIAS_SEMANA, eventosDaAgenda, podeFazerAgenda, porDia } from '@/lib/agenda-midia'
import { limitesDoMes, segundaDaSemana } from '@/lib/agenda'
import { lerTema, semanasDomingo } from '@/lib/agenda-temas'

export const runtime = 'nodejs'

const CORES_DIA = ['#16a34a', '#1d4ed8', '#9a5b2e', '#64748b', '#0e7490', '#dc2626', '#7c3aed']

async function logo(): Promise<string | null> {
    try {
        const b = await readFile(path.join(process.cwd(), 'public', 'images', 'logo_admvc.png'))
        return `data:image/png;base64,${b.toString('base64')}`
    } catch { return null }
}

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    const { sessao } = auth
    if (!(await podeFazerAgenda(sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const url = new URL(request.url)
    const formato = url.searchParams.get('formato') === 'redes' ? 'redes' : 'telao'
    const cong = Number(url.searchParams.get('c')) || null
    const casa = cong ? (await getTenantClient(sessao.tenantId).congregacao.findUnique({ where: { id: cong }, select: { nome: true } }))?.nome ?? null : null
    const marca = await logo()
    const t = lerTema(url.searchParams.get('tema'))
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const nomeFicheiro = (s: string) => `agenda-${s}.png`

    let img: ImageResponse
    if (formato === 'telao') {
        const pedida = url.searchParams.get('semana')
        const segunda = segundaDaSemana(pedida && /^\d{4}-\d{2}-\d{2}$/.test(pedida) ? pedida : hoje)
        const de = new Date(`${segunda}T00:00:00Z`)
        const dias = porDia(await eventosDaAgenda(sessao.tenantId, de, new Date(de.getTime() + 7 * 86400000), cong))
        const metade = Math.ceil(dias.length / 2)
        const coluna = (lista: typeof dias) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 34, flex: 1 }}>
                {lista.map((d) => {
                    const nome = DIAS_SEMANA[new Date(`${d.dia}T12:00:00Z`).getUTCDay()]
                    return (
                        <div key={d.dia} style={{ display: 'flex', flexDirection: 'column', borderLeft: `6px solid ${t.linha}`, paddingLeft: 26 }}>
                            <div style={{ display: 'flex', fontSize: 52, color: t.acento, fontWeight: 700 }}>
                                {nome} <span style={{ color: t.suave, fontSize: 34, marginLeft: 16, marginTop: 14 }}>{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                            </div>
                            {d.linhas.map((l, i) => (
                                <div key={i} style={{ display: 'flex', fontSize: 34, color: t.texto, marginTop: 6 }}>{l.hora} · {l.nome}</div>
                            ))}
                        </div>
                    )
                })}
            </div>
        )
        img = new ImageResponse(
            <div style={{ width: '100%', height: '100%', display: 'flex', background: t.fundo, fontFamily: 'sans-serif' }}>
                <div style={{ width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 70, background: t.painel }}>
                    {marca ? <img src={marca} width={200} height={200} style={{ borderRadius: 100, objectFit: 'contain' }} /> : <div />}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 40, color: t.painelSuave, letterSpacing: 8 }}>AGENDA</div>
                        <div style={{ fontSize: 96, color: t.painelTexto, fontWeight: 700, lineHeight: 1 }}>ADMVC</div>
                        {casa && <div style={{ fontSize: 36, color: t.acento, marginTop: 12 }}>{casa}</div>}
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 80px' }}>
                    <div style={{ display: 'flex', fontSize: 76, color: t.acento, fontWeight: 700, marginBottom: 50 }}>Programação da Semana</div>
                    {dias.length === 0
                        ? <div style={{ display: 'flex', fontSize: 40, color: t.suave }}>Sem eventos marcados nesta semana.</div>
                        : <div style={{ display: 'flex', gap: 60 }}>{coluna(dias.slice(0, metade))}{coluna(dias.slice(metade))}</div>}
                </div>
            </div>,
            { width: 1920, height: 1080 },
        )
        if (url.searchParams.get('download')) img.headers.set('Content-Disposition', `attachment; filename="${nomeFicheiro(`semana-${segunda}-${t.id}`)}"`)
    } else {
        const pedido = url.searchParams.get('mes')
        const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : hoje.slice(0, 7)
        const { inicio, fim } = limitesDoMes(mes)
        const todos = porDia(await eventosDaAgenda(sessao.tenantId, inicio, fim, cong))
        const nomeMes = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-PT', { month: 'long', timeZone: 'UTC' }).toUpperCase()
        const titulo = `PROGRAMAÇÃO MENSAL ADMVC${casa ? ` - ${casa.toUpperCase()}` : ''}`
        const corNumero = (dia: string) => t.numero ?? CORES_DIA[Number(dia.slice(8)) % CORES_DIA.length]
        const curto = (n: string, max: number) => (n.length > max ? n.slice(0, max - 1).trimEnd() + '…' : n)

        if (url.searchParams.get('disposicao') === 'cartoes') {
            const dias = todos.slice(0, 25)
            const cartoes = [...dias.map((d) => d as (typeof dias)[number] | null)]
            while (cartoes.length % 5 || cartoes.length < 20) cartoes.push(null)
            const lado = 184
            img = new ImageResponse(
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: t.fundoRedes, padding: '50px 40px', fontFamily: 'sans-serif' }}>
                    {marca && <div style={{ display: 'flex', width: 140, height: 140, borderRadius: 70, background: t.logoFundo ?? 'transparent', alignItems: 'center', justifyContent: 'center' }}><img src={marca} width={t.logoFundo ? 110 : 130} height={t.logoFundo ? 110 : 130} style={{ objectFit: 'contain' }} /></div>}
                    <div style={{ display: 'flex', fontSize: 50, color: t.tituloRedes, fontWeight: 700, margin: '24px 0 36px', textAlign: 'center' }}>
                        {titulo} · {nomeMes} {mes.slice(0, 4)}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, width: lado * 5 + 18 * 4 }}>
                        {cartoes.map((d, i) => (
                            <div key={i} style={{ width: lado, height: lado + 16, borderRadius: 34, background: d ? t.celula : t.celulaVazia, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                                {d && <div style={{ display: 'flex', fontSize: 86, fontWeight: 700, color: corNumero(d.dia), lineHeight: 1 }}>{d.dia.slice(8)}</div>}
                                {d && d.linhas.slice(0, 2).map((l, j) => (
                                    <div key={j} style={{ display: 'flex', fontSize: 21, fontWeight: 700, color: t.celulaTexto, textAlign: 'center', marginTop: 6, textTransform: 'uppercase' }}>
                                        {curto(l.nome, 22)} {l.hora.toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>,
                { width: 1080, height: 1350 },
            )
        } else {
            // calendário de parede: D S T Q Q S S em cima, uma linha por semana
            const doDia = new Map(todos.map((d) => [d.dia, d.linhas]))
            const semanas = semanasDomingo(mes)
            const gap = 10, largura = 1080 - 2 * 44, celula = Math.floor((largura - gap * 6) / 7)
            const altura = semanas.length > 5 ? 136 : 164
            const max = altura > 140 ? 3 : 2
            img = new ImageResponse(
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: t.fundoRedes, padding: '44px 44px 34px', fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 26, width: largura }}>
                        {marca && <div style={{ display: 'flex', width: 124, height: 124, borderRadius: 62, background: t.logoFundo ?? 'transparent', alignItems: 'center', justifyContent: 'center' }}><img src={marca} width={t.logoFundo ? 100 : 116} height={t.logoFundo ? 100 : 116} style={{ objectFit: 'contain' }} /></div>}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', fontSize: 26, color: t.cabecalho, letterSpacing: 5, fontWeight: 700 }}>{titulo}</div>
                            <div style={{ display: 'flex', fontSize: 84, color: t.tituloRedes, fontWeight: 700, lineHeight: 1.05 }}>{nomeMes}<span style={{ color: t.cabecalho, marginLeft: 18 }}>{mes.slice(0, 4)}</span></div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap, width: largura, marginTop: 30, marginBottom: 10 }}>
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((l, i) => (
                            <div key={i} style={{ width: celula, display: 'flex', justifyContent: 'center', fontSize: 34, fontWeight: 700, color: i === 0 ? t.cabecalho : t.tituloRedes }}>{l}</div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap, width: largura }}>
                        {semanas.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap }}>
                                {s.map((dia, j) => {
                                    const linhas = dia ? doDia.get(dia) ?? [] : []
                                    return (
                                        <div key={j} style={{ width: celula, height: altura, borderRadius: 18, background: !dia ? 'transparent' : linhas.length ? t.celula : t.celulaVazia, display: 'flex', flexDirection: 'column', padding: 10, border: `2px solid ${dia && linhas.length && t.numero ? t.numero : 'transparent'}` }}>
                                            {dia && <div style={{ display: 'flex', fontSize: 34, fontWeight: 700, lineHeight: 1, color: linhas.length ? corNumero(dia) : t.celulaSuave }}>{String(Number(dia.slice(8)))}</div>}
                                            {linhas.slice(0, max).map((l, k) => (
                                                <div key={k} style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
                                                    <div style={{ display: 'flex', fontSize: 15, fontWeight: 700, color: t.celulaTexto, lineHeight: 1.1, textTransform: 'uppercase' }}>{curto(l.nome, 16)}</div>
                                                    <div style={{ display: 'flex', fontSize: 14, color: t.celulaSuave }}>{l.hora}</div>
                                                </div>
                                            ))}
                                            {linhas.length > max && <div style={{ display: 'flex', fontSize: 13, color: t.celulaSuave, marginTop: 2 }}>{`+${linhas.length - max}`}</div>}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: t.tituloRedes, letterSpacing: 2 }}>igrejaadmvc.org</div>
                </div>,
                { width: 1080, height: 1350 },
            )
        }
        if (url.searchParams.get('download')) img.headers.set('Content-Disposition', `attachment; filename="${nomeFicheiro(`${mes}-${t.id}`)}"`)
    }
    // &previa=1: versão pequena (JPEG ~640 px); curta no cache porque a agenda muda
    if (url.searchParams.get('previa')) return comoPrevia(img, 'private, max-age=120')
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

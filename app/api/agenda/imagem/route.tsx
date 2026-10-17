// Imagens da agenda para a Mídia (PNG, prontas a usar):
//   ?formato=telao&semana=AAAA-MM-DD  → 1920×1080, "Programação da Semana" (modelo escuro com laranja)
//   ?formato=redes&mes=AAAA-MM        → 1080×1350, "Programação mensal" em cartões (modelo das redes)
//   &c=<id da congregação> (opcional) · &download=1 para descarregar
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { getTenantClient } from '@/lib/prisma'
import { DIAS_SEMANA, eventosDaAgenda, podeFazerAgenda, porDia } from '@/lib/agenda-midia'
import { limitesDoMes, segundaDaSemana } from '@/lib/agenda'

export const runtime = 'nodejs'

const LARANJA = '#f5a524'
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
                        <div key={d.dia} style={{ display: 'flex', flexDirection: 'column', borderLeft: `6px solid #d4d4d4`, paddingLeft: 26 }}>
                            <div style={{ display: 'flex', fontSize: 52, color: LARANJA, fontWeight: 700 }}>
                                {nome} <span style={{ color: '#a3a3a3', fontSize: 34, marginLeft: 16, marginTop: 14 }}>{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                            </div>
                            {d.linhas.map((l, i) => (
                                <div key={i} style={{ display: 'flex', fontSize: 34, color: '#e5e5e5', marginTop: 6 }}>{l.hora} · {l.nome}</div>
                            ))}
                        </div>
                    )
                })}
            </div>
        )
        img = new ImageResponse(
            <div style={{ width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg, #1c1c1c 0%, #2b2b2b 100%)', fontFamily: 'sans-serif' }}>
                <div style={{ width: 520, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 70, background: '#111' }}>
                    {marca ? <img src={marca} width={200} height={200} style={{ borderRadius: 100, objectFit: 'contain' }} /> : <div />}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: 40, color: '#a3a3a3', letterSpacing: 8 }}>AGENDA</div>
                        <div style={{ fontSize: 96, color: '#fff', fontWeight: 700, lineHeight: 1 }}>ADMVC</div>
                        {casa && <div style={{ fontSize: 36, color: LARANJA, marginTop: 12 }}>{casa}</div>}
                    </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '70px 80px' }}>
                    <div style={{ display: 'flex', fontSize: 76, color: LARANJA, fontWeight: 700, marginBottom: 50 }}>Programação da Semana</div>
                    {dias.length === 0
                        ? <div style={{ display: 'flex', fontSize: 40, color: '#a3a3a3' }}>Sem eventos marcados nesta semana.</div>
                        : <div style={{ display: 'flex', gap: 60 }}>{coluna(dias.slice(0, metade))}{coluna(dias.slice(metade))}</div>}
                </div>
            </div>,
            { width: 1920, height: 1080 },
        )
        if (url.searchParams.get('download')) img.headers.set('Content-Disposition', `attachment; filename="${nomeFicheiro(`semana-${segunda}`)}"`)
    } else {
        const pedido = url.searchParams.get('mes')
        const mes = pedido && /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : hoje.slice(0, 7)
        const { inicio, fim } = limitesDoMes(mes)
        const dias = porDia(await eventosDaAgenda(sessao.tenantId, inicio, fim, cong)).slice(0, 25)
        const cartoes = [...dias.map((d) => d as (typeof dias)[number] | null)]
        while (cartoes.length % 5 || cartoes.length < 20) cartoes.push(null)
        const nomeMes = new Date(`${mes}-01T12:00:00Z`).toLocaleDateString('pt-PT', { month: 'long', timeZone: 'UTC' }).toUpperCase()
        const lado = 184
        img = new ImageResponse(
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'linear-gradient(180deg, #8a7a6c 0%, #5d5047 100%)', padding: '50px 40px', fontFamily: 'sans-serif' }}>
                {marca && <img src={marca} width={130} height={130} style={{ borderRadius: 65, objectFit: 'contain' }} />}
                <div style={{ display: 'flex', fontSize: 50, color: '#fff', fontWeight: 700, margin: '24px 0 36px', textAlign: 'center' }}>
                    PROGRAMAÇÃO MENSAL ADMVC{casa ? ` - ${casa.toUpperCase()}` : ''} · {nomeMes} {mes.slice(0, 4)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, width: lado * 5 + 18 * 4 }}>
                    {cartoes.map((d, i) => (
                        <div key={i} style={{ width: lado, height: lado + 16, borderRadius: 34, background: d ? 'rgba(246,240,232,0.92)' : 'rgba(246,240,232,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                            {d && <div style={{ display: 'flex', fontSize: 86, fontWeight: 700, color: CORES_DIA[Number(d.dia.slice(8)) % CORES_DIA.length], lineHeight: 1 }}>{d.dia.slice(8)}</div>}
                            {d && d.linhas.slice(0, 2).map((l, j) => (
                                <div key={j} style={{ display: 'flex', fontSize: 21, fontWeight: 700, color: '#3b3029', textAlign: 'center', marginTop: 6, textTransform: 'uppercase' }}>
                                    {l.nome.length > 22 ? l.nome.slice(0, 21) + '…' : l.nome} {l.hora.toUpperCase()}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>,
            { width: 1080, height: 1350 },
        )
        if (url.searchParams.get('download')) img.headers.set('Content-Disposition', `attachment; filename="${nomeFicheiro(mes)}"`)
    }
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

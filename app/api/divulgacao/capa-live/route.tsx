// Pré-visualização da capa da live do YouTube de um culto, por estado (Mídia e administração):
//   ?evento=N&estado=agendada|direto|arquivo|reserva   [&download=1]  → PNG 1280×720 (≤ 2 MB). Só gera a imagem, não toca no YouTube.
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { desenharCapaLive } from '@/lib/youtube-capa'
import { lerEstadoCapa } from '@/lib/youtube-capa-dados'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { dadosDaCapa, dadosDoCulto } from '@/lib/youtube-live'

export const runtime = 'nodejs'

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const q = new URL(request.url).searchParams
    const estado = lerEstadoCapa(q.get('estado')) ?? 'agendada'
    const evento = Number(q.get('evento'))
    if (!Number.isInteger(evento) || evento <= 0) return NextResponse.json({ error: 'Culto inválido.' }, { status: 400 })
    const culto = await dadosDoCulto(auth.sessao.tenantId, evento)
    if (!culto) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
    // só em ensaio (YouTube simulado): foto, tema e preletor à mão para ver o desenho
    if (simuladoAtivo()) {
        if (q.get('tema')) culto.tema = q.get('tema')!.slice(0, 80)
        if (q.get('preletor')) culto.preletor = q.get('preletor')!.slice(0, 60)
        if (q.get('foto')) culto.foto = { url: q.get('foto')!, w: Number(q.get('fw')) || 0, h: Number(q.get('fh')) || 0, recorte: q.get('recorte') === '1' }
    }
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
    const img = await desenharCapaLive(dadosDaCapa(culto, estado, hoje))
    if (q.get('download')) img.headers.set('Content-Disposition', `attachment; filename="capa-live-${estado}.png"`)
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

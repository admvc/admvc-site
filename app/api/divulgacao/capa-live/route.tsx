// Pré-visualização e descarregamento da capa da live do YouTube de um culto, por estado (Mídia e administração):
//   ?evento=N&estado=agendada|direto|arquivo|reserva [&receita=<JSON>] [&previa=1&w=400] [&download=1]
// A capa segue o padrão e a edição guardados no kit do culto (kit.capaYt; sem escolha = igual às artes do culto). Com `receita` (a do ecrã,
// ainda por guardar) usa essa no lugar da guardada, por isso a pré-visualização muda ao editar. Só gera a imagem, não toca no YouTube.
//   sem previa → o PNG 1280×720 (≤ 2 MB) que a Aplicar também usa; previa=1 → JPEG pequeno, desenhado já em ponto pequeno e com memória.
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { normalizarReceita } from '@/lib/divulgacao-kit'
import { comoPrevia } from '@/lib/imagem-previa'
import { criarPrevias } from '@/lib/previa-memoria'
import { capaLive, desenharCapaLive } from '@/lib/youtube-capa'
import { lerEstadoCapa } from '@/lib/youtube-capa-dados'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { dadosDaCapa, dadosDoCulto } from '@/lib/youtube-live'

export const runtime = 'nodejs'

const previas = criarPrevias()

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const q = new URL(request.url).searchParams
    const estado = lerEstadoCapa(q.get('estado')) ?? 'agendada'
    const evento = Number(q.get('evento'))
    if (!Number.isInteger(evento) || evento <= 0) return NextResponse.json({ error: 'Culto inválido.' }, { status: 400 })

    // a receita do ecrã (ainda por guardar): validada como qualquer receita
    let kit: ReturnType<typeof normalizarReceita> | undefined
    const bruta = q.get('receita')
    if (bruta) {
        if (bruta.length > 20000) return NextResponse.json({ error: 'Receita demasiado grande.' }, { status: 400 })
        try { kit = normalizarReceita(JSON.parse(bruta)) } catch { return NextResponse.json({ error: 'Receita inválida.' }, { status: 400 }) }
    }
    // só em ensaio (YouTube simulado): tema, preletor e foto à mão para ver o desenho
    if (simuladoAtivo() && (q.get('tema') || q.get('preletor') || q.get('foto'))) {
        const base = kit ?? normalizarReceita({})
        kit = { ...base, tema: q.get('tema')?.slice(0, 80) || base.tema, preletor: q.get('preletor')?.slice(0, 60) || base.preletor }
        if (q.get('foto')) kit.fotoH = { url: q.get('foto')!, foco: '50% 30%', w: Number(q.get('fw')) || 0, h: Number(q.get('fh')) || 0, recorte: q.get('recorte') === '1' }
    }
    const culto = await dadosDoCulto(auth.sessao.tenantId, evento, kit)
    if (!culto) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
    const dados = dadosDaCapa(culto, estado, hoje)

    if (q.get('previa')) {
        const largura = Math.min(800, Math.max(200, Number(q.get('w')) || 480))
        const cabecalhos = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' }
        try {
            const r = await previas.obter(`${largura}|${JSON.stringify(dados)}`, async () => {
                const img = await desenharCapaLive(dados)   // sempre em tamanho real: desenhar já pequeno (scale no satori) partia vários modelos; o sharp reduz
                return new Uint8Array(await (await comoPrevia(img, 'private, no-store', largura)).arrayBuffer())
            }, () => request.signal.aborted)
            return new Response(r.bytes as BodyInit, { headers: { ...cabecalhos, ...(r.memoria ? { 'X-Previa': 'memoria' } : {}) } })
        } catch { return new Response(null, { status: request.signal.aborted ? 499 : 500 }) }
    }

    try {
        const png = await capaLive(dados)
        const cab: Record<string, string> = { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store' }
        if (q.get('download')) cab['Content-Disposition'] = `attachment; filename="capa-live-${estado}.png"`
        return new Response(png as BodyInit, { headers: cab })
    } catch (e) {
        return NextResponse.json({ error: e instanceof Error ? e.message : 'Não consegui desenhar a capa.' }, { status: 500 })
    }
}

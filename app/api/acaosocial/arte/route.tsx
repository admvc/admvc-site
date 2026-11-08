// Arte da Assistência Social para o telão (PNG 1920×1080), só para a equipa social e a administração.
//   ?estilo=noite|creme|verde&t=<título>&x=<texto>&a=<apelo>  ·  &previa=1 → JPEG pequeno (~640 px)  ·  &download=1 → descarrega o PNG
import { NextResponse } from 'next/server'
import { comoPrevia } from '@/lib/imagem-previa'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerArteSocial } from '@/lib/acaosocial-acesso'
import { lerPedidoSocial } from '@/lib/acaosocial-arte-dados'
import { desenharArteSocial } from '@/lib/acaosocial-arte'

export const runtime = 'nodejs'

const pedidos = new Map<number, number[]>()
/** Travão simples por pessoa: no máximo 40 imagens por minuto. */
function demasiados(membroId: number): boolean {
    const agora = Date.now()
    const lista = (pedidos.get(membroId) ?? []).filter((t) => agora - t < 60_000)
    lista.push(agora)
    pedidos.set(membroId, lista)
    if (pedidos.size > 500) pedidos.clear()
    return lista.length > 40
}

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    const { sessao } = auth
    if (!(await podeFazerArteSocial(sessao))) return NextResponse.json({ error: 'Só a equipa da Assistência Social e a administração.' }, { status: 403 })
    if (demasiados(sessao.membroId)) return NextResponse.json({ error: 'Muitos pedidos seguidos. Espere um momento.' }, { status: 429 })

    const url = new URL(request.url)
    const pedido = lerPedidoSocial(url.searchParams)
    let img
    try {
        img = await desenharArteSocial(pedido)
    } catch (err) {
        console.error('[acaosocial/arte] falhou a desenhar', pedido.estilo, err)
        return NextResponse.json({ error: 'Não foi possível desenhar a arte.' }, { status: 500 })
    }
    if (url.searchParams.get('download')) img.headers.set('Content-Disposition', `attachment; filename="assistencia-social-${pedido.estilo}.png"`)
    if (url.searchParams.get('previa')) return comoPrevia(img, 'private, max-age=120')
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

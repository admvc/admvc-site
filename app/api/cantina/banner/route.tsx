// Banner de divulgação da cantina (PNG pronto a usar), só para a equipa da Cantina e a administração.
//   ?modelo=toldo|giz|cafe|festa&formato=telao|redes&t=<título>&s=<o que se vende>&p=<preço: 2,50>&n=<texto pequeno>
//   &foto=<endereço da foto>&zoom=1..3&fx=0..1&fy=0..1 (o ponto da foto que fica no centro)&tb=1 (tirar o fundo branco)
//   &previa=1 → JPEG pequeno (~640 px) · &download=1 → descarrega o PNG
import { NextResponse } from 'next/server'
import { comoPrevia } from '@/lib/imagem-previa'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerBannersCantina } from '@/lib/cantina-acesso'
import { lerPedido } from '@/lib/cantina-banners'
import { desenharBanner, ErroFoto } from '@/lib/cantina-banners-imagem'

export const runtime = 'nodejs'

const emDev = process.env.NODE_ENV !== 'production'
const pedidos = new Map<number, number[]>()

/** Travão simples por pessoa: no máximo 40 imagens por minuto (cada uma gasta processador). */
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
    if (!(await podeFazerBannersCantina(sessao))) return NextResponse.json({ error: 'Só a equipa da Cantina e a administração.' }, { status: 403 })
    if (demasiados(sessao.membroId)) return NextResponse.json({ error: 'Muitos pedidos seguidos. Espere um momento.' }, { status: 429 })

    const url = new URL(request.url)
    const pedido = lerPedido(url.searchParams, emDev)
    let img
    try {
        img = await desenharBanner(pedido)
    } catch (err) {
        if (err instanceof ErroFoto) return NextResponse.json({ error: err.message }, { status: 422 })
        return NextResponse.json({ error: 'Não foi possível desenhar o banner.' }, { status: 500 })
    }
    if (url.searchParams.get('download')) {
        img.headers.set('Content-Disposition', `attachment; filename="cantina-${pedido.modelo}-${pedido.formato}.png"`)
    }
    if (url.searchParams.get('previa')) return comoPrevia(img, 'private, max-age=120')
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

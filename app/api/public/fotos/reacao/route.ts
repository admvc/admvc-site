// POST /api/public/fotos/reacao   { "foto": 123, "gosto": true | false, "emoji": "❤️" | "🙏" | "🙌" | "😂" }  (sem emoji = coracao)
// Uma reaccao de cada emoji por foto e por aparelho (cookie + hash; sem login, sem nomes). "gosto": false tira a reaccao.
// → { ok, emoji, total, minha, contagens }
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { contagemReacoes } from '@/lib/fotos'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { emojiValido, EMOJIS_FOTOS } from '@/lib/fotos-galeria'
import { aparelhoValido, COOKIE_APARELHO, fotoVisivel, hashDoAparelho, hashDoIp, novoAparelho } from '@/lib/fotos-gestao'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`fotos-reacao:${ip}`, 60, 60000)
        if (!success) return NextResponse.json({ error: 'Muitos toques seguidos. Tente daqui a pouco.' }, { status: 429 })

        const corpo = await request.json().catch(() => null) as { foto?: unknown; gosto?: unknown; emoji?: unknown } | null
        const fotoId = Number(corpo?.foto)
        if (!Number.isInteger(fotoId) || fotoId <= 0 || typeof corpo?.gosto !== 'boolean' || (corpo.emoji !== undefined && !emojiValido(corpo.emoji))) {
            return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        }

        const emoji = emojiValido(corpo.emoji) ? corpo.emoji : EMOJIS_FOTOS[0]

        // So reage a fotos que a galeria mostra.
        const foto = await prisma.fotoAlbum.findFirst({
            where: { id: fotoId, album: { publicado: true }, ...fotoVisivel },
            select: { id: true, album: { select: { tenant_id: true } } },
        })
        if (!foto) return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })

        const jar = await cookies()
        let aparelho = jar.get(COOKIE_APARELHO)?.value
        const novo = !aparelhoValido(aparelho)
        if (novo) aparelho = novoAparelho()
        const hash = hashDoAparelho(aparelho!)

        if (corpo.gosto) {
            await prisma.fotoReacao.upsert({
                where: { foto_id_aparelho_hash_emoji: { foto_id: foto.id, aparelho_hash: hash, emoji } },
                create: { tenant_id: foto.album.tenant_id, foto_id: foto.id, aparelho_hash: hash, emoji, ip_hash: hashDoIp(ip) },
                update: {},
            })
        } else {
            await prisma.fotoReacao.deleteMany({ where: { foto_id: foto.id, aparelho_hash: hash, emoji } })
        }
        const contagens = (await contagemReacoes([foto.id])).get(foto.id) ?? {}
        const total = contagens[emoji] ?? 0

        const resposta = NextResponse.json({ ok: true, emoji, total, minha: corpo.gosto, contagens })
        if (novo) {
            resposta.cookies.set(COOKIE_APARELHO, aparelho!, {
                httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365,
                secure: process.env.NODE_ENV === 'production',
            })
        }
        return resposta
    } catch (error) {
        console.error('[API FOTOS] Erro na reacção:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

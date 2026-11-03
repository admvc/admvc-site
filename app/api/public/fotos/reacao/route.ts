// POST /api/public/fotos/reacao   { "foto": 123, "gosto": true | false }
// Um coracao por foto e por aparelho (cookie + hash; sem login, sem nomes). "gosto": false tira a reaccao.
// → { ok, total, minha }
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { aparelhoValido, COOKIE_APARELHO, fotoVisivel, hashDoAparelho, hashDoIp, novoAparelho } from '@/lib/fotos-gestao'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`fotos-reacao:${ip}`, 60, 60000)
        if (!success) return NextResponse.json({ error: 'Muitos toques seguidos. Tente daqui a pouco.' }, { status: 429 })

        const corpo = await request.json().catch(() => null) as { foto?: unknown; gosto?: unknown } | null
        const fotoId = Number(corpo?.foto)
        if (!Number.isInteger(fotoId) || fotoId <= 0 || typeof corpo?.gosto !== 'boolean') {
            return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        }

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
                where: { foto_id_aparelho_hash: { foto_id: foto.id, aparelho_hash: hash } },
                create: { tenant_id: foto.album.tenant_id, foto_id: foto.id, aparelho_hash: hash, ip_hash: hashDoIp(ip) },
                update: {},
            })
        } else {
            await prisma.fotoReacao.deleteMany({ where: { foto_id: foto.id, aparelho_hash: hash } })
        }
        const total = await prisma.fotoReacao.count({ where: { foto_id: foto.id } })

        const resposta = NextResponse.json({ ok: true, total, minha: corpo.gosto })
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

// POST /api/public/fotos/publicar?chave=…   { "album": 12 }
// No fim do envio: marca o album como publicado e escolhe a capa. So entao aparece em /fotos.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { igrejaDaChave } from '@/lib/fotos-api'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { success } = await rateLimit(`fotos-publicar:${ipDoPedido(request.headers)}`, 30, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429 })

        const tenantId = await igrejaDaChave(request)
        if (!tenantId) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const corpo = await request.json().catch(() => null) as { album?: unknown } | null
        const albumId = Number(corpo?.album)
        if (!Number.isInteger(albumId) || albumId <= 0) return NextResponse.json({ error: 'Álbum em falta.' }, { status: 400 })

        const album = await prisma.albumFoto.findFirst({
            where: { id: albumId, tenant_id: tenantId },
            select: { id: true, slug: true, capa_chave: true, fotos: { orderBy: [{ ordem: 'asc' }, { hora: 'asc' }, { id: 'asc' }], take: 1, select: { chave: true } } },
        })
        if (!album) return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
        if (!album.fotos.length) return NextResponse.json({ error: 'O álbum ainda não tem fotos.' }, { status: 409 })

        await prisma.albumFoto.update({
            where: { id: album.id },
            data: { publicado: true, capa_chave: album.capa_chave ?? album.fotos[0].chave },
        })

        return NextResponse.json({ ok: true, slug: album.slug, url: `/fotos/${album.slug}` })
    } catch (error) {
        console.error('[API FOTOS] Erro ao publicar o álbum:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

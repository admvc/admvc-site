// POST /api/public/fotos/album?chave=…
// O FotosCulto.exe pede (ou cria) o album do culto antes de enviar as fotos.
//   { "titulo": "Culto de Teste", "dia": "2026-11-02", "evento_id": 123 }
// → { ok, id, slug, url }
import { NextResponse } from 'next/server'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { igrejaDaChave } from '@/lib/fotos-api'
import prisma from '@/lib/prisma'
import { criarOuObterAlbum, diaValido } from '@/lib/fotos'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { success } = await rateLimit(`fotos-album:${ipDoPedido(request.headers)}`, 30, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos.' }, { status: 429 })

        const tenantId = await igrejaDaChave(request)
        if (!tenantId) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const corpo = await request.json().catch(() => null) as { titulo?: unknown; dia?: unknown; evento_id?: unknown } | null
        const titulo = String(corpo?.titulo ?? '').trim()
        const dia = String(corpo?.dia ?? '').trim()
        if (titulo.length < 2 || titulo.length > 120) return NextResponse.json({ error: 'Título inválido.' }, { status: 400 })
        if (!diaValido(dia)) return NextResponse.json({ error: 'Data inválida (AAAA-MM-DD).' }, { status: 400 })
        // O culto so liga ao album se for desta igreja.
        const pedidoEvento = Number(corpo?.evento_id)
        const evento = Number.isInteger(pedidoEvento) && pedidoEvento > 0
            ? await prisma.evento.findFirst({ where: { id: pedidoEvento, tenant_id: tenantId }, select: { id: true } })
            : null

        const album = await criarOuObterAlbum(tenantId, dia, titulo, evento?.id ?? null)
        return NextResponse.json({ ok: true, ...album, url: `/fotos/${album.slug}` })
    } catch (error) {
        console.error('[API FOTOS] Erro ao criar o álbum:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

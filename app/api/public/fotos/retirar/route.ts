// POST /api/public/fotos/retirar   { "foto": 123, "motivo": "opcional, ate 200 caracteres" }
// "Pedir para retirar esta foto": a foto fica escondida JA (pedido PENDENTE) ate a Midia decidir em /midia/fotos.
// Sem login e sem dados pessoais: nao se pede nome nem contacto; do IP guarda-se so um hash.
import { after, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { avisarMidia, fotoVisivel, hashDoIp } from '@/lib/fotos-gestao'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`fotos-retirar:${ip}`, 5, 60 * 60 * 1000)
        if (!success) return NextResponse.json({ error: 'Já enviou vários pedidos. Tente mais tarde ou fale com a equipa de mídia.' }, { status: 429 })

        const corpo = await request.json().catch(() => null) as { foto?: unknown; motivo?: unknown } | null
        const fotoId = Number(corpo?.foto)
        if (!Number.isInteger(fotoId) || fotoId <= 0) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        const motivo = String(corpo?.motivo ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 200) || null

        const foto = await prisma.fotoAlbum.findFirst({
            where: { id: fotoId, album: { publicado: true }, ...fotoVisivel },
            select: { id: true, album_id: true, album: { select: { tenant_id: true, titulo: true } } },
        })
        if (!foto) return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })
        const tenantId = foto.album.tenant_id

        // Travao geral: se alguem estiver a pedir a retirada de tudo, pára (a Midia ve os pedidos e decide).
        const naUltimaHora = await prisma.pedidoRetirarFoto.count({ where: { tenant_id: tenantId, criado_em: { gt: new Date(Date.now() - 3600_000) } } })
        if (naUltimaHora >= 30) return NextResponse.json({ error: 'Há muitos pedidos neste momento. Fale com a equipa de mídia.' }, { status: 429 })

        await prisma.pedidoRetirarFoto.create({
            data: { tenant_id: tenantId, album_id: foto.album_id, foto_id: foto.id, motivo, ip_hash: hashDoIp(ip) },
        })

        after(() => avisarMidia(tenantId, {
            title: 'Pedido para retirar uma foto',
            body: `Álbum "${foto.album.titulo}". A foto já está escondida até decidir.`,
            url: '/midia/fotos?aba=pedidos',
            tag: 'fotos-retirar',
        }))

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[API FOTOS] Erro no pedido de retirada:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

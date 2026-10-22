// Para o módulo do Holyrics: liga uma música do repertório à música certa da biblioteca do Holyrics (com a chave de Mídia).
//   POST ?chave=…&musica=<id do repertório>&holyrics=<id no Holyrics>
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { ligarMusica } from '@/lib/holyrics-culto'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
    try {
        const { success } = await rateLimit(`holyrics-ligar:${ipDoPedido(request.headers)}`, 30, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })

        const q = new URL(request.url).searchParams
        const tenantId = await tenantPublico()
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
        if (!tenantId || !chaveCerta(q.get('chave'), tenant?.holyrics_chave_hash)) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const musica = q.get('musica') ?? '', holyrics = q.get('holyrics') ?? ''
        if (!/^[\w-]{1,60}$/.test(musica) || !/^[\w-]{1,40}$/.test(holyrics)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        const r = await ligarMusica(tenantId, musica, holyrics)
        if (r === 'nao-encontrada') return NextResponse.json({ error: 'Música não encontrada no repertório.' }, { status: 404 })
        if (r === 'em-uso') return NextResponse.json({ error: 'Essa música do Holyrics já está ligada a outra do repertório.' }, { status: 409 })
        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao ligar música do Holyrics:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// Próximos eventos para a agenda do site público (30 dias). Os cultos regulares
// já estão na agenda semanal do site e as reuniões são internas, por isso ficam
// de fora. A descrição não sai (pode ter notas internas).
const TIPOS_PUBLICOS = ['CULTO_ESPECIAL', 'CONVIVIO', 'CULTO_RUA', 'MISSAO', 'FORMACAO']
const DIAS = 30

export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`eventos:${ip}`, 30, 60000)
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const tenant = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
        if (!tenant) return NextResponse.json({ ok: true, data: [] })

        const agora = new Date()
        const eventos = await prisma.evento.findMany({
            where: {
                tenant_id: tenant.id,
                tipo: { in: TIPOS_PUBLICOS },
                data: { gte: agora, lte: new Date(agora.getTime() + DIAS * 86400000) },
                OR: [{ congregacao_id: null }, { congregacao: { site_mostrar: true } }],
            },
            select: { id: true, nome: true, data: true, tipo: true, congregacao: { select: { nome: true, cidade: true } } },
            orderBy: { data: 'asc' },
            take: 20,
        })

        return NextResponse.json({ ok: true, data: eventos })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao buscar eventos:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

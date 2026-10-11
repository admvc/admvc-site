import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const { success } = rateLimit(`grupos:${ip}`, 30, 60000) // 30 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const grupos = await prisma.grupo.findMany({
            where: { publico: true },
            include: {
                lideres: {
                    select: { first_name: true, last_name: true, avatar_file: true }
                },
                _count: { select: { membros: true } }
            },
            orderBy: [{ regiao: 'asc' }, { nome: 'asc' }]
        })

        return NextResponse.json({ ok: true, data: grupos })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao buscar grupos:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}

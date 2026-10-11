import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const { success } = rateLimit(`obra:${ip}`, 30, 60000) // 30 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const projeto = await prisma.projetoObra.findFirst({
            include: {
                etapas: { orderBy: { ordem: 'asc' } }
            }
        })

        if (!projeto) {
            return NextResponse.json({ ok: true, data: null })
        }

        return NextResponse.json({ ok: true, data: projeto })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao buscar obra:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { lerArea, type PontoArea } from '@/lib/area-grupo'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`grupos:${ip}`, 30, 60000) // 30 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const grupos = await prisma.grupo.findMany({
            where: { publico: true },
            select: {
                id: true, nome: true, dia_semana: true, horario: true, perfil: true,
                categoria: true, descricao: true, bairro: true, cidade: true, regiao: true,
                latitude: true, longitude: true, area: true,
                lideres: {
                    select: { first_name: true, last_name: true, avatar_file: true }
                },
                _count: { select: { membros: true } }
            },
            orderBy: [{ regiao: 'asc' }, { nome: 'asc' }]
        })

        // Muitos grupos reúnem-se em casa de uma família: a rua, o número e o ponto
        // exato nunca saem para o site público. Vai a zona desenhada ou um ponto
        // arredondado (~1 km); a morada dá-se por contacto.
        const data = grupos.map(({ latitude, longitude, area, ...g }) => {
            const zona = lerArea(area)
            const centro = zona ? centroDe(zona) : latitude != null && longitude != null ? [latitude, longitude] : null
            return {
                ...g,
                latitude: centro ? arredondar(centro[0]) : null,
                longitude: centro ? arredondar(centro[1]) : null,
                area: zona,
            }
        })

        return NextResponse.json({ ok: true, data })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao buscar grupos:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}

const arredondar = (n: number) => Math.round(n * 100) / 100

function centroDe(zona: PontoArea[]): PontoArea {
    const lat = zona.reduce((s, p) => s + p[0], 0) / zona.length
    const lng = zona.reduce((s, p) => s + p[1], 0) / zona.length
    return [lat, lng]
}

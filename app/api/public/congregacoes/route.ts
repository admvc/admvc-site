import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { lerHorarios, mapaDe } from '@/lib/congregacao-site'

export const dynamic = 'force-dynamic'

// Congregações para o site público: só nome, cidade, morada, mapa, descrição e
// horários. Pastor, telefone e email nunca saem daqui (decisão de 14/10/2026).
export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`congregacoes:${ip}`, 30, 60000)
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const tenant = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
        if (!tenant) return NextResponse.json({ ok: true, data: [] })

        const congregacoes = await prisma.congregacao.findMany({
            where: { tenant_id: tenant.id, site_mostrar: true },
            select: {
                id: true, nome: true, cidade: true, endereco: true, codigo_postal: true,
                latitude: true, longitude: true, site_descricao: true, site_horarios: true,
            },
            orderBy: { id: 'asc' },
        })

        const data = congregacoes.map(({ site_descricao, site_horarios, ...c }) => ({
            id: c.id,
            nome: c.nome,
            cidade: c.cidade,
            endereco: [c.endereco, c.codigo_postal].filter(Boolean).join(', '),
            mapaUrl: mapaDe(c),
            descricao: site_descricao,
            horarios: lerHorarios(site_horarios),
        }))

        return NextResponse.json({ ok: true, data })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao buscar congregações:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

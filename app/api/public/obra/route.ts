import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { contasObra } from '@/lib/obra-tijolos'

export const dynamic = 'force-dynamic'

// Lida pelo site e pelo telão do VOLTA (outro domínio): CORS aberto no next.config.
export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`obra:${ip}`, 30, 60000) // 30 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        // Igreja principal: a primeira ativa (o mesmo critério das boas-vindas)
        const tenant = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
        const projeto = await prisma.projetoObra.findFirst({
            where: tenant ? { tenant_id: tenant.id } : undefined,
            orderBy: { id: 'asc' },
        })

        if (!projeto) {
            return NextResponse.json({ ok: true, data: null })
        }

        const valores = { valorObra: projeto.objetivoFinal, valorTijolo: projeto.valorTijolo, arrecadado: projeto.arrecadado }
        return NextResponse.json({
            ok: true,
            data: {
                titulo: projeto.titulo,
                descricao: projeto.descricao,
                chamada: projeto.chamada,
                versiculo: projeto.versiculo,
                versiculoRef: projeto.versiculoRef,
                videoUrl: projeto.videoUrl,
                ...valores,
                contribuintes: projeto.contribuintes,
                tijolos: contasObra(valores),
                atualizadoEm: projeto.atualizadoEm,
                // o site antigo lê estes dois; podem sair quando o novo estiver publicado
                objetivoFinal: projeto.objetivoFinal,
                etapas: [],
            },
        })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao buscar obra:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}

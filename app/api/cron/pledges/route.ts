// app/api/cron/pledges/route.ts
// Cron job diario (06:00) que atualiza o status de todos os pledges
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Verificar secret para proteger o endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Fetch all tenants
        const tenants = await prisma.tenant.findMany({
            select: { id: true },
        })

        const now = new Date()
        let totalAtualizados = 0

        for (const tenant of tenants) {
            const pledgesAtivos = await prisma.pledge.findMany({
                where: {
                    tenant_id: tenant.id,
                    status: { in: ['ATIVO', 'ATRASADO'] },
                },
            })

            for (const pledge of pledgesAtivos) {
                const inicio = new Date(pledge.data_inicio)
                const mesesPassados = Math.max(0,
                    (now.getFullYear() - inicio.getFullYear()) * 12 +
                    (now.getMonth() - inicio.getMonth())
                )

                // Somar contribuicoes deste membro ao fundo desde data_inicio
                const contribuicoes = await prisma.contribuicao.aggregate({
                    _sum: { valor: true },
                    _count: true,
                    where: {
                        membro_id: pledge.membro_id,
                        fundo_id: pledge.fundo_id,
                        data: { gte: inicio },
                        tenant_id: tenant.id,
                    },
                })

                const valor_cumprido = contribuicoes._sum.valor || 0
                const meses_cumpridos = pledge.valor_mensal > 0
                    ? Math.min(Math.floor(valor_cumprido / pledge.valor_mensal), pledge.duracao_meses)
                    : 0

                let novoStatus = pledge.status

                // Verificar se cumpriu tudo
                if (meses_cumpridos >= pledge.duracao_meses && valor_cumprido >= pledge.valor_mensal * pledge.duracao_meses) {
                    novoStatus = 'CUMPRIDO'
                }
                // Verificar se esta atrasado (mais de 1 mes de atraso)
                else if (mesesPassados > meses_cumpridos + 1) {
                    novoStatus = 'ATRASADO'
                }
                // Se estava atrasado mas recuperou
                else if (pledge.status === 'ATRASADO' && mesesPassados <= meses_cumpridos + 1) {
                    novoStatus = 'ATIVO'
                }

                // Only update if something changed
                if (novoStatus !== pledge.status || meses_cumpridos !== pledge.meses_cumpridos || valor_cumprido !== pledge.valor_cumprido) {
                    await prisma.pledge.update({
                        where: { id: pledge.id },
                        data: {
                            meses_cumpridos,
                            valor_cumprido,
                            status: novoStatus,
                        },
                    })
                    totalAtualizados++
                }
            }
        }

        return NextResponse.json({
            ok: true,
            tenants: tenants.length,
            updated: totalAtualizados,
        })
    } catch (error: any) {
        console.error('[CRON PLEDGES] Erro:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

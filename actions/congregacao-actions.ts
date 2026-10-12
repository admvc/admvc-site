'use server'

import prisma from '@/lib/prisma'
import { criarSessaoMembro } from '@/lib/sessao'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth-utils'

export async function selecionarCongregacao(congregacaoId: number) {
    const session = await requireAuth()

    // So congregacoes da propria igreja
    const congregacao = await prisma.congregacao.findUnique({ where: { id: congregacaoId }, select: { tenant_id: true } })
    if (!congregacao || congregacao.tenant_id !== session.tenantId) throw new Error('Congregação não encontrada.')

    // Atualiza o membro com a congregação escolhida
    await prisma.membro.update({
        where: { id: session.membroId },
        data: { congregacao_id: congregacaoId }
    })

    // Reemite a sessao com a congregacao nova
    const membro = await prisma.membro.findUnique({
        where: { id: session.membroId },
        include: { tenant: { select: { plano: true } } },
    })
    if (membro) await criarSessaoMembro({ ...membro, plano: membro.tenant?.plano })

    if (session.role === 'ADMIN') redirect('/admin/dashboard')
    redirect('/membros/dashboard')
}

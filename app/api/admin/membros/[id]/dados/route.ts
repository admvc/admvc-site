// app/api/admin/membros/[id]/dados/route.ts
// Exportar os dados de um membro (pedido de acesso feito a administracao).

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sessaoDaApi } from '@/lib/api-auth'
import { dadosDoMembro } from '@/lib/rgpd'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const { sessao, erro } = await sessaoDaApi(['ADMIN', 'CONGREGATION_ADMIN'])
    if (erro) return erro

    const id = Number(params.id)
    const alvo = Number.isInteger(id)
        ? await prisma.membro.findUnique({ where: { id }, select: { id: true, tenant_id: true } })
        : null
    if (!alvo || alvo.tenant_id !== sessao.tenantId) {
        return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })
    }

    const dados = await dadosDoMembro(alvo.id)
    await audit({
        tenant_id: sessao.tenantId,
        categoria: 'RGPD',
        acao: 'EXPORT',
        alvo_id: alvo.id,
        alvo_tipo: 'MEMBRO',
        descricao: `Dados do membro #${alvo.id} exportados pela administracao`,
    })

    return new NextResponse(JSON.stringify(dados, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="membro-${alvo.id}-dados.json"`,
            'Cache-Control': 'no-store',
        },
    })
}

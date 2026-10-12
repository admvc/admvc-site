// app/api/membros/meus-dados/route.ts
// Direito de acesso (RGPD, art. 15.º): o membro descarrega tudo o que o
// portal guarda sobre si, num ficheiro JSON.

import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { dadosDoMembro } from '@/lib/rgpd'
import { audit } from '@/lib/audit'

export const dynamic = 'force-dynamic'

export async function GET() {
    const { sessao, erro } = await sessaoDaApi()
    if (erro) return erro

    const dados = await dadosDoMembro(sessao.membroId)
    if (!dados) return NextResponse.json({ error: 'Membro não encontrado.' }, { status: 404 })

    await audit({
        tenant_id: sessao.tenantId,
        categoria: 'RGPD',
        acao: 'EXPORT',
        actor_id: sessao.membroId,
        alvo_id: sessao.membroId,
        alvo_tipo: 'MEMBRO',
        descricao: 'Membro descarregou os seus dados',
    })

    return new NextResponse(JSON.stringify(dados, null, 2), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="os-meus-dados-admvc.json"',
            'Cache-Control': 'no-store',
        },
    })
}

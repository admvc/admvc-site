// /inscricoes/<slug>/csv — as inscrições em CSV (abre no Excel), só para quem gere o evento.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEvento } from '@/lib/inscricoes-acesso'
import { csvInscricoes } from '@/lib/inscricoes'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const sessao = await getSessionData()
    if (!sessao) return NextResponse.json({ error: 'Sem sessão' }, { status: 401 })
    const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!evento || !(await podeGerirEvento(sessao, evento))) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

    const linhas = await prisma.inscricao.findMany({ where: { evento_inscricao_id: evento.id }, orderBy: { criado_em: 'asc' } })
    const csv = csvInscricoes(linhas.map(i => ({ ...i, membro: !!i.membro_id })))
    return new NextResponse(csv, {
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="inscricoes-${evento.slug}.csv"`,
            'Cache-Control': 'no-store',
        },
    })
}

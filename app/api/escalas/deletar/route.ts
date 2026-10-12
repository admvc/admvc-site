// app/api/escalas/deletar/route.ts
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'

export async function DELETE(req: Request) {
    const { sessao, erro } = await sessaoDaApi()
    if (erro) return erro
    const tenantId = sessao.tenantId
    const db = getTenantClient(tenantId)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })

    try {
        const escala = await db.escala.findUnique({ where: { id: parseInt(id) }, select: { departamento_id: true } })
        if (!escala) return NextResponse.json({ error: 'Escala não encontrada.' }, { status: 404 })
        if (!(await podeGerirEscalasDoDepartamento(sessao, escala.departamento_id))) {
            return NextResponse.json({ error: 'Sem permissão para gerir escalas deste departamento.' }, { status: 403 })
        }
        await db.escala.delete({
            where: { id: parseInt(id) }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao deletar escala' }, { status: 500 })
    }
}
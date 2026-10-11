// app/api/escalas/deletar/route.ts
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'

export async function DELETE(req: Request) {
    const tenantId = Number(req.headers.get('x-tenant-id') || 0)
    if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })
    const db = getTenantClient(tenantId)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 })

    try {
        await db.escala.delete({
            where: { id: parseInt(id) }
        })
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao deletar escala' }, { status: 500 })
    }
}
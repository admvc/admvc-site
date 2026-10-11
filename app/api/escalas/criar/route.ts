// app/api/escalas/criar/route.ts
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const tenantId = Number(request.headers.get('x-tenant-id') || 0)
        if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })
        const db = getTenantClient(tenantId)

        const body = await request.json()
        const { eventoId, membroId, departamentoId, funcao, funcaoId, horario } = body

        // Validação básica
        if (!eventoId || !membroId || !departamentoId || !funcao) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
        }

        // Criar a escala no banco
        const novaEscala = await db.escala.create({
            data: {
                evento_id: Number(eventoId),
                membro_id: Number(membroId),
                departamento_id: Number(departamentoId),
                funcao: String(funcao),
                funcao_id: funcaoId ? Number(funcaoId) : null,
                horario: String(horario),
                tenant_id: tenantId,
            },
            include: {
                evento: true,
                membro: true,
                departamento: true
            }
        })

        return NextResponse.json(novaEscala)

    } catch (error: any) {
        console.error("ERRO AO CRIAR ESCALA:", error)

        // Verifica se o erro é de duplicidade (P2002 no Prisma)
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Este voluntário já está escalado para este evento neste departamento.' },
                { status: 400 }
            )
        }

        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
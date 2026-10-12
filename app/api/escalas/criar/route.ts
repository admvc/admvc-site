// app/api/escalas/criar/route.ts
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'

export async function POST(request: Request) {
    try {
        const { sessao, erro } = await sessaoDaApi()
        if (erro) return erro
        const tenantId = sessao.tenantId
        const db = getTenantClient(tenantId)

        const body = await request.json()
        const { eventoId, membroId, departamentoId, funcao, funcaoId, horario } = body

        // Validação básica
        if (!eventoId || !membroId || !departamentoId || !funcao) {
            return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
        }
        if (!(await podeGerirEscalasDoDepartamento(sessao, Number(departamentoId)))) {
            return NextResponse.json({ error: 'Sem permissão para gerir escalas deste departamento.' }, { status: 403 })
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
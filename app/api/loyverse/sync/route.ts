// app/api/loyverse/sync/route.ts
import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'
import { getLoyverseTokenForTenant, createLoyverseCustomer } from '@/lib/loyverse-api'

export async function POST(request: Request) {
    try {
        const tenantId = Number(request.headers.get('x-tenant-id') || 0)
        if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })
        const db = getTenantClient(tenantId)

        const token = await getLoyverseTokenForTenant(tenantId)
        if (!token) {
            return NextResponse.json({ error: 'Loyverse nao configurado para este tenant.' }, { status: 400 })
        }

        const body = await request.json()
        const { membroId } = body

        if (!membroId) {
            return NextResponse.json({ error: 'ID do membro é obrigatório.' }, { status: 400 })
        }

        // 1. Busca o membro no seu banco de dados
        const membro = await db.membro.findUnique({
            where: { id: Number(membroId) }
        })

        if (!membro) {
            return NextResponse.json({ error: 'Membro não encontrado no banco.' }, { status: 404 })
        }

        // Se ele já tem o loyverse_id, não precisamos criar de novo
        if (membro.loyverse_id) {
            return NextResponse.json({
                message: 'Membro já está sincronizado com a Cantina.',
                loyverse_id: membro.loyverse_id
            })
        }

        // 2. Prepara os dados para enviar para o Loyverse
        const loyversePayload = {
            name: `${membro.first_name} ${membro.last_name}`,
            email: membro.email,
            // phone_number: membro.telefone // (Descomente se você tiver telefone no banco)
            note: "Membro integrado via App da Igreja"
        }

        // 3. Cria o cliente no Loyverse via helper centralizado
        const data = await createLoyverseCustomer(token, loyversePayload)
        const novoLoyverseId = data.id

        // 5. Salva o ID gerado pelo Loyverse no perfil do membro no SEU banco
        await db.membro.update({
            where: { id: membro.id },
            data: { loyverse_id: novoLoyverseId }
        })

        return NextResponse.json({
            success: true,
            message: 'Carteira digital criada com sucesso!',
            loyverse_id: novoLoyverseId
        })

    } catch (error: any) {
        console.error("ERRO INTERNO SYNC LOYVERSE:", error)
        return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
    }
}
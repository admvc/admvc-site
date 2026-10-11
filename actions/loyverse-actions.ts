// actions/loyverse-actions.ts
'use server'

import { getDb } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'

export async function vincularLoyverseId(membroId: number, loyverseId: string) {
    try {
        await requireRole(['ADMIN'])
        const db = await getDb()
        await db.membro.update({
            where: { id: membroId },
            data: { loyverse_id: loyverseId }
        })

        // Substitui pela rota real onde está o teu relatório
        revalidatePath('/admin/relatorios/loyverse')
        return { sucesso: true }
    } catch (error) {
        console.error("Erro ao vincular Loyverse:", error)
        return { sucesso: false, erro: "Falha ao gravar o ID na base de dados." }
    }
}
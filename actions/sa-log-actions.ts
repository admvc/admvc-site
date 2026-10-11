'use server'

import prisma from '@/lib/prisma'

export async function logSA(saId: number, acao: string, detalhes?: string) {
    try {
        await prisma.superAdminLog.create({
            data: { sa_id: saId, acao, detalhes },
        })
    } catch {} // fire and forget
}

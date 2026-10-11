'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// ══════════════════════════════════════════════════════════════════════════════
// CRIAR FIADO
// ══════════════════════════════════════════════════════════════════════════════

export async function criarFiado(membroId: number, valor: number, descricao?: string, transacaoId?: number) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (valor <= 0) return { error: 'O valor do fiado deve ser positivo.' }

    try {
        await (db as any).fiadoCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: membroId,
                valor,
                descricao: descricao || null,
                transacao_id: transacaoId || null,
                status: 'PENDENTE',
                operador_id: session.membroId,
            },
        })

        revalidatePath('/cantina')
        return { success: true }
    } catch (error) {
        console.error('Erro ao criar fiado:', error)
        return { error: 'Erro ao criar fiado.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LIQUIDAR FIADO
// ══════════════════════════════════════════════════════════════════════════════

export async function liquidarFiado(fiadoId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()

    try {
        const fiado = await db.fiadoCantina.findUnique({ where: { id: fiadoId } })

        if (!fiado) return { error: 'Fiado nao encontrado.' }
        if (fiado.status !== 'PENDENTE') return { error: 'Este fiado ja foi liquidado.' }

        // Tentar debitar do saldo do membro se houver saldo suficiente
        const saldo = await db.saldoCantina.findUnique({ where: { membro_id: fiado.membro_id } })

        if (saldo && saldo.saldo >= fiado.valor_devido) {
            await db.saldoCantina.update({
                where: { membro_id: fiado.membro_id },
                data: { saldo: { decrement: fiado.valor_devido } },
            })
        }

        // Marcar como liquidado
        await db.fiadoCantina.update({
            where: { id: fiadoId },
            data: {
                status: 'LIQUIDADO',
                liquidado_em: new Date(),
            },
        })

        revalidatePath('/cantina')
        return { success: true }
    } catch (error) {
        console.error('Erro ao liquidar fiado:', error)
        return { error: 'Erro ao liquidar fiado.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// OBTER FIADOS DE UM MEMBRO
// ══════════════════════════════════════════════════════════════════════════════

export async function obterFiadosMembro(membroId: number) {
    const db = await getDb()

    try {
        const fiados = await db.fiadoCantina.findMany({
            where: {
                membro_id: membroId,
                status: 'PENDENTE',
            },
            orderBy: { criado_em: 'desc' },
        })

        return fiados
    } catch (error) {
        console.error('Erro ao obter fiados do membro:', error)
        return []
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// OBTER TODOS OS FIADOS PENDENTES
// ══════════════════════════════════════════════════════════════════════════════

export async function obterTodosFiadosPendentes() {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()

    try {
        const fiados = await db.fiadoCantina.findMany({
            where: { status: 'PENDENTE' },
            include: {
                membro: {
                    select: { first_name: true, last_name: true },
                },
            },
            orderBy: { criado_em: 'desc' },
        })

        const total = fiados.reduce((sum: number, f: any) => sum + f.valor, 0)

        return { fiados, total }
    } catch (error) {
        console.error('Erro ao obter fiados pendentes:', error)
        return { fiados: [], total: 0 }
    }
}

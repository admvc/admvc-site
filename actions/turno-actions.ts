'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// ══════════════════════════════════════════════════════════════════════════════
// ABRIR TURNO
// ══════════════════════════════════════════════════════════════════════════════

export async function abrirTurno(valorInicial: number) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (valorInicial < 0) return { error: 'O valor inicial nao pode ser negativo.' }

    try {
        // Verificar se ja existe um turno aberto para este operador
        const turnoExistente = await db.turnoCantina.findFirst({
            where: {
                operador_id: session.membroId,
                status: 'ABERTO',
            },
        })

        if (turnoExistente) {
            return { error: 'Ja existe um turno aberto para este operador.' }
        }

        const turno = await (db as any).turnoCantina.create({
            data: {
                tenant_id: tenantId,
                operador_id: session.membroId,
                status: 'ABERTO',
                valor_inicial: valorInicial,
            },
        })

        revalidatePath('/cantina')
        return { success: true, turnoId: turno.id }
    } catch (error) {
        console.error('Erro ao abrir turno:', error)
        return { error: 'Erro ao abrir turno.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// FECHAR TURNO
// ══════════════════════════════════════════════════════════════════════════════

export async function fecharTurno(turnoId: number, valorFinalReal: number, observacao?: string) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const turno = await db.turnoCantina.findUnique({ where: { id: turnoId } })

        if (!turno) return { error: 'Turno nao encontrado.' }
        if (turno.operador_id !== session.membroId) return { error: 'Este turno nao pertence a este operador.' }
        if (turno.status !== 'ABERTO') return { error: 'Este turno ja esta fechado.' }

        // Buscar todas as transacoes deste turno
        const transacoes = await db.transacaoCantina.findMany({
            where: { turno_id: turnoId },
        })

        // Calcular totais por forma de pagamento
        let totalDinheiro = 0
        let totalMbway = 0
        let totalTransferencia = 0
        let totalCreditos = 0
        let totalVendas = 0

        for (const t of transacoes) {
            const valorAbs = Math.abs(t.valor)
            if (t.tipo === 'CONSUMO') {
                totalVendas += valorAbs
                switch (t.forma_pagamento) {
                    case 'DINHEIRO':
                        totalDinheiro += valorAbs
                        break
                    case 'MBWAY':
                        totalMbway += valorAbs
                        break
                    case 'TRANSFERENCIA':
                        totalTransferencia += valorAbs
                        break
                    case 'CREDITOS':
                        totalCreditos += valorAbs
                        break
                }
            }
        }

        // Valor esperado em caixa = valor_inicial + dinheiro recebido
        const valorFinalEsperado = turno.valor_inicial + totalDinheiro
        const diferenca = valorFinalReal - valorFinalEsperado

        // Fechar turno
        await db.turnoCantina.update({
            where: { id: turnoId },
            data: {
                status: 'FECHADO',
                fecho_em: new Date(),
                valor_final_esperado: valorFinalEsperado,
                valor_final_real: valorFinalReal,
                diferenca,
                observacao: observacao || null,
            },
        })

        revalidatePath('/cantina')
        return {
            success: true,
            resumo: {
                totalVendas,
                totalCreditos,
                totalDinheiro,
                totalMbway,
                totalTransferencia,
                diferenca,
            },
        }
    } catch (error) {
        console.error('Erro ao fechar turno:', error)
        return { error: 'Erro ao fechar turno.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// OBTER TURNO ABERTO
// ══════════════════════════════════════════════════════════════════════════════

export async function obterTurnoAberto() {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const turno = await db.turnoCantina.findFirst({
            where: {
                operador_id: session.membroId,
                status: 'ABERTO',
            },
            include: {
                _count: {
                    select: { transacoes: true },
                },
            },
        })

        return turno || null
    } catch (error) {
        console.error('Erro ao obter turno aberto:', error)
        return null
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORICO DE TURNOS
// ══════════════════════════════════════════════════════════════════════════════

export async function obterHistoricoTurnos(limite = 20) {
    const db = await getDb()

    try {
        const turnos = await db.turnoCantina.findMany({
            where: { status: 'FECHADO' },
            include: {
                operador: {
                    select: { first_name: true, last_name: true },
                },
            },
            orderBy: { fecho_em: 'desc' },
            take: limite,
        })

        return turnos
    } catch (error) {
        console.error('Erro ao obter historico de turnos:', error)
        return []
    }
}

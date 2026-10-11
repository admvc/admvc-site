'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// ══════════════════════════════════════════════════════════════════════════════
// CRIAR PRE-ENCOMENDA (Membro)
// ══════════════════════════════════════════════════════════════════════════════

interface ItemEncomenda {
    produtoId: number
    quantidade: number
}

export async function criarPreEncomenda(eventoId: number, itens: ItemEncomenda[], pagarComCreditos: boolean = true) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (!itens.length) return { error: 'Adicione pelo menos um item.' }

    try {
        // Verificar evento existe e e futuro
        const evento = await db.evento.findUnique({ where: { id: eventoId } })
        if (!evento || evento.data < new Date()) {
            return { error: 'Evento nao encontrado ou ja passou.' }
        }

        // Verificar se ja tem encomenda para este evento
        const existente = await db.preEncomendaCantina.findFirst({
            where: { membro_id: session.membroId, evento_id: eventoId, status: { in: ['PENDENTE', 'CONFIRMADA'] } },
        })
        if (existente) {
            return { error: 'Ja tem uma encomenda para este evento. Cancele a anterior para fazer uma nova.' }
        }

        // Buscar produtos e calcular total
        const produtoIds = itens.map(i => i.produtoId)
        const produtos = await db.produtoCantina.findMany({
            where: { id: { in: produtoIds }, disponivel: true },
        })

        if (produtos.length !== produtoIds.length) {
            return { error: 'Um ou mais produtos nao estao disponiveis.' }
        }

        let total = 0
        const itensValidados = itens.map(item => {
            const produto = produtos.find(p => p.id === item.produtoId)!
            total += produto.preco * item.quantidade
            return { produto_id: item.produtoId, quantidade: item.quantidade, preco_unitario: produto.preco }
        })

        // Se pagar com creditos, debitar saldo agora
        let pago = false
        if (pagarComCreditos) {
            const saldo = await db.saldoCantina.findUnique({ where: { membro_id: session.membroId } })
            if (!saldo || saldo.saldo < total) {
                return { error: `Saldo insuficiente. Disponivel: ${(saldo?.saldo || 0).toFixed(2)}€. Total: ${total.toFixed(2)}€` }
            }

            await db.saldoCantina.update({
                where: { membro_id: session.membroId },
                data: { saldo: { decrement: total } },
            })

            // Registar transacao
            const saldoAtualizado = saldo.saldo - total
            await (db as any).transacaoCantina.create({
                data: {
                    tenant_id: tenantId,
                    membro_id: session.membroId,
                    tipo: 'CONSUMO',
                    valor: -total,
                    saldo_apos: saldoAtualizado,
                    descricao: `Pre-encomenda para ${evento.nome}`,
                    operador_id: session.membroId,
                    forma_pagamento: 'CREDITOS',
                },
            })
            pago = true
        }

        // Criar encomenda
        await (db as any).preEncomendaCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: session.membroId,
                evento_id: eventoId,
                total,
                pago,
                status: 'CONFIRMADA',
                itens: {
                    create: itensValidados,
                },
            },
        })

        revalidatePath('/cantina')
        revalidatePath('/membros/dashboard')
        return { success: true, total }
    } catch (error) {
        console.error('Erro ao criar pre-encomenda:', error)
        return { error: 'Erro ao criar encomenda. Tente novamente.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CANCELAR ENCOMENDA (Membro ou Admin)
// ══════════════════════════════════════════════════════════════════════════════

export async function cancelarPreEncomenda(encomendaId: number) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const encomenda = await db.preEncomendaCantina.findUnique({ where: { id: encomendaId } })

        if (!encomenda) return { error: 'Encomenda nao encontrada.' }

        const isAdmin = session.role === 'ADMIN' || session.role === 'CONGREGATION_ADMIN'
        if (encomenda.membro_id !== session.membroId && !isAdmin) {
            return { error: 'Sem permissao para cancelar esta encomenda.' }
        }

        if (encomenda.status === 'ENTREGUE') {
            return { error: 'Encomenda ja foi entregue.' }
        }

        if (encomenda.status === 'CANCELADA') {
            return { error: 'Encomenda ja esta cancelada.' }
        }

        // Devolver saldo se foi pago com creditos
        if (encomenda.pago) {
            const tenantId = await getTenantIdFromHeaders()
            const saldo = await db.saldoCantina.findUnique({ where: { membro_id: encomenda.membro_id } })
            const novoSaldo = (saldo?.saldo || 0) + encomenda.total

            await db.saldoCantina.update({
                where: { membro_id: encomenda.membro_id },
                data: { saldo: novoSaldo },
            })

            await (db as any).transacaoCantina.create({
                data: {
                    tenant_id: tenantId,
                    membro_id: encomenda.membro_id,
                    tipo: 'ESTORNO',
                    valor: encomenda.total,
                    saldo_apos: novoSaldo,
                    descricao: `Estorno pre-encomenda #${encomendaId}`,
                    forma_pagamento: 'CREDITOS',
                },
            })
        }

        await db.preEncomendaCantina.update({
            where: { id: encomendaId },
            data: { status: 'CANCELADA', cancelado_em: new Date() },
        })

        revalidatePath('/cantina')
        return { success: true }
    } catch (error) {
        console.error('Erro ao cancelar encomenda:', error)
        return { error: 'Erro ao cancelar.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// MARCAR COMO ENTREGUE (Operador/Admin)
// ══════════════════════════════════════════════════════════════════════════════

export async function marcarEntregue(encomendaId: number) {
    await requireAuth()
    const db = await getDb()

    try {
        const encomenda = await db.preEncomendaCantina.findUnique({ where: { id: encomendaId } })
        if (!encomenda || encomenda.status !== 'CONFIRMADA') {
            return { error: 'Encomenda nao encontrada ou nao esta confirmada.' }
        }

        await db.preEncomendaCantina.update({
            where: { id: encomendaId },
            data: { status: 'ENTREGUE', entregue_em: new Date() },
        })

        revalidatePath('/cantina/encomendas')
        return { success: true }
    } catch (error) {
        console.error('Erro ao marcar entregue:', error)
        return { error: 'Erro ao marcar entregue.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTAS
// ══════════════════════════════════════════════════════════════════════════════

export async function obterMinhasEncomendas() {
    const session = await requireAuth()
    const db = await getDb()

    return db.preEncomendaCantina.findMany({
        where: { membro_id: session.membroId, status: { in: ['PENDENTE', 'CONFIRMADA'] } },
        include: {
            evento: { select: { nome: true, data: true } },
            itens: { include: { produto: { select: { nome: true } } } },
        },
        orderBy: { criado_em: 'desc' },
    })
}

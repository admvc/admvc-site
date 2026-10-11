'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

/**
 * Cria uma nova promessa de contribuicao (pledge).
 * Qualquer membro autenticado pode criar.
 */
export async function criarPledge(formData: FormData) {
    const session = await requireAuth()
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const fundo_id = Number(formData.get('fundo_id'))
    const valor_mensal = parseFloat(formData.get('valor_mensal') as string)
    const duracao_meses = parseInt(formData.get('duracao_meses') as string)
    const observacao = (formData.get('observacao') as string)?.trim() || null
    // Admin pode criar pledge para outro membro
    const membro_id_raw = formData.get('membro_id')
    const membro_id = membro_id_raw ? Number(membro_id_raw) : session.membroId

    if (!fundo_id || isNaN(fundo_id)) {
        return { ok: false, error: 'Fundo e obrigatorio.' }
    }

    if (!valor_mensal || isNaN(valor_mensal) || valor_mensal <= 0) {
        return { ok: false, error: 'Valor mensal deve ser maior que zero.' }
    }

    if (!duracao_meses || isNaN(duracao_meses) || duracao_meses < 1) {
        return { ok: false, error: 'Duracao deve ser pelo menos 1 mes.' }
    }

    // Apenas admin pode criar pledge para outro membro
    if (membro_id !== session.membroId && !['ADMIN', 'FINANCE'].includes(session.role)) {
        return { ok: false, error: 'Sem permissao para criar pledge para outro membro.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundo_id, tenant_id: tenantId, ativo: true }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado ou inativo.' }
        }

        // data_inicio = primeiro dia do proximo mes
        const now = new Date()
        const data_inicio = new Date(now.getFullYear(), now.getMonth() + 1, 1)

        const pledge = await prisma.pledge.create({
            data: {
                tenant_id: tenantId,
                membro_id: membro_id,
                fundo_id,
                valor_mensal,
                duracao_meses,
                data_inicio,
                status: 'ATIVO',
                observacao,
            }
        })

        revalidatePath('/financeiro/pledges')
        return { ok: true, pledge }
    } catch (error) {
        console.error('Erro ao criar pledge:', error)
        return { ok: false, error: 'Erro ao criar promessa de contribuicao.' }
    }
}

/**
 * Cancela um pledge. Apenas o dono ou admin pode cancelar.
 */
export async function cancelarPledge(pledgeId: number) {
    const session = await requireAuth()
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const pledge = await prisma.pledge.findFirst({
            where: { id: pledgeId, tenant_id: tenantId }
        })

        if (!pledge) {
            return { ok: false, error: 'Pledge nao encontrado.' }
        }

        // Apenas o dono ou admin pode cancelar
        if (pledge.membro_id !== session.membroId && !['ADMIN', 'FINANCE'].includes(session.role)) {
            return { ok: false, error: 'Sem permissao para cancelar este pledge.' }
        }

        if (pledge.status === 'CANCELADO') {
            return { ok: false, error: 'Este pledge ja esta cancelado.' }
        }

        await prisma.pledge.update({
            where: { id: pledgeId },
            data: { status: 'CANCELADO' }
        })

        revalidatePath('/financeiro/pledges')
        return { ok: true }
    } catch (error) {
        console.error('Erro ao cancelar pledge:', error)
        return { ok: false, error: 'Erro ao cancelar pledge.' }
    }
}

/**
 * Atualiza o cumprimento de todos os pledges ativos.
 * Apenas ADMIN ou FINANCE.
 */
export async function atualizarCumprimento() {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const pledgesAtivos = await prisma.pledge.findMany({
            where: {
                tenant_id: tenantId,
                status: { in: ['ATIVO', 'ATRASADO'] }
            }
        })

        const now = new Date()
        let atualizados = 0

        for (const pledge of pledgesAtivos) {
            // Quantos meses passaram desde data_inicio
            const inicio = new Date(pledge.data_inicio)
            const mesesPassados = Math.max(0,
                (now.getFullYear() - inicio.getFullYear()) * 12 +
                (now.getMonth() - inicio.getMonth())
            )

            // Somar contribuicoes deste membro ao fundo desde data_inicio
            const contribuicoes = await prisma.contribuicao.aggregate({
                _sum: { valor: true },
                _count: true,
                where: {
                    membro_id: pledge.membro_id,
                    fundo_id: pledge.fundo_id,
                    data: { gte: inicio },
                    tenant_id: tenantId,
                }
            })

            const valor_cumprido = contribuicoes._sum.valor || 0
            // Estimar meses cumpridos com base no valor
            const meses_cumpridos = pledge.valor_mensal > 0
                ? Math.min(Math.floor(valor_cumprido / pledge.valor_mensal), pledge.duracao_meses)
                : 0

            let novoStatus = pledge.status

            // Verificar se cumpriu tudo
            if (meses_cumpridos >= pledge.duracao_meses && valor_cumprido >= pledge.valor_mensal * pledge.duracao_meses) {
                novoStatus = 'CUMPRIDO'
            }
            // Verificar se esta atrasado (mais de 1 mes de atraso)
            else if (mesesPassados > meses_cumpridos + 1) {
                novoStatus = 'ATRASADO'
            }
            // Se estava atrasado mas recuperou
            else if (pledge.status === 'ATRASADO' && mesesPassados <= meses_cumpridos + 1) {
                novoStatus = 'ATIVO'
            }

            await prisma.pledge.update({
                where: { id: pledge.id },
                data: {
                    meses_cumpridos,
                    valor_cumprido,
                    status: novoStatus,
                }
            })

            atualizados++
        }

        revalidatePath('/financeiro/pledges')
        return { ok: true, atualizados }
    } catch (error) {
        console.error('Erro ao atualizar cumprimento:', error)
        return { ok: false, error: 'Erro ao atualizar cumprimento dos pledges.' }
    }
}

/**
 * Atualiza automaticamente o status de todos os pledges ativos/atrasados.
 * Versao simplificada que pode ser chamada no carregamento da pagina sem requireRole.
 */
export async function atualizarPledgesAutomatico() {
    await requireAuth()
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const pledgesAtivos = await prisma.pledge.findMany({
            where: {
                tenant_id: tenantId,
                status: { in: ['ATIVO', 'ATRASADO'] }
            }
        })

        const now = new Date()
        let atualizados = 0

        for (const pledge of pledgesAtivos) {
            const inicio = new Date(pledge.data_inicio)
            const mesesPassados = Math.max(0,
                (now.getFullYear() - inicio.getFullYear()) * 12 +
                (now.getMonth() - inicio.getMonth())
            )

            // Somar contribuicoes deste membro ao fundo desde data_inicio
            const contribuicoes = await prisma.contribuicao.aggregate({
                _sum: { valor: true },
                _count: true,
                where: {
                    membro_id: pledge.membro_id,
                    fundo_id: pledge.fundo_id,
                    data: { gte: inicio },
                    tenant_id: tenantId,
                }
            })

            const valor_cumprido = contribuicoes._sum.valor || 0
            const meses_cumpridos = pledge.valor_mensal > 0
                ? Math.min(Math.floor(valor_cumprido / pledge.valor_mensal), pledge.duracao_meses)
                : 0

            let novoStatus = pledge.status

            // Verificar se cumpriu tudo
            if (meses_cumpridos >= pledge.duracao_meses && valor_cumprido >= pledge.valor_mensal * pledge.duracao_meses) {
                novoStatus = 'CUMPRIDO'
            }
            // Verificar se esta atrasado (mais de 1 mes de atraso)
            else if (mesesPassados > meses_cumpridos + 1) {
                novoStatus = 'ATRASADO'
            }
            // Se estava atrasado mas recuperou
            else if (pledge.status === 'ATRASADO' && mesesPassados <= meses_cumpridos + 1) {
                novoStatus = 'ATIVO'
            }

            // Only update if something changed
            if (novoStatus !== pledge.status || meses_cumpridos !== pledge.meses_cumpridos || valor_cumprido !== pledge.valor_cumprido) {
                await prisma.pledge.update({
                    where: { id: pledge.id },
                    data: {
                        meses_cumpridos,
                        valor_cumprido,
                        status: novoStatus,
                    }
                })
                atualizados++
            }
        }

        return { ok: true, atualizados }
    } catch (error) {
        console.error('Erro ao atualizar pledges automaticamente:', error)
        return { ok: false, error: 'Erro ao atualizar pledges.' }
    }
}

/**
 * Obter pledges do membro logado.
 */
export async function obterMeusPledges() {
    const session = await requireAuth()
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const pledges = await prisma.pledge.findMany({
            where: {
                tenant_id: tenantId,
                membro_id: session.membroId,
            },
            include: {
                fundo: { select: { id: true, nome: true } },
            },
            orderBy: { criado_em: 'desc' },
        })

        return { ok: true, pledges }
    } catch (error) {
        console.error('Erro ao obter pledges:', error)
        return { ok: false, error: 'Erro ao carregar promessas.', pledges: [] }
    }
}

/**
 * Obter todos os pledges (admin/finance).
 */
export async function obterTodosPledges() {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const pledges = await prisma.pledge.findMany({
            where: { tenant_id: tenantId },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true } },
                fundo: { select: { id: true, nome: true } },
            },
            orderBy: { criado_em: 'desc' },
        })

        const ativos = pledges.filter(p => p.status === 'ATIVO')
        const atrasados = pledges.filter(p => p.status === 'ATRASADO')
        const cumpridos = pledges.filter(p => p.status === 'CUMPRIDO')
        const cancelados = pledges.filter(p => p.status === 'CANCELADO')

        const totalPrometidoMensal = ativos.reduce((s, p) => s + p.valor_mensal, 0) +
            atrasados.reduce((s, p) => s + p.valor_mensal, 0)
        const totalCumprido = pledges.reduce((s, p) => s + p.valor_cumprido, 0)

        return {
            ok: true,
            pledges,
            stats: {
                ativos: ativos.length,
                atrasados: atrasados.length,
                cumpridos: cumpridos.length,
                cancelados: cancelados.length,
                totalPrometidoMensal,
                totalCumprido,
            },
            grupos: { ativos, atrasados, cumpridos, cancelados }
        }
    } catch (error) {
        console.error('Erro ao obter todos os pledges:', error)
        return { ok: false, error: 'Erro ao carregar pledges.', pledges: [], stats: null, grupos: null }
    }
}

'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

/**
 * Cria um novo fundo financeiro.
 */
export async function criarFundo(formData: FormData) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    const descricao = (formData.get('descricao') as string)?.trim() || null
    const tipo = (formData.get('tipo') as string) || 'CUSTOM'
    const restrito = formData.get('restrito') === 'true'

    if (!nome) {
        return { ok: false, error: 'O nome do fundo e obrigatorio.' }
    }

    const tiposValidos = ['GERAL', 'CONSTRUCAO', 'MISSOES', 'SOCIAL', 'CANTINA', 'CUSTOM']
    if (!tiposValidos.includes(tipo)) {
        return { ok: false, error: 'Tipo de fundo invalido.' }
    }

    try {
        // Unique constraint: tenant_id + nome
        const existente = await prisma.fundoFinanceiro.findUnique({
            where: { tenant_id_nome: { tenant_id: tenantId, nome } }
        })

        if (existente) {
            return { ok: false, error: 'Ja existe um fundo com este nome.' }
        }

        const fundo = await prisma.fundoFinanceiro.create({
            data: {
                tenant_id: tenantId,
                nome,
                descricao,
                tipo,
                restrito,
                saldo_atual: 0,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, fundo }
    } catch (error) {
        console.error('Erro ao criar fundo:', error)
        return { ok: false, error: 'Erro ao criar fundo.' }
    }
}

/**
 * Atualiza um fundo financeiro existente.
 */
export async function atualizarFundo(fundoId: number, formData: FormData) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    const descricao = (formData.get('descricao') as string)?.trim() || null
    const tipo = (formData.get('tipo') as string) || 'CUSTOM'
    const restrito = formData.get('restrito') === 'true'
    const ativo = formData.get('ativo') !== 'false'

    if (!nome) {
        return { ok: false, error: 'O nome do fundo e obrigatorio.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundoId, tenant_id: tenantId }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado.' }
        }

        // Verificar unicidade do nome (excluindo o proprio)
        const duplicado = await prisma.fundoFinanceiro.findFirst({
            where: {
                tenant_id: tenantId,
                nome,
                id: { not: fundoId }
            }
        })

        if (duplicado) {
            return { ok: false, error: 'Ja existe outro fundo com este nome.' }
        }

        const atualizado = await prisma.fundoFinanceiro.update({
            where: { id: fundoId },
            data: { nome, descricao, tipo, restrito, ativo }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, fundo: atualizado }
    } catch (error) {
        console.error('Erro ao atualizar fundo:', error)
        return { ok: false, error: 'Erro ao atualizar fundo.' }
    }
}

/**
 * Cria uma nova categoria de orcamento vinculada a um fundo.
 */
export async function criarCategoriaOrcamento(formData: FormData) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    const fundo_id = Number(formData.get('fundo_id'))

    if (!nome) {
        return { ok: false, error: 'O nome da categoria e obrigatorio.' }
    }

    if (!fundo_id || isNaN(fundo_id)) {
        return { ok: false, error: 'Fundo invalido.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundo_id, tenant_id: tenantId }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado.' }
        }

        // Verificar unicidade: fundo_id + nome
        const existente = await prisma.categoriaOrcamento.findUnique({
            where: { fundo_id_nome: { fundo_id, nome } }
        })

        if (existente) {
            return { ok: false, error: 'Ja existe uma categoria com este nome neste fundo.' }
        }

        const categoria = await prisma.categoriaOrcamento.create({
            data: {
                tenant_id: tenantId,
                fundo_id,
                nome,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, categoria }
    } catch (error) {
        console.error('Erro ao criar categoria:', error)
        return { ok: false, error: 'Erro ao criar categoria de orcamento.' }
    }
}

/**
 * Transfere valor entre dois fundos. Admin auto-aprova.
 */
export async function transferirEntreFundos(formData: FormData) {
    const session = await requireRole(['ADMIN'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const fundo_origem_id = Number(formData.get('fundo_origem_id'))
    const fundo_destino_id = Number(formData.get('fundo_destino_id'))
    const valor = parseFloat(formData.get('valor') as string)
    const motivo = (formData.get('motivo') as string)?.trim()

    if (!fundo_origem_id || !fundo_destino_id || isNaN(fundo_origem_id) || isNaN(fundo_destino_id)) {
        return { ok: false, error: 'Fundos de origem e destino sao obrigatorios.' }
    }

    if (fundo_origem_id === fundo_destino_id) {
        return { ok: false, error: 'Os fundos de origem e destino devem ser diferentes.' }
    }

    if (!valor || isNaN(valor) || valor <= 0) {
        return { ok: false, error: 'Valor deve ser maior que zero.' }
    }

    if (!motivo) {
        return { ok: false, error: 'O motivo da transferencia e obrigatorio.' }
    }

    try {
        // Verificar se ambos os fundos pertencem ao tenant
        const [fundoOrigem, fundoDestino] = await Promise.all([
            prisma.fundoFinanceiro.findFirst({
                where: { id: fundo_origem_id, tenant_id: tenantId, ativo: true }
            }),
            prisma.fundoFinanceiro.findFirst({
                where: { id: fundo_destino_id, tenant_id: tenantId, ativo: true }
            }),
        ])

        if (!fundoOrigem) {
            return { ok: false, error: 'Fundo de origem nao encontrado ou inativo.' }
        }

        if (!fundoDestino) {
            return { ok: false, error: 'Fundo de destino nao encontrado ou inativo.' }
        }

        // Validar saldo suficiente
        if (fundoOrigem.saldo_atual < valor) {
            return { ok: false, error: 'Saldo insuficiente no fundo de origem.' }
        }

        // Transacao: criar transferencia + atualizar saldos
        await prisma.$transaction([
            prisma.transferenciaFundo.create({
                data: {
                    tenant_id: tenantId,
                    fundo_origem_id,
                    fundo_destino_id,
                    valor,
                    motivo,
                    aprovado_por: session.membroId,
                    status: 'APROVADA',
                }
            }),
            prisma.fundoFinanceiro.update({
                where: { id: fundo_origem_id },
                data: { saldo_atual: { decrement: valor } }
            }),
            prisma.fundoFinanceiro.update({
                where: { id: fundo_destino_id },
                data: { saldo_atual: { increment: valor } }
            }),
        ])

        revalidatePath('/departamentos/financeiro')
        return { ok: true }
    } catch (error) {
        console.error('Erro ao transferir entre fundos:', error)
        return { ok: false, error: 'Erro ao realizar transferencia.' }
    }
}

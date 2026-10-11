'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

/**
 * Salva (cria ou atualiza) um orcamento para uma categoria/fundo/ano/mes.
 */
export async function salvarOrcamento(fundo_id: number, categoria_id: number, ano: number, valor_previsto: number, mes: number | null = null) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (!fundo_id || isNaN(fundo_id)) {
        return { ok: false, error: 'Fundo e obrigatorio.' }
    }

    if (!categoria_id || isNaN(categoria_id)) {
        return { ok: false, error: 'Categoria e obrigatoria.' }
    }

    if (!ano || isNaN(ano) || ano < 2000 || ano > 2100) {
        return { ok: false, error: 'Ano invalido.' }
    }

    if (mes !== null && (isNaN(mes) || mes < 1 || mes > 12)) {
        return { ok: false, error: 'Mes invalido (1-12).' }
    }

    if (isNaN(valor_previsto) || valor_previsto < 0) {
        return { ok: false, error: 'Valor previsto invalido.' }
    }

    try {
        // Verificar se fundo e categoria pertencem ao tenant
        const [fundo, categoria] = await Promise.all([
            prisma.fundoFinanceiro.findFirst({
                where: { id: fundo_id, tenant_id: tenantId }
            }),
            prisma.categoriaOrcamento.findFirst({
                where: { id: categoria_id, fundo_id, tenant_id: tenantId }
            }),
        ])

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado.' }
        }

        if (!categoria) {
            return { ok: false, error: 'Categoria nao encontrada ou nao pertence a este fundo.' }
        }

        // Upsert: unique on fundo_id + categoria_id + ano + mes
        const orcamento = await prisma.orcamento.upsert({
            where: {
                fundo_id_categoria_id_ano_mes: {
                    fundo_id,
                    categoria_id,
                    ano,
                    mes: mes,
                }
            },
            create: {
                tenant_id: tenantId,
                fundo_id,
                categoria_id,
                ano,
                mes,
                valor_previsto,
            },
            update: {
                valor_previsto,
            }
        })

        revalidatePath('/departamentos/financeiro')
        return { ok: true, orcamento }
    } catch (error) {
        console.error('Erro ao salvar orcamento:', error)
        return { ok: false, error: 'Erro ao salvar orcamento.' }
    }
}

/**
 * Salva orcamentos em lote para um ano/fundo especifico.
 */
export async function salvarOrcamentoLote(
    ano: number,
    fundoId: number,
    itens: { categoriaId: number; valor: number }[]
) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (!ano || ano < 2000 || ano > 2100) {
        return { ok: false, error: 'Ano invalido.' }
    }

    if (!fundoId) {
        return { ok: false, error: 'Fundo e obrigatorio.' }
    }

    if (!itens || itens.length === 0) {
        return { ok: false, error: 'Nenhum item de orcamento informado.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundoId, tenant_id: tenantId }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado.' }
        }

        // Verificar se todas as categorias pertencem ao fundo/tenant
        const categoriaIds = itens.map(i => i.categoriaId)
        const categorias = await prisma.categoriaOrcamento.findMany({
            where: {
                id: { in: categoriaIds },
                fundo_id: fundoId,
                tenant_id: tenantId,
            }
        })

        if (categorias.length !== categoriaIds.length) {
            return { ok: false, error: 'Uma ou mais categorias sao invalidas.' }
        }

        // Upsert em lote usando transacao
        const operacoes = itens.map(item =>
            prisma.orcamento.upsert({
                where: {
                    fundo_id_categoria_id_ano_mes: {
                        fundo_id: fundoId,
                        categoria_id: item.categoriaId,
                        ano,
                        mes: null,
                    }
                },
                create: {
                    tenant_id: tenantId,
                    fundo_id: fundoId,
                    categoria_id: item.categoriaId,
                    ano,
                    mes: null,
                    valor_previsto: item.valor,
                },
                update: {
                    valor_previsto: item.valor,
                }
            })
        )

        await prisma.$transaction(operacoes)

        revalidatePath('/departamentos/financeiro')
        return { ok: true }
    } catch (error) {
        console.error('Erro ao salvar orcamentos em lote:', error)
        return { ok: false, error: 'Erro ao salvar orcamentos em lote.' }
    }
}

/**
 * Obtem a analise de variancia (previsto vs real) para um fundo/ano.
 * Retorna por categoria: previsto, real (despesas PAGAS), diferenca e percentual.
 */
export async function obterVariance(fundoId: number, ano: number) {
    const session = await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (!fundoId) {
        return { ok: false, error: 'Fundo e obrigatorio.' }
    }

    if (!ano || ano < 2000 || ano > 2100) {
        return { ok: false, error: 'Ano invalido.' }
    }

    try {
        // Verificar se o fundo pertence ao tenant
        const fundo = await prisma.fundoFinanceiro.findFirst({
            where: { id: fundoId, tenant_id: tenantId }
        })

        if (!fundo) {
            return { ok: false, error: 'Fundo nao encontrado.' }
        }

        // Buscar categorias do fundo
        const categorias = await prisma.categoriaOrcamento.findMany({
            where: { fundo_id: fundoId, tenant_id: tenantId }
        })

        // Buscar orcamentos do ano para este fundo
        const orcamentos = await prisma.orcamento.findMany({
            where: {
                fundo_id: fundoId,
                ano,
                tenant_id: tenantId,
            }
        })

        // Buscar despesas PAGAS do ano para este fundo
        const inicioAno = new Date(ano, 0, 1)
        const fimAno = new Date(ano + 1, 0, 1)

        const despesas = await prisma.despesaFinanceira.findMany({
            where: {
                fundo_id: fundoId,
                tenant_id: tenantId,
                status: 'PAGA',
                data: {
                    gte: inicioAno,
                    lt: fimAno,
                }
            }
        })

        // Agregar por categoria
        const resultado = categorias.map(cat => {
            // Somar orcamentos desta categoria (anuais + mensais)
            const orcamentosCat = orcamentos.filter(o => o.categoria_id === cat.id)
            const previsto = orcamentosCat.reduce((acc, o) => acc + o.valor_previsto, 0)

            // Somar despesas pagas desta categoria
            const despesasCat = despesas.filter(d => d.categoria_id === cat.id)
            const real = despesasCat.reduce((acc, d) => acc + d.valor, 0)

            const diferenca = previsto - real
            const percentual = previsto > 0 ? Math.round((real / previsto) * 100) : 0

            return {
                categoria: cat.nome,
                categoriaId: cat.id,
                previsto,
                real,
                diferenca,
                percentual,
            }
        })

        return { ok: true, dados: resultado }
    } catch (error) {
        console.error('Erro ao obter variance:', error)
        return { ok: false, error: 'Erro ao obter analise de variancia.' }
    }
}

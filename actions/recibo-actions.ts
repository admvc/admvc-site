'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return getTenantClient(Number(tenantId))
}

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    return Number(headersList.get('x-tenant-id') || 0)
}

// Tipos de contribuicao dedutiveis para efeitos fiscais
const TIPOS_DEDUTIVEIS = ['DIZIMO', 'OFERTA', 'MISSOES', 'MISSAO']

/**
 * Gera o recibo fiscal anual para um membro especifico.
 */
export async function gerarReciboAnual(membroId: number, ano: number) {
    try {
        await requireRole(['ADMIN', 'FINANCE'])
        const db = await getDb()
        const tenantId = await getTenantId()

        // 1. Somar contribuicoes dedutiveis do membro no ano
        const inicioAno = new Date(ano, 0, 1)
        const fimAno = new Date(ano + 1, 0, 1)

        const contribuicoes = await db.contribuicao.findMany({
            where: {
                membro_id: membroId,
                tipo: { in: TIPOS_DEDUTIVEIS },
                data: { gte: inicioAno, lt: fimAno },
            },
            select: { valor: true },
        })

        const totalContribuicoes = contribuicoes.reduce((sum, c) => sum + c.valor, 0)

        // 2. Somar lancamentos financeiros dos objetivos do membro no ano
        const objetivos = await db.objetivoFinanceiro.findMany({
            where: { membro_id: membroId },
            select: { id: true },
        })

        const objetivoIds = objetivos.map(o => o.id)

        let totalLancamentos = 0
        if (objetivoIds.length > 0) {
            const lancamentos = await db.lancamentoFinanceiro.findMany({
                where: {
                    objetivo_id: { in: objetivoIds },
                    data_recebimento: { gte: inicioAno, lt: fimAno },
                },
                select: { valor_pago: true },
            })
            totalLancamentos = lancamentos.reduce((sum, l) => sum + l.valor_pago, 0)
        }

        const valorTotal = totalContribuicoes + totalLancamentos

        if (valorTotal <= 0) {
            return { success: false, error: 'Nenhuma contribuicao dedutivel encontrada para este membro no ano selecionado.' }
        }

        // 3. Buscar info do tenant e membro para snapshot
        const tenant = await db.membro.findFirst({
            where: { id: membroId },
            select: { tenant_id: true },
        })

        // Buscar tenant info (nome)
        const { default: prismaGlobal } = await import('@/lib/prisma')
        const tenantInfo = await prismaGlobal.tenant.findUnique({
            where: { id: tenantId },
            select: { nome: true },
        })

        const membro = await db.membro.findFirst({
            where: { id: membroId },
            select: {
                first_name: true,
                last_name: true,
                email: true,
                tax_id: true,
                address_1: true,
                address_2: true,
                postal_code: true,
                id_city: true,
            },
        })

        if (!membro) {
            return { success: false, error: 'Membro nao encontrado.' }
        }

        // 4. Gerar numero do recibo sequencial
        const recibosExistentes = await db.reciboFiscal.count({
            where: { ano },
        })

        const sequencial = recibosExistentes + 1
        const numeroRecibo = `REC-${ano}-${String(sequencial).padStart(4, '0')}`

        // 5. Preparar snapshots
        const dadosIgreja = {
            nome: tenantInfo?.nome || 'Igreja',
            nif: '',
            morada: '',
        }

        const dadosMembro = {
            nome: `${membro.first_name} ${membro.last_name}`,
            nif: membro.tax_id || '',
            morada: [membro.address_1, membro.address_2, membro.postal_code, membro.id_city]
                .filter(Boolean)
                .join(', '),
            email: membro.email,
        }

        // 6. Upsert do recibo
        const recibo = await db.reciboFiscal.upsert({
            where: {
                tenant_id_membro_id_ano: {
                    tenant_id: tenantId,
                    membro_id: membroId,
                    ano,
                },
            },
            update: {
                valor_total: valorTotal,
                numero_recibo: undefined, // manter o existente no update
                emitido_em: new Date(),
                dados_igreja: dadosIgreja,
                dados_membro: dadosMembro,
            },
            create: {
                tenant_id: tenantId,
                membro_id: membroId,
                ano,
                valor_total: valorTotal,
                numero_recibo: numeroRecibo,
                dados_igreja: dadosIgreja,
                dados_membro: dadosMembro,
            },
        })

        revalidatePath('/financeiro/recibos')

        return {
            success: true,
            recibo: {
                id: recibo.id,
                valor_total: recibo.valor_total,
                numero_recibo: recibo.numero_recibo,
            },
        }
    } catch (error: any) {
        console.error('Erro ao gerar recibo anual:', error)
        return { success: false, error: error.message || 'Erro ao gerar recibo.' }
    }
}

/**
 * Gera recibos em lote para todos os membros com contribuicoes num dado ano.
 */
export async function gerarRecibosLote(ano: number) {
    try {
        await requireRole(['ADMIN'])
        const db = await getDb()

        const inicioAno = new Date(ano, 0, 1)
        const fimAno = new Date(ano + 1, 0, 1)

        // Encontrar todos os membros com contribuicoes dedutiveis no ano
        const contribuicoes = await db.contribuicao.findMany({
            where: {
                tipo: { in: TIPOS_DEDUTIVEIS },
                data: { gte: inicioAno, lt: fimAno },
            },
            select: { membro_id: true },
            distinct: ['membro_id'],
        })

        // Tambem membros com lancamentos financeiros no ano
        const lancamentos = await db.lancamentoFinanceiro.findMany({
            where: {
                data_recebimento: { gte: inicioAno, lt: fimAno },
            },
            select: { objetivo: { select: { membro_id: true } } },
        })

        const membrosComLancamentos = lancamentos.map(l => l.objetivo.membro_id)
        const todosMembroIds = [
            ...new Set([
                ...contribuicoes.map(c => c.membro_id),
                ...membrosComLancamentos,
            ]),
        ]

        if (todosMembroIds.length === 0) {
            return { success: false, error: 'Nenhum membro com contribuicoes encontrado para o ano selecionado.' }
        }

        let count = 0
        for (const membroId of todosMembroIds) {
            const resultado = await gerarReciboAnual(membroId, ano)
            if (resultado.success) count++
        }

        revalidatePath('/financeiro/recibos')
        return { success: true, total: count }
    } catch (error: any) {
        console.error('Erro ao gerar recibos em lote:', error)
        return { success: false, error: error.message || 'Erro ao gerar recibos em lote.' }
    }
}

/**
 * Obter todos os recibos de um dado ano (admin/finance).
 */
export async function obterRecibosDoAno(ano: number) {
    try {
        await requireRole(['ADMIN', 'FINANCE'])
        const db = await getDb()

        const recibos = await db.reciboFiscal.findMany({
            where: { ano },
            include: {
                membro: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        tax_id: true,
                        email: true,
                    },
                },
            },
            orderBy: { membro: { first_name: 'asc' } },
        })

        return {
            success: true,
            recibos: recibos.map(r => ({
                id: r.id,
                membro_id: r.membro_id,
                ano: r.ano,
                valor_total: r.valor_total,
                numero_recibo: r.numero_recibo,
                emitido_em: r.emitido_em.toISOString(),
                dados_igreja: r.dados_igreja,
                dados_membro: r.dados_membro,
                membro_nome: `${r.membro.first_name} ${r.membro.last_name}`,
                membro_nif: r.membro.tax_id || '',
                membro_email: r.membro.email,
            })),
        }
    } catch (error: any) {
        console.error('Erro ao obter recibos:', error)
        return { success: false, recibos: [], error: error.message }
    }
}

/**
 * Obter recibos do membro autenticado.
 */
export async function obterMeusRecibos() {
    try {
        const session = await requireAuth()
        const db = await getDb()

        const recibos = await db.reciboFiscal.findMany({
            where: { membro_id: session.membroId },
            orderBy: { ano: 'desc' },
        })

        return {
            success: true,
            recibos: recibos.map(r => ({
                id: r.id,
                membro_id: r.membro_id,
                ano: r.ano,
                valor_total: r.valor_total,
                numero_recibo: r.numero_recibo,
                emitido_em: r.emitido_em.toISOString(),
                dados_igreja: r.dados_igreja,
                dados_membro: r.dados_membro,
            })),
        }
    } catch (error: any) {
        console.error('Erro ao obter meus recibos:', error)
        return { success: false, recibos: [], error: error.message }
    }
}

/**
 * Buscar membros para autocomplete na geracao individual.
 */
export async function buscarMembrosParaRecibo(query: string) {
    try {
        await requireRole(['ADMIN', 'FINANCE'])
        const db = await getDb()

        const membros = await db.membro.findMany({
            where: {
                is_active: true,
                OR: [
                    { first_name: { contains: query, mode: 'insensitive' as any } },
                    { last_name: { contains: query, mode: 'insensitive' as any } },
                ],
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                tax_id: true,
            },
            take: 10,
            orderBy: { first_name: 'asc' },
        })

        return { success: true, membros }
    } catch (error: any) {
        return { success: false, membros: [], error: error.message }
    }
}

/**
 * Contar membros com contribuicoes mas sem recibo num dado ano.
 */
export async function contarMembrosSemRecibo(ano: number) {
    try {
        await requireRole(['ADMIN', 'FINANCE'])
        const db = await getDb()

        const inicioAno = new Date(ano, 0, 1)
        const fimAno = new Date(ano + 1, 0, 1)

        // Membros com contribuicoes
        const contribuicoes = await db.contribuicao.findMany({
            where: {
                tipo: { in: TIPOS_DEDUTIVEIS },
                data: { gte: inicioAno, lt: fimAno },
            },
            select: { membro_id: true },
            distinct: ['membro_id'],
        })

        const membrosComContrib = new Set(contribuicoes.map(c => c.membro_id))

        // Membros com recibo
        const recibos = await db.reciboFiscal.findMany({
            where: { ano },
            select: { membro_id: true },
        })

        const membrosComRecibo = new Set(recibos.map(r => r.membro_id))

        let semRecibo = 0
        for (const id of membrosComContrib) {
            if (!membrosComRecibo.has(id)) semRecibo++
        }

        return { success: true, semRecibo, totalComContrib: membrosComContrib.size, totalComRecibo: membrosComRecibo.size }
    } catch (error: any) {
        return { success: false, semRecibo: 0, totalComContrib: 0, totalComRecibo: 0 }
    }
}

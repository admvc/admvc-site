'use server'

import { getDb } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'

/**
 * Exporta dados fiscais do ano para formato CSV-compativel (SAFT-PT simplificado).
 * Retorna JSON com 4 datasets que o cliente converte em CSV downloads.
 */
export async function exportarDadosFiscais(ano: number) {
    await requireRole(['ADMIN'])
    const db = await getDb()

    const inicioAno = new Date(ano, 0, 1)
    const fimAno = new Date(ano + 1, 0, 1)

    const [contribuicoes, despesas, donativos, lancamentos] = await Promise.all([
        db.contribuicao.findMany({
            where: { data: { gte: inicioAno, lt: fimAno } },
            include: {
                membro: { select: { first_name: true, last_name: true } },
                fundo: { select: { nome: true } },
            },
            orderBy: { data: 'asc' },
        }),
        db.despesaFinanceira.findMany({
            where: { status: 'PAGA', data: { gte: inicioAno, lt: fimAno } },
            include: {
                fundo: { select: { nome: true } },
                categoria: { select: { nome: true } },
            },
            orderBy: { data: 'asc' },
        }),
        db.donativoOnline.findMany({
            where: { status: 'CONFIRMADO', criado_em: { gte: inicioAno, lt: fimAno } },
            include: { fundo: { select: { nome: true } } },
            orderBy: { criado_em: 'asc' },
        }),
        db.lancamentoFinanceiro.findMany({
            where: { data_recebimento: { gte: inicioAno, lt: fimAno } },
            include: {
                objetivo: { select: { nome: true } },
                fundo: { select: { nome: true } },
            },
            orderBy: { data_recebimento: 'asc' },
        }),
    ])

    return {
        success: true,
        dados: {
            contribuicoes: contribuicoes.map(c => ({
                data: c.data.toISOString().split('T')[0],
                membro: `${c.membro.first_name} ${c.membro.last_name}`,
                nif: '',
                tipo: c.tipo,
                valor: c.valor,
                metodo: c.metodo || '',
                fundo: c.fundo?.nome || 'Geral',
            })),
            despesas: despesas.map(d => ({
                data: d.data.toISOString().split('T')[0],
                descricao: d.descricao,
                fornecedor: d.fornecedor || '',
                valor: d.valor,
                categoria: d.categoria?.nome || '',
                fundo: d.fundo.nome,
                forma_pagamento: d.forma_pagamento || '',
            })),
            donativos: donativos.map(d => ({
                data: d.criado_em.toISOString().split('T')[0],
                doador: d.anonimo ? 'Anonimo' : d.nome_doador,
                valor: d.valor,
                fundo: d.fundo?.nome || 'Geral',
                forma_pagamento: d.forma_pagamento,
            })),
            lancamentos: lancamentos.map(l => ({
                data: l.data_recebimento.toISOString().split('T')[0],
                campanha: l.objetivo.nome,
                valor: l.valor_pago,
                forma_pagamento: l.forma_pagamento,
                fundo: l.fundo?.nome || 'Geral',
            })),
        },
    }
}

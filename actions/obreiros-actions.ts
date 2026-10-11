'use server'

import { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { requireAuth } from '@/lib/auth-utils'

const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Tenant nao identificado.')
    return {
        db: getTenantClient(Number(tenantId)),
        tenantId: Number(tenantId)
    }
}

async function findDiaconiaDepartamento(db: any) {
    const deptos = await db.departamento.findMany({
        select: { id: true, nome: true },
    })
    return deptos.find((d: any) =>
        TERMOS_DIACONIA.some(t => d.nome.toLowerCase().includes(t))
    )
}

export async function buscarDadosObreirosDashboard() {
    try {
        await requireAuth()
        const { db } = await getDb()

        const depto = await findDiaconiaDepartamento(db)
        if (!depto) return { ok: false, error: 'Departamento de Diaconia não encontrado.' }

        const agora = new Date()
        const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

        const [integrantes, funcoes, escalasEsteMes, proximoEvento] = await Promise.all([
            // Obreiros do departamento
            db.integranteDepartamento.findMany({
                where: { departamento_id: depto.id },
                include: {
                    membro: {
                        select: {
                            id: true,
                            first_name: true,
                            last_name: true,
                            phone_1: true,
                            avatar_file: true,
                        },
                    },
                    funcoes: {
                        include: { funcao: { select: { id: true, nome: true } } },
                    },
                },
            }),

            // Funcoes do departamento
            db.funcaoDepartamento.findMany({
                where: { departamento_id: depto.id },
                select: { id: true, nome: true },
            }),

            // Escalas confirmadas este mes
            db.escala.findMany({
                where: {
                    departamento_id: depto.id,
                    confirmado: true,
                    evento: { data: { gte: inicioMes } },
                },
                select: { membro_id: true, funcao_id: true },
            }),

            // Proximo evento
            db.evento.findFirst({
                where: {
                    data: { gte: agora },
                    tipo: { in: ['CULTO_REGULAR', 'CULTO_ESPECIAL'] },
                },
                orderBy: { data: 'asc' },
                include: {
                    escalas: {
                        where: { departamento_id: depto.id },
                        select: { membro_id: true, confirmado: true, funcao: true },
                    },
                },
            }),
        ])

        // Contar servicos por membro este mes
        const servicosPorMembro: Record<number, number> = {}
        for (const e of escalasEsteMes) {
            servicosPorMembro[e.membro_id] = (servicosPorMembro[e.membro_id] || 0) + 1
        }

        // Total escalas este mes (incluindo nao confirmadas) para taxa
        const totalEscalasMes = await db.escala.count({
            where: {
                departamento_id: depto.id,
                evento: { data: { gte: inicioMes } },
            },
        })

        const obreiros = integrantes.map((i: any) => ({
            id: i.id,
            membroId: i.membro.id,
            nome: `${i.membro.first_name} ${i.membro.last_name || ''}`.trim(),
            iniciais: `${i.membro.first_name?.[0] || ''}${i.membro.last_name?.[0] || ''}`,
            telefone: i.membro.phone_1 || null,
            avatar: i.membro.avatar_file || null,
            funcoes: i.funcoes.map((f: any) => f.funcao.nome),
            servicosEsteMes: servicosPorMembro[i.membro.id] || 0,
        }))

        // Ordenar por servicos (mais activos primeiro)
        obreiros.sort((a: any, b: any) => b.servicosEsteMes - a.servicosEsteMes)

        return {
            ok: true,
            data: {
                departamentoId: depto.id,
                obreiros,
                funcoes: funcoes.map((f: any) => ({ id: f.id, nome: f.nome })),
                totalObreiros: integrantes.length,
                servicosEsteMes: escalasEsteMes.length,
                taxaPresenca: totalEscalasMes > 0
                    ? Math.round((escalasEsteMes.length / totalEscalasMes) * 100)
                    : 0,
                proximoEvento: proximoEvento
                    ? {
                        id: proximoEvento.id,
                        nome: proximoEvento.nome,
                        data: proximoEvento.data.toISOString(),
                        escalados: proximoEvento.escalas.length,
                        confirmados: proximoEvento.escalas.filter((e: any) => e.confirmado).length,
                    }
                    : null,
            },
        }
    } catch (error: any) {
        console.error('Erro ao buscar dados obreiros:', error)
        return { ok: false, error: error.message || 'Erro ao buscar dados.' }
    }
}

export async function buscarEstatisticasObreiros(departamentoId: number, meses: number = 3) {
    try {
        await requireAuth()
        const { db } = await getDb()

        const agora = new Date()
        const dataInicio = new Date(agora.getFullYear(), agora.getMonth() - meses, 1)

        const [escalas, integrantes] = await Promise.all([
            db.escala.findMany({
                where: {
                    departamento_id: departamentoId,
                    evento: { data: { gte: dataInicio } },
                },
                include: {
                    membro: { select: { id: true, first_name: true, last_name: true } },
                    evento: { select: { data: true } },
                    funcao_ref: { select: { nome: true } },
                },
            }),
            db.integranteDepartamento.findMany({
                where: { departamento_id: departamentoId },
                include: {
                    membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true } },
                },
            }),
        ])

        // Stats por membro
        const porMembro: Record<number, {
            nome: string
            iniciais: string
            avatar: string | null
            total: number
            confirmados: number
            funcoes: Record<string, number>
        }> = {}

        for (const int of integrantes) {
            porMembro[int.membro.id] = {
                nome: `${int.membro.first_name} ${int.membro.last_name || ''}`.trim(),
                iniciais: `${int.membro.first_name?.[0] || ''}${int.membro.last_name?.[0] || ''}`,
                avatar: int.membro.avatar_file || null,
                total: 0,
                confirmados: 0,
                funcoes: {},
            }
        }

        // Distribuicao por funcao
        const porFuncao: Record<string, number> = {}

        // Tendencia mensal
        const porMes: Record<string, number> = {}

        for (const esc of escalas) {
            const membroId = esc.membro.id
            if (!porMembro[membroId]) {
                porMembro[membroId] = {
                    nome: `${esc.membro.first_name} ${esc.membro.last_name || ''}`.trim(),
                    iniciais: `${esc.membro.first_name?.[0] || ''}${esc.membro.last_name?.[0] || ''}`,
                    avatar: null,
                    total: 0,
                    confirmados: 0,
                    funcoes: {},
                }
            }

            porMembro[membroId].total++
            if (esc.confirmado) porMembro[membroId].confirmados++

            const funcaoNome = esc.funcao_ref?.nome || esc.funcao || 'Geral'
            porMembro[membroId].funcoes[funcaoNome] = (porMembro[membroId].funcoes[funcaoNome] || 0) + 1

            if (esc.confirmado) {
                porFuncao[funcaoNome] = (porFuncao[funcaoNome] || 0) + 1
            }

            if (esc.confirmado) {
                const mesKey = new Date(esc.evento.data).toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' })
                porMes[mesKey] = (porMes[mesKey] || 0) + 1
            }
        }

        // Ranking por servicos confirmados
        const ranking = Object.entries(porMembro)
            .map(([id, stats]) => ({ membroId: Number(id), ...stats }))
            .sort((a, b) => b.confirmados - a.confirmados)

        // Distribuicao funcoes ordenada
        const funcaoDistribuicao = Object.entries(porFuncao)
            .map(([nome, count]) => ({ nome, count }))
            .sort((a, b) => b.count - a.count)

        // Tendencia mensal (garantir ordem cronologica)
        const mesesOrdenados = Object.entries(porMes)
            .map(([mes, count]) => ({ mes, count }))

        const totalServicos = escalas.filter((e: any) => e.confirmado).length
        const totalEscalas = escalas.length
        const melhorObreiro = ranking[0] || null

        return {
            ok: true,
            data: {
                totalServicos,
                mediaServicos: ranking.length > 0 ? Math.round(totalServicos / ranking.length) : 0,
                taxaConfirmacao: totalEscalas > 0 ? Math.round((totalServicos / totalEscalas) * 100) : 0,
                melhorObreiro: melhorObreiro ? { nome: melhorObreiro.nome, count: melhorObreiro.confirmados } : null,
                ranking,
                funcaoDistribuicao,
                tendenciaMensal: mesesOrdenados,
            },
        }
    } catch (error: any) {
        console.error('Erro ao buscar estatísticas obreiros:', error)
        return { ok: false, error: error.message || 'Erro ao buscar estatísticas.' }
    }
}

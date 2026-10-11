import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const prismaClientSingleton = () => {
    const connectionString = process.env.DATABASE_URL

    const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 20000 })
    const adapter = new PrismaPg(pool as any)

    return new PrismaClient({ adapter })
}

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Cliente global base (acesso a tudo — usar apenas para queries globais/SA)
const prisma = globalThis.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

// ============================================================================
// EXTENSAO MULTITENANT + CONGREGACAO
// ============================================================================

// Modelos protegidos por tenant_id
const PROTECTED_MODELS = [
    'Congregacao', 'Membro', 'Familia', 'Departamento',
    'IntegranteDepartamento', 'Grupo', 'EncontroGrupo',
    'Evento', 'Escala', 'FuncaoDepartamento', 'ObjetivoFinanceiro',
    'LancamentoFinanceiro', 'Rifa', 'RifaNumero', 'PedidoSaldoCantina',
    'Contribuicao', 'Visitante', 'AcompanhamentoVisitante',
    'ProjetoObra', 'EtapaObra', 'AvisoMural', 'Agenda',
    'Compromisso', 'RepertorioEvento',
    'ItemInventario', 'MovimentoInventario',
    'IndisponibilidadeMembro', 'MensagemEvento',
    'BoleiaOferta', 'BoleiaReserva',
    'CategoriaCantina', 'ProdutoCantina', 'SaldoCantina', 'TransacaoCantina',
    'TurnoCantina', 'FiadoCantina',
    'PreEncomendaCantina',
    'CardapioCantina',
    'ItemAssistenciaSocial', 'MovimentoAssistencia',
    'FundoFinanceiro', 'CategoriaOrcamento', 'DespesaFinanceira', 'Orcamento', 'TransferenciaFundo',
    'ReciboFiscal',
    'DonativoOnline', 'Pledge',
    'ContaBancaria', 'MovimentoBancario',
    'InteresseDepartamento',
]

// Modelos que suportam congregacao_id (para filtro explicito na UI)
export const CONGREGATION_MODELS = [
    'Membro', 'Departamento', 'Grupo',
    'Evento', 'Escala',
    'LancamentoFinanceiro',
    'ItemInventario', 'MovimentoInventario',
    'IndisponibilidadeMembro', 'MensagemEvento',
    'RepertorioEvento',
] as const

export const getTenantClient = (tenantId: number) => {
    return prisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {

                    if (!PROTECTED_MODELS.includes(model)) {
                        return query(args)
                    }

                    const anyArgs = args as any

                    // 1. Buscas e contagens — apenas tenant_id
                    if (['findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(operation)) {
                        anyArgs.where = { ...anyArgs.where, tenant_id: tenantId }
                    }

                    // 2. Criacoes — apenas tenant_id
                    if (['create', 'createMany'].includes(operation)) {
                        if (anyArgs.data) {
                            if (Array.isArray(anyArgs.data)) {
                                anyArgs.data = anyArgs.data.map((item: any) => ({
                                    ...item,
                                    tenant_id: tenantId,
                                }))
                            } else {
                                anyArgs.data.tenant_id = tenantId
                            }
                        }
                    }

                    // 3. Updates e Deletes singulares — apenas tenant_id
                    if (['update', 'delete'].includes(operation)) {
                        anyArgs.where = { ...anyArgs.where, tenant_id: tenantId }
                    }

                    return query(anyArgs)
                },
            },
        },
    })
}

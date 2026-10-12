import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * O adaptador pg nao le o `?schema=` do endereco: tira-se daqui e passa-se a
 * mao. Na producao nao ha `?schema=` (schema public). A base de teste
 * (Supabase partilhado com o Atelie) usa `?schema=admvc_teste` — sem isto, as
 * consultas iam parar ao public dessa base, que nao e nosso.
 */
export function ligacaoDoEndereco(url: string | undefined) {
    if (!url) return { connectionString: url, schema: undefined as string | undefined, ssl: undefined }
    const u = new URL(url)
    const schema = u.searchParams.get('schema') ?? undefined
    if (!schema) return { connectionString: url, schema: undefined, ssl: undefined }
    const sslmode = u.searchParams.get('sslmode')
    for (const p of ['schema', 'connection_limit', 'pgbouncer', 'sslmode']) u.searchParams.delete(p)
    return {
        connectionString: u.toString(),
        schema,
        ssl: sslmode === 'disable' ? false : { rejectUnauthorized: false },
    }
}

const prismaClientSingleton = () => {
    const { connectionString, schema, ssl } = ligacaoDoEndereco(process.env.DATABASE_URL)

    const pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 20000, ...(ssl !== undefined ? { ssl } : {}) })
    const adapter = new PrismaPg(pool as any, schema ? { schema } : undefined)

    return new PrismaClient({ adapter })
}

// Sem `declare global`: a declaracao global deixava usar `prisma` sem o
// importar (o TypeScript aceitava, e em producao a variavel nao existia).
const globalParaPrisma = globalThis as unknown as { __prismaAdmvc?: ReturnType<typeof prismaClientSingleton> }

// Cliente global base (acesso a tudo — usar apenas para queries globais/SA)
const prisma = globalParaPrisma.__prismaAdmvc ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalParaPrisma.__prismaAdmvc = prisma

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
    // Faltavam (tinham tenant_id mas o cliente nao os filtrava):
    'Sermao', 'EscolaBiblica', 'CursoEBD', 'TurmaEBD', 'MatriculaEBD',
    'AtividadeEBD', 'NotaEBD', 'InteresseCurso',
    'AuditLog', 'BoleiaTracking', 'DespesaCantina', 'TipoCesta', 'EntregaCesta',
    // Fora de proposito: AvisoPlataforma e PlanoHistorico (da plataforma, nao de uma igreja)
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

                    // 4. Upsert — so encontra registos da igreja e cria-os nela
                    if (operation === 'upsert') {
                        anyArgs.where = { ...anyArgs.where, tenant_id: tenantId }
                        if (anyArgs.create) anyArgs.create.tenant_id = tenantId
                    }

                    return query(anyArgs)
                },
            },
        },
    })
}

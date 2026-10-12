// tools/base-de-teste.mjs
// Prepara a base de TESTE (schema admvc_teste no Supabase do Atelie):
//   npm run test:db:preparar
//
// 1. `prisma db push` do schema atual para o admvc_teste;
// 2. apaga os dados de teste anteriores e cria dados ficticios: duas igrejas
//    (A e B), um utilizador por papel em cada, e alguns registos de cada modulo.
//
// Recusa correr se o endereco nao for o schema admvc_teste: nunca toca na
// producao nem no schema do Atelie.

import { spawnSync } from 'node:child_process'
import { urlDeTeste, prismaDeTeste } from './url-de-teste.mjs'

export const SENHA_TESTE = 'senha-de-teste-123'
export const PAPEIS = ['ADMIN', 'CONGREGATION_ADMIN', 'LEADER', 'FINANCE', 'MANAGER', 'USER']

const url = urlDeTeste()

console.log('1/2 · db push para o schema admvc_teste…')
const r = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: url },
})
if (r.status !== 0) process.exit(r.status ?? 1)

console.log('2/2 · dados ficticios…')
const { prisma, fechar } = await prismaDeTeste(url)
const bcrypt = (await import('bcryptjs')).default
const hash = await bcrypt.hash(SENHA_TESTE, 10)
const hashConhecida = await bcrypt.hash('admvc123', 10)

// Limpar tudo (so neste schema). TRUNCATE ... CASCADE em todas as tabelas.
const tabelas = await prisma.$queryRawUnsafe(
    `select tablename from pg_tables where schemaname = 'admvc_teste' and tablename <> '_prisma_migrations'`,
)
if (tabelas.length) {
    await prisma.$executeRawUnsafe(
        `truncate ${tabelas.map((t) => `"admvc_teste"."${t.tablename}"`).join(', ')} restart identity cascade`,
    )
}

const hoje = new Date()
const diasAtras = (n) => new Date(hoje.getTime() - n * 86400000)
const resumo = []

for (const letra of ['a', 'b']) {
    const L = letra.toUpperCase()
    const tenant = await prisma.tenant.create({
        data: { slug: `igreja-${letra}`, nome: `Igreja de Teste ${L}`, plano: 'PREMIUM', status: 'ATIVO', onboarding_completo: true },
    })
    const cong = await prisma.congregacao.create({
        data: { nome: `Sede ${L}`, cidade: 'Lisboa', endereco: 'Rua de Teste, 1', tenant_id: tenant.id },
    })

    const membros = {}
    for (const papel of PAPEIS) {
        const nome = papel.toLowerCase().replace('_', '-')
        membros[papel] = await prisma.membro.create({
            data: {
                first_name: `${papel[0]}${papel.slice(1).toLowerCase()}`,
                last_name: `Igreja ${L}`,
                email: `${nome}@${letra}.teste`,
                password: hash,
                role: papel,
                status: 'ATIVO',
                is_active: true,
                termo_aceite: true,
                tenant_id: tenant.id,
                congregacao_id: cong.id,
                phone_1: `91000000${PAPEIS.indexOf(papel)}`,
            },
        })
    }
    // Outro membro comum (para testar "um membro nao mexe no que e de outro")
    const outro = await prisma.membro.create({
        data: {
            first_name: 'Outro', last_name: `Membro ${L}`, email: `outro@${letra}.teste`, password: hash,
            role: 'USER', status: 'ATIVO', is_active: true, termo_aceite: true, tenant_id: tenant.id, congregacao_id: cong.id,
        },
    })
    // Conta com a senha antiga atribuida pelo sistema (deve ser bloqueada no login)
    await prisma.membro.create({
        data: {
            first_name: 'Antiga', last_name: `Senha ${L}`, email: `senha-antiga@${letra}.teste`, password: hashConhecida,
            role: 'USER', status: 'ATIVO', is_active: true, termo_aceite: true, tenant_id: tenant.id,
        },
    })

    const depto = await prisma.departamento.create({ data: { nome: 'Louvor', tenant_id: tenant.id } })
    const funcao = await prisma.funcaoDepartamento.create({ data: { nome: 'Voz', departamento_id: depto.id, tenant_id: tenant.id } })
    await prisma.integranteDepartamento.create({ data: { membro_id: membros.USER.id, departamento_id: depto.id, tenant_id: tenant.id } })
    await prisma.integranteDepartamento.create({ data: { membro_id: membros.LEADER.id, departamento_id: depto.id, tenant_id: tenant.id } })

    const evento = await prisma.evento.create({
        data: { nome: `Culto de domingo ${L}`, data: new Date(hoje.getTime() + 3 * 86400000), atualizado_em: hoje, tenant_id: tenant.id },
    })
    await prisma.escala.create({
        data: { funcao: funcao.nome, evento_id: evento.id, departamento_id: depto.id, membro_id: membros.USER.id, tenant_id: tenant.id },
    })

    await prisma.grupo.create({
        data: {
            nome: `Grupo ${L}`, dia_semana: 'Quarta', horario: '20:00', endereco: 'Rua de Teste, 2', bairro: 'Centro',
            cidade: 'Lisboa', estado: 'Lisboa', tenant_id: tenant.id,
            lideres: { connect: [{ id: membros.LEADER.id }] }, membros: { connect: [{ id: membros.USER.id }] },
        },
    })

    const objetivo = await prisma.objetivoFinanceiro.create({
        data: { nome: 'Dízimo', valor_mensal: 50, parcelas_total: 12, data_pagamento: 10, membro_id: membros.USER.id, tenant_id: tenant.id },
    })
    await prisma.lancamentoFinanceiro.create({
        data: { objetivo_id: objetivo.id, valor_pago: 50, forma_pagamento: 'MBWAY', registrado_por_id: membros.FINANCE.id, tenant_id: tenant.id },
    })

    await prisma.avisoMural.create({ data: { texto: `Aviso da igreja ${L}`, autor_id: membros.USER.id, tenant_id: tenant.id } })

    // Visitantes: um recente, um com pedido de oracao antigo (4 meses), um esquecido (13 meses)
    await prisma.visitante.create({ data: { nome: `Visitante recente ${L}`, telefone: '930000001', tenant_id: tenant.id, consentimento_em: hoje } })
    await prisma.visitante.create({
        data: { nome: `Visitante com pedido ${L}`, telefone: '930000002', pedido_oracao: 'Pedido de teste', tenant_id: tenant.id,
            data_primeira_visita: diasAtras(120), data_ultima_visita: diasAtras(120) },
    })
    await prisma.visitante.create({
        data: { nome: `Visitante esquecido ${L}`, telefone: '930000003', tenant_id: tenant.id,
            data_primeira_visita: diasAtras(400), data_ultima_visita: diasAtras(400) },
    })

    resumo.push({ igreja: tenant.nome, tenant_id: tenant.id, membros: Object.keys(membros).length + 2, outro: outro.email })
}

await prisma.superAdmin.create({ data: { email: 'sa@teste.teste', password: hash, nome: 'Super Admin de Teste' } })
await fechar()

console.table(resumo)
console.log(`\nContas: <papel>@a.teste e <papel>@b.teste (admin, congregation-admin, leader, finance, manager, user), outro@…, senha-antiga@… (admvc123), sa@teste.teste`)
console.log(`Senha de todas (menos senha-antiga): ${SENHA_TESTE}`)

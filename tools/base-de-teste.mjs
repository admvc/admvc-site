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

// Os modulos do sistema (iguais a MODULOS em lib/planos.ts)
const MODULOS = {
    ESCALAS: 'escalas', GRUPOS: 'grupos', LOUVOR: 'louvor', FINANCEIRO: 'financeiro', CANTINA: 'cantina',
    ACOLHIMENTO: 'acolhimento', INVENTARIO: 'inventario', GABINETE: 'gabinete', MURAL: 'mural',
    PERSONALIZACAO: 'personalizacao', RELATORIOS: 'relatorios', AUDITORIA: 'auditoria', HOLYRICS: 'holyrics',
    MESA_SOM: 'mesa_som', CIFRAS: 'cifras', LUMIKIT: 'lumikit', PREGACAO: 'pregacao', EBD: 'ebd',
    BOLEIA: 'boleia', ASSISTENCIA: 'assistencia',
}

export const SENHA_TESTE = 'senha-de-teste-123'
export const PAPEIS = ['ADMIN', 'CONGREGATION_ADMIN', 'LEADER', 'FINANCE', 'MANAGER', 'USER']

const url = urlDeTeste()

// Com --sem-push salta o db push (quando o schema ja foi atualizado por uma
// migracao aplicada a mao): so recria os dados de teste.
if (process.argv.includes('--sem-push')) {
    console.log('1/2 · db push saltado (--sem-push)')
} else {
    console.log('1/2 · db push para o schema admvc_teste…')
    const r = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
        stdio: 'inherit',
        shell: true,
        env: { ...process.env, DATABASE_URL: url },
    })
    if (r.status !== 0) process.exit(r.status ?? 1)
}

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
        data: { slug: `igreja-${letra}`, nome: `Igreja de Teste ${L}`, plano: 'ENTERPRISE', status: 'ATIVO', onboarding_completo: true,
            // A: todos os modulos (e a igreja com que o dono testa). B: os mesmos
            // que a igreja tem ligados na producao (para ver modulos desligados).
            modulos_custom: letra === 'a'
                ? Object.values(MODULOS)
                : ['escalas', 'grupos', 'louvor', 'mural', 'personalizacao', 'holyrics', 'cifras'] },
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

    // Louvor: o LEADER lidera; funcoes; uma equipa com nomes (para as capturas)
    const depto = await prisma.departamento.create({ data: { nome: 'Louvor', e_louvor: true, tenant_id: tenant.id, lider_id: membros.LEADER.id } })
    const funcoes = {}
    for (const nome of ['Voz', 'Teclas', 'Guitarra', 'Bateria']) {
        funcoes[nome] = await prisma.funcaoDepartamento.create({ data: { nome, departamento_id: depto.id, tenant_id: tenant.id } })
    }
    const funcao = funcoes.Voz
    const equipa = [
        [membros.USER, ['Voz']],
        [membros.LEADER, ['Voz', 'Guitarra']],
    ]
    for (const [first, last, fs] of [['Ana', 'Ribeiro', ['Voz']], ['Bruno', 'Costa', ['Teclas']], ['Carla', 'Mendes', ['Voz', 'Teclas']], ['Daniel', 'Sousa', ['Bateria']]]) {
        const m = await prisma.membro.create({
            data: {
                first_name: first, last_name: last, email: `${first.toLowerCase()}@${letra}.teste`, password: hash,
                role: 'USER', status: 'ATIVO', is_active: true, termo_aceite: true, tenant_id: tenant.id, congregacao_id: cong.id,
                phone_1: '91' + String(Math.floor(1000000 + Math.random() * 8999999)),
            },
        })
        equipa.push([m, fs])
    }
    const integrantes = {}
    for (const [m, fs] of equipa) {
        integrantes[m.id] = await prisma.integranteDepartamento.create({
            data: {
                membro_id: m.id, departamento_id: depto.id, tenant_id: tenant.id,
                funcoes: { create: fs.map((f) => ({ funcao_id: funcoes[f].id })) },
            },
        })
    }

    // Tres cultos: domingo (com escala do USER por confirmar), quarta e o domingo seguinte
    // hora de Lisboa gravada em UTC (docs/BASE-DE-DADOS.md)
    const diaHora = (dias, h) => { const d = new Date(hoje.getTime() + dias * 86400000); d.setUTCHours(h, 0, 0, 0); return d }
    // Proximo domingo (nunca hoje) e a quarta a seguir: datas reais de culto
    const domingo = ((7 - hoje.getDay()) % 7) || 7
    const quarta = domingo + 3
    const evento = await prisma.evento.create({
        data: { nome: `Culto de domingo ${L}`, data: diaHora(domingo, 10), atualizado_em: hoje, tenant_id: tenant.id, tipo: 'CULTO_REGULAR' },
    })
    await prisma.evento.create({ data: { nome: 'Culto de oração', data: diaHora(quarta, 20), atualizado_em: hoje, tenant_id: tenant.id, tipo: 'CULTO_REGULAR' } })
    await prisma.evento.create({ data: { nome: `Culto de domingo ${L}`, data: diaHora(domingo + 7, 10), atualizado_em: hoje, tenant_id: tenant.id, tipo: 'CULTO_REGULAR' } })
    await prisma.escala.create({
        data: { funcao: funcao.nome, funcao_id: funcao.id, evento_id: evento.id, departamento_id: depto.id, membro_id: membros.USER.id, tenant_id: tenant.id },
    })
    // A Ana ja confirmou as teclas? Nao: Ana canta; o Bruno toca e confirmou
    const bruno = equipa.find(([m]) => m.first_name === 'Bruno')[0]
    await prisma.escala.create({
        data: { funcao: 'Teclas', funcao_id: funcoes.Teclas.id, evento_id: evento.id, departamento_id: depto.id, membro_id: bruno.id, tenant_id: tenant.id, confirmado: true },
    })
    // Repertorio da igreja (cada igreja o seu) e a setlist do primeiro domingo
    const musicas = []
    for (const [titulo, artista, tom, bpm, cifra] of [
        [`Grande é o Senhor ${L}`, 'Adhemar de Campos', 'G', 72, 'adhemar-de-campos/grande-o-senhor'],
        ['Lugar Secreto', 'Gabriela Rocha', 'D', 68, 'gabriela-rocha/lugar-secreto'],
        ['Ousado Amor', 'Isaías Saad', 'A', 76, 'isaias-saad/ousado-amor'],
        ['Bondade de Deus', 'Isaías Saad', 'C', 70, 'isaias-saad/bondade-de-deus'],
    ]) {
        musicas.push(await prisma.musica.create({
            data: { titulo, artista, tom, bpm, tenant_id: tenant.id, link_cifra: `https://www.cifraclub.com.br/${cifra}/`,
                cifra_interna: titulo.startsWith('Grande') ? '[G]Grande é o Se[D]nhor\n[Em]Digno de [C]louvor' : null },
        }))
    }
    for (const [i, [m, tom]] of [[musicas[0], 'A'], [musicas[1], 'D']].entries()) {
        await prisma.repertorioEvento.create({ data: { evento_id: evento.id, musica_id: m.id, tom_tocado: tom, ordem: i + 1, tenant_id: tenant.id } })
    }

    // A Carla nao pode no primeiro domingo (indisponibilidade marcada)
    const carla = equipa.find(([m]) => m.first_name === 'Carla')[0]
    await prisma.indisponibilidadeMembro.create({
        data: { membro_id: carla.id, tenant_id: tenant.id, tipo: 'DATA_ESPECIFICA', data_inicio: diaHora(domingo, 0), motivo: 'Viagem' },
    })

    // Diaconia (Obreiros): lider proprio, funcoes, equipa e uma escala no domingo
    const novo = (first, last, email, role = 'USER') => prisma.membro.create({
        data: { first_name: first, last_name: last, email, password: hash, role, status: 'ATIVO', is_active: true, termo_aceite: true,
            tenant_id: tenant.id, congregacao_id: cong.id, phone_1: '91' + String(Math.floor(1000000 + Math.random() * 8999999)) },
    })
    const liderObreiros = await novo('Paulo', 'Diácono', `obreiros@${letra}.teste`, 'LEADER')
    const rui = await novo('Rui', 'Martins', `rui@${letra}.teste`)
    const diaconia = await prisma.departamento.create({ data: { nome: 'Diaconia', tenant_id: tenant.id, lider_id: liderObreiros.id } })
    const fd = {}
    for (const nome of ['Porta', 'Recepção', 'Ofertas', 'Santa Ceia']) {
        fd[nome] = await prisma.funcaoDepartamento.create({ data: { nome, departamento_id: diaconia.id, tenant_id: tenant.id } })
    }
    const daniel = equipa.find(([m]) => m.first_name === 'Daniel')[0]
    const ana = equipa.find(([m]) => m.first_name === 'Ana')[0]
    for (const [m, fs] of [[liderObreiros, ['Porta', 'Recepção']], [daniel, ['Porta', 'Santa Ceia']], [ana, ['Recepção', 'Ofertas']], [rui, ['Ofertas', 'Porta']]]) {
        await prisma.integranteDepartamento.create({
            data: { membro_id: m.id, departamento_id: diaconia.id, tenant_id: tenant.id, funcoes: { create: fs.map((f) => ({ funcao_id: fd[f].id })) } },
        })
    }
    await prisma.escala.create({ data: { funcao: 'Porta', funcao_id: fd.Porta.id, evento_id: evento.id, departamento_id: diaconia.id, membro_id: daniel.id, tenant_id: tenant.id, confirmado: true } })
    await prisma.escala.create({ data: { funcao: 'Ofertas', funcao_id: fd.Ofertas.id, evento_id: evento.id, departamento_id: diaconia.id, membro_id: rui.id, tenant_id: tenant.id } })

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

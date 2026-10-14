// Permissoes na base de teste (npm run test:db). Cada teste "entra" como um
// membro da igreja A ou B e chama as actions reais; depois confere na base
// que nada mudou quando devia ser recusado.

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'

import { apagarAviso } from '@/actions/mural-actions'
import { deletarEscalaAction } from '@/actions/escalas-actions'
import { guardarNotaLider, agendarProximoContacto, registarVisitanteAction } from '@/actions/visitante-actions'
import { criarSermao, criarCurso } from '@/actions/pregacao-actions'
import { registarVenda, obterSaldoMembro } from '@/actions/cantina-local-actions'
import { criarItemAssistencia } from '@/actions/assistencia-actions'
import { confirmarPresenca, assinarTermosAction, atualizarDadosMembro } from '@/actions/membro-actions'
import { anonimizarMembroAction } from '@/actions/rgpd-actions'
import { obterAlertasOrcamento } from '@/actions/alerta-orcamento-actions'
import { selecionarCongregacao } from '@/actions/congregacao-actions'
import { getDb } from '@/lib/db'

let A: { tenant: number; escala: number; aviso: string; visitante: number; congregacao: number }

beforeAll(async () => {
    const userA = await membroPorEmail('user@a.teste')
    const escala = await prisma.escala.findFirst({ where: { tenant_id: userA.tenant_id, membro_id: userA.id } })
    const aviso = await prisma.avisoMural.findFirst({ where: { tenant_id: userA.tenant_id } })
    const visitante = await prisma.visitante.findFirst({ where: { tenant_id: userA.tenant_id } })
    const congregacao = await prisma.congregacao.findFirst({ where: { tenant_id: userA.tenant_id } })
    if (!escala || !aviso || !visitante || !congregacao) throw new Error('Base de teste incompleta: npm run test:db:preparar')
    A = { tenant: userA.tenant_id, escala: escala.id, aviso: aviso.id, visitante: visitante.id, congregacao: congregacao.id }
})
afterEach(() => sair())

describe('igreja B nao mexe na igreja A (mesmo sendo admin la)', () => {
    it('nao apaga um aviso do mural de A', async () => {
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await tentar(() => apagarAviso(A.aviso)))).toBe(true)
        expect(await prisma.avisoMural.findUnique({ where: { id: A.aviso } })).not.toBeNull()
    })

    it('nao apaga uma escala de A', async () => {
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await tentar(() => deletarEscalaAction(A.escala)))).toBe(true)
        expect(await prisma.escala.findUnique({ where: { id: A.escala } })).not.toBeNull()
    })

    it('nao escreve notas num visitante de A', async () => {
        await entrarComo('admin@b.teste')
        const antes = await prisma.visitante.findUnique({ where: { id: A.visitante } })
        expect(foiRecusado(await tentar(() => guardarNotaLider(A.visitante, 'nota de B')))).toBe(true)
        expect(foiRecusado(await tentar(() => agendarProximoContacto(A.visitante, '2030-01-01')))).toBe(true)
        const depois = await prisma.visitante.findUnique({ where: { id: A.visitante } })
        expect(depois?.notas_lider).toBe(antes?.notas_lider)
        expect(depois?.proximo_contacto).toEqual(antes?.proximo_contacto)
    })

    it('quem nao e do acolhimento nao regista visitantes', async () => {
        await entrarComo('user@a.teste')
        const antes = await prisma.visitante.count({ where: { tenant_id: A.tenant } })
        const f = new FormData()
        f.set('nome', 'Intruso'); f.set('telefone', '919999999'); f.set('origem', 'PRESENCIAL'); f.set('consentimento', 'on')
        expect(foiRecusado(await tentar(() => registarVisitanteAction(f)))).toBe(true)
        expect(await prisma.visitante.count({ where: { tenant_id: A.tenant } })).toBe(antes)
    })

    it('nao muda para uma congregacao de A', async () => {
        await entrarComo('user@b.teste')
        expect(foiRecusado(await tentar(() => selecionarCongregacao(A.congregacao)))).toBe(true)
    })

    it('o cliente da igreja nao ve registos de A', async () => {
        await entrarComo('admin@b.teste')
        const db = await getDb()
        expect(await db.escala.findUnique({ where: { id: A.escala } })).toBeNull()
        expect(await db.visitante.findUnique({ where: { id: A.visitante } })).toBeNull()
    })
})

describe('um membro comum nao faz o que e de equipas ou da administracao', () => {
    it('nao apaga escalas (nao gere o departamento)', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await tentar(() => deletarEscalaAction(A.escala)))).toBe(true)
        expect(await prisma.escala.findUnique({ where: { id: A.escala } })).not.toBeNull()
    })

    it('nao cria pregacoes nem cursos', async () => {
        await entrarComo('user@a.teste')
        const f = new FormData()
        f.set('titulo', 'Sermao de teste'); f.set('data', '2030-01-01'); f.set('pregador', 'X')
        expect(foiRecusado(await tentar(() => criarSermao(f)))).toBe(true)
        expect(foiRecusado(await tentar(() => criarCurso(f)))).toBe(true)
        expect(await prisma.sermao.count({ where: { titulo: 'Sermao de teste' } })).toBe(0)
    })

    it('nao usa a caixa da cantina nem ve o saldo de outros', async () => {
        await entrarComo('user@a.teste')
        const outro = await membroPorEmail('outro@a.teste')
        expect(foiRecusado(await tentar(() => registarVenda(null, [], 'NUMERARIO')))).toBe(true)
        expect(foiRecusado(await tentar(() => obterSaldoMembro(outro.id)))).toBe(true)
    })

    it('ve o seu proprio saldo da cantina', async () => {
        const eu = await entrarComo('user@a.teste')
        expect(foiRecusado(await tentar(() => obterSaldoMembro(eu.id)))).toBe(false)
    })

    it('nao mexe na assistencia social', async () => {
        await entrarComo('user@a.teste')
        const f = new FormData(); f.set('nome', 'Arroz'); f.set('categoria', 'ALIMENTAR')
        expect(foiRecusado(await tentar(() => criarItemAssistencia(f)))).toBe(true)
    })

    it('nao ve alertas de orcamento', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await tentar(() => obterAlertasOrcamento()))).toBe(true)
    })

    it('nao anonimiza membros (nem um admin de congregacao: so ADMIN)', async () => {
        const outro = await membroPorEmail('outro@a.teste')
        for (const quem of ['user@a.teste', 'congregation-admin@a.teste']) {
            await entrarComo(quem)
            expect(foiRecusado(await tentar(() => anonimizarMembroAction(outro.id, `${outro.first_name} ${outro.last_name}`)))).toBe(true)
        }
        expect((await membroPorEmail('outro@a.teste')).first_name).toBe('Outro')
    })
})

describe('um membro nao mexe no que e de outro membro', () => {
    it('nao confirma a escala de outro', async () => {
        await entrarComo('outro@a.teste')
        const antes = await prisma.escala.findUnique({ where: { id: A.escala } })
        await tentar(() => confirmarPresenca(A.escala, !antes?.confirmado))
        expect((await prisma.escala.findUnique({ where: { id: A.escala } }))?.confirmado).toBe(antes?.confirmado)
    })

    it('nao assina os termos de outro', async () => {
        await entrarComo('outro@a.teste')
        const user = await membroPorEmail('user@a.teste')
        await prisma.membro.update({ where: { id: user.id }, data: { termo_aceite: false } })
        expect(foiRecusado(await tentar(() => assinarTermosAction(user.id)))).toBe(true)
        expect((await membroPorEmail('user@a.teste')).termo_aceite).toBe(false)
        await prisma.membro.update({ where: { id: user.id }, data: { termo_aceite: true } })
    })

    it('nao altera o perfil (email, senha) de outro', async () => {
        await entrarComo('outro@a.teste')
        const user = await membroPorEmail('user@a.teste')
        const f = new FormData()
        f.set('first_name', 'Roubado'); f.set('last_name', 'X'); f.set('email', 'roubado@a.teste'); f.set('nova_senha', 'uma senha bem comprida')
        expect(foiRecusado(await tentar(() => atualizarDadosMembro(user.id, f)))).toBe(true)
        const depois = await membroPorEmail('user@a.teste')
        expect(depois.first_name).toBe(user.first_name)
        expect(depois.password).toBe(user.password)
    })
})

describe('quem tem permissao continua a conseguir', () => {
    it('o lider do departamento apaga uma escala do seu departamento', async () => {
        const lider = await membroPorEmail('leader@a.teste')
        const base = await prisma.escala.findUnique({ where: { id: A.escala } })
        const depto = await prisma.departamento.findUnique({ where: { id: base!.departamento_id } })
        await prisma.departamento.update({ where: { id: depto!.id }, data: { lider_id: lider.id } })
        const nova = await prisma.escala.create({
            data: { funcao: 'Voz', evento_id: base!.evento_id, departamento_id: depto!.id, membro_id: lider.id, tenant_id: A.tenant },
        })
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await tentar(() => deletarEscalaAction(nova.id)))).toBe(false)
        expect(await prisma.escala.findUnique({ where: { id: nova.id } })).toBeNull()
    })

    it('o proprio confirma a sua escala', async () => {
        await entrarComo('user@a.teste')
        const antes = await prisma.escala.findUnique({ where: { id: A.escala } })
        await confirmarPresenca(A.escala, !antes?.confirmado)
        expect((await prisma.escala.findUnique({ where: { id: A.escala } }))?.confirmado).toBe(!antes?.confirmado)
        await confirmarPresenca(A.escala, !!antes?.confirmado)
    })

    it('o admin ve alertas de orcamento', async () => {
        await entrarComo('admin@a.teste')
        expect(foiRecusado(await tentar(() => obterAlertasOrcamento()))).toBe(false)
    })
})

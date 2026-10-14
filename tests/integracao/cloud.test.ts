// Painel Cloud (Super Admin) na base de teste: papéis, proteções das contas,
// impersonação marcada e edições de congregações/departamentos.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { entrarComoSA, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { cookies } from './cookies'
import { COOKIE_MEMBRO, lerSessao } from '@/lib/sessao-core'
import {
    suspenderIgreja, criarSuperAdmin, toggleSuperAdmin, alterarRoleSA, impersonarIgreja, terminarImpersonacao,
    atualizarDepartamentoSA, eliminarDepartamentoSA, eliminarCongregacaoSA,
} from '@/actions/super-admin-actions'
import { getSessionData } from '@/lib/auth-utils'
import { audit } from '@/lib/audit'

const SENHA = 'senha-de-teste-123'
const VIEWER = 'viewer@cloud.teste', SUPPORT = 'support@cloud.teste'
let tenantA = 0

beforeAll(async () => {
    tenantA = (await membroPorEmail('admin@a.teste')).tenant_id
    const hash = await bcrypt.hash(SENHA, 10)
    for (const [email, role] of [[VIEWER, 'VIEWER'], [SUPPORT, 'SUPPORT']]) {
        await prisma.superAdmin.upsert({ where: { email }, update: { role, is_active: true }, create: { email, nome: `Teste ${role}`, password: hash, role } })
    }
})

afterAll(async () => {
    const temp = await prisma.superAdmin.findMany({ where: { email: { in: [VIEWER, SUPPORT, 'novo.sa@cloud.teste'] } }, select: { id: true } })
    await prisma.superAdminLog.deleteMany({ where: { sa_id: { in: temp.map(t => t.id) } } })
    await prisma.superAdmin.deleteMany({ where: { id: { in: temp.map(t => t.id) } } })
})
afterEach(() => sair())

describe('papéis do Cloud', () => {
    it('VIEWER não suspende igrejas nem cria contas', async () => {
        await entrarComoSA(VIEWER)
        expect(foiRecusado(await tentar(() => suspenderIgreja(tenantA)))).toBe(true)
        expect((await prisma.tenant.findUnique({ where: { id: tenantA } }))?.status).toBe('ATIVO')
        const f = new FormData()
        f.set('nome', 'X'); f.set('email', 'x@cloud.teste'); f.set('password', 'uma-senha-bem-longa-123'); f.set('role', 'ADMIN')
        expect(foiRecusado(await tentar(() => criarSuperAdmin(f)))).toBe(true)
        expect(await prisma.superAdmin.findUnique({ where: { email: 'x@cloud.teste' } })).toBeNull()
    })

    it('VIEWER não entra nas igrejas; SUPPORT entra, mas só com motivo', async () => {
        await entrarComoSA(VIEWER)
        expect(foiRecusado(await tentar(() => impersonarIgreja(tenantA, 'quero ver')))).toBe(true)
        await entrarComoSA(SUPPORT)
        expect(foiRecusado(await tentar(() => impersonarIgreja(tenantA, '')))).toBe(true)
        expect(cookies.has(COOKIE_MEMBRO)).toBe(false)
    })
})

describe('impersonação marcada', () => {
    it('a sessão diz quem do Cloud entrou, a auditoria também, e "Voltar ao Cloud" fecha-a', async () => {
        const sa = await entrarComoSA(SUPPORT)
        const r = await tentar(() => impersonarIgreja(tenantA, 'teste automático de suporte'))
        expect(r).toEqual({ lancou: 'NEXT_REDIRECT:/membros/dashboard' })

        const payload = await lerSessao(cookies.get(COOKIE_MEMBRO))
        expect(payload && payload.t === 'm' && payload.imp).toBe(sa.id)
        const sessao = await getSessionData()
        expect(sessao?.impersonadoPor).toEqual({ saId: sa.id, nome: sa.nome })

        await audit({ tenant_id: tenantA, categoria: 'SISTEMA' as never, acao: 'EDITAR', descricao: 'teste-impersonar' })
        const linha = await prisma.auditLog.findFirst({ where: { descricao: 'teste-impersonar' }, orderBy: { id: 'desc' } })
        expect(linha?.actor_nome).toMatch(/^Teste SUPPORT \(Cloud\) como /)
        await prisma.auditLog.deleteMany({ where: { descricao: 'teste-impersonar' } })

        const log = await prisma.superAdminLog.findFirst({ where: { sa_id: sa.id, acao: 'IMPERSONAR' }, orderBy: { id: 'desc' } })
        expect(log?.detalhes).toContain('motivo: teste automático de suporte')

        expect(await tentar(() => terminarImpersonacao())).toEqual({ lancou: 'NEXT_REDIRECT:/super-admin/dashboard' })
        expect(cookies.has(COOKIE_MEMBRO)).toBe(false)
    })

    it('se a conta do Cloud for desativada, a sessão de impersonação deixa de valer', async () => {
        const sa = await entrarComoSA(SUPPORT)
        await tentar(() => impersonarIgreja(tenantA, 'teste de desativar'))
        await prisma.superAdmin.update({ where: { id: sa.id }, data: { is_active: false } })
        expect(await getSessionData()).toBeNull()
        await prisma.superAdmin.update({ where: { id: sa.id }, data: { is_active: true } })
    })
})

describe('contas do Cloud', () => {
    it('não se desativa a si próprio nem tira o papel ao único ADMIN', async () => {
        const eu = await entrarComoSA('sa@teste.teste')
        expect(foiRecusado(await toggleSuperAdmin(eu.id))).toBe(true)
        const outrosAdmins = await prisma.superAdmin.count({ where: { role: 'ADMIN', is_active: true, id: { not: eu.id } } })
        if (outrosAdmins === 0) expect(foiRecusado(await alterarRoleSA(eu.id, 'VIEWER'))).toBe(true)
        expect((await prisma.superAdmin.findUnique({ where: { id: eu.id } }))).toMatchObject({ is_active: true, role: 'ADMIN' })
    })

    it('o email da conta nova fica em minúsculas (o login também as usa)', async () => {
        await entrarComoSA('sa@teste.teste')
        const f = new FormData()
        f.set('nome', 'Novo SA'); f.set('email', '  Novo.SA@Cloud.Teste '); f.set('password', 'uma-senha-bem-longa-123'); f.set('role', 'VIEWER')
        expect(foiRecusado(await criarSuperAdmin(f))).toBe(false)
        expect(await prisma.superAdmin.findUnique({ where: { email: 'novo.sa@cloud.teste' } })).not.toBeNull()
    })
})

describe('edições no Cloud', () => {
    it('edita o nome de um departamento e recusa um nome repetido', async () => {
        await entrarComoSA('sa@teste.teste')
        const [d1, d2] = await prisma.departamento.findMany({ where: { tenant_id: tenantA, congregacaoId: null }, orderBy: { id: 'asc' }, take: 2 })
        const f = new FormData()
        f.set('nome', d2.nome); f.set('descricao', ''); f.set('is_global', 'false')
        expect(foiRecusado(await atualizarDepartamentoSA(tenantA, d1.id, f))).toBe(true)
        f.set('nome', `${d1.nome} (editado)`)
        expect(foiRecusado(await atualizarDepartamentoSA(tenantA, d1.id, f))).toBe(false)
        expect((await prisma.departamento.findUnique({ where: { id: d1.id } }))?.nome).toBe(`${d1.nome} (editado)`)
        await prisma.departamento.update({ where: { id: d1.id }, data: { nome: d1.nome, descricao: d1.descricao, is_global: d1.is_global } })
    })

    it('não apaga um departamento com escalas (levava-as)', async () => {
        await entrarComoSA('sa@teste.teste')
        const comEscalas = await prisma.departamento.findFirst({ where: { tenant_id: tenantA, escalas: { some: {} } } })
        expect(comEscalas).not.toBeNull()
        expect(foiRecusado(await eliminarDepartamentoSA(tenantA, comEscalas!.id))).toBe(true)
        expect(await prisma.departamento.findUnique({ where: { id: comEscalas!.id } })).not.toBeNull()
    })

    it('apaga uma congregação: o que estava nela fica sem congregação', async () => {
        await entrarComoSA('sa@teste.teste')
        const c = await prisma.congregacao.create({ data: { nome: 'Temporária [teste]', cidade: 'X', endereco: 'Y', tenant_id: tenantA } })
        const d = await prisma.departamento.create({ data: { nome: 'Dep temporário [teste]', tenant_id: tenantA, congregacaoId: c.id } })
        const r = await eliminarCongregacaoSA(tenantA, c.id)
        expect(foiRecusado(r)).toBe(false)
        expect(await prisma.congregacao.findUnique({ where: { id: c.id } })).toBeNull()
        expect((await prisma.departamento.findUnique({ where: { id: d.id } }))?.congregacaoId).toBeNull()
        await prisma.departamento.delete({ where: { id: d.id } })
    })

    it('de outra igreja não se apaga nada', async () => {
        await entrarComoSA('sa@teste.teste')
        const deB = await prisma.congregacao.findFirst({ where: { tenant_id: { not: tenantA } } })
        expect(foiRecusado(await eliminarCongregacaoSA(tenantA, deB!.id))).toBe(true)
        expect(await prisma.congregacao.findUnique({ where: { id: deB!.id } })).not.toBeNull()
    })
})

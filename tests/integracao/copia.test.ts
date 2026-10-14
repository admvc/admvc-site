// Copia de seguranca e restauro (Super Admin), na base de teste: copiar,
// mexer, restaurar, e confirmar que volta tudo menos o que deve ficar.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Prisma } from '@prisma/client'
import { cookies } from './cookies'
import { membroPorEmail, sair, prisma } from './ajuda'
import { assinarSessao, impressaoDaSenha, COOKIE_SA } from '@/lib/sessao-core'
import { copiaCompleta, copiaEmJson, tabelaNaBase } from '@/lib/copia/gerar'
import { analisarCopiaAction, restaurarCopiaAction } from '@/actions/copia-actions'

let pasta: string
let json: string
let viewerId: number
let userOriginal: { id: number; password: string | null }

async function entrarComoSA(email: string) {
    const sa = await prisma.superAdmin.findUniqueOrThrow({ where: { email } })
    cookies.set(COOKIE_SA, await assinarSessao({ t: 'sa', sa: sa.id, pw: await impressaoDaSenha(sa.password), exp: Math.floor(Date.now() / 1000) + 3600 }))
}

const ficheiro = (texto: string) => new File([texto], 'copia.json', { type: 'application/json' })
const form = (campos: Record<string, string | File>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(campos)) f.set(k, v)
    return f
}

beforeAll(async () => {
    pasta = await mkdtemp(join(tmpdir(), 'admvc-copias-'))
    process.env.COPIAS_PASTA_LOCAL = pasta
    const sa = await prisma.superAdmin.findUniqueOrThrow({ where: { email: 'sa@teste.teste' } })
    viewerId = (await prisma.superAdmin.create({ data: { email: 'viewer@teste.teste', password: sa.password, nome: 'Viewer', role: 'VIEWER' } })).id
    const u = await membroPorEmail('user@a.teste')
    userOriginal = { id: u.id, password: u.password }
    json = copiaEmJson(await copiaCompleta())
})
afterEach(() => sair())
afterAll(async () => {
    // Mesmo que um teste falhe a meio: o user@a volta a entrar com a senha de teste.
    await prisma.membro.update({ where: { id: userOriginal.id }, data: { password: userOriginal.password, push_subscription: Prisma.DbNull } })
    await prisma.membro.deleteMany({ where: { email: { in: ['depois@a.teste', 'seq@a.teste'] } } })
    await prisma.superAdminLog.deleteMany({ where: { sa_id: viewerId } })
    await prisma.superAdmin.delete({ where: { id: viewerId } })
    delete process.env.COPIAS_PASTA_LOCAL
    await rm(pasta, { recursive: true, force: true })
})

describe('a copia', () => {
    it('leva todas as tabelas e as ligacoes, sem segredos', () => {
        const c = JSON.parse(json)
        expect(c.app).toBe('admvc')
        expect(c.tabelas.Membro.length).toBeGreaterThan(0)
        expect(c.tabelas.Membro[0]).not.toHaveProperty('password')
        expect(c.tabelas.Membro[0]).not.toHaveProperty('push_subscription')
        expect(c.tabelas.SuperAdmin[0]).not.toHaveProperty('password')
        expect(c.tabelas.Tenant[0]).not.toHaveProperty('holyrics_token')
        expect(c.ligacoes).toHaveProperty('_CargoToMembro')
    })
})

describe('quem pode', () => {
    it('sem sessao, ou um Super Admin VIEWER, nao analisa nem restaura', async () => {
        expect((await analisarCopiaAction(form({ ficheiro: ficheiro(json) }))).ok).toBe(false)
        await entrarComoSA('viewer@teste.teste')
        expect((await analisarCopiaAction(form({ ficheiro: ficheiro(json) }))).ok).toBe(false)
        expect((await restaurarCopiaAction(form({ ficheiro: ficheiro(json), confirmacao: 'RESTAURAR' }))).ok).toBe(false)
    })
})

describe('restaurar', () => {
    it('sem RESTAURAR escrito nao faz nada; um ficheiro estranho e recusado', async () => {
        await entrarComoSA('sa@teste.teste')
        const r = await restaurarCopiaAction(form({ ficheiro: ficheiro(json), confirmacao: 'sim' }))
        expect(r).toMatchObject({ ok: false, message: expect.stringMatching(/RESTAURAR/) })
        expect((await analisarCopiaAction(form({ ficheiro: ficheiro('{"app":"outra"}') }))).ok).toBe(false)
        expect(await readdir(pasta)).toHaveLength(0)
    })

    it('volta tudo como estava na copia, menos senhas, Super Admins e registo', async () => {
        const user = await membroPorEmail('user@a.teste')
        const antes = { nome: user.first_name }
        const membrosAntes = await prisma.membro.count()
        const ligacoesAntes = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${tabelaNaBase("_CargoToMembro")}`)

        // Mexer depois da copia: um membro novo, um nome mudado, uma senha nova, avisos no telemovel.
        const novo = await prisma.membro.create({ data: { tenant_id: user.tenant_id, first_name: 'Depois', last_name: 'DaCopia', email: 'depois@a.teste' } })
        await prisma.membro.update({ where: { id: user.id }, data: { first_name: 'Mudado', password: 'hash-novo', push_subscription: { endpoint: 'x' } } })
        const registoAntes = await prisma.auditLog.count()

        await entrarComoSA('sa@teste.teste')
        const a = await analisarCopiaAction(form({ ficheiro: ficheiro(json) }))
        expect(a.ok).toBe(true)
        const linhaMembro = a.tabelas!.find((t) => t.modelo === 'Membro')!
        expect(linhaMembro).toMatchObject({ agora: membrosAntes + 1, naCopia: membrosAntes })
        expect(linhaMembro.depoisDaCopia).toBeGreaterThanOrEqual(1)
        expect(a.tabelas!.map((t) => t.modelo)).not.toContain('SuperAdmin')

        const r = await restaurarCopiaAction(form({ ficheiro: ficheiro(json), confirmacao: 'restaurar' }))
        expect(r.message).toMatch(/Restaurada/)
        expect(r.ok).toBe(true)

        // Os dados voltam.
        expect(await prisma.membro.findUnique({ where: { id: novo.id } })).toBeNull()
        expect(await prisma.membro.count()).toBe(membrosAntes)
        const depois = await prisma.membro.findUniqueOrThrow({ where: { id: user.id } })
        expect(depois.first_name).toBe(antes.nome)
        expect(await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM ${tabelaNaBase("_CargoToMembro")}`)).toEqual(ligacoesAntes)

        // O que fica como estava hoje: a senha e os avisos de agora, o registo, os Super Admins.
        expect(depois.password).toBe('hash-novo')
        expect(depois.push_subscription).toEqual({ endpoint: 'x' })
        expect(await prisma.auditLog.count()).toBe(registoAntes)
        expect(await prisma.superAdmin.findUnique({ where: { id: viewerId } })).not.toBeNull()
        expect(await prisma.superAdminLog.findFirst({ where: { acao: 'RESTAURAR_COPIA' }, orderBy: { id: 'desc' } })).not.toBeNull()

        // Gravou a de antes, e os numeros automaticos continuam a seguir.
        const guardadas = await readdir(pasta)
        expect(guardadas).toHaveLength(1)
        expect(guardadas[0]).toMatch(/^antes-de-restaurar-/)
        const outro = await prisma.membro.create({ data: { tenant_id: user.tenant_id, first_name: 'Seq', last_name: 'Teste', email: 'seq@a.teste' } })
        expect(outro.id).toBeGreaterThan(Math.max(...JSON.parse(json).tabelas.Membro.map((m: { id: number }) => m.id)))
        await prisma.membro.delete({ where: { id: outro.id } })
    }, 240_000)
})

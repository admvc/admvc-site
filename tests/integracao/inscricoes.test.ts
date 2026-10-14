// Inscrições em eventos na base de teste: inscrição pública (membro reconhecido em
// silêncio, visitante para o acolhimento), gestão só para quem organiza, entrada
// pelo código e criar eventos só para os próprios grupos.

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { inscreverAction, alterarInscricaoAction, entradaPorCodigoAction, guardarEventoAction } from '@/actions/inscricao-actions'

const SLUG = 'teste-integracao-insc'
let tenantA = 0, grupoA = 0, eventoId = 0
const criados: string[] = []

function formInscricao(campos: Record<string, string>) {
    const f = new FormData()
    for (const [k, v] of Object.entries({ consentimento: 'on', campo_c1: 'on', ...campos })) f.set(k, v)
    return f
}

beforeAll(async () => {
    const lider = await membroPorEmail('leader@a.teste')
    tenantA = lider.tenant_id
    const g = await prisma.grupo.findFirst({ where: { tenant_id: tenantA, lideres: { some: { id: lider.id } } } })
    if (!g) throw new Error('Base de teste sem grupo liderado pelo leader@a.teste')
    grupoA = g.id
    // A igreja da página pública é a primeira ativa: tem de ser a A
    const publica = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' } })
    if (publica?.id !== tenantA) throw new Error('A igreja A tem de ser a primeira ativa')
    await prisma.inscricao.deleteMany({ where: { evento: { slug: SLUG } } })
    await prisma.eventoInscricao.deleteMany({ where: { slug: SLUG } })
    const e = await prisma.eventoInscricao.create({
        data: {
            tenant_id: tenantA, slug: SLUG, titulo: 'Teste integração', inicio: new Date('2030-01-10T19:00:00Z'),
            preco_eur: 5, estado: 'ABERTO', grupo_id: grupoA, campos: [{ id: 'c1', rotulo: 'Aceito', tipo: 'aceite', obrigatorio: true }],
        },
    })
    eventoId = e.id
})

afterAll(async () => {
    const vis = await prisma.inscricao.findMany({ where: { evento_inscricao_id: eventoId, visitante_id: { not: null } }, select: { visitante_id: true } })
    await prisma.inscricao.deleteMany({ where: { evento_inscricao_id: eventoId } })
    await prisma.eventoInscricao.deleteMany({ where: { OR: [{ id: eventoId }, { slug: { in: criados } }] } })
    const ids = vis.map(v => v.visitante_id!)
    await prisma.acompanhamentoVisitante.deleteMany({ where: { visitante_id: { in: ids } } })
    await prisma.visitante.deleteMany({ where: { id: { in: ids } } })
})
afterEach(() => sair())

describe('inscrição pública (sem sessão)', () => {
    it('membro reconhecido pelo telefone, sem nada da ficha na resposta', async () => {
        const user = await membroPorEmail('user@a.teste')
        const r = await inscreverAction(SLUG, formInscricao({ nome: 'Nome Escrito', telefone: user.phone_1! }))
        expect(r).toMatchObject({ ok: true, repetida: false })
        expect(JSON.stringify(r)).not.toContain(user.first_name)
        const i = await prisma.inscricao.findFirst({ where: { evento_inscricao_id: eventoId, membro_id: user.id } })
        expect(i?.nome).toBe('Nome Escrito')
    })

    it('mesmo telefone outra vez: resposta neutra, sem código', async () => {
        const user = await membroPorEmail('user@a.teste')
        expect(await inscreverAction(SLUG, formInscricao({ nome: 'Outra', telefone: `+351 ${user.phone_1}` }))).toEqual({ ok: true, codigo: null, repetida: true })
    })

    it('visitante que pede contacto entra no acolhimento; sem a caixa obrigatória não passa', async () => {
        expect(foiRecusado(await inscreverAction(SLUG, formInscricao({ nome: 'Visitante Teste', telefone: '969999001', campo_c1: '' })))).toBe(true)
        const r = await inscreverAction(SLUG, formInscricao({ nome: 'Visitante Teste', telefone: '969999001', quer_contacto: 'on', email: 'v@exemplo.invalid' }))
        expect(r.ok).toBe(true)
        const i = await prisma.inscricao.findFirst({ where: { evento_inscricao_id: eventoId, telefone: '969999001' }, include: { visitante: true } })
        expect(i?.membro_id).toBeNull()
        expect(i?.visitante?.origem).toBe('EVENTO')
    })
})

describe('gestão', () => {
    it('quem não organiza não confirma nem regista entradas', async () => {
        const i = await prisma.inscricao.findFirstOrThrow({ where: { evento_inscricao_id: eventoId, telefone: '969999001' } })
        await entrarComo('user@a.teste')
        expect(foiRecusado(await alterarInscricaoAction(i.id, 'CONFIRMAR'))).toBe(true)
        expect(foiRecusado(await entradaPorCodigoAction(SLUG, i.codigo))).toBe(true)
        expect((await prisma.inscricao.findUnique({ where: { id: i.id } }))?.estado).toBe('PENDENTE')
    })

    it('a líder confirma (email enviado) e regista a entrada pelo código', async () => {
        const i = await prisma.inscricao.findFirstOrThrow({ where: { evento_inscricao_id: eventoId, telefone: '969999001' } })
        const g = globalThis as unknown as { __emailsInscricao?: unknown[] }
        const antes = g.__emailsInscricao?.length ?? 0
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await alterarInscricaoAction(i.id, 'CONFIRMAR'))).toBe(false)
        expect(g.__emailsInscricao?.length).toBe(antes + 1)

        const r1 = await entradaPorCodigoAction(SLUG, ` ${i.codigo.toLowerCase()} `)
        expect(r1).toMatchObject({ ok: true, jaEstava: false, nome: 'Visitante Teste' })
        expect((await prisma.inscricao.findUnique({ where: { id: i.id } }))?.presente_em).not.toBeNull()
        expect(await entradaPorCodigoAction(SLUG, i.codigo)).toMatchObject({ ok: true, jaEstava: true })
        expect(foiRecusado(await entradaPorCodigoAction(SLUG, 'ZZZZZ'))).toBe(true)
    })
})

describe('criar eventos', () => {
    const f = (organizador: string) => {
        const d = new FormData()
        for (const [k, v] of Object.entries({ titulo: 'Retiro Teste', data: '2030-03-01', hora: '10:00', organizador, estado: 'RASCUNHO' })) d.set(k, v)
        return d
    }

    it('a líder cria para o seu grupo; não para um grupo que não lidera', async () => {
        await entrarComo('leader@a.teste')
        const r = await guardarEventoAction(null, f(`grupo:${grupoA}`))
        expect(r.ok).toBe(true)
        if (r.ok) criados.push(r.slug)
        const outro = await prisma.grupo.findFirst({ where: { tenant_id: { not: tenantA } } })
        expect(foiRecusado(await guardarEventoAction(null, f(`grupo:${outro!.id}`)))).toBe(true)
    })

    it('quem não lidera nada não cria', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await tentar(() => guardarEventoAction(null, f(`grupo:${grupoA}`))))).toBe(true)
    })
})

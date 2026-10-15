// Rotina dos cultos (Pregações), na base de teste: quem altera, passar à série, modelos.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { guardarRotina, aplicarRotinaASerie, guardarModelo, apagarModelo } from '@/actions/rotina-actions'
import { dadosDaRotina } from '@/lib/rotina-culto-dados'
import { getSessionData } from '@/lib/auth-utils'

let ctx: { tenant: number; cong: number; serie: number[]; pastor: number }

const semana = 7 * 86400000

beforeAll(async () => {
    const admin = await membroPorEmail('admin@a.teste')
    const cong = await prisma.congregacao.findFirst({ where: { tenant_id: admin.tenant_id }, orderBy: { id: 'asc' } })
    // Uma série: 3 cultos à quinta às 20:00 (hora de parede), daqui a 1, 2 e 3 semanas
    const base = new Date(); base.setUTCHours(20, 0, 0, 0)
    base.setUTCDate(base.getUTCDate() + ((4 - base.getUTCDay() + 7) % 7) + 7)
    const serie = []
    for (let i = 0; i < 3; i++) {
        const e = await prisma.evento.create({
            data: { nome: 'Culto de Teste da Rotina', tipo: 'CULTO_REGULAR', data: new Date(base.getTime() + i * semana), tenant_id: admin.tenant_id, congregacao_id: cong!.id },
        })
        serie.push(e.id)
    }
    const pastor = await prisma.membro.update({ where: { id: (await membroPorEmail('manager@a.teste')).id }, data: { church_role: 'Pastor(a)', gender: 'Masculino' } })
    ctx = { tenant: admin.tenant_id, cong: cong!.id, serie, pastor: pastor.id }
})

afterAll(async () => {
    await prisma.rotinaModelo.deleteMany({ where: { tenant_id: ctx.tenant } })
    await prisma.evento.deleteMany({ where: { id: { in: ctx.serie } } }) // a rotina vai com o evento (cascade)
    await prisma.membro.update({ where: { id: ctx.pastor }, data: { church_role: 'Membro' } })
})
afterEach(() => sair())

const rotina = () => [
    { momento: 'Louvor', duracao: 35 },
    { momento: 'Oração pela Família', nome: 'Evangelista Gustavo Santos' },
    { momento: 'Palavra', membro_id: ctx.pastor, nota: 'Os talentos de Deus' },
]

describe('rotina de um culto', () => {
    it('o líder da Diaconia guarda; um membro comum não', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await guardarRotina(ctx.serie[0], rotina()))).toBe(true)
        expect(await prisma.rotinaCulto.count({ where: { evento_id: ctx.serie[0] } })).toBe(0)

        await entrarComo('obreiros@a.teste')
        expect(foiRecusado(await guardarRotina(ctx.serie[0], rotina()))).toBe(false)
        const r = await prisma.rotinaCulto.findUnique({ where: { evento_id: ctx.serie[0] } })
        expect((r!.itens as any[]).map((i) => i.momento)).toEqual(['Louvor', 'Oração pela Família', 'Palavra'])
    })

    it('outra igreja não mexe', async () => {
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await tentar(() => guardarRotina(ctx.serie[0], [{ momento: 'Invasão' }])))).toBe(true)
        const r = await prisma.rotinaCulto.findUnique({ where: { evento_id: ctx.serie[0] } })
        expect((r!.itens as any[])[0].momento).toBe('Louvor')
    })

    it('um membro comum vê a rotina, com o título do cargo, mas não altera', async () => {
        await entrarComo('user@a.teste')
        const d = await dadosDaRotina((await getSessionData())!, ctx.serie[0])
        expect(d!.podeEditar).toBe(false)
        expect(d!.itens).toHaveLength(3)
        expect(d!.membros.map((m) => m.id)).toEqual([ctx.pastor]) // só quem está na rotina
        expect(d!.modelos).toEqual([])
    })

    it('passa aos próximos cultos da série, sem as notas e sem estragar os que já têm', async () => {
        await entrarComo('admin@a.teste')
        await guardarRotina(ctx.serie[2], [{ momento: 'Já tinha' }])
        const r: any = await aplicarRotinaASerie(ctx.serie[0])
        expect(r).toMatchObject({ ok: true, aplicados: 1, ignorados: 1 })
        const segunda = await prisma.rotinaCulto.findUnique({ where: { evento_id: ctx.serie[1] } })
        expect((segunda!.itens as any[]).map((i) => i.nota)).toEqual([null, null, null])
        expect((segunda!.itens as any[])[2].membro_id).toBe(ctx.pastor)
        const terceira = await prisma.rotinaCulto.findUnique({ where: { evento_id: ctx.serie[2] } })
        expect((terceira!.itens as any[])[0].momento).toBe('Já tinha')
    })

    it('guardar vazio apaga', async () => {
        await entrarComo('admin@a.teste')
        expect(foiRecusado(await guardarRotina(ctx.serie[2], []))).toBe(false)
        expect(await prisma.rotinaCulto.count({ where: { evento_id: ctx.serie[2] } })).toBe(0)
    })
})

describe('modelos de rotina', () => {
    it('admin cria, altera e apaga; membro comum não', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await guardarModelo({ nome: 'X', congregacaoId: ctx.cong, itens: rotina() }))).toBe(true)

        await entrarComo('admin@a.teste')
        const r: any = await guardarModelo({ nome: 'Culto de domingo', congregacaoId: ctx.cong, itens: rotina() })
        expect(r.ok).toBe(true)
        expect(foiRecusado(await guardarModelo({ id: r.id, nome: 'Domingo', congregacaoId: ctx.cong, itens: rotina() }))).toBe(false)
        expect((await prisma.rotinaModelo.findUnique({ where: { id: r.id } }))!.nome).toBe('Domingo')
        expect(foiRecusado(await guardarModelo({ nome: 'Sem momentos', congregacaoId: ctx.cong, itens: [] }))).toBe(true)

        // aparece para escolher no culto da mesma congregação
        const d = await dadosDaRotina((await getSessionData())!, ctx.serie[2])
        expect(d!.modelos.map((m) => m.nome)).toContain('Domingo')
        expect(d!.anterior?.itens.length).toBe(3)

        expect(foiRecusado(await apagarModelo(r.id))).toBe(false)
        expect(await prisma.rotinaModelo.count({ where: { id: r.id } })).toBe(0)
    })

    it('o admin de uma congregação não cria modelos para todas', async () => {
        await entrarComo('congregation-admin@a.teste')
        expect(foiRecusado(await guardarModelo({ nome: 'Todas', congregacaoId: null, itens: rotina() }))).toBe(true)
    })
})

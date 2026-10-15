// Esboços das pregações, na base de teste: quem prega escreve o seu a partir
// do culto; os outros só leem depois de publicado; outra igreja não entra.
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { abrirEsbocoDoCulto, guardarEsboco, apagarEsboco } from '@/actions/esboco-actions'
import { historicoDePregacoes, podeLerSermao, filtrarPregacoes } from '@/lib/pregacoes'
import { dadosDaRotina } from '@/lib/rotina-culto-dados'
import { getSessionData } from '@/lib/auth-utils'

let ctx: { tenant: number; evento: number; pregador: number }
const dados = (publicado: boolean) => ({
    titulo: 'Os talentos de Deus', referencias: 'Mateus 25:14-30', texto_corpo: '1. Recebemos\n2. Multiplicamos',
    notas_privadas: 'só para mim', tags: 'mordomia, parábolas', publicado,
})

beforeAll(async () => {
    const pregador = await membroPorEmail('leader@a.teste')
    const evento = await prisma.evento.create({
        data: { nome: 'Culto dos Esboços', tipo: 'CULTO_REGULAR', data: new Date(Date.now() - 3 * 86400000), tenant_id: pregador.tenant_id },
    })
    await prisma.rotinaCulto.create({
        data: {
            evento_id: evento.id, tenant_id: pregador.tenant_id,
            itens: [{ momento: 'Louvor', duracao: 30 }, { momento: 'Palavra', membro_id: pregador.id, nota: 'Os talentos de Deus', texto: 'Mateus 25:14-30' }],
        },
    })
    ctx = { tenant: pregador.tenant_id, evento: evento.id, pregador: pregador.id }
})

afterAll(async () => {
    await prisma.sermao.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.evento.delete({ where: { id: ctx.evento } })
})
afterEach(() => sair())

let id = ''

describe('esboço da Palavra', () => {
    it('um membro que não prega não o cria', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await abrirEsbocoDoCulto(ctx.evento))).toBe(true)
        expect(await prisma.sermao.count({ where: { evento_id: ctx.evento } })).toBe(0)
    })

    it('outra igreja não entra', async () => {
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await tentar(() => abrirEsbocoDoCulto(ctx.evento)))).toBe(true)
    })

    it('quem prega cria-o (com o tema e o texto da rotina) e volta ao mesmo', async () => {
        await entrarComo('leader@a.teste')
        const r: any = await abrirEsbocoDoCulto(ctx.evento)
        expect(r.ok).toBe(true)
        id = r.id
        const s = await prisma.sermao.findUnique({ where: { id } })
        expect(s!.titulo).toBe('Os talentos de Deus')
        expect(s!.pregador_id).toBe(ctx.pregador)
        expect(s!.publicado).toBe(false)
        expect(s!.referencias_biblicas).toEqual([{ livro: 'Mateus', capitulo: 25, versiculo_inicio: 14, versiculo_fim: 30 }])
        expect(((await abrirEsbocoDoCulto(ctx.evento)) as any).id).toBe(id)
    })

    it('só quem prega altera; por publicar, os outros não o leem nem o veem no histórico', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await guardarEsboco(id, dados(true)))).toBe(true)
        expect(foiRecusado(await apagarEsboco(id))).toBe(true)
        const sessao = (await getSessionData())!
        const s = await prisma.sermao.findUnique({ where: { id } })
        expect(await podeLerSermao(sessao, s!)).toBe(false)
        const minha = (await historicoDePregacoes(sessao)).find((p) => p.eventoId === ctx.evento)
        expect(minha?.tema).toBe('Os talentos de Deus') // a pregação aparece (vem da rotina)…
        expect(minha?.esboco).toBeNull() // …mas o esboço por publicar não
        const d = await dadosDaRotina(sessao, ctx.evento)
        expect(d!.esboco).toBeNull()
        expect(d!.podeEscreverEsboco).toBe(false)

        await entrarComo('leader@a.teste')
        expect(foiRecusado(await guardarEsboco(id, dados(false)))).toBe(false)
        expect((await prisma.sermao.findUnique({ where: { id } }))!.texto_corpo).toContain('Multiplicamos')
    })

    it('publicado: todos leem e encontram no histórico', async () => {
        await entrarComo('leader@a.teste')
        await guardarEsboco(id, dados(true))
        await entrarComo('user@a.teste')
        const sessao = (await getSessionData())!
        expect(await podeLerSermao(sessao, (await prisma.sermao.findUnique({ where: { id } }))!)).toBe(true)
        const lista = await historicoDePregacoes(sessao)
        expect(filtrarPregacoes(lista, { q: 'talentos' }).find((p) => p.eventoId === ctx.evento)?.esboco?.id).toBe(id)
        expect(filtrarPregacoes(lista, { q: 'mateus 25' }).some((p) => p.eventoId === ctx.evento)).toBe(true)
        expect(filtrarPregacoes(lista, { pregador: ctx.pregador }).every((p) => p.pregadorId === ctx.pregador)).toBe(true)
    })

    it('outra igreja não vê as pregações', async () => {
        await entrarComo('admin@b.teste')
        const lista = await historicoDePregacoes((await getSessionData())!)
        expect(lista.some((p) => p.eventoId === ctx.evento)).toBe(false)
    })

    it('quem prega apaga o seu', async () => {
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await apagarEsboco(id))).toBe(false)
        expect(await prisma.sermao.count({ where: { id } })).toBe(0)
    })
})

// "Publicar para a igreja": quem pode, o que fica gravado, ficheiros da publicação anterior apagados, e se mudou depois.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { entrarComo, sair, membroPorEmail, prisma } from './ajuda'
import { concluirPublicacao, guardarKitDivulgacao, retirarPublicacao } from '@/actions/divulgacao-actions'
import { estaEmDia, lerPublicado, pastaPublicada } from '@/lib/divulgacao-publicacao'
import { receitaVazia } from '@/lib/divulgacao-kit'

const apagados: string[][] = []
vi.mock('@vercel/blob', () => ({ del: async (u: string[]) => { apagados.push(u) }, put: async () => ({ url: '' }) }))

let ctx: { tenant: number; evento: number }
const blob = (lote: string, tipo: string, id: string, tenant = ctx.tenant, evento = ctx.evento) => `https://abc123.public.blob.vercel-storage.com/${pastaPublicada(tenant, evento)}${lote}-${tipo}-${id}.png`

beforeAll(async () => {
    const admin = await membroPorEmail('admin@a.teste')
    const ev = await prisma.evento.create({ data: { nome: 'Culto (teste publicar)', data: new Date(Date.now() + 2 * 86400000), tenant_id: admin.tenant_id } as never })
    ctx = { tenant: admin.tenant_id, evento: ev.id }
})
afterAll(async () => {
    await prisma.kitDivulgacao.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.evento.deleteMany({ where: { id: ctx.evento } })
})
afterEach(() => sair())

describe('publicar para a igreja', () => {
    it('só a Mídia e a administração; precisa do kit guardado', async () => {
        await entrarComo('user@a.teste')
        expect((await concluirPublicacao(ctx.evento, '1700000000001', [{ tipo: 'peca', id: 'oracao', url: blob('1700000000001', 'peca', 'oracao') }], {})).ok).toBe(false)
        await entrarComo('admin@a.teste')
        const sem = await concluirPublicacao(ctx.evento, '1700000000001', [{ tipo: 'peca', id: 'oracao', url: blob('1700000000001', 'peca', 'oracao') }], {})
        expect(sem.ok).toBe(false)   // ainda não há kit
    })

    it('grava a lista pela ordem do kit, os textos e a receita; a seguinte apaga os ficheiros antigos', async () => {
        await entrarComo('admin@a.teste')
        const r = { ...receitaVazia(), pecas: ['oracao', 'palavra'] as never, redes: ['post'] as never }
        expect((await guardarKitDivulgacao(ctx.evento, r)).ok).toBe(true)

        const L1 = '1700000000010'
        const ok = await concluirPublicacao(ctx.evento, L1, [
            { tipo: 'rede', id: 'post', url: blob(L1, 'rede', 'post') },
            { tipo: 'peca', id: 'palavra', url: blob(L1, 'peca', 'palavra') },
            { tipo: 'peca', id: 'oracao', url: blob(L1, 'peca', 'oracao') },
        ], { legenda: ' Legenda ', whatsapp: 'Mensagem' })
        expect(ok.ok).toBe(true)
        const kit = await prisma.kitDivulgacao.findFirst({ where: { evento_id: ctx.evento } })
        const pub = lerPublicado(kit!.publicado)!
        expect(pub.itens.map((i) => `${i.tipo}:${i.id}`)).toEqual(['telao:oracao', 'telao:palavra', 'redes:post'])
        expect(pub.textos).toEqual({ legenda: 'Legenda', whatsapp: 'Mensagem' })
        expect(kit!.publicado_em).toBeTruthy()
        expect(estaEmDia(kit!.receita, kit!.publicado_receita)).toBe(true)
        expect(apagados.length).toBe(0)

        // mudar o kit → "mudou depois de publicar"
        await guardarKitDivulgacao(ctx.evento, { ...r, paleta: 'azul-branco' })
        const mudou = await prisma.kitDivulgacao.findFirst({ where: { evento_id: ctx.evento } })
        expect(estaEmDia(mudou!.receita, mudou!.publicado_receita)).toBe(false)

        // publicar outra vez: os ficheiros do lote anterior saem
        const L2 = '1700000000020'
        const dois = await concluirPublicacao(ctx.evento, L2, [
            { tipo: 'peca', id: 'oracao', url: blob(L2, 'peca', 'oracao') },
            { tipo: 'peca', id: 'palavra', url: blob(L2, 'peca', 'palavra') },
            { tipo: 'rede', id: 'post', url: blob(L2, 'rede', 'post') },
        ], {})
        expect(dois.ok).toBe(true)
        expect(apagados.flat().sort()).toEqual([blob(L1, 'peca', 'oracao'), blob(L1, 'peca', 'palavra'), blob(L1, 'rede', 'post')].sort())
    })

    it('recusa ligações de fora, de outro culto, de outro lote ou de artes que o kit não tem', async () => {
        await entrarComo('admin@a.teste')
        const L = '1700000000030'
        const mau = (url: string, tipo = 'peca', id = 'oracao') => concluirPublicacao(ctx.evento, L, [{ tipo, id, url }], {})
        expect((await mau('https://exemplo.com/a.png')).ok).toBe(false)
        expect((await mau(blob(L, 'peca', 'oracao', ctx.tenant, ctx.evento + 999))).ok).toBe(false)
        expect((await mau(blob('1700000000031', 'peca', 'oracao'))).ok).toBe(false)
        expect((await mau(blob(L, 'peca', 'oferta'), 'peca', 'oferta')).ok).toBe(false)   // o kit não tem a oferta
    })

    it('retirar apaga os ficheiros e limpa a publicação (o kit fica)', async () => {
        await entrarComo('user@a.teste')
        expect((await retirarPublicacao(ctx.evento)).ok).toBe(false)
        await entrarComo('admin@a.teste')
        apagados.length = 0
        expect((await retirarPublicacao(ctx.evento)).ok).toBe(true)
        expect(apagados.flat().length).toBe(3)
        const kit = await prisma.kitDivulgacao.findFirst({ where: { evento_id: ctx.evento } })
        expect(kit).toBeTruthy()
        expect(kit!.publicado).toBeNull()
        expect(kit!.publicado_em).toBeNull()
    })
})

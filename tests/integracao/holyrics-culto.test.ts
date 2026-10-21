// "Receber o culto do portal": o que o portal entrega ao módulo do Holyrics (repertório, artes do telão, escala, rotina).
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { membroPorEmail, prisma } from './ajuda'
import { chaveCerta, gerarChave, hashDaChave } from '@/lib/holyrics-chave'
import { cultoCompleto, cultosDoApp } from '@/lib/holyrics-culto'

let ctx: { tenant: number; evento: number; musica: string; departamento: number }
const url = (n: string) => `https://abc123.public.blob.vercel-storage.com/divulgacao/1/kits/9/1700000000010-${n}.png`

beforeAll(async () => {
    const admin = await membroPorEmail('admin@a.teste')
    const depto = await prisma.departamento.findFirst({ where: { tenant_id: admin.tenant_id }, select: { id: true, nome: true } })
    if (!depto) throw new Error('Falta um departamento na base de teste')
    const dia = new Date(); dia.setUTCHours(19, 0, 0, 0); dia.setUTCDate(dia.getUTCDate() + 1)
    const ev = await prisma.evento.create({ data: { nome: 'Culto (teste Holyrics)', data: dia, tenant_id: admin.tenant_id } as never })
    const musica = await prisma.musica.create({ data: { titulo: 'Grande é o Senhor (teste)', artista: 'Adhemar', tom: 'G', holyrics_id: '1752153870720', tenant_id: admin.tenant_id } as never })
    await prisma.repertorioEvento.create({ data: { evento_id: ev.id, musica_id: musica.id, tom_tocado: 'A', ordem: 1, tenant_id: admin.tenant_id } as never })
    await prisma.rotinaCulto.create({ data: { evento_id: ev.id, tenant_id: admin.tenant_id, itens: [{ momento: 'Louvor', duracao: 20, membro_id: admin.id }, { momento: 'Palavra', duracao: 40, nome: 'Pastor Convidado', nota: 'A fé' }] } as never })
    await prisma.escala.create({ data: { evento_id: ev.id, departamento_id: depto.id, membro_id: admin.id, funcao: 'Vocalista', confirmado: false, tenant_id: admin.tenant_id } as never })
    await prisma.kitDivulgacao.create({
        data: {
            evento_id: ev.id, tenant_id: admin.tenant_id, receita: {},
            publicado: { itens: [{ tipo: 'telao', id: 'oracao', nome: 'Oração', url: url('peca-oracao') }, { tipo: 'telao', id: 'oferta', nome: 'Oferta', url: url('peca-oferta') }, { tipo: 'redes', id: 'post', nome: 'Post', url: url('rede-post') }], textos: { legenda: '', whatsapp: '' } },
            publicado_em: new Date(),
        } as never,
    })
    ctx = { tenant: admin.tenant_id, evento: ev.id, musica: musica.id, departamento: depto.id }
})
afterAll(async () => {
    await prisma.kitDivulgacao.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.escala.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.rotinaCulto.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.repertorioEvento.deleteMany({ where: { evento_id: ctx.evento } })
    await prisma.musica.deleteMany({ where: { id: ctx.musica } })
    await prisma.evento.deleteMany({ where: { id: ctx.evento } })
})

describe('a chave do Holyrics', () => {
    it('só abre com a chave certa (compara o código guardado)', () => {
        const k = gerarChave()
        expect(k.length).toBe(24)
        expect(chaveCerta(k, hashDaChave(k))).toBe(true)
        expect(chaveCerta(k + 'x', hashDaChave(k))).toBe(false)
        expect(chaveCerta(null, hashDaChave(k))).toBe(false)
        expect(chaveCerta(k, null)).toBe(false)
    })
})

describe('o culto para o Holyrics', () => {
    it('a lista dos próximos cultos diz quantas músicas e artes do telão tem cada um', async () => {
        const c = (await cultosDoApp(ctx.tenant)).find((x) => x.id === ctx.evento)
        expect(c).toMatchObject({ nome: 'Culto (teste Holyrics)', musicas: 1, artes: 2 })
    })
    it('entrega músicas, artes do telão com a secção, escala e rotina com horas', async () => {
        const c = (await cultoCompleto(ctx.tenant, ctx.evento))!
        expect(c.musicas).toEqual([{ titulo: 'Grande é o Senhor (teste)', artista: 'Adhemar', holyricsId: '1752153870720', tom: 'A' }])
        expect(c.artes.map((a) => `${a.ficheiro}:${a.secao}`)).toEqual(['01-oracao.png:ABERTURA', '02-oferta.png:OFERTORIO'])   // nunca as das redes
        expect(c.escala.length).toBe(1)
        expect(c.escala[0]).toMatch(/: Vocalista .* \(por confirmar\)$/)
        expect(c.rotina[0]).toMatch(/^19:00 Louvor \(20 min\)/)
        expect(c.rotina[1]).toBe('19:20 Palavra (40 min) — Pastor Convidado — A fé')
    })
    it('culto de outra igreja ou inexistente não sai', async () => {
        expect(await cultoCompleto(ctx.tenant, 999999999)).toBeNull()
        expect(await cultoCompleto(ctx.tenant + 1000, ctx.evento)).toBeNull()
    })
})

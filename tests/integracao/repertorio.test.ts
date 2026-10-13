// Escalas "a la LouveApp" (ministerios, pagina da escala) e repertorio por
// igreja, na base de teste.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { getSessionData } from '@/lib/auth-utils'
import { cultosDoMinisterio, dadosDaEscala, meusMinisterios, musicaDoRepertorio, repertorioDaIgreja } from '@/lib/ministerios-app'
import { podeVerRepertorio } from '@/lib/louvor-permissoes'
import {
    adicionarMusicaNaEscala, apagarMusica, criarMusica, moverMusicaNaEscala, mudarTomNaEscala, tirarMusicaDaEscala,
} from '@/actions/repertorio-app-actions'

let ctx: { tenantA: number; depto: number; domingo: number; outroDomingo: number; quarta: number; musicaB: string }
const criadas: string[] = []

const sessao = async () => (await getSessionData())!

beforeAll(async () => {
    const lider = await membroPorEmail('leader@a.teste')
    const depto = await prisma.departamento.findFirst({ where: { tenant_id: lider.tenant_id, nome: 'Louvor' } })
    const eventos = await prisma.evento.findMany({ where: { tenant_id: lider.tenant_id }, orderBy: { data: 'asc' } })
    const outra = await membroPorEmail('leader@b.teste')
    const musicaB = await prisma.musica.findFirst({ where: { tenant_id: outra.tenant_id } })
    ctx = {
        tenantA: lider.tenant_id, depto: depto!.id,
        domingo: eventos[0].id, quarta: eventos[1].id, outroDomingo: eventos[2].id,
        musicaB: musicaB!.id,
    }
    // O culto usado para mexer na setlist comeca vazio
    await prisma.repertorioEvento.deleteMany({ where: { evento_id: ctx.outroDomingo } })
})
afterEach(() => sair())
afterAll(async () => {
    await prisma.repertorioEvento.deleteMany({ where: { musica_id: { in: criadas } } })
    await prisma.musica.deleteMany({ where: { id: { in: criadas } } })
})

describe('ministerios e escalas', () => {
    it('o membro ve o Louvor nos seus ministerios, com a sua escala', async () => {
        await entrarComo('user@a.teste')
        const m = (await meusMinisterios(await sessao())).find((x) => x.nome === 'Louvor')
        expect(m).toMatchObject({ eLouvor: true, minhas: 1, musicas: 4 })
    })

    it('o membro so ve os cultos com escala; o lider ve tambem os por montar', async () => {
        await entrarComo('user@a.teste')
        const membro = await cultosDoMinisterio(await sessao(), ctx.depto, 'proximas', false)
        expect(membro.map((c) => c.id)).toEqual([ctx.domingo])
        expect(membro[0]).toMatchObject({ confirmados: 1, musicas: 2, euEstou: true })

        await entrarComo('leader@a.teste')
        const lider = await cultosDoMinisterio(await sessao(), ctx.depto, 'proximas', true)
        expect(lider.map((c) => c.id)).toEqual(expect.arrayContaining([ctx.domingo, ctx.quarta, ctx.outroDomingo]))
    })

    it('a pagina da escala: equipa, musicas pela ordem e a minha parte', async () => {
        await entrarComo('user@a.teste')
        const d = await dadosDaEscala(await sessao(), ctx.domingo, ctx.depto)
        expect(d?.musicas.map((m) => [m.ordem, m.tom])).toEqual([[1, 'A'], [2, 'D']])
        expect(d?.minhas).toEqual([expect.objectContaining({ funcao: 'Voz', estado: 'POR_CONFIRMAR' })])
        expect(d?.participantes).toHaveLength(2)
        expect(d?.gere).toBe(false)
        expect(d?.gereMusicas).toBe(false)
    })

    it('quem nao e do ministerio nao abre a escala; outra igreja tambem nao', async () => {
        await entrarComo('finance@a.teste')
        expect(await dadosDaEscala(await sessao(), ctx.domingo, ctx.depto)).toBeNull()
        expect(await podeVerRepertorio(await sessao())).toBe(false)
        await entrarComo('leader@b.teste')
        expect(await dadosDaEscala(await sessao(), ctx.domingo, ctx.depto)).toBeNull()
    })
})

describe('setlist de um culto (lider)', () => {
    it('cria uma musica, junta ao culto, muda o tom e a ordem, e tira', async () => {
        await entrarComo('leader@a.teste')
        const c = await criarMusica({ titulo: 'Teste Setlist', artista: 'Vitest', tom: 'E' })
        expect(c.ok).toBe(true)
        const id = (c as { id: string }).id
        criadas.push(id)
        expect((await prisma.musica.findUnique({ where: { id } }))?.tenant_id).toBe(ctx.tenantA)

        const outra = await prisma.musica.findFirst({ where: { tenant_id: ctx.tenantA, titulo: 'Lugar Secreto' } })
        expect((await adicionarMusicaNaEscala(ctx.outroDomingo, outra!.id, 'D')).ok).toBe(true)
        expect((await adicionarMusicaNaEscala(ctx.outroDomingo, id, 'F#m')).ok).toBe(true)
        expect(foiRecusado(await adicionarMusicaNaEscala(ctx.outroDomingo, id, 'G'))).toBe(true) // ja esta
        expect(foiRecusado(await adicionarMusicaNaEscala(ctx.outroDomingo, outra!.id, 'H'))).toBe(true) // tom invalido

        const s = await sessao()
        let lista = (await dadosDaEscala(s, ctx.outroDomingo, ctx.depto))!.musicas
        expect(lista.map((m) => m.titulo)).toEqual(['Lugar Secreto', 'Teste Setlist'])

        expect((await moverMusicaNaEscala(lista[1].id, -1)).ok).toBe(true)
        expect((await mudarTomNaEscala(lista[0].id, 'Eb')).ok).toBe(true) // Lugar Secreto (ainda em 1.º nesta lista)
        lista = (await dadosDaEscala(s, ctx.outroDomingo, ctx.depto))!.musicas
        expect(lista.map((m) => [m.titulo, m.ordem, m.tom])).toEqual([['Teste Setlist', 1, 'F#m'], ['Lugar Secreto', 2, 'Eb']])

        expect((await tirarMusicaDaEscala(lista[0].id)).ok).toBe(true)
        lista = (await dadosDaEscala(s, ctx.outroDomingo, ctx.depto))!.musicas
        expect(lista.map((m) => [m.titulo, m.ordem])).toEqual([['Lugar Secreto', 1]])
        await tirarMusicaDaEscala(lista[0].id)
    })

    it('nao apaga musicas ja tocadas; apaga as que nunca foram', async () => {
        await entrarComo('leader@a.teste')
        const tocada = await prisma.musica.findFirst({ where: { tenant_id: ctx.tenantA, titulo: { startsWith: 'Grande' } } })
        expect(foiRecusado(await apagarMusica(tocada!.id))).toBe(true)
        const c = await criarMusica({ titulo: 'Para apagar' })
        expect((await apagarMusica((c as { id: string }).id)).ok).toBe(true)
    })

    it('um membro nao mexe na setlist nem no repertorio', async () => {
        await entrarComo('user@a.teste')
        const m = await prisma.musica.findFirst({ where: { tenant_id: ctx.tenantA } })
        expect(foiRecusado(await tentar(() => adicionarMusicaNaEscala(ctx.quarta, m!.id, 'G')))).toBe(true)
        expect(foiRecusado(await tentar(() => criarMusica({ titulo: 'Intrusa' })))).toBe(true)
        expect(await prisma.musica.findFirst({ where: { titulo: 'Intrusa' } })).toBeNull()
    })
})

describe('repertorio por igreja', () => {
    it('cada igreja so ve as suas musicas', async () => {
        await entrarComo('leader@a.teste')
        const s = await sessao()
        const titulos = (await repertorioDaIgreja(s)).map((m) => m.titulo)
        expect(titulos).toContain('Grande é o Senhor A')
        expect(titulos).not.toContain('Grande é o Senhor B')
        expect(await musicaDoRepertorio(s, ctx.musicaB)).toBeNull()
    })

    it('nao se junta a um culto uma musica de outra igreja', async () => {
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await adicionarMusicaNaEscala(ctx.quarta, ctx.musicaB, 'G'))).toBe(true)
        expect(await prisma.repertorioEvento.findFirst({ where: { evento_id: ctx.quarta, musica_id: ctx.musicaB } })).toBeNull()
    })

    it('a musica tocada mostra quantas vezes e em que tom', async () => {
        await entrarComo('leader@a.teste')
        const m = (await repertorioDaIgreja(await sessao())).find((x) => x.titulo === 'Lugar Secreto')
        // o domingo do seed ainda nao passou: conta 0 vezes tocada
        expect(m).toMatchObject({ tom: 'D', vezes: 0, ultimaVez: null })
    })
})

describe('so o lider ou alguem nomeado por ele mexe na escala e nas musicas', () => {
    it('um integrante comum nao junta pessoas nem musicas', async () => {
        await entrarComo('ana@a.teste')
        const m = await prisma.musica.findFirst({ where: { tenant_id: ctx.tenantA } })
        expect(foiRecusado(await tentar(() => adicionarMusicaNaEscala(ctx.quarta, m!.id, 'G')))).toBe(true)
        const d = await dadosDaEscala(await sessao(), ctx.domingo, ctx.depto)
        expect(d?.gere).toBe(false)
        expect(d?.gereMusicas).toBe(false)
    })

    it('o delegado do lider ("pode gerir escalas") pode', async () => {
        const ana = await membroPorEmail('ana@a.teste')
        await prisma.integranteDepartamento.updateMany({ where: { membro_id: ana.id, departamento_id: ctx.depto }, data: { pode_gerir_escalas: true } })
        try {
            await entrarComo('ana@a.teste')
            const d = await dadosDaEscala(await sessao(), ctx.quarta, ctx.depto)
            expect(d?.gere).toBe(true)
            expect(d?.gereMusicas).toBe(true)
            const m = await prisma.musica.findFirst({ where: { tenant_id: ctx.tenantA, titulo: 'Ousado Amor' } })
            expect((await adicionarMusicaNaEscala(ctx.quarta, m!.id, 'A')).ok).toBe(true)
        } finally {
            await prisma.repertorioEvento.deleteMany({ where: { evento_id: ctx.quarta } })
            await prisma.integranteDepartamento.updateMany({ where: { membro_id: ana.id, departamento_id: ctx.depto }, data: { pode_gerir_escalas: false } })
        }
    })

    it('quem tem a funcao "Líder" (com acento) tambem pode', async () => {
        const carla = await membroPorEmail('carla@a.teste')
        const integrante = await prisma.integranteDepartamento.findFirst({ where: { membro_id: carla.id, departamento_id: ctx.depto } })
        const funcao = await prisma.funcaoDepartamento.create({ data: { nome: 'Líder de louvor', departamento_id: ctx.depto, tenant_id: ctx.tenantA } })
        const ligacao = await prisma.funcaoSelecionada.create({ data: { integrante_departamento_id: integrante!.id, funcao_id: funcao.id } })
        try {
            await entrarComo('carla@a.teste')
            const d = await dadosDaEscala(await sessao(), ctx.quarta, ctx.depto)
            expect(d?.gere).toBe(true)
            expect(d?.gereMusicas).toBe(true)
        } finally {
            await prisma.funcaoSelecionada.delete({ where: { id: ligacao.id } })
            await prisma.funcaoDepartamento.delete({ where: { id: funcao.id } })
        }
    })
})

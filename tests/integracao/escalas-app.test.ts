// Ecra "Montar escala" (lider no telemovel), na base de teste.
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { escalarNaFuncao, tirarDaEscala, lembrarQuemNaoConfirmou } from '@/actions/escala-app-actions'
import { dadosMontarEscala, equipasQueGiro, minhasEscalas } from '@/lib/escalas-app'
import { getSessionData } from '@/lib/auth-utils'

let ctx: { evento: number; depto: number; bateria: number; daniel: number; carla: number }

beforeAll(async () => {
    const lider = await membroPorEmail('leader@a.teste')
    const depto = await prisma.departamento.findFirst({ where: { tenant_id: lider.tenant_id, nome: 'Louvor' } })
    const evento = await prisma.evento.findFirst({ where: { tenant_id: lider.tenant_id }, orderBy: { data: 'asc' } })
    const bateria = await prisma.funcaoDepartamento.findFirst({ where: { departamento_id: depto!.id, nome: 'Bateria' } })
    ctx = {
        evento: evento!.id, depto: depto!.id, bateria: bateria!.id,
        daniel: (await membroPorEmail('daniel@a.teste')).id,
        carla: (await membroPorEmail('carla@a.teste')).id,
    }
})
afterEach(() => sair())

describe('lider monta a escala de um culto', () => {
    it('o lider ve a sua equipa e os dados do culto (indisponivel marcado)', async () => {
        await entrarComo('leader@a.teste')
        const sessao = (await getSessionData())!
        expect((await equipasQueGiro(sessao)).map((e) => e.nome)).toContain('Louvor')
        const dados = await dadosMontarEscala(sessao, ctx.depto, ctx.evento)
        expect(dados?.funcoes.map((f) => f.nome)).toEqual(['Bateria', 'Guitarra', 'Teclas', 'Voz'])
        expect(dados?.equipa.find((p) => p.membroId === ctx.carla)?.indisponivel).toBe('Viagem')
    })

    it('escala e tira uma pessoa', async () => {
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, ctx.bateria, ctx.daniel))).toBe(false)
        const e = await prisma.escala.findFirst({ where: { evento_id: ctx.evento, membro_id: ctx.daniel, funcao_id: ctx.bateria } })
        expect(e).not.toBeNull()
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, ctx.bateria, ctx.daniel))).toBe(true) // duplicado
        expect(foiRecusado(await tirarDaEscala(e!.id))).toBe(false)
        expect(await prisma.escala.findUnique({ where: { id: e!.id } })).toBeNull()
    })

    it('o lembrete conta so quem ainda nao confirmou', async () => {
        await entrarComo('leader@a.teste')
        const r: any = await lembrarQuemNaoConfirmou(ctx.evento, ctx.depto)
        expect(r.ok).toBe(true)
        expect(r.enviados).toBe(1) // o user@a esta por confirmar; o Bruno ja confirmou
    })

    it('nao escala quem nao e da equipa, nem funcoes de outra equipa', async () => {
        await entrarComo('leader@a.teste')
        const estranho = await membroPorEmail('finance@a.teste')
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, ctx.bateria, estranho.id))).toBe(true)
        const outraIgreja = await prisma.funcaoDepartamento.findFirst({ where: { nome: 'Bateria', departamento_id: { not: ctx.depto } } })
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, outraIgreja!.id, ctx.daniel))).toBe(true)
    })
})

describe('quem nao gere a equipa', () => {
    it('um membro nao monta escalas nem envia lembretes', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, ctx.bateria, ctx.daniel))).toBe(true)
        expect(foiRecusado(await tentar(() => lembrarQuemNaoConfirmou(ctx.evento, ctx.depto)))).toBe(true)
        const sessao = (await getSessionData())!
        expect(await equipasQueGiro(sessao)).toEqual([])
    })

    it('o lider da igreja B nao mexe na escala da igreja A', async () => {
        await entrarComo('leader@b.teste')
        expect(foiRecusado(await escalarNaFuncao(ctx.evento, ctx.depto, ctx.bateria, ctx.daniel))).toBe(true)
    })

    it('o membro ve a sua proxima escala por confirmar', async () => {
        await entrarComo('user@a.teste')
        const minhas = await minhasEscalas((await getSessionData())!)
        expect(minhas[0]).toMatchObject({ funcao: 'Voz', estado: 'POR_CONFIRMAR' })
    })
})

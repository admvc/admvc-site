// Grupos: so administradores ou lideres DESTE grupo gerem os membros.
// Ministerios: o lider sugere uma pessoa, um administrador aprova.
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { entrarComo, sair, tentar, foiRecusado, membroPorEmail, prisma } from './ajuda'
import { gerirMembroGrupoAction } from '@/actions/grupo-actions'
import { sugerirPessoaNoMinisterio, procurarMembrosParaSugerir } from '@/actions/sugestao-actions'
import { aprovarInteresseDepartamento } from '@/actions/admin-actions'

let ctx: { grupo: number; lider: number; user: number; outro: number; depto: number; teclas: number }

beforeAll(async () => {
    const lider = await membroPorEmail('leader@a.teste')
    const grupo = await prisma.grupo.findFirst({ where: { tenant_id: lider.tenant_id } })
    const depto = await prisma.departamento.findFirst({ where: { tenant_id: lider.tenant_id, nome: 'Louvor' } })
    const teclas = await prisma.funcaoDepartamento.findFirst({ where: { departamento_id: depto!.id, nome: 'Teclas' } })
    ctx = {
        grupo: grupo!.id, lider: lider.id, depto: depto!.id, teclas: teclas!.id,
        user: (await membroPorEmail('user@a.teste')).id, outro: (await membroPorEmail('outro@a.teste')).id,
    }
})
afterEach(() => sair())
afterAll(async () => {
    // Repor: o lider volta a liderar o grupo; o "outro" sai do grupo e do louvor
    await prisma.grupo.update({ where: { id: ctx.grupo }, data: { lideres: { set: [{ id: ctx.lider }] }, membros: { disconnect: [{ id: ctx.outro }] } } })
    await prisma.integranteDepartamento.deleteMany({ where: { membro_id: ctx.outro, departamento_id: ctx.depto } })
    await prisma.interesseDepartamento.deleteMany({ where: { membro_id: ctx.outro, departamento_id: ctx.depto } })
})

describe('grupos', () => {
    it('o lider do grupo junta e tira pessoas', async () => {
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'ADICIONAR'))).toBe(false)
        expect(foiRecusado(await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'REMOVER'))).toBe(false)
    })

    it('ter o papel "Líder" nao chega: tem de liderar ESTE grupo', async () => {
        await prisma.grupo.update({ where: { id: ctx.grupo }, data: { lideres: { set: [] } } })
        await entrarComo('leader@a.teste')
        expect(foiRecusado(await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'ADICIONAR'))).toBe(true)
        await prisma.grupo.update({ where: { id: ctx.grupo }, data: { lideres: { set: [{ id: ctx.lider }] } } })
    })

    it('um membro normal que lidera o grupo pode', async () => {
        await prisma.grupo.update({ where: { id: ctx.grupo }, data: { lideres: { connect: [{ id: ctx.user }] } } })
        await entrarComo('user@a.teste')
        expect(foiRecusado(await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'ADICIONAR'))).toBe(false)
        await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'REMOVER')
        await prisma.grupo.update({ where: { id: ctx.grupo }, data: { lideres: { disconnect: [{ id: ctx.user }] } } })
    })

    it('outra igreja nao mexe', async () => {
        await entrarComo('admin@b.teste')
        expect(foiRecusado(await gerirMembroGrupoAction(ctx.grupo, ctx.outro, 'ADICIONAR'))).toBe(true)
    })
})

describe('sugerir pessoa para o ministerio', () => {
    it('um membro normal nao sugere', async () => {
        await entrarComo('user@a.teste')
        expect(foiRecusado(await sugerirPessoaNoMinisterio(ctx.depto, ctx.outro, [ctx.teclas]))).toBe(true)
    })

    it('o lider encontra quem nao esta na equipa e sugere; o admin aprova com a funcao', async () => {
        await entrarComo('leader@a.teste')
        const r = await procurarMembrosParaSugerir(ctx.depto, 'outro')
        expect(r.ok && r.membros.map((m) => m.id)).toContain(ctx.outro)
        const ja = await procurarMembrosParaSugerir(ctx.depto, 'Carla') // ja esta na equipa
        expect(ja.ok && ja.membros).toEqual([])

        expect((await sugerirPessoaNoMinisterio(ctx.depto, ctx.outro, [ctx.teclas])).ok).toBe(true)
        const interesse = await prisma.interesseDepartamento.findFirst({ where: { membro_id: ctx.outro, departamento_id: ctx.depto } })
        expect(interesse).toMatchObject({ status: 'PENDENTE', sugerido_por_id: ctx.lider, funcoes_ids: [ctx.teclas] })
        // Ainda nao esta na equipa
        expect(await prisma.integranteDepartamento.count({ where: { membro_id: ctx.outro, departamento_id: ctx.depto } })).toBe(0)

        // O lider nao aprova sozinho
        expect(foiRecusado(await tentar(() => aprovarInteresseDepartamento(interesse!.id)))).toBe(true)

        await entrarComo('admin@a.teste')
        expect((await aprovarInteresseDepartamento(interesse!.id)).ok).toBe(true)
        const integrante = await prisma.integranteDepartamento.findFirst({
            where: { membro_id: ctx.outro, departamento_id: ctx.depto }, include: { funcoes: true },
        })
        expect(integrante?.funcoes.map((f) => f.funcao_id)).toEqual([ctx.teclas])
    })
})

// Agenda por grupo e regras repetidas, na base de teste: quem cria o quê, o que se gera (sem duplicar), o alerta aos
// membros do grupo, e o que acontece ao editar/parar a regra.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { entrarComo, sair, membroPorEmail, prisma } from './ajuda'
import { apagarRegra, atualizarRegra, criarRegra, desativarRegra } from '@/actions/agenda-regras-actions'
import { guardarEncontro, cancelarEncontro } from '@/actions/agenda-departamento-actions'
import { alertasDoMembro } from '@/lib/alertas-encontros'
import { gerarRegra, type RegraGerar } from '@/lib/agenda-regras'
import { getTenantClient } from '@/lib/prisma'

// `after()` só existe dentro de um pedido real; nos testes não envia avisos
vi.mock('next/server', async (orig) => ({ ...(await orig<typeof import('next/server')>()), after: () => {} }))

let ctx: { tenant: number; homens: number; jovens: number; admin: number; lider: number; user: number }
const regras: number[] = []

const form = (o: Record<string, string | number>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, String(v)); return f }
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())

beforeAll(async () => {
    const [admin, lider, user] = await Promise.all([membroPorEmail('admin@a.teste'), membroPorEmail('leader@a.teste'), membroPorEmail('user@a.teste')])
    const novo = (nome: string) => prisma.grupo.create({
        data: { nome, dia_semana: 'Segunda', horario: '20:00', endereco: 'Rua Teste', bairro: 'Centro', cidade: 'Figueira da Foz', estado: 'Coimbra', tenant_id: admin.tenant_id },
    })
    const homens = await novo('Homens (teste regras)')
    const jovens = await novo('Jovens (teste regras)')
    await prisma.grupo.update({ where: { id: homens.id }, data: { lideres: { connect: { id: lider.id } }, membros: { connect: { id: user.id } } } })
    ctx = { tenant: admin.tenant_id, homens: homens.id, jovens: jovens.id, admin: admin.id, lider: lider.id, user: user.id }
})

afterAll(async () => {
    await prisma.agendaDepartamento.deleteMany({ where: { grupo_id: { in: [ctx.homens, ctx.jovens] } } })
    await prisma.evento.deleteMany({ where: { grupo_id: { in: [ctx.homens, ctx.jovens] } } })
    await prisma.regraAgenda.deleteMany({ where: { grupo_id: { in: [ctx.homens, ctx.jovens] } } })
    await prisma.grupo.deleteMany({ where: { id: { in: [ctx.homens, ctx.jovens] } } })
})
afterEach(() => sair())

describe('quem cria regras', () => {
    it('o líder cria a reunião do SEU grupo e gera as datas', async () => {
        await entrarComo('leader@a.teste')
        const r = await criarRegra(form({ alvo: 'ENCONTRO', grupo_id: ctx.homens, titulo: 'Reunião — Homens', dia_semana: 1, semana_do_mes: 1, hora: '20:00' }))
        expect(r.ok).toBe(true)
        if (r.ok) { expect(r.criados).toBeGreaterThanOrEqual(2); expect(r.criados).toBeLessThanOrEqual(4) }
        const criados = await prisma.agendaDepartamento.findMany({ where: { grupo_id: ctx.homens }, select: { inicio: true, regra_id: true, departamento_id: true } })
        expect(criados.length).toBeGreaterThan(0)
        for (const c of criados) {
            expect(c.departamento_id).toBeNull()
            expect(c.inicio.getUTCDay()).toBe(1)           // segunda
            expect(c.inicio.getUTCHours()).toBe(20)        // 20:00 "escrita" em UTC
            expect(c.inicio.getUTCDate()).toBeLessThanOrEqual(7) // 1.ª semana
        }
        regras.push(criados[0].regra_id!)
    })

    it('o líder NÃO cria regras para o grupo de outros, mas cria o culto direcionado ao SEU grupo', async () => {
        await entrarComo('leader@a.teste')
        const outro = await criarRegra(form({ alvo: 'ENCONTRO', grupo_id: ctx.jovens, titulo: 'x', dia_semana: 1, semana_do_mes: 1, hora: '20:00' }))
        expect(outro.ok).toBe(false)
        const cultoOutro = await criarRegra(form({ alvo: 'CULTO', grupo_id: ctx.jovens, titulo: 'x', dia_semana: 4, semana_do_mes: 2, hora: '20:00' }))
        expect(cultoOutro.ok).toBe(false)
        const cultoMeu = await criarRegra(form({ alvo: 'CULTO', grupo_id: ctx.homens, titulo: 'Culto — Homens', dia_semana: 4, semana_do_mes: 2, hora: '20:00' }))
        expect(cultoMeu.ok).toBe(true)
        expect(await prisma.evento.count({ where: { grupo_id: ctx.homens } })).toBeGreaterThan(0)
    })

    it('o Pastor (cargo na ficha) cria reuniões e cultos de qualquer grupo, mesmo sem ser administrador', async () => {
        const carla = await membroPorEmail('carla@a.teste')
        expect(carla.role).not.toBe('ADMIN')
        const antes = carla.church_role
        await prisma.membro.update({ where: { id: carla.id }, data: { church_role: 'Pastor' } })
        try {
            await entrarComo('carla@a.teste')
            const culto = await criarRegra(form({ alvo: 'CULTO', grupo_id: ctx.jovens, titulo: 'Culto — Jovens (pastor)', dia_semana: 5, semana_do_mes: 1, hora: '20:00' }))
            expect(culto.ok).toBe(true)
            const reuniao = await criarRegra(form({ alvo: 'ENCONTRO', grupo_id: ctx.homens, titulo: 'Reunião (pastor)', dia_semana: 6, semana_do_mes: 1, hora: '10:00' }))
            expect(reuniao.ok).toBe(true)
        } finally {
            await prisma.membro.update({ where: { id: carla.id }, data: { church_role: antes } })
        }
        // sem o cargo, deixa de poder
        sair()
        await entrarComo('carla@a.teste')
        const nega = await criarRegra(form({ alvo: 'CULTO', grupo_id: ctx.jovens, titulo: 'x', dia_semana: 5, semana_do_mes: 2, hora: '20:00' }))
        expect(nega.ok).toBe(false)
    })

    it('um membro sem liderança não cria nada', async () => {
        await entrarComo('user@a.teste')
        const r = await criarRegra(form({ alvo: 'ENCONTRO', grupo_id: ctx.homens, titulo: 'x', dia_semana: 1, semana_do_mes: 1, hora: '20:00' }))
        expect(r.ok).toBe(false)
    })

    it('a administração cria o culto direcionado ao grupo, sem duplicar cultos da mesma noite', async () => {
        await entrarComo('admin@a.teste')
        // um culto já marcado à mão numa quarta qualquer dos próximos meses: a regra não cria outro nessa noite
        const r = await criarRegra(form({ alvo: 'CULTO', grupo_id: ctx.jovens, titulo: 'Culto — Jovens', dia_semana: 3, semana_do_mes: -1, hora: '20:00' }))
        expect(r.ok).toBe(true)
        const cultos = await prisma.evento.findMany({ where: { grupo_id: ctx.jovens, nome: 'Culto — Jovens' }, select: { data: true, tipo: true, regra_id: true } })
        expect(cultos.length).toBeGreaterThan(0)
        for (const c of cultos) { expect(c.tipo).toBe('CULTO_REGULAR'); expect(c.data.getUTCDay()).toBe(3) }
        regras.push(cultos[0].regra_id!)
    })
})

describe('gerar sem duplicar', () => {
    it('gerar duas vezes não cria o mesmo dia outra vez', async () => {
        const id = regras[0]
        const regra = await prisma.regraAgenda.findUniqueOrThrow({ where: { id } })
        const antes = await prisma.agendaDepartamento.count({ where: { regra_id: id } })
        const r = await gerarRegra(getTenantClient(ctx.tenant), ctx.tenant, regra as RegraGerar, 3, hojeISO())
        expect(r.criados).toBe(0)
        expect(await prisma.agendaDepartamento.count({ where: { regra_id: id } })).toBe(antes)
    })
})

describe('alertas dos membros do grupo', () => {
    it('o membro do grupo recebe o alerta do encontro novo; quem não é do grupo não', async () => {
        const janela14 = await alertasDoMembro({ membroId: ctx.user, tenantId: ctx.tenant })   // a janela normal do Início (14 dias)
        console.log('alertas do user (14 dias):', janela14.map((a) => `${a.equipa.tipo}:${a.equipa.nome}@${a.inicio.slice(0, 10)}`))
        const doMembro = await alertasDoMembro({ membroId: ctx.user, tenantId: ctx.tenant }, 120)
        const meus = doMembro.filter((a) => a.equipa.tipo === 'grupo' && a.equipa.id === ctx.homens)
        expect(meus.length).toBeGreaterThan(0)
        expect(meus[0].estado).toBe('novo')
        // o admin não é do grupo nem criou as datas (criado_por = null), mas não é membro → nada deste grupo
        const doAdmin = await alertasDoMembro({ membroId: ctx.admin, tenantId: ctx.tenant }, 120)
        expect(doAdmin.filter((a) => a.equipa.tipo === 'grupo' && a.equipa.id === ctx.homens)).toHaveLength(0)
    })
})

describe('mudar, cancelar e parar', () => {
    it('o líder marca e cancela um encontro avulso do grupo; o membro não pode', async () => {
        await entrarComo('user@a.teste')
        const nao = await guardarEncontro(form({ grupo_id: ctx.homens, titulo: 'Avulso', dia: '2030-01-15', hora: '19:00', tipo: 'REUNIAO' }))
        expect(nao.ok).toBe(false)
        sair()
        await entrarComo('leader@a.teste')
        const sim = await guardarEncontro(form({ grupo_id: ctx.homens, titulo: 'Avulso', dia: '2030-01-15', hora: '19:00', tipo: 'REUNIAO' }))
        expect(sim.ok).toBe(true)
        const e = await prisma.agendaDepartamento.findFirstOrThrow({ where: { grupo_id: ctx.homens, titulo: 'Avulso' } })
        expect(e.departamento_id).toBeNull()
        const c = await cancelarEncontro(e.id, { grupoId: ctx.homens })
        expect(c.ok).toBe(true)
        expect((await prisma.agendaDepartamento.findUniqueOrThrow({ where: { id: e.id } })).cancelado_em).not.toBeNull()
    })

    it('mudar a regra refaz o futuro por mexer; parar cancela-o; apagar tira a regra e deixa o histórico', async () => {
        await entrarComo('leader@a.teste')
        const id = regras[0]
        const antes = await prisma.agendaDepartamento.count({ where: { regra_id: id, cancelado_em: null } })
        const mudou = await atualizarRegra(id, form({ alvo: 'ENCONTRO', grupo_id: ctx.homens, titulo: 'Reunião dos Homens', dia_semana: 2, semana_do_mes: 2, hora: '19:30', tipo: 'REUNIAO' }))
        expect(mudou.ok).toBe(true)
        const novas = await prisma.agendaDepartamento.findMany({ where: { regra_id: id, cancelado_em: null }, select: { inicio: true, titulo: true } })
        expect(novas.length).toBeGreaterThan(0)
        expect(novas.every((n) => n.titulo === 'Reunião dos Homens' && n.inicio.getUTCDay() === 2 && n.inicio.getUTCHours() === 19)).toBe(true)
        expect(antes).toBeGreaterThan(0)

        const parou = await desativarRegra(id)
        expect(parou.ok).toBe(true)
        expect(await prisma.agendaDepartamento.count({ where: { regra_id: id, cancelado_em: null } })).toBe(0)

        const apagou = await apagarRegra(id)
        expect(apagou.ok).toBe(true)
        expect(await prisma.regraAgenda.count({ where: { id } })).toBe(0)
        // os encontros cancelados ficam (SET NULL na regra), nada se perdeu
        expect(await prisma.agendaDepartamento.count({ where: { grupo_id: ctx.homens, regra_id: null } })).toBeGreaterThan(0)
    })
})

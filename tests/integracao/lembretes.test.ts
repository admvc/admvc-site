// Lembretes das escalas (vespera e dia do culto), na base de teste. O teste cria
// o seu proprio culto (a base de teste tambem e usada a mao) e apaga-o no fim.
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { membroPorEmail, prisma } from './ajuda'
import { lembretesDeHoje } from '@/lib/lembretes-escala'

let ctx: { data: Date; eventoId: number; deptoId: number; confirmou: number; porConfirmar: number; naoPode: number }

beforeAll(async () => {
    const lider = await membroPorEmail('leader@a.teste')
    const depto = await prisma.departamento.findFirst({ where: { tenant_id: lider.tenant_id, nome: 'Louvor' } })
    // Daqui a 30 dias, 10:00 (fora dos outros cultos de teste)
    const data = new Date(Date.now() + 30 * 86400000)
    data.setHours(10, 0, 0, 0)
    const evento = await prisma.evento.create({ data: { nome: 'Culto do teste de lembretes', data, atualizado_em: new Date(), tenant_id: lider.tenant_id } })
    const [a, b, c] = await Promise.all(['ana@a.teste', 'bruno@a.teste', 'daniel@a.teste'].map(membroPorEmail))
    const base = { evento_id: evento.id, departamento_id: depto!.id, tenant_id: lider.tenant_id }
    await prisma.escala.createMany({
        data: [
            { ...base, membro_id: a.id, funcao: 'Voz', confirmado: true },
            { ...base, membro_id: b.id, funcao: 'Teclas' },
            { ...base, membro_id: c.id, funcao: 'Bateria', motivo_recusa: 'Viagem' },
        ],
    })
    ctx = { data, eventoId: evento.id, deptoId: depto!.id, confirmou: a.id, porConfirmar: b.id, naoPode: c.id }
})

afterAll(async () => {
    await prisma.evento.delete({ where: { id: ctx.eventoId } }) // as escalas vao em cascata
})

const doCulto = (l: Awaited<ReturnType<typeof lembretesDeHoje>>) => l.filter((x) => x.url.startsWith(`/escalas/culto/${ctx.eventoId}?`))

describe('lembretes das escalas', () => {
    it('na vespera: "Amanhã serve", e pede confirmacao so a quem ainda nao confirmou', async () => {
        const l = doCulto(await lembretesDeHoje(new Date(ctx.data.getTime() - 24 * 3600000)))
        const confirmou = l.find((x) => x.membroId === ctx.confirmou)
        const porConfirmar = l.find((x) => x.membroId === ctx.porConfirmar)
        expect(confirmou?.title).toBe('Amanhã serve: Culto do teste de lembretes')
        expect(confirmou?.body).toBe('Às 10:00 — Voz.')
        expect(porConfirmar?.body).toMatch(/Teclas\. Ainda não confirmou/)
        expect(porConfirmar?.url).toBe(`/escalas/culto/${ctx.eventoId}?equipa=${ctx.deptoId}`)
    })

    it('no dia: "Hoje serve"; quem disse que nao pode nao recebe', async () => {
        const l = doCulto(await lembretesDeHoje(new Date(ctx.data.getTime() - 2 * 3600000)))
        expect(l.map((x) => x.title)).toEqual(['Hoje serve: Culto do teste de lembretes', 'Hoje serve: Culto do teste de lembretes'])
        expect(l.find((x) => x.membroId === ctx.naoPode)).toBeUndefined()
    })

    it('dois dias antes ainda nao ha lembrete', async () => {
        expect(doCulto(await lembretesDeHoje(new Date(ctx.data.getTime() - 48 * 3600000)))).toEqual([])
    })
})

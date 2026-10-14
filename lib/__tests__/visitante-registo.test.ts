// Mesma pessoa a voltar soma visita em vez de duplicar (formulário público e registo da equipa).
import { describe, it, expect } from 'vitest'
import { mesmoTelefone, telefoneValido, juntarPedidos, registarVisita } from '@/lib/visitante-registo'

describe('mesmoTelefone', () => {
    it('com e sem indicativo, espaços e 00', () => {
        expect(mesmoTelefone('+351 912 345 678', '912345678')).toBe(true)
        expect(mesmoTelefone('00351912345678', '912 345 678')).toBe(true)
        expect(mesmoTelefone('912345678', '912345679')).toBe(false)
    })

    it('vazios ou curtos nunca coincidem (ex.: anonimizados)', () => {
        expect(mesmoTelefone('', '')).toBe(false)
        expect(mesmoTelefone('12345', '12345')).toBe(false)
    })
})

describe('telefoneValido', () => {
    it('9 a 15 dígitos', () => {
        expect(telefoneValido('+351 912 345 678')).toBe(true)
        expect(telefoneValido('(11) 98765-4321')).toBe(true)
        expect(telefoneValido('12345')).toBe(false)
        expect(telefoneValido('91234567a')).toBe(false)
    })
})

describe('juntarPedidos', () => {
    const d = new Date('2026-10-14T12:00:00Z')
    it('junta com a data e não repete', () => {
        expect(juntarPedidos(null, 'Saúde', d)).toBe('Saúde')
        expect(juntarPedidos('Saúde', '  ', d)).toBe('Saúde')
        expect(juntarPedidos('Saúde', 'Saúde', d)).toBe('Saúde')
        expect(juntarPedidos('Saúde', 'Trabalho', d)).toBe('Saúde\n\n— 14/10/2026 —\nTrabalho')
    })
})

// Base falsa, só com o que registarVisita usa
function baseFalsa(visitantes: any[] = []) {
    const eventos: any[] = []
    let id = 100
    const db = {
        visitante: {
            findMany: async ({ where }: any) => visitantes.filter(v => v.tenant_id === where.tenant_id && v.telefone !== ''),
            findUniqueOrThrow: async ({ where }: any) => ({ ...visitantes.find(v => v.id === where.id) }),
            create: async ({ data }: any) => { const v = { id: ++id, status: 'NOVO', quantidade_visitas: 1, ...data }; visitantes.push(v); return v },
            update: async ({ where, data }: any) => Object.assign(visitantes.find(v => v.id === where.id), data),
        },
        acompanhamentoVisitante: { create: async ({ data }: any) => { eventos.push(data); return data } },
    }
    return { db: db as any, visitantes, eventos }
}

const agora = new Date('2026-10-14T12:00:00Z')
const diasAntes = (n: number) => new Date(agora.getTime() - n * 86400000)
const ana = (extra = {}) => ({
    id: 1, tenant_id: 1, nome: 'Ana', telefone: '+351 912 345 678', status: 'EM_CONTACTO', quantidade_visitas: 1,
    data_ultima_visita: diasAntes(7), pedido_oracao: null, email: null, ...extra,
})

describe('registarVisita', () => {
    it('telefone novo: cria', async () => {
        const { db, visitantes } = baseFalsa([ana()])
        const r = await registarVisita(db, { tenantId: 1, nome: 'Rui', telefone: '913 000 000' }, undefined, agora)
        expect(r).toMatchObject({ novo: true, visitas: 1 })
        expect(visitantes).toHaveLength(2)
    })

    it('mesmo telefone: soma a visita e não duplica', async () => {
        const { db, visitantes, eventos } = baseFalsa([ana()])
        const r = await registarVisita(db, { tenantId: 1, nome: 'Ana Silva', telefone: '912345678', pedido: 'Família' }, undefined, agora)
        expect(r).toMatchObject({ id: 1, novo: false, visitas: 2, reativado: false, repetido: false })
        expect(visitantes).toHaveLength(1)
        expect(visitantes[0]).toMatchObject({ quantidade_visitas: 2, status: 'EM_CONTACTO', pedido_oracao: 'Família', nome: 'Ana' })
        // formulário público: fica no histórico sem autor
        expect(eventos).toEqual([expect.objectContaining({ tipo_evento: 'NOVA_VISITA', membro_id: null, observacoes: 'Voltou: 2.ª visita (pelo formulário)' })])
    })

    it('outra igreja com o mesmo telefone não conta', async () => {
        const { db, visitantes } = baseFalsa([ana({ tenant_id: 2 })])
        expect((await registarVisita(db, { tenantId: 1, nome: 'Ana', telefone: '912345678' }, undefined, agora)).novo).toBe(true)
        expect(visitantes).toHaveLength(2)
    })

    it('reenvio em poucos minutos não conta outra visita', async () => {
        const { db } = baseFalsa([ana({ data_ultima_visita: new Date(agora.getTime() - 2 * 60000) })])
        expect(await registarVisita(db, { tenantId: 1, nome: 'Ana', telefone: '912345678' }, undefined, agora))
            .toMatchObject({ novo: false, visitas: 1, repetido: true })
    })

    it('estava nas saídas: volta aos novos e fica no histórico (registo da equipa)', async () => {
        const { db, visitantes, eventos } = baseFalsa([ana({ status: 'NAO_RETORNOU', quantidade_visitas: 3 })])
        const r = await registarVisita(db, { tenantId: 1, nome: 'Ana', telefone: '912345678' }, 9, agora)
        expect(r).toMatchObject({ visitas: 4, reativado: true })
        expect(visitantes[0].status).toBe('NOVO')
        expect(eventos.map(e => e.tipo_evento)).toEqual(['NOVA_VISITA', 'MUDANCA_STATUS'])
        expect(eventos.every(e => e.membro_id === 9)).toBe(true)
    })

    it('guarda a congregação (a da visita mais recente)', async () => {
        const { db, visitantes, eventos } = baseFalsa([ana({ congregacao_id: 1 })])
        await registarVisita(db, { tenantId: 1, nome: 'Ana', telefone: '912345678', congregacao: { id: 7, nome: 'Montemor' } }, undefined, agora)
        expect(visitantes[0].congregacao_id).toBe(7)
        expect(eventos[0].observacoes).toBe('Voltou: 2.ª visita (pelo formulário) · Montemor')
        const r = await registarVisita(db, { tenantId: 1, nome: 'Rui', telefone: '913000000', congregacao: { id: 7, nome: 'Montemor' } }, 5, agora)
        expect(visitantes.find(v => v.id === r.id)?.congregacao_id).toBe(7)
        expect(eventos[1]).toMatchObject({ membro_id: 5, observacoes: '1.ª visita (registada pela equipa) · Montemor' })
    })

    it('consolidado continua consolidado', async () => {
        const { db, visitantes } = baseFalsa([ana({ status: 'CONSOLIDADO' })])
        await registarVisita(db, { tenantId: 1, nome: 'Ana', telefone: '912345678' }, undefined, agora)
        expect(visitantes[0].status).toBe('CONSOLIDADO')
    })
})

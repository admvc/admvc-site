// Regra do atraso (painel + lembrete diário), datas do próximo contacto e pesquisa.
import { describe, it, expect } from 'vitest'
import { estaAtrasado, lerDataContacto, filtroPesquisa } from '@/lib/acolhimento-prazos'

const agora = new Date('2026-10-14T12:00:00Z')
const horasAntes = (h: number) => new Date(agora.getTime() - h * 3600_000)

describe('estaAtrasado', () => {
    it('sem data marcada: 48h depois do último contacto', () => {
        const v = { proximo_contacto: null, data_primeira_visita: horasAntes(100) }
        expect(estaAtrasado(v, horasAntes(47), agora)).toBe(false)
        expect(estaAtrasado(v, horasAntes(49), agora)).toBe(true)
    })

    it('sem contactos: conta desde a 1.ª visita', () => {
        expect(estaAtrasado({ proximo_contacto: null, data_primeira_visita: horasAntes(30) }, null, agora)).toBe(false)
        expect(estaAtrasado({ proximo_contacto: null, data_primeira_visita: horasAntes(60) }, undefined, agora)).toBe(true)
    })

    it('com data marcada: só atrasa depois desse dia, mesmo sem contacto há muito', () => {
        const base = { data_primeira_visita: horasAntes(500) }
        expect(estaAtrasado({ ...base, proximo_contacto: new Date('2026-10-20T00:00:00Z') }, horasAntes(300), agora)).toBe(false)
        expect(estaAtrasado({ ...base, proximo_contacto: new Date('2026-10-14T00:00:00Z') }, null, agora)).toBe(false)
        expect(estaAtrasado({ ...base, proximo_contacto: new Date('2026-10-13T00:00:00Z') }, null, agora)).toBe(true)
    })
})

describe('lerDataContacto', () => {
    it('lê a data do formulário e aceita vazio', () => {
        expect(lerDataContacto('2026-10-20')?.toISOString()).toBe('2026-10-20T00:00:00.000Z')
        expect(lerDataContacto('  ')).toBeNull()
    })

    it('recusa datas inválidas', () => {
        expect(() => lerDataContacto('20/10/2026')).toThrow()
        expect(() => lerDataContacto('2026-02-30')).toThrow()
    })
})

describe('filtroPesquisa', () => {
    it('vazio não filtra', () => {
        expect(filtroPesquisa('  ')).toEqual({})
    })

    it('nome e telefone', () => {
        expect(filtroPesquisa('912 345')).toEqual({
            OR: [
                { nome: { contains: '912 345', mode: 'insensitive' } },
                { telefone: { contains: '912 345' } },
                { telefone: { contains: '912345' } },
            ],
        })
        expect(filtroPesquisa('Ana')).toEqual({ OR: [{ nome: { contains: 'Ana', mode: 'insensitive' } }] })
    })
})

// A conta dos tijolos (o modelo do VOLTA): o dinheiro manda, os tijolos saem dele.
import { describe, it, expect } from 'vitest'
import { contasObra, desenhoIgreja, celulasCheias } from '@/lib/obra-tijolos'

describe('contasObra', () => {
    it('200.000 ÷ 1.000 = 200 tijolos; 9.000 assenta 9 (4,5 %)', () => {
        expect(contasObra({ valorObra: 200000, valorTijolo: 1000, arrecadado: 9000 }))
            .toEqual({ total: 200, colocados: 9, faltam: 191, pct: 4.5, faltaEur: 191000 })
    })

    it('tijolo parcial não conta', () => {
        expect(contasObra({ valorObra: 200000, valorTijolo: 1000, arrecadado: 9999 }).colocados).toBe(9)
    })

    it('nunca passa de 100 % nem do total de tijolos', () => {
        const c = contasObra({ valorObra: 200000, valorTijolo: 1000, arrecadado: 250000 })
        expect(c.colocados).toBe(200)
        expect(c.faltam).toBe(0)
        expect(c.pct).toBe(100)
        expect(c.faltaEur).toBe(0)
    })

    it('valores estranhos não rebentam as contas', () => {
        const c = contasObra({ valorObra: 0, valorTijolo: 0, arrecadado: -5 })
        expect(c.total).toBe(1)
        expect(c.colocados).toBe(0)
        expect(c.pct).toBe(0)
    })
})

describe('desenhoIgreja', () => {
    it('a grelha fica perto do número de tijolos pedido', () => {
        for (const total of [50, 200, 750]) {
            const n = desenhoIgreja(total).celulas.length
            expect(Math.abs(n - total) / total).toBeLessThan(0.1)
        }
    })

    it('pinta na proporção quando a grelha não fecha o total exato', () => {
        expect(celulasCheias(9, 200, 210)).toBe(9)
        expect(celulasCheias(100, 200, 210)).toBe(105)
        expect(celulasCheias(0, 200, 210)).toBe(0)
    })
})

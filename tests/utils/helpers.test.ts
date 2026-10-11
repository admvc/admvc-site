import { describe, it, expect } from 'vitest'
import { formatarMoeda, calcularPercentagem } from '@/lib/helpers'

describe('formatarMoeda', () => {
    it('formats positive values', () => {
        expect(formatarMoeda(10)).toBe('10.00€')
    })
    it('formats zero', () => {
        expect(formatarMoeda(0)).toBe('0.00€')
    })
})

describe('calcularPercentagem', () => {
    it('calculates correctly', () => {
        expect(calcularPercentagem(50, 100)).toBe(50)
    })
    it('handles zero total', () => {
        expect(calcularPercentagem(50, 0)).toBe(0)
    })
})

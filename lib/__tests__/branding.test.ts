import { describe, it, expect } from 'vitest'
import { temaValido } from '../branding'

describe('temaValido', () => {
    it('aceita os temas conhecidos', () => {
        expect(temaValido('verde')).toBe('verde')
        expect(temaValido('louveapp')).toBe('louveapp')
    })

    it('qualquer outro valor fica no Verde', () => {
        expect(temaValido('azul')).toBe('verde')
        expect(temaValido(null)).toBe('verde')
        expect(temaValido(undefined)).toBe('verde')
    })
})

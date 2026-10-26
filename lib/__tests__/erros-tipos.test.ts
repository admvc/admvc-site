// O ecrã de erro diz ao membro o que aconteceu: versão antiga, sem rede, servidor ou aparelho.
import { describe, it, expect } from 'vitest'
import { classificarErro, codigoErro } from '@/lib/erros-tipos'

describe('classificarErro', () => {
    it('versão antiga depois de uma publicação', () => {
        expect(classificarErro({ name: 'ChunkLoadError', message: 'Loading chunk 123 failed.' })).toBe('VERSAO')
        expect(classificarErro({ message: 'Failed to fetch dynamically imported module: https://x/a.js' })).toBe('VERSAO')
        expect(classificarErro({ message: 'Importing a module script failed.' })).toBe('VERSAO')
        expect(classificarErro({ message: 'Failed to find Server Action "abc". This request might be from an older or newer deployment.' })).toBe('VERSAO')
    })
    it('sem rede', () => {
        expect(classificarErro({ message: 'Load failed' })).toBe('REDE')
        expect(classificarErro({ message: 'qualquer coisa' }, false)).toBe('REDE')
    })
    it('servidor quando há digest', () => {
        expect(classificarErro({ message: 'An error occurred in the Server Components render.', digest: '123' })).toBe('SERVIDOR')
    })
    it('o resto é do aparelho', () => {
        expect(classificarErro({ name: 'TypeError', message: "undefined is not an object (evaluating 'a.b')" })).toBe('APP')
    })
})

describe('codigoErro', () => {
    it('6 letras/números sem 0, O, 1 e I', () => {
        for (let i = 0; i < 50; i++) expect(codigoErro()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    })
})

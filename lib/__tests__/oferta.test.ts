// IBAN, QR de transferência (EPC) e página /oferta.
import { describe, it, expect } from 'vitest'
import { ibanValido, limparIban, ibanEmGrupos, epcPayload, enderecoOferta } from '@/lib/oferta'

// IBAN de exemplo com a soma de controlo certa
const IBAN = 'PT50000201231234567890154'

describe('ibanValido', () => {
    it('aceita com espaços e minúsculas', () => {
        expect(ibanValido(IBAN)).toBe(true)
        expect(ibanValido('pt50 0002 0123 1234 5678 9015 4')).toBe(true)
        expect(ibanValido('GB82 WEST 1234 5698 7654 32')).toBe(true)
    })
    it('recusa números trocados, curtos ou sem país', () => {
        expect(ibanValido('PT50000201231234567890155')).toBe(false)
        expect(ibanValido('PT50 0002')).toBe(false)
        expect(ibanValido('5000020123123456789015400')).toBe(false)
        expect(ibanValido('')).toBe(false)
    })
})

describe('formatação', () => {
    it('limpa e agrupa de 4 em 4', () => {
        expect(limparIban(' pt50-0002 0123 ')).toBe('PT5000020123')
        expect(ibanEmGrupos(IBAN)).toBe('PT50 0002 0123 1234 5678 9015 4')
    })
})

describe('epcPayload (QR de transferência)', () => {
    it('linhas do padrão EPC versão 002', () => {
        const p = epcPayload({ iban: 'PT50 0002 0123 1234 5678 9015 4', titular: 'Igreja ADMVC', descricao: 'Oferta ADMVC' })!
        expect(p.split('\n')).toEqual(['BCD', '002', '1', 'SCT', '', 'Igreja ADMVC', IBAN, '', '', '', 'Oferta ADMVC'])
    })
    it('sem titular ou com IBAN inválido não há QR', () => {
        expect(epcPayload({ iban: IBAN, titular: '  ' })).toBeNull()
        expect(epcPayload({ iban: 'PT50000201231234567890155', titular: 'Igreja' })).toBeNull()
    })
    it('o nome tem no máximo 70 caracteres e nunca leva quebras de linha', () => {
        const p = epcPayload({ iban: IBAN, titular: `Igreja\nADMVC ${'x'.repeat(100)}` })!
        const linhas = p.split('\n')
        expect(linhas).toHaveLength(11)
        expect(linhas[5].length).toBe(70)
    })
})

describe('enderecoOferta', () => {
    it('leva o IBAN limpo, o titular e o MB WAY', () => {
        const u = new URL(enderecoOferta('https://app.igrejaadmvc.org', { iban: 'PT50 0002 0123 1234 5678 9015 4', titular: 'Igreja ADMVC', mbway: '+351 965 039 027' })!)
        expect(u.pathname).toBe('/oferta')
        expect(u.searchParams.get('i')).toBe(IBAN)
        expect(u.searchParams.get('t')).toBe('Igreja ADMVC')
        expect(u.searchParams.get('m')).toBe('+351 965 039 027')
    })
    it('IBAN inválido: sem endereço', () => {
        expect(enderecoOferta('https://app.igrejaadmvc.org', { iban: 'PT50' })).toBeNull()
    })
})

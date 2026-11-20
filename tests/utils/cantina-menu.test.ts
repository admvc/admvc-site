// Cantina em menu (20/11): uma linha com preço no fim vira prato + preço; as outras ficam como nota.
import { describe, expect, it } from 'vitest'
import { linhaDoMenu } from '@/lib/divulgacao-imagem'

describe('linhaDoMenu', () => {
    it.each([
        ['Sopa do dia 1€', { nome: 'Sopa do dia', preco: '1€' }],
        ['Bifana no pão 3,50 €', { nome: 'Bifana no pão', preco: '3,50€' }],
        ['Bolo caseiro - 2.5€', { nome: 'Bolo caseiro', preco: '2.5€' }],
        ['Café € 0,80', { nome: 'Café', preco: '€0,80' }],
    ])('%s', (t, r) => expect(linhaDoMenu(t)).toEqual(r))
    it('sem preço → nota', () => {
        expect(linhaDoMenu('O valor reverte para a obra')).toBeNull()
        expect(linhaDoMenu('5€')).toBeNull()
    })
})

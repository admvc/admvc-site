import { describe, expect, it } from 'vitest'
import { categoriaValida, CATEGORIAS_FUNDO, moverNaLista, nomeLimpo, textoDaCategoria, urlDoBlob } from '@/lib/fundos'

describe('banco de fundos', () => {
    it('as seis categorias combinadas', () => {
        expect(CATEGORIAS_FUNDO.map((c) => c.id)).toEqual(['MULHERES', 'JOVENS', 'HOMENS', 'FAMILIA', 'LOUVOR', 'ADMVC'])
        expect(textoDaCategoria('FAMILIA')).toBe('Família')
    })
    it('valida a categoria', () => {
        expect(categoriaValida('JOVENS')).toBe(true)
        expect(categoriaValida('jovens')).toBe(false)
        expect(categoriaValida(undefined)).toBe(false)
        expect(categoriaValida('X')).toBe(false)
    })
    it('limpa o nome do ficheiro', () => {
        expect(nomeLimpo('IMG_1234__fundo azul.JPG')).toBe('IMG 1234 fundo azul')
        expect(nomeLimpo('   ')).toBe('')
        expect(nomeLimpo('a'.repeat(100))).toHaveLength(60)
    })
    it('move na lista sem sair dos limites', () => {
        expect(moverNaLista([1, 2, 3], 2, -1)).toEqual([2, 1, 3])
        expect(moverNaLista([1, 2, 3], 2, 1)).toEqual([1, 3, 2])
        expect(moverNaLista([1, 2, 3], 1, -1)).toEqual([1, 2, 3])
        expect(moverNaLista([1, 2, 3], 3, 1)).toEqual([1, 2, 3])
        expect(moverNaLista([1, 2, 3], 9, 1)).toEqual([1, 2, 3])
    })
    it('só reconhece o Blob público como nosso', () => {
        expect(urlDoBlob('https://abc123.public.blob.vercel-storage.com/1/fundos/x.jpg')).toBe(true)
        expect(urlDoBlob('https://exemplo.com/x.jpg')).toBe(false)
        expect(urlDoBlob('não é url')).toBe(false)
    })
})

import { describe, expect, it } from 'vitest'
import { agruparPorAno, emojiValido, EMOJIS_FOTOS, inclinacao, vizinhosDoAlbum } from '@/lib/fotos-galeria'

describe('galeria de fotos', () => {
    it('aceita so os emojis da lista', () => {
        for (const e of EMOJIS_FOTOS) expect(emojiValido(e)).toBe(true)
        expect(emojiValido('💩')).toBe(false)
        expect(emojiValido(3)).toBe(false)
        expect(emojiValido(undefined)).toBe(false)
    })
    it('agrupa por ano, o mais recente primeiro', () => {
        const g = agruparPorAno([
            { data: '2026-11-02T00:00:00.000Z' }, { data: '2026-10-05T00:00:00.000Z' }, { data: '2025-12-31T00:00:00.000Z' },
        ])
        expect(g.map((x) => x.ano)).toEqual([2026, 2025])
        expect(g[0].itens).toHaveLength(2)
    })
    it('o ano usa UTC (31 dez nao passa para o ano seguinte)', () => {
        expect(agruparPorAno([{ data: '2025-12-31T23:30:00.000Z' }])[0].ano).toBe(2025)
    })
    it('vizinhos: mais recente e mais antigo', () => {
        const l = [{ slug: 'c' }, { slug: 'b' }, { slug: 'a' }]
        expect(vizinhosDoAlbum(l, 'b')).toEqual({ maisRecente: { slug: 'c' }, maisAntigo: { slug: 'a' } })
        expect(vizinhosDoAlbum(l, 'c').maisRecente).toBeNull()
        expect(vizinhosDoAlbum(l, 'a').maisAntigo).toBeNull()
        expect(vizinhosDoAlbum(l, 'x')).toEqual({ maisRecente: null, maisAntigo: null })
    })
    it('inclinacao e pequena', () => {
        for (let n = 0; n < 12; n++) expect(Math.abs(inclinacao(n))).toBeLessThan(2)
    })
})

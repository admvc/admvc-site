// "Programação da semana" com cartões: juntar por dia, horas, mudanças à mão e arrumação dos cartões.
import { describe, it, expect } from 'vitest'
import { juntarHoras, montarCartoes, lerEdicao, editarCartoes, linhasDaGrelha, type Cartao } from '@/lib/agenda-semana'

const ev = (id: number, nome: string, iso: string) => ({ id, nome, data: new Date(iso) })
const FOTO = 'https://abc.public.blob.vercel-storage.com/divulgacao/1/foto.jpg'

describe('juntarHoras', () => {
    it('uma, duas e três horas', () => {
        expect(juntarHoras(['20h'])).toBe('20h')
        expect(juntarHoras(['10h', '18h'])).toBe('10h e 18h')
        expect(juntarHoras(['10h', '15h', '18h', '10h'])).toBe('10h, 15h e 18h')
    })
})

describe('montarCartoes', () => {
    it('um cartão por dia, o mesmo nome junta as horas, e o preletor/foto do primeiro evento que os tem', () => {
        const extras = new Map([[3, { preletor: 'Pr. Nome', foto: { url: FOTO, recorte: false } }]])
        const c = montarCartoes([
            ev(3, 'Culto da Família', '2026-10-25T18:00:00Z'),
            ev(1, 'Culto de oração', '2026-10-21T20:00:00Z'),
            ev(2, 'Culto da Família', '2026-10-25T10:00:00Z'),
            ev(4, 'Ensaio', '2026-10-25T15:30:00Z'),
        ], extras)
        expect(c.map((x) => x.dia)).toEqual(['2026-10-21', '2026-10-25'])
        expect(c[0]).toMatchObject({ nomeDia: 'Quarta', linhas: ['Culto de oração | 20h'], preletor: null, foto: null })
        expect(c[1]).toMatchObject({ nomeDia: 'Domingo', linhas: ['Culto da Família | 10h e 18h', 'Ensaio | 15h30'], preletor: 'Pr. Nome' })
    })
})

describe('mudanças à mão', () => {
    const base: Cartao[] = [
        { dia: '2026-10-21', nomeDia: 'Quarta', linhas: ['Culto | 20h'], preletor: 'A', foto: { url: FOTO, recorte: false } },
        { dia: '2026-10-22', nomeDia: 'Quinta', linhas: ['Jovens | 20h'], preletor: null, foto: null },
        { dia: '2026-10-25', nomeDia: 'Domingo', linhas: ['Família | 10h'], preletor: 'B', foto: null },
    ]
    it('título por omissão e textos cortados', () => {
        const e = lerEdicao(new URLSearchParams({ r: 'x'.repeat(200) }))
        expect(e.titulo).toBe('Programação da semana')
        expect(e.rodape).toHaveLength(90)
    })
    it('linha, preletor, foto com tamanho e recorte, tirar preletor/foto e esconder um dia', () => {
        const e = lerEdicao(new URLSearchParams({
            t: 'Esta semana', 'l_2026-10-22': 'Culto de Jovens | 20h30', 'p_2026-10-22': 'Pra. C',
            'f_2026-10-22': FOTO, 'fd_2026-10-22': '600x1000', 'fr_2026-10-22': '1',
            'p_2026-10-21': '-', 'f_2026-10-21': '-', 'x_2026-10-25': '1',
        }))
        const c = editarCartoes(base, e)
        expect(e.titulo).toBe('Esta semana')
        expect(c.map((x) => x.dia)).toEqual(['2026-10-21', '2026-10-22'])
        expect(c[0]).toMatchObject({ preletor: null, foto: null })
        expect(c[1]).toMatchObject({ linhas: ['Culto de Jovens | 20h30'], preletor: 'Pra. C', foto: { url: FOTO, recorte: true, w: 600, h: 1000 } })
    })
    it('foto de fora do nosso Blob é ignorada', () => {
        const e = lerEdicao(new URLSearchParams({ 'f_2026-10-22': 'https://exemplo.com/x.jpg', 'f_2026-10-21': 'javascript:alert(1)' }))
        const c = editarCartoes(base, e)
        expect(c[0].foto?.url).toBe(FOTO)
        expect(c[1].foto).toBeNull()
    })
    it('nunca mais de 6 cartões', () => {
        const sete = Array.from({ length: 7 }, (_, i) => ({ ...base[1], dia: `2026-10-${19 + i}` }))
        expect(editarCartoes(sete, lerEdicao(new URLSearchParams()))).toHaveLength(6)
    })
})

describe('linhasDaGrelha', () => {
    it('ao alto: alterna cartão largo e dois lado a lado (como o exemplo)', () => {
        expect([1, 2, 3, 4, 5, 6].map((n) => linhasDaGrelha(n, false))).toEqual([[1], [1, 1], [1, 2], [1, 2, 1], [1, 2, 2], [2, 2, 2]])
    })
    it('no telão: em colunas', () => {
        expect([1, 2, 3, 4, 5, 6].map((n) => linhasDaGrelha(n, true))).toEqual([[1], [2], [3], [2, 2], [3, 2], [3, 3]])
        expect(linhasDaGrelha(0, true)).toEqual([])
    })
    it('o total de cartões bate sempre certo', () => {
        for (let n = 1; n <= 6; n++) for (const h of [true, false]) expect(linhasDaGrelha(n, h).reduce((a, b) => a + b, 0)).toBe(n)
    })
})

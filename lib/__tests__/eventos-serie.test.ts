// Cultos recorrentes: reconhecer a série (sem a guardar) e mudar a hora de todos.
import { describe, it, expect } from 'vitest'
import { filtrarSerie, marcaHoraria, minutosDe, deslocar } from '@/lib/eventos-serie'

const ev = (id: number, iso: string, extra: Partial<{ nome: string; tipo: string; congregacao_id: number | null }> = {}) =>
    ({ id, nome: 'Quarta profética', tipo: 'CULTO_REGULAR', congregacao_id: 1, data: new Date(iso), ...extra })

describe('filtrarSerie', () => {
    const base = ev(2, '2026-10-21T20:00:00Z')
    const todos = [
        ev(1, '2026-10-14T20:00:00Z'),                               // anterior: fica de fora
        base,
        ev(3, '2026-10-28T20:00:00Z'),                               // depois da mudança da hora: mesma hora gravada
        ev(4, '2026-11-04T20:00:00Z'),
        ev(5, '2026-11-11T21:00:00Z'),                               // outra hora
        ev(6, '2026-11-18T20:00:00Z', { congregacao_id: 2 }),        // outra casa
        ev(7, '2026-11-25T20:00:00Z', { nome: 'Quarta especial' }),  // outro nome
        ev(8, '2026-11-26T20:00:00Z'),                               // quinta
        ev(9, '2026-12-02T20:00:00Z', { tipo: 'CULTO_ESPECIAL' }),   // outro tipo
    ]
    it('este e os seguintes: mesmo nome, tipo, casa, dia e hora', () => {
        expect(filtrarSerie(base, todos).map(e => e.id)).toEqual([2, 3, 4])
    })
    it('sem congregação conta como igual a sem congregação', () => {
        const a = ev(1, '2026-10-21T20:00:00Z', { congregacao_id: null })
        const b = ev(2, '2026-10-28T20:00:00Z', { congregacao_id: null })
        expect(filtrarSerie(a, [b, a]).map(e => e.id)).toEqual([1, 2])
    })
})

describe('hora', () => {
    it('marca = dia da semana e hora gravados', () => {
        expect(marcaHoraria(new Date('2026-10-21T20:00:00Z'))).toBe('3-20:00')
    })
    it('minutosDe e deslocar', () => {
        expect(minutosDe('19:30')).toBe(1170)
        expect(minutosDe('24:00')).toBeNull()
        expect(minutosDe('')).toBeNull()
        expect(deslocar(new Date('2026-10-21T20:00:00Z'), -30).toISOString()).toBe('2026-10-21T19:30:00.000Z')
    })
})

import { describe, expect, it } from 'vitest'
import { lerMes, limitesDoMes, mesVizinho, nomeDoMes, segundaDaSemana, semanasDoMes, tipoAgendaValido } from '@/lib/agenda'

describe('calendário do mês', () => {
    it('outubro de 2026 começa numa quinta (3 vazios) e tem 5 semanas', () => {
        const s = semanasDoMes('2026-10')
        expect(s).toHaveLength(5)
        expect(s[0].slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
        expect(s.flat().filter(Boolean)).toHaveLength(31)
        expect(s.every((x) => x.length === 7)).toBe(true)
    })
    it('fevereiro de 2027 (começa numa segunda) tem 4 semanas certas', () => {
        expect(semanasDoMes('2027-02')).toHaveLength(4)
    })
    it('meses vizinhos atravessam o ano', () => {
        expect(mesVizinho('2026-12', 1)).toBe('2027-01')
        expect(mesVizinho('2026-01', -1)).toBe('2025-12')
    })
    it('limites em UTC e mês inválido volta ao de hoje', () => {
        expect(limitesDoMes('2026-10').fim.toISOString()).toBe('2026-11-01T00:00:00.000Z')
        expect(lerMes('2026-13', '2026-10-17')).toBe('2026-10')
        expect(lerMes('2027-03', '2026-10-17')).toBe('2027-03')
    })
    it('nome do mês, segunda-feira e tipos', () => {
        expect(nomeDoMes('2026-10')).toBe('outubro de 2026')
        expect(segundaDaSemana('2026-10-18')).toBe('2026-10-12')
        expect(tipoAgendaValido('ENSAIO')).toBe('ENSAIO')
        expect(tipoAgendaValido('xpto')).toBe('REUNIAO')
    })
})

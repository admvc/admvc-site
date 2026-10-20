import { describe, expect, it } from 'vitest'
import { datasDaRegra, descreverRegra, somarMeses } from '@/lib/agenda-regras'

describe('regras repetidas da agenda', () => {
    it('1.ª, 2.ª e 3.ª segunda de novembro de 2026', () => {
        // novembro de 2026: segundas = 2, 9, 16, 23, 30
        expect(datasDaRegra({ dia_semana: 1, semana_do_mes: 1 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-02'])
        expect(datasDaRegra({ dia_semana: 1, semana_do_mes: 2 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-09'])
        expect(datasDaRegra({ dia_semana: 1, semana_do_mes: 3 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-16'])
    })
    it('a última quarta e a 5.ª quarta (só existe em alguns meses)', () => {
        // quartas de outubro de 2026: 7, 14, 21, 28 (sem 5.ª); de dezembro: 2, 9, 16, 23, 30 (com 5.ª)
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: -1 }, '2026-10-01', '2026-10-31')).toEqual(['2026-10-28'])
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: 5 }, '2026-10-01', '2026-10-31')).toEqual([])
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: 5 }, '2026-12-01', '2026-12-31')).toEqual(['2026-12-30'])
    })
    it('respeita os limites (de/ate inclusivos) e atravessa a mudança de ano', () => {
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: 4 }, '2026-10-29', '2027-01-31')).toEqual(['2026-11-25', '2026-12-23', '2027-01-27'])
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: 1 }, '2026-12-02', '2026-12-02')).toEqual(['2026-12-02'])
        expect(datasDaRegra({ dia_semana: 3, semana_do_mes: 1 }, '2026-12-03', '2026-12-31')).toEqual([])
    })
    it('o domingo é 0 e a última sexta é a certa', () => {
        expect(datasDaRegra({ dia_semana: 0, semana_do_mes: -1 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-29'])
        expect(datasDaRegra({ dia_semana: 5, semana_do_mes: -1 }, '2026-11-01', '2026-11-30')).toEqual(['2026-11-27'])
    })
    it('descreve a regra em português', () => {
        expect(descreverRegra({ dia_semana: 1, semana_do_mes: 1 })).toBe('toda a 1.ª segunda')
        expect(descreverRegra({ dia_semana: 3, semana_do_mes: -1 })).toBe('toda a última quarta')
    })
    it('soma meses sem estourar o fim do mês', () => {
        expect(somarMeses('2026-10-21', 3)).toBe('2027-01-21')
        expect(somarMeses('2026-11-30', 3)).toBe('2027-03-02') // 30 de fevereiro não existe: o JS passa a março
    })
})

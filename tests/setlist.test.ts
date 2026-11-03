import { describe, it, expect } from 'vitest'
import { resumirSetlist, formatarTempo, textoDuracaoTotal, type ItemSetlist } from '@/lib/setlist'

const m = (tom: string | null, bpm: number | null, duracaoSeg: number | null, titulo = 'x'): ItemSetlist => ({ titulo, tom, bpm, duracaoSeg })

describe('formatarTempo', () => {
    it('minutos e horas', () => {
        expect(formatarTempo(375)).toBe('6:15')
        expect(formatarTempo(3725)).toBe('1:02:05')
        expect(formatarTempo(0)).toBe('0:00')
    })
})

describe('resumirSetlist', () => {
    it('soma só as durações conhecidas e conta as outras como ?', () => {
        const r = resumirSetlist([m('G', 70, 300), m('A', 90, null), m('D', 80, 200)])
        expect(r.totalSeg).toBe(500)
        expect(r.semDuracao).toBe(1)
        expect(textoDuracaoTotal(r)).toBe('8:20 + ?')
    })
    it('várias sem duração', () => {
        expect(textoDuracaoTotal({ totalSeg: 60, semDuracao: 3 })).toBe('1:00 + 3 ?')
        expect(textoDuracaoTotal({ totalSeg: 0, semDuracao: 2 })).toBe('?')
        expect(textoDuracaoTotal({ totalSeg: 0, semDuracao: 0 })).toBeNull()
        expect(textoDuracaoTotal({ totalSeg: 125, semDuracao: 0 })).toBe('2:05')
    })
    it('avisa 3 músicas seguidas no mesmo tom (sem diferenciar maiúsculas)', () => {
        const r = resumirSetlist([m('G', null, 1), m('g', null, 1), m(' G ', null, 1), m('A', null, 1)])
        expect(r.avisos).toEqual(['3 músicas seguidas em G (n.º 1 a 3).'])
    })
    it('duas seguidas não avisam; sem tom nunca avisa', () => {
        expect(resumirSetlist([m('G', null, 1), m('G', null, 1), m('A', null, 1)]).avisos).toEqual([])
        expect(resumirSetlist([m(null, null, 1), m(null, null, 1), m(null, null, 1)]).avisos).toEqual([])
    })
    it('sequência longa dá um só aviso', () => {
        const r = resumirSetlist([m('D', null, 1), m('D', null, 1), m('D', null, 1), m('D', null, 1)])
        expect(r.avisos).toHaveLength(1)
        expect(r.avisos[0]).toContain('4 músicas')
    })
    it('avisa salto grande de bpm, só se os dois são conhecidos', () => {
        expect(resumirSetlist([m('G', 68, 1), m('A', 128, 1)]).avisos).toEqual(['Salto de 68 para 128 bpm entre a 1 e a 2.'])
        expect(resumirSetlist([m('G', 68, 1), m('A', 100, 1)]).avisos).toEqual([])
        expect(resumirSetlist([m('G', 68, 1), m('A', null, 1), m('B', 150, 1)]).avisos).toEqual([])
    })
    it('lista vazia', () => {
        expect(resumirSetlist([])).toEqual({ totalSeg: 0, semDuracao: 0, avisos: [] })
    })
})

import { describe, it, expect } from 'vitest'
import { maisTocadas, desdeMeses, jaNaLista, type ExecucaoMusica } from '@/lib/setlist-descobrir'

const e = (musicaId: string, dia: string, titulo = musicaId): ExecucaoMusica => ({ musicaId, titulo, artista: null, tom: 'G', ano: null, data: new Date(dia) })

describe('maisTocadas', () => {
    it('ordena por vezes e desempata pela mais recente', () => {
        const r = maisTocadas([e('a', '2026-01-01'), e('b', '2026-02-01'), e('b', '2026-03-01'), e('c', '2026-05-01')])
        expect(r.map((x) => x.musicaId)).toEqual(['b', 'c', 'a'])
        expect(r[0].vezes).toBe(2)
        expect(r[0].ultimaVez.toISOString().slice(0, 10)).toBe('2026-03-01')
    })
    it('respeita o limite e a lista vazia', () => {
        expect(maisTocadas([e('a', '2026-01-01'), e('b', '2026-01-02')], 1)).toHaveLength(1)
        expect(maisTocadas([])).toEqual([])
    })
})

describe('desdeMeses', () => {
    it('recua N meses', () => {
        expect(desdeMeses(new Date('2026-11-03T12:00:00Z'), 6).toISOString().slice(0, 10)).toBe('2026-05-03')
        expect(desdeMeses(new Date('2026-11-03T12:00:00Z'), 12).toISOString().slice(0, 10)).toBe('2025-11-03')
    })
})

describe('jaNaLista', () => {
    const lista = [
        { id: '1', titulo: 'Glória', titulo_norm: 'gloria', csdb_track_id: null },
        { id: '2', titulo: 'Outra', titulo_norm: null, csdb_track_id: 55 },
        { id: '3', titulo: 'Sem Norm', titulo_norm: null, csdb_track_id: null },
    ]
    it('pela mesma faixa', () => expect(jaNaLista(lista, { id: 55, titulo: 'qualquer' })?.id).toBe('2'))
    it('pelo título normalizado', () => {
        expect(jaNaLista(lista, { id: 9, titulo: 'GLORIA!' })?.id).toBe('1')
        expect(jaNaLista(lista, { id: 9, titulo: 'sem norm' })?.id).toBe('3')
    })
    it('nova', () => expect(jaNaLista(lista, { id: 9, titulo: 'Nunca vista' })).toBeNull())
})

import { describe, it, expect } from 'vitest'
import { consultasDeBusca, escolherNoHolyrics } from '@/lib/holyrics-cliente'

describe('consultasDeBusca', () => {
    it('título tal como está, sem acentos e a palavra mais comprida', () => {
        expect(consultasDeBusca('Grande É o Senhor')).toEqual(['Grande É o Senhor', 'grande e o senhor', 'grande'])
    })
    it('sem repetidos e sem textos curtos demais', () => {
        expect(consultasDeBusca('gloria')).toEqual(['gloria'])
        expect(consultasDeBusca('Eu sou')).toEqual(['Eu sou', 'eu sou'])
        expect(consultasDeBusca(' ')).toEqual([])
    })
})

describe('escolherNoHolyrics', () => {
    const lista = [
        { id: 1, title: 'Glória a Deus', artist: 'Outro' },
        { id: 2, title: 'GLORIA', artist: 'Ministério A' },
        { id: 3, title: 'Gloria!', artist: 'Ministério B' },
    ]
    it('Glória = gloria = GLORIA!', () => {
        expect(escolherNoHolyrics(lista, 'Glória', null)?.id).toBe(2)
    })
    it('prefere o mesmo artista (sem acentos)', () => {
        expect(escolherNoHolyrics(lista, 'Glória', 'ministerio b')?.id).toBe(3)
    })
    it('não aceita títulos parecidos', () => {
        expect(escolherNoHolyrics(lista, 'Glória Deus', null)).toBeNull()
        expect(escolherNoHolyrics([], 'x', null)).toBeNull()
    })
})

import { musicaParaLigar, jaExisteNoPortal, type MusicaDoPortal } from '@/lib/holyrics-cliente'

describe('trazer do Holyrics sem duplicar', () => {
    const portal: MusicaDoPortal[] = [
        { id: 'a', titulo: 'Glória', artista: null, titulo_norm: 'gloria', holyrics_id: null },
        { id: 'b', titulo: 'Bondade de Deus', artista: 'Isaias Saad', titulo_norm: 'bondade de deus', holyrics_id: null },
        { id: 'c', titulo: 'Quão Grande', artista: 'X', titulo_norm: 'quao grande', holyrics_id: '77' },
    ]
    it('liga "Gloria" do Holyrics à "Glória" do portal', () => {
        expect(musicaParaLigar(portal, 'GLORIA', 'Ministério')?.id).toBe('a')
    })
    it('artista diferente = outra música', () => {
        expect(musicaParaLigar(portal, 'Bondade de Deus', 'Outro Artista')).toBeNull()
        expect(musicaParaLigar(portal, 'bondade de deus', 'isaias saad')?.id).toBe('b')
    })
    it('já ligada a outra entrada do Holyrics não é religada, mas conta como existente', () => {
        expect(musicaParaLigar(portal, 'Quão Grande', 'X')).toBeNull()
        expect(jaExisteNoPortal(portal, 'Quao grande', 'X')).toBe(true)
        expect(jaExisteNoPortal(portal, 'Nova canção', 'X')).toBe(false)
    })
})

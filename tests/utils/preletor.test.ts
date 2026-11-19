import { describe, expect, it } from 'vitest'
import { normalizar, procurarMembros, textoDoPreletor, tituloAbreviado, tituloDoMembro } from '@/lib/preletor'

const M = [
    { first_name: 'José', last_name: 'Gonçalves', church_role: 'Pastor(a)', cargos: [] },
    { first_name: 'Ana', last_name: 'Pereira', church_role: 'Membro', cargos: [{ nome: 'Diaconisa' }] },
    { first_name: 'Rui', last_name: 'Jose Silva', church_role: null },
    { first_name: 'Marta', last_name: null, church_role: 'Evangelista' },
    { first_name: 'Paulo', last_name: 'Costa', church_role: 'Presbítero' },
]

describe('preletor', () => {
    it('normaliza acentos e maiúsculas', () => expect(normalizar('  JOSÉ  Gonçalves ')).toBe('jose goncalves'))
    it('títulos pelo cargo', () => {
        expect(tituloAbreviado('Pastor(a)')).toBe('Pr.')
        expect(tituloAbreviado('Pastora')).toBe('Pr.')
        expect(tituloAbreviado('Evangelista')).toBe('Ev.')
        expect(tituloAbreviado('Presbítera')).toBe('Pb.')
        expect(tituloAbreviado('Diácono')).toBe('Dc.')
        expect(tituloAbreviado('Diaconisa')).toBe('Dc.')
        expect(tituloAbreviado('Membro')).toBe('')
        expect(tituloAbreviado(null)).toBe('')
    })
    it('o cargo da lista vale mais que o texto da ficha', () => {
        expect(tituloDoMembro({ church_role: 'Membro', cargos: [{ nome: 'Obreiro' }, { nome: 'Diácono' }] })).toBe('Dc.')
        expect(tituloDoMembro({ church_role: 'Pastor(a)', cargos: [] })).toBe('Pr.')
    })
    it('procura sem acentos e sem maiúsculas', () => {
        expect(procurarMembros(M, 'jose')).toEqual([{ nome: 'José Gonçalves', titulo: 'Pr.' }, { nome: 'Rui Jose Silva' }])
        expect(procurarMembros(M, 'GONCALVES')[0].nome).toBe('José Gonçalves')
        expect(procurarMembros(M, 'jo go')).toHaveLength(1)
    })
    it('exige 2 letras e respeita o máximo', () => {
        expect(procurarMembros(M, 'a')).toEqual([])
        expect(procurarMembros(M, '  ')).toEqual([])
        expect(procurarMembros(M, 'a', 8)).toEqual([])
        expect(procurarMembros(M, 'ma', 0)).toEqual([])
        expect(procurarMembros(Array.from({ length: 20 }, (_, i) => ({ first_name: `Ana${i}`, last_name: 'X' })), 'an', 8)).toHaveLength(8)
    })
    it('só devolve nome e título', () => {
        expect(Object.keys(procurarMembros(M, 'ana')[0]).sort()).toEqual(['nome', 'titulo'])
        expect(procurarMembros(M, 'marta')[0]).toEqual({ nome: 'Marta', titulo: 'Ev.' })
    })
    it('texto do campo', () => {
        expect(textoDoPreletor({ nome: 'Ana Pereira', titulo: 'Dc.' })).toBe('Dc. Ana Pereira')
        expect(textoDoPreletor({ nome: 'Rui Silva' })).toBe('Rui Silva')
    })
})

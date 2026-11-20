import { describe, expect, it } from 'vitest'
import { ESTILOS, PALETAS } from '@/lib/divulgacao'
import { PADROES, coresDaPaleta, padraoDaReceita, padraoDoCulto } from '@/lib/divulgacao-padroes'

describe('padrões das artes', () => {
    it('só usam estilos e paletas que existem', () => {
        for (const p of PADROES) {
            expect(ESTILOS.some((e) => e.id === p.estilo), p.id).toBe(true)
            expect(PALETAS.some((x) => x.id === p.paleta), p.id).toBe(true)
        }
    })
    it('os ids são únicos', () => {
        expect(new Set(PADROES.map((p) => p.id)).size).toBe(PADROES.length)
    })
    it('escolhe o padrão pelo nome do culto (sem acentos nem maiúsculas)', () => {
        expect(padraoDoCulto('Culto de Jovens')?.id).toBe('jovens')
        expect(padraoDoCulto('Chá de Mulheres')?.id).toBe('mulheres')
        expect(padraoDoCulto('Quarta Profética')?.id).toBe('profetica')
        expect(padraoDoCulto('Culto de Rua')?.id).toBe('rua')
        expect(padraoDoCulto('Santa Ceia do Senhor')?.id).toBe('santa-ceia')
        expect(padraoDoCulto('Culto de Batismo')?.id).toBe('batismo')
        expect(padraoDoCulto('Encontro de FORMAÇÃO')?.id).toBe('formacao')
    })
    it('o culto comum não escolhe nada (fica o padrão da igreja)', () => {
        expect(padraoDoCulto('Culto Dominical da Família')).toBeNull()
        expect(padraoDoCulto('Culto de Domingo')).toBeNull()
        expect(padraoDoCulto('')).toBeNull()
    })
    it('reconhece o padrão de uma receita e dá as cores', () => {
        expect(padraoDaReceita({ estilo: 'manchas', paleta: 'jovens' })?.id).toBe('jovens')
        expect(padraoDaReceita({ estilo: 'pastel', paleta: 'jovens' })).toBeNull()
        expect(coresDaPaleta('jovens')).toEqual(['#5A4580', '#EBB035'])
    })
})

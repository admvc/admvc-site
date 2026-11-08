import { describe, expect, it } from 'vitest'
import { nomeDaReuniao, semReunioesDuplicadas } from '@/lib/agenda-reunioes'
import { montarCartoes } from '@/lib/agenda-semana'
import { TEMAS_AGENDA, lerTema } from '@/lib/agenda-temas'

describe('reuniões de grupos na agenda', () => {
    it('o nome diz o grupo e não o repete', () => {
        expect(nomeDaReuniao('Grupo de Homens', 'Homens')).toBe('Grupo de Homens')
        expect(nomeDaReuniao('Reunião', 'Casais')).toBe('Casais · Reunião')
        expect(nomeDaReuniao('', 'Mulheres')).toBe('Mulheres')
    })
    it('não duplica o culto direcionado ao mesmo grupo no mesmo dia', () => {
        const r = [
            { inicio: new Date('2026-11-02T20:00:00Z'), grupoId: 1 },
            { inicio: new Date('2026-11-09T20:00:00Z'), grupoId: 2 },
        ]
        const ficam = semReunioesDuplicadas(r, [{ data: new Date('2026-11-02T20:00:00Z'), grupo_id: 1 }, { data: new Date('2026-11-09T20:00:00Z'), grupo_id: 3 }, { data: new Date('2026-11-09T20:00:00Z'), grupo_id: null }])
        expect(ficam).toEqual([r[1]])
    })
    it('a reunião de segunda aparece com a hora de Lisboa escrita em UTC (20h)', () => {
        const c = montarCartoes([{ id: -1, nome: 'Grupo de Homens', data: new Date('2026-11-02T20:00:00Z') }], new Map())
        expect(c).toHaveLength(1)
        expect(c[0].nomeDia).toBe('Segunda')
        expect(c[0].linhas).toEqual(['Grupo de Homens | 20h'])
    })
})

describe('modelos de cores da agenda', () => {
    it('tem 6 modelos com ids únicos e os novos são reconhecidos', () => {
        const ids = TEMAS_AGENDA.map((t) => t.id)
        expect(new Set(ids).size).toBe(ids.length)
        expect(ids).toEqual(expect.arrayContaining(['floresta', 'nude']))
        expect(lerTema('nude').nome).toBe('Nude e terracota')
        expect(lerTema('não existe').id).toBe('classico')
    })
})

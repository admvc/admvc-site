import { describe, it, expect } from 'vitest'
import {
    normalizarItens, tituloDoCargo, responsavel, horasPrevistas, duracaoTotal,
    textoDaRotina, quandoPorExtenso, semNotas, minutosPorExtenso, ePalavra, palavraDe, repeticoes, chaveDeComparacao, type MembroRotina,
} from '@/lib/rotina-culto'

const membros = new Map<number, MembroRotina>([
    [1, { id: 1, first_name: 'Rafael', last_name: 'Castro', church_role: 'Pastor(a)', gender: 'Masculino' }],
    [2, { id: 2, first_name: 'Amanda', last_name: 'Lopes', church_role: 'Missionário(a)', gender: 'Feminino' }],
    [3, { id: 3, first_name: 'Gustavo', last_name: 'Santos', church_role: 'Evangelista', gender: 'Masculino' }],
    [4, { id: 4, first_name: 'Ana', last_name: 'Silva', church_role: 'Membro', gender: 'Feminino' }],
])

describe('tituloDoCargo', () => {
    it('vem do cargo, no feminino quando é o caso', () => {
        expect(tituloDoCargo('Pastor(a)', 'Masculino')).toBe('Pastor')
        expect(tituloDoCargo('Pastor(a)', 'Feminino')).toBe('Pastora')
        expect(tituloDoCargo('Missionário(a)', 'Feminino')).toBe('Missionária')
        expect(tituloDoCargo('Evangelista', null)).toBe('Evangelista')
        expect(tituloDoCargo('Diácono/Diaconisa', 'Feminino')).toBe('Diaconisa')
        expect(tituloDoCargo('Presbítero', 'Masculino')).toBe('Presbítero')
    })
    it('sem título para membros comuns e cargos que não são títulos', () => {
        expect(tituloDoCargo('Membro', 'Feminino')).toBe('')
        expect(tituloDoCargo('LIDER DE JOVENS E LOUVOR', 'Feminino')).toBe('')
        expect(tituloDoCargo(null)).toBe('')
    })
})

describe('responsavel', () => {
    it('membro: título do cargo + nome; de fora: o nome escrito', () => {
        expect(responsavel({ momento: 'Palavra', membro_id: 1 }, membros)).toBe('Pastor Rafael Castro')
        expect(responsavel({ momento: 'Ofertas', membro_id: 2 }, membros)).toBe('Missionária Amanda Lopes')
        expect(responsavel({ momento: 'Avisos', membro_id: 4 }, membros)).toBe('Ana Silva')
        expect(responsavel({ momento: 'Palavra', nome: 'Pr. João (convidado)' }, membros)).toBe('Pr. João (convidado)')
        expect(responsavel({ momento: 'Louvor' }, membros)).toBe('')
    })
})

describe('normalizarItens', () => {
    it('tira momentos sem nome e valores inválidos', () => {
        const r = normalizarItens([
            { momento: '  Louvor  ', duracao: '35' },
            { momento: '', membro_id: 1 },
            { momento: 'Palavra', membro_id: 1, nome: 'ignorado', duracao: -5, nota: ' Os talentos de Deus ' },
            { momento: 'Encerramento', membro_id: 'x', nome: '  Pastor Leandro ' },
            null, 'lixo',
        ])
        expect(r).toEqual([
            { momento: 'Louvor', membro_id: null, nome: null, duracao: 35, nota: null },
            { momento: 'Palavra', membro_id: 1, nome: null, duracao: null, nota: 'Os talentos de Deus' },
            { momento: 'Encerramento', membro_id: null, nome: 'Pastor Leandro', duracao: null, nota: null },
        ])
        expect(normalizarItens('nada')).toEqual([])
    })
})

describe('horas', () => {
    const inicio = '2026-10-18T18:00:00.000Z' // domingo, 18:00 (hora de parede)
    it('conta a partir da hora do culto, enquanto houver durações', () => {
        expect(horasPrevistas(inicio, [
            { momento: 'Louvor', duracao: 35 },
            { momento: 'Oração', duracao: 10 },
            { momento: 'Palavra' },
            { momento: 'Encerramento', duracao: 5 },
        ])).toEqual(['18:00', '18:35', '18:45', null])
    })
    it('duração total só com todas as durações', () => {
        expect(duracaoTotal([{ momento: 'a', duracao: 35 }, { momento: 'b', duracao: 50 }])).toBe(85)
        expect(duracaoTotal([{ momento: 'a', duracao: 35 }, { momento: 'b' }])).toBeNull()
        expect(minutosPorExtenso(85)).toBe('1h25')
        expect(minutosPorExtenso(35)).toBe('35 min')
    })
    it('quando por extenso, sem depender do fuso', () => {
        expect(quandoPorExtenso(inicio)).toBe('Domingo, 18 de outubro, às 18:00')
    })
})

describe('textoDaRotina', () => {
    it('fica como a lista escrita à mão', () => {
        const t = textoDaRotina({ nome: 'Culto de Domingo', data: '2026-10-18T18:00:00.000Z' }, [
            { momento: 'Louvor', duracao: 35 },
            { momento: 'Oração pela Família', membro_id: 3 },
            { momento: 'Dízimos e ofertas', membro_id: 2 },
            { momento: 'Palavra', membro_id: 1, nota: 'Os talentos de Deus' },
        ], membros)
        expect(t).toBe([
            '*Culto de Domingo*',
            'Domingo, 18 de outubro, às 18:00',
            '',
            '• 18:00 Louvor (35 min)',
            '• 18:35 Oração pela Família — Evangelista Gustavo Santos',
            '• Dízimos e ofertas — Missionária Amanda Lopes',
            '• Palavra — Pastor Rafael Castro — _Os talentos de Deus_',
        ].join('\n'))
    })
    it('semNotas tira só as notas', () => {
        expect(semNotas([{ momento: 'Palavra', membro_id: 1, nota: 'x', duracao: 40 }])).toEqual([{ momento: 'Palavra', membro_id: 1, nota: null, duracao: 40 }])
    })
})

describe('Palavra', () => {
    it('reconhece o momento da pregação e guarda o texto bíblico só aí', () => {
        expect(ePalavra('Palavra')).toBe(true)
        expect(ePalavra('Ministração da Palavra')).toBe(true)
        expect(ePalavra('Pregação')).toBe(true)
        expect(ePalavra('Louvor')).toBe(false)
        const r = normalizarItens([
            { momento: 'Palavra', membro_id: 1, nota: 'Os talentos', texto: ' Mateus 25:14-30 ' },
            { momento: 'Louvor', texto: 'ignorado' },
        ])
        expect(r[0].texto).toBe('Mateus 25:14-30')
        expect(r[1]).not.toHaveProperty('texto')
        expect(palavraDe(r)?.nota).toBe('Os talentos')
    })
    it('o texto bíblico entra no texto partilhado', () => {
        const t = textoDaRotina({ nome: 'Culto', data: '2026-10-18T18:00:00.000Z' },
            [{ momento: 'Palavra', membro_id: 1, nota: 'Os talentos de Deus', texto: 'Mateus 25:14-30' }], membros)
        expect(t.split('\n').pop()).toBe('• 18:00 Palavra — Pastor Rafael Castro — _Os talentos de Deus_ (Mateus 25:14-30)')
    })
    it('avisa quando o tema ou o texto já foram pregados (sem ligar a acentos)', () => {
        const feitas = [
            { data: '2026-03-01T18:00:00.000Z', culto: 'Culto', quem: 'Pastor X', tema: 'A Fé que Move Montanhas', texto: 'Marcos 11:22-24' },
            { data: '2026-05-01T18:00:00.000Z', culto: 'Culto', quem: 'Pastor Y', tema: 'Graça', texto: 'Efésios 2:8' },
        ]
        expect(repeticoes({ nota: 'a fe que move montanhas!' }, feitas)).toHaveLength(1)
        expect(repeticoes({ texto: 'Efesios 2:8' }, feitas)[0].quem).toBe('Pastor Y')
        expect(repeticoes({ nota: 'Outro tema' }, feitas)).toHaveLength(0)
        expect(repeticoes({}, feitas)).toHaveLength(0)
        expect(chaveDeComparacao('  Mateus  25:14 ')).toBe('mateus 25:14')
    })
})

import { describe, expect, it } from 'vitest'
import {
    agruparDuplicados, confiancaDaProposta, contarPreenchidos, frasesDoResumo, fundirCampos, ordenarPorConfianca,
    planearReferencias, sugerirQueFica, type CamposMusica, type MusicaParaAgrupar,
} from '@/lib/musicas-juntar'

describe('confiancaDaProposta', () => {
    it('alta: título e artista iguais (sem acentos nem maiúsculas)', () => {
        expect(confiancaDaProposta({ titulo: 'Glória', artista: 'Isaias Saad' }, { titulo: 'GLORIA!', artista: 'isaias saad' })).toBe('alta')
    })
    it('média: título igual, artista diferente ou em falta', () => {
        expect(confiancaDaProposta({ titulo: 'Bondade de Deus', artista: 'Outro' }, { titulo: 'Bondade de Deus', artista: 'Isaias Saad' })).toBe('media')
        expect(confiancaDaProposta({ titulo: 'Bondade de Deus', artista: null }, { titulo: 'Bondade de Deus', artista: 'Isaias Saad' })).toBe('media')
    })
    it('baixa: título diferente', () => {
        expect(confiancaDaProposta({ titulo: 'Bondade', artista: 'X' }, { titulo: 'Bondade de Deus', artista: 'X' })).toBe('baixa')
    })
    it('ordena melhor primeiro e mantém a ordem do CSDB no empate', () => {
        const r = ordenarPorConfianca([
            { n: 1, confianca: 'baixa' as const }, { n: 2, confianca: 'media' as const },
            { n: 3, confianca: 'alta' as const }, { n: 4, confianca: 'media' as const },
        ])
        expect(r.map((x) => x.n)).toEqual([3, 2, 4, 1])
    })
})

const m = (id: string, over: Partial<MusicaParaAgrupar> = {}): MusicaParaAgrupar => ({
    id, titulo: 'Glória', titulo_norm: 'gloria', artista: 'A', csdb_track_id: null, csdb_work_id: null, cultos: 0, preenchidos: 0, ...over,
})

describe('agruparDuplicados', () => {
    it('agrupa por título normalizado + artista normalizado', () => {
        const g = agruparDuplicados([m('1'), m('2', { titulo: 'Gloria', artista: 'a' }), m('3', { titulo_norm: 'outra' })])
        expect(g).toHaveLength(1)
        expect(g[0].musicas.map((x) => x.id).sort()).toEqual(['1', '2'])
        expect(g[0].motivo).toBe('titulo')
    })
    it('mesmo título com artistas diferentes não é duplicado', () => {
        expect(agruparDuplicados([m('1'), m('2', { artista: 'B' })])).toHaveLength(0)
    })
    it('agrupa pela obra do CSDB mesmo com títulos diferentes', () => {
        const g = agruparDuplicados([m('1', { csdb_work_id: 5 }), m('2', { titulo: 'Goodness of God', titulo_norm: 'goodness of god', artista: 'Z', csdb_work_id: 5 })])
        expect(g).toHaveLength(1)
        expect(g[0].motivo).toBe('obra')
    })
    it('junta grupos que se encontram por chaves diferentes (A~B por obra, B~C por título)', () => {
        const g = agruparDuplicados([
            m('A', { titulo_norm: 'x', artista: '1', csdb_work_id: 9 }),
            m('B', { titulo_norm: 'y', artista: '2', csdb_work_id: 9 }),
            m('C', { titulo_norm: 'y', artista: '2' }),
        ])
        expect(g).toHaveLength(1)
        expect(g[0].musicas).toHaveLength(3)
    })
    it('sem titulo_norm usa o título; músicas sozinhas não formam grupo', () => {
        expect(agruparDuplicados([m('1', { titulo_norm: null }), m('2', { titulo: 'GLÓRIA', titulo_norm: null })])).toHaveLength(1)
        expect(agruparDuplicados([m('1')])).toHaveLength(0)
    })
    it('sugere a ligada ao CSDB, depois a mais tocada, depois a mais completa', () => {
        expect(sugerirQueFica([m('1', { cultos: 9 }), m('2', { csdb_track_id: 3 })]).id).toBe('2')
        expect(sugerirQueFica([m('1', { cultos: 1 }), m('2', { cultos: 4 })]).id).toBe('2')
        expect(sugerirQueFica([m('1', { preenchidos: 2 }), m('2', { preenchidos: 5 })]).id).toBe('2')
    })
})

const vazia: CamposMusica = {
    artista: null, bpm: null, tom: null, link_video: null, link_letra: null, link_cifra: null, link_audio: null,
    cifra_interna: null, holyrics_id: null, csdb_track_id: null, csdb_work_id: null, isrc: null, ano: null,
    duracao_seg: null, idioma: null, compasso: null, compositores: [], links: null, link_playback: null, csdb_atualizado_em: null,
}

describe('fundirCampos', () => {
    it('preenche só o que está vazio e nunca substitui', () => {
        const r = fundirCampos({ ...vazia, tom: 'G', artista: ' ' }, { ...vazia, tom: 'A', artista: 'Fulano', bpm: 70, link_cifra: 'https://x' })
        expect(r.dados).toEqual({ artista: 'Fulano', bpm: 70, link_cifra: 'https://x' })
        expect(r.preenchidos).toEqual(['artista', 'bpm', 'link_cifra'])
    })
    it('o bloco do CSDB passa inteiro se a que fica não tem faixa', () => {
        const outra = { ...vazia, csdb_track_id: 7, csdb_work_id: 8, ano: 2022, compositores: ['X'], links: { spotify: 'https://s' } }
        const r = fundirCampos(vazia, outra)
        expect(r.dados.csdb_track_id).toBe(7)
        expect(r.dados.compositores).toEqual(['X'])
        expect(r.preenchidos).toContain('csdb')
    })
    it('não toca no CSDB se a que fica já tem faixa', () => {
        const r = fundirCampos({ ...vazia, csdb_track_id: 1 }, { ...vazia, csdb_track_id: 2, ano: 2000 })
        expect(r.dados).toEqual({})
    })
    it('conta os campos preenchidos', () => {
        expect(contarPreenchidos(vazia)).toBe(0)
        expect(contarPreenchidos({ ...vazia, tom: 'G', compositores: ['A'] })).toBe(2)
    })
})

describe('planearReferencias', () => {
    it('move os cultos novos e separa os repetidos (fica o tom da que fica)', () => {
        const p = planearReferencias(
            [{ id: 'a', evento_id: 1 }, { id: 'b', evento_id: 2 }],
            [{ id: 'c', evento_id: 2 }, { id: 'd', evento_id: 3 }],
        )
        expect(p.mover.map((r) => r.id)).toEqual(['d'])
        expect(p.repetidos.map((r) => r.id)).toEqual(['c'])
    })
    it('resume em frases', () => {
        const f = frasesDoResumo({
            ficaId: 'a', ficaTitulo: 'Glória', passam: 3, repetidos: 1,
            outras: [{ id: 'b', titulo: 'Gloria', passam: 3, repetidos: 1, preenchidos: ['tom', 'csdb'] }],
        })
        expect(f[0]).toBe('3 cultos passam para «Glória», com o tom que tocaram.')
        expect(f.join(' ')).toContain('tom, dados do CSDB')
    })
})

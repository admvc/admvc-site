import { describe, expect, it } from 'vitest'
import { ESTILOS, MODELOS_REDES, conteudoDaPeca, lerEstilo, redesDoEstilo } from '@/lib/divulgacao'
import { modeloDasRedes, normalizarReceita, paramsDaPeca, paramsDaRede, quandoEscrito, receitaVazia, textosPara } from '@/lib/divulgacao-kit'
import { caixaFoto, CAIXA_FOTO } from '@/lib/divulgacao-enquadrar'

const ev = { nome: 'Culto da Família', data: new Date('2026-11-11T20:00:00Z') }

describe('8 estilos unificados (telão + redes)', () => {
    it('os ids antigos continuam e há 8 estilos, cada um com a sua versão das redes', () => {
        expect(ESTILOS.map((e) => e.id)).toEqual(expect.arrayContaining(['manchas', 'foto', 'capsula', 'pastel']))
        expect(ESTILOS).toHaveLength(8)
        expect(MODELOS_REDES.map((m) => m.id)).toEqual(expect.arrayContaining(['classico', 'arcos', 'arco-claro', 'elegante']))
        expect(MODELOS_REDES).toHaveLength(8)
        const pares = ESTILOS.map((e) => e.redes)
        expect(new Set(pares).size).toBe(8)
        for (const p of pares) expect(MODELOS_REDES.some((m) => m.id === p)).toBe(true)
        expect(lerEstilo('inventado')).toBe('manchas')
    })
    it('receitas antigas ficam como estavam: só estão separadas se o estilo das redes não era o par do telão', () => {
        const antigaPar = normalizarReceita({ estilo: 'manchas', modeloRedes: 'classico' })
        expect(antigaPar.estilosSeparados).toBe(false)
        const antigaSeparada = normalizarReceita({ estilo: 'foto', modeloRedes: 'classico' })
        expect(antigaSeparada.estilosSeparados).toBe(true)
        expect(modeloDasRedes(antigaSeparada)).toBe('classico')
        expect(paramsDaRede(antigaSeparada, 'post', ev).get('modelo')).toBeNull()   // o clássico não leva modelo, como antes
        const antigaArcos = normalizarReceita({ estilo: 'pastel', modeloRedes: 'arcos' })
        expect(modeloDasRedes(antigaArcos)).toBe('arcos')
        expect(paramsDaRede(antigaArcos, 'post', ev).get('modelo')).toBe('arcos')
    })
    it('unificado: escolher o estilo muda as redes; separado: o modelo das redes é à parte', () => {
        const r = normalizarReceita({ estilo: 'faixas', estilosSeparados: false })
        expect(r.modeloRedes).toBe('faixas')
        expect(paramsDaRede(r, 'story', ev).get('modelo')).toBe('faixas')
        expect(redesDoEstilo('editorial')).toBe('editorial')
        const s = normalizarReceita({ estilo: 'faixas', estilosSeparados: true, modeloRedes: 'moldura' })
        expect(paramsDaRede(s, 'story', ev).get('modelo')).toBe('moldura')
        expect(paramsDaPeca(s, 'oracao', '2026-11-11').get('estilo')).toBe('faixas')
    })
    it('cada estilo novo das redes tem a sua caixa da foto', () => {
        for (const m of ['faixas', 'moldura', 'horizonte', 'editorial']) {
            expect(caixaFoto('post', m)).not.toEqual(CAIXA_FOTO.post)
            expect(caixaFoto('youtube', m).width).toBeGreaterThan(0)
        }
    })
})

describe('textos das artes (M4) e texto livre (M6)', () => {
    it('o que se escreve vale para o telão e para as redes; afinar só muda um formato', () => {
        const r = normalizarReceita({ ...receitaVazia(), titulo: 'Culto de Jovens', subtitulo: 'Jovens & Gerações', textoLivre: 'Traz um amigo!', afinar: { post: { titulo: 'Noite de Jovens', livre: '  Entrada livre ' }, story: { titulo: '' }, inventado: { titulo: 'x' } } })
        expect(textosPara(r, 'telao').titulo).toBe('Culto de Jovens')
        expect(textosPara(r, 'post').titulo).toBe('Noite de Jovens')
        expect(textosPara(r, 'post').livre).toBe('Entrada livre')
        expect(textosPara(r, 'story').titulo).toBe('Culto de Jovens')
        expect(r.afinar).toEqual({ post: { titulo: 'Noite de Jovens', livre: 'Entrada livre' } })
        expect(paramsDaRede(r, 'post', ev).get('titulo')).toBe('Noite de Jovens')
        expect(paramsDaRede(r, 'youtube', ev).get('titulo')).toBe('Culto de Jovens')
        const capa = paramsDaPeca(r, 'capa', '2026-11-11', ev)
        expect(capa.get('capa')).toBe('Culto de Jovens')
        expect(capa.get('sub')).toBe('Jovens & Gerações')
        expect(capa.get('livre')).toBe('Traz um amigo!')
        expect(paramsDaRede(r, 'story', ev).get('livre')).toBe('Traz um amigo!')
    })
    it('texto livre: limite de 120, tamanho só p/m/g e sem texto livre não vai no pedido', () => {
        const r = normalizarReceita({ textoLivre: 'a'.repeat(300), textoLivreTam: 'g' })
        expect(r.textoLivre).toHaveLength(120)
        expect(paramsDaPeca(r, 'capa', '2026-11-11', ev).get('livreTam')).toBe('g')
        expect(normalizarReceita({ textoLivreTam: 'enorme' }).textoLivreTam).toBe('m')
        expect(paramsDaPeca(receitaVazia(), 'capa', '2026-11-11', ev).get('livre')).toBeNull()
        expect(paramsDaRede(receitaVazia(), 'post', ev).get('livre')).toBeNull()
    })
    it('a data e a hora escritas à mão substituem as do culto (ou só uma delas)', () => {
        const auto = { quando: 'Quarta, 11 nov', hora: '20h00' }
        expect(quandoEscrito('', auto)).toEqual(auto)
        expect(quandoEscrito('Sábado, 14 nov · 19h30', auto)).toEqual({ quando: 'Sábado, 14 nov', hora: '19h30' })
        expect(quandoEscrito('Sábado, 14 nov', auto)).toEqual({ quando: 'Sábado, 14 nov', hora: '20h00' })
        const r = normalizarReceita({ quandoTexto: 'Sábado, 14 nov · 19h30' })
        const q = paramsDaRede(r, 'post', ev)
        expect([q.get('quando'), q.get('hora')]).toEqual(['Sábado, 14 nov', '19h30'])
        expect(paramsDaPeca(r, 'capa', '2026-11-11', ev).get('quando')).toBe('Sábado, 14 nov · 19h30')
    })
    it('o texto livre só aparece nas peças com texto', () => {
        const o = { semente: 'x', livre: 'Traz um amigo!' }
        expect(conteudoDaPeca('capa', o).livre).toBe('Traz um amigo!')
        expect(conteudoDaPeca('palavra', o).livre).toBe('Traz um amigo!')
        for (const p of ['neutro', 'oferta', 'cantina'] as const) expect(conteudoDaPeca(p, o).livre).toBeUndefined()
        expect(conteudoDaPeca('capa', { semente: 'x' }).livre).toBeUndefined()
    })
})

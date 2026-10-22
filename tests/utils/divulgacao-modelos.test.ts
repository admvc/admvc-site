import { describe, expect, it } from 'vitest'
import { palavrasDoTitulo } from '@/lib/divulgacao-titulo'
import { normalizarReceita, paramsDaPeca, paramsDaRede, receitaVazia, semDestaque } from '@/lib/divulgacao-kit'
import { caixaFoto, CAIXA_FOTO } from '@/lib/divulgacao-enquadrar'

describe('estilos novos das redes', () => {
    it('*asteriscos* marcam o destaque e | muda de linha', () => {
        const l = palavrasDoTitulo('As obras da carne X o *fruto do Espírito*')
        expect(l).toHaveLength(1)
        expect(l[0].filter((w) => w.destaque).map((w) => w.t)).toEqual(['fruto', 'do', 'Espírito'])
        expect(palavrasDoTitulo('Levante a cabeça|e *siga* adiante').map((x) => x.map((w) => w.t).join(' '))).toEqual(['Levante a cabeça', 'e siga adiante'])
        expect(semDestaque('O *fruto* do Espírito')).toBe('O fruto do Espírito')
    })
    it('a receita guarda o estilo; o pedido leva o estilo e o tema; o telão nunca leva asteriscos', () => {
        const r = normalizarReceita({ ...receitaVazia(), modeloRedes: 'elegante', tema: 'Transformados pela *reconciliação*', pecas: ['palavra'] })
        expect(r.modeloRedes).toBe('elegante')
        expect(normalizarReceita({ modeloRedes: 'inventado' }).modeloRedes).toBe('classico')
        const ev = { nome: 'Culto', data: new Date('2026-10-18T18:30:00Z') }
        const q = paramsDaRede(r, 'post', ev)
        expect(q.get('modelo')).toBe('elegante')
        expect(q.get('tema')).toBe('Transformados pela *reconciliação*')
        expect(paramsDaRede({ ...r, modeloRedes: 'classico' }, 'post', ev).get('modelo')).toBeNull()
        expect(paramsDaPeca(r, 'palavra', '2026-10-18').get('tema')).toBe('Transformados pela reconciliação')
    })
    it('cada estilo tem a sua caixa da foto (o clássico mantém a de antes)', () => {
        expect(caixaFoto('post')).toEqual(CAIXA_FOTO.post)
        expect(caixaFoto('youtube', 'arco-claro').width).toBe(460)
        expect(caixaFoto('story', 'inventado')).toEqual(CAIXA_FOTO.story)
    })
})

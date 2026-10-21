import { describe, expect, it } from 'vitest'
import { CAIXA_FOTO, ajusteEmTexto, ajustePorOmissao, enquadrarFoto, enquadrarRecorte, lerAjuste, lerAjustesKit, limitarAjuste } from '@/lib/divulgacao-enquadrar'
import { normalizarReceita, paramsDaRede, receitaVazia } from '@/lib/divulgacao-kit'

const post = CAIXA_FOTO.post   // 1080×1000

describe('enquadrar a foto (foto normal)', () => {
    it('sem ajuste dá o mesmo corte de antes (rosto a meio e a 30% da altura, sem fundo à vista)', () => {
        // foto deitada 2000×1000, rosto em 70% 20%: o corte antigo
        const fw = 2000, fh = 1000
        const escala = Math.max(post.width / fw, post.height / fh), w = Math.round(fw * escala), h = Math.round(fh * escala)
        const left = Math.round(Math.min(0, Math.max(post.width - w, post.width * 0.5 - 0.7 * w)))
        const top = Math.round(Math.min(0, Math.max(post.height - h, post.height * 0.3 - 0.2 * h)))
        expect(enquadrarFoto(fw, fh, post, ajustePorOmissao(false, '70% 20%'))).toEqual({ left, top, width: w, height: h })
    })
    it('o zoom aproxima e a foto continua a cobrir a caixa toda', () => {
        const p = enquadrarFoto(1000, 1500, post, { x: 0.5, y: 0.3, zoom: 2 })
        expect(p.width).toBe(2160)
        for (const a of [{ x: 0, y: 0, zoom: 2.5 }, { x: 1, y: 1, zoom: 1 }, { x: 0.5, y: 0.5, zoom: 3 }]) {
            const q = enquadrarFoto(1000, 1500, post, a)
            expect(q.left).toBeLessThanOrEqual(0); expect(q.top).toBeLessThanOrEqual(0)
            expect(q.left + q.width).toBeGreaterThanOrEqual(post.width); expect(q.top + q.height).toBeGreaterThanOrEqual(post.height)
        }
    })
    it('o zoom não passa de 1 a 3', () => {
        expect(limitarAjuste({ x: 2, y: -1, zoom: 9 }, false)).toEqual({ x: 1, y: 0, zoom: 3 })
        expect(limitarAjuste({ x: 0.5, y: 0.5, zoom: 0.2 }, false).zoom).toBe(1)
    })
})

describe('enquadrar o recorte (PNG transparente)', () => {
    it('sem ajuste: ao centro, assente no fundo, 94% da altura (como antes)', () => {
        const p = enquadrarRecorte(800, 1600, post, ajustePorOmissao(true))
        expect(p.height).toBe(940); expect(p.top).toBe(60)
        expect(p.left + p.width / 2).toBeCloseTo(540, 0)
    })
    it('recorte largo nas artes ao alto corta nos braços (largura máx. 1,35×)', () => {
        const p = enquadrarRecorte(3000, 1000, CAIXA_FOTO.story, ajustePorOmissao(true))
        expect(p.width).toBe(Math.round(1080 * 1.35))
    })
    it('mover e aproximar: o meio da pessoa segue o x e os pés o y', () => {
        const p = enquadrarRecorte(800, 1600, post, { x: 0.3, y: 1.2, zoom: 1.5 })
        expect(Math.abs(p.left + p.width / 2 - 324)).toBeLessThanOrEqual(1)
        expect(Math.abs(p.top + p.height - 1200)).toBeLessThanOrEqual(1)
        expect(p.height).toBe(1410)
    })
})

describe('guardar e enviar o ajuste', () => {
    it('texto ↔ ajuste', () => {
        expect(lerAjuste(ajusteEmTexto({ x: 0.123456, y: 1, zoom: 1.5 }))).toEqual({ x: 0.123, y: 1, zoom: 1.5 })
        expect(lerAjuste('a,b,c')).toBeNull(); expect(lerAjuste(null)).toBeNull()
    })
    it('a receita só aceita ajustes válidos e o pedido só os leva se a foto for a mesma', () => {
        const url = 'https://abc.public.blob.vercel-storage.com/divulgacao/1/f.jpg'
        expect(lerAjustesKit({ post: { url, x: 0.5, y: 0.3, zoom: 2 }, story: { x: 'a' }, outro: {} })).toEqual({ post: { url, x: 0.5, y: 0.3, zoom: 2 } })
        const r = normalizarReceita({ ...receitaVazia(), fotoV: { url, foco: '50% 30%', w: 800, h: 1200 }, ajustes: { post: { url, x: 0.4, y: 0.2, zoom: 1.4 }, story: { url: url + 'x', x: 0.4, y: 0.2, zoom: 1.4 } } })
        const ev = { nome: 'Culto', data: new Date('2026-10-25T10:00:00Z') }
        expect(paramsDaRede(r, 'post', ev).get('aj')).toBe('0.4,0.2,1.4')
        expect(paramsDaRede(r, 'story', ev).get('aj')).toBeNull()      // feito com outra foto: ignora
    })
})

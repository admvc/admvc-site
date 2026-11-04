import { describe, expect, it } from 'vitest'
import {
    DISPOSICAO, FORMATOS, LIMITES, MODELOS, aleatorio, ajustarFonte, arrastarFoco, caixaFoto, caixaSelo, dentroDe,
    enderecoDeFotoPermitido, formatarPreco, larguraEm, lerAjuste, lerPedido, limparTexto, linhasDoTexto, recorteQuadrado, sobrepoe,
    type FormatoId,
} from '@/lib/cantina-banners'

describe('preço em euros (pt-PT)', () => {
    it('formata como 2,50 €', () => {
        expect(formatarPreco('2,5')).toBe('2,50 €')
        expect(formatarPreco('2.5')).toBe('2,50 €')
        expect(formatarPreco(2.5)).toBe('2,50 €')
        expect(formatarPreco('€ 12')).toBe('12,00 €')
        expect(formatarPreco('1,20€')).toBe('1,20 €')
        expect(formatarPreco('12 euros')).toBe('12,00 €')
        expect(formatarPreco('0,999')).toBe('1,00 €')
    })
    it('separadores: o último é o decimal; mil euros ou mais não cabe no selo', () => {
        expect(formatarPreco('2.50')).toBe('2,50 €')
        expect(formatarPreco('1.250,5')).toBe('')
        expect(formatarPreco('1.000')).toBe('')
        expect(formatarPreco('999,99')).toBe('999,99 €')
    })
    it('vazio, lixo, zero, negativo e acima do limite escondem o selo', () => {
        for (const v of ['', '   ', 'grátis', 'abc', '0', '0,00', '-2', '1000', '12,3,4', '1..2', null, undefined, NaN, Infinity, -1, 0]) {
            expect(formatarPreco(v as never)).toBe('')
        }
    })
    it('cabe sempre no limite de caracteres do selo', () => {
        expect(formatarPreco('999,99').length).toBeLessThanOrEqual(LIMITES.preco)
    })
})

describe('texto limpo', () => {
    it('tira controlo, normaliza espaços e corta', () => {
        expect(limparTexto('  Olá \n\t mundo  ', 20)).toBe('Olá mundo')
        expect(limparTexto('a'.repeat(100), 10)).toBe('a'.repeat(10))
        expect(limparTexto(undefined, 10)).toBe('')
        expect(limparTexto(42, 10)).toBe('')
    })
})

describe('letra que se ajusta', () => {
    const medir = (s: string) => larguraEm('Titan', s)
    it('medidas reais: Titan é mais larga que Gochi', () => {
        expect(larguraEm('Titan', 'CANTINA')).toBeGreaterThan(larguraEm('Gochi', 'CANTINA'))
        expect(larguraEm('Titan', '')).toBe(0)
    })
    it('texto curto fica no tamanho máximo, comprido encolhe', () => {
        const caixa = { w: 800, h: 330 }
        const curto = ajustarFonte('Hoje', caixa, { max: 150, min: 40, medir, altura: 1.08 })
        const longo = ajustarFonte('Cantina aberta hoje depois do culto', caixa, { max: 150, min: 40, medir, altura: 1.08 })
        expect(curto.tamanho).toBe(150)
        expect(longo.tamanho).toBeLessThan(150)
        expect(longo.cabe).toBe(true)
        expect(longo.linhas * longo.tamanho * 1.08).toBeLessThanOrEqual(caixa.h)
    })
    it('uma palavra que não cabe nem no mínimo é assinalada (cabe: false), sem inventar tamanho', () => {
        const r = ajustarFonte('Pãodeloucomqueijoerecheio', { w: 400, h: 200 }, { max: 120, min: 30, medir })
        expect(r.cabe).toBe(false)
        expect(r.tamanho).toBe(30)
        const menor = ajustarFonte('Pão com queijo', { w: 400, h: 200 }, { max: 120, min: 30, medir })
        expect(menor.cabe).toBe(true)
        expect(linhasDoTexto('Pão com queijo', menor.tamanho, 400, medir)).not.toBeNull()
    })
    it('o texto mais comprido permitido cabe nas caixas de todos os modelos e formatos (no tamanho mínimo)', () => {
        const maxTitulo = 'Mmmmmmmmm Mmmmmmmmm Mmmmmmmm'.slice(0, LIMITES.titulo)
        const maxSub = 'Mmmmmmmmm Mmmmmmmmm Mmmmmmmm Mmmmmmmm Mmmmm'.slice(0, LIMITES.subtitulo)
        for (const f of Object.keys(FORMATOS) as FormatoId[]) {
            const t = ajustarFonte(maxTitulo.toUpperCase(), DISPOSICAO[f].titulo, { max: 150, min: 48, medir: (s) => larguraEm('Titan', s), altura: 1.08 })
            const s = ajustarFonte(maxSub, DISPOSICAO[f].subtitulo, { max: 80, min: 34, medir: (x) => larguraEm('Lilita', x), altura: 1.15 })
            expect(t.cabe, `título ${f}`).toBe(true)
            expect(s.cabe, `subtítulo ${f}`).toBe(true)
        }
    })
})

describe('disposição: nada sai da área nem se sobrepõe', () => {
    for (const f of Object.keys(FORMATOS) as FormatoId[]) {
        const { w, h } = FORMATOS[f], L = DISPOSICAO[f]
        const textos = { titulo: L.titulo, subtitulo: L.subtitulo, nota: L.nota, marca: L.marca }
        it(`${f}: tudo dentro do banner`, () => {
            for (const [nome, c] of Object.entries({ ...textos, foto: caixaFoto(f), selo: caixaSelo(f) })) expect(dentroDe(c, w, h), nome).toBe(true)
        })
        it(`${f}: textos não se sobrepõem entre si nem à foto ou ao selo`, () => {
            const nomes = Object.keys(textos) as (keyof typeof textos)[]
            for (let i = 0; i < nomes.length; i++) {
                for (let j = i + 1; j < nomes.length; j++) expect(sobrepoe(textos[nomes[i]], textos[nomes[j]]), `${nomes[i]} × ${nomes[j]}`).toBe(false)
                expect(sobrepoe(textos[nomes[i]], caixaFoto(f)), `${nomes[i]} × foto`).toBe(false)
                expect(sobrepoe(textos[nomes[i]], caixaSelo(f)), `${nomes[i]} × selo`).toBe(false)
            }
        })
        it(`${f}: o título começa abaixo do toldo`, () => {
            expect(L.titulo.y).toBeGreaterThanOrEqual(L.toldo - 20)
        })
    }
})

describe('foto: recorte com zoom e foco', () => {
    it('zoom 1 dá o maior quadrado que cabe, centrado no foco', () => {
        expect(recorteQuadrado(1920, 1080, { zoom: 1, fx: 0.5, fy: 0.5 })).toEqual({ left: 420, top: 0, lado: 1080 })
        expect(recorteQuadrado(800, 1200, { zoom: 1, fx: 0.5, fy: 0.5 })).toEqual({ left: 0, top: 200, lado: 800 })
    })
    it('mais zoom = quadrado mais pequeno (aproxima) e o foco move-o', () => {
        const a = recorteQuadrado(2000, 1000, { zoom: 2, fx: 0.5, fy: 0.5 })
        expect(a.lado).toBe(500)
        const b = recorteQuadrado(2000, 1000, { zoom: 2, fx: 0.1, fy: 0.5 })
        expect(b.left).toBeLessThan(a.left)
    })
    it('o recorte nunca sai da foto e é sempre quadrado', () => {
        for (const [w, h] of [[1920, 1080], [900, 1600], [500, 500], [3000, 400]]) {
            for (const zoom of [1, 1.7, 3]) for (const fx of [0, 0.5, 1]) for (const fy of [0, 0.5, 1]) {
                const r = recorteQuadrado(w, h, { zoom, fx, fy })
                expect(r.left).toBeGreaterThanOrEqual(0); expect(r.top).toBeGreaterThanOrEqual(0)
                expect(r.left + r.lado).toBeLessThanOrEqual(w); expect(r.top + r.lado).toBeLessThanOrEqual(h)
                expect(r.lado).toBeGreaterThan(0)
            }
        }
    })
    it('lerAjuste limita o que vem de fora', () => {
        expect(lerAjuste('9', '-3', '5')).toEqual({ zoom: 3, fx: 0, fy: 1 })
        expect(lerAjuste('abc', null, '')).toEqual({ zoom: 1, fx: 0.5, fy: 0.5 })
        expect(lerAjuste(0.2, 0.3, 0.7)).toEqual({ zoom: 1, fx: 0.3, fy: 0.7 })
    })
    it('arrastar para a direita mostra mais à esquerda da foto (a foto acompanha o dedo)', () => {
        const r = arrastarFoco(2000, 1000, { zoom: 2, fx: 0.5, fy: 0.5 }, 50, 0, 200)
        expect(r.fx).toBeLessThan(0.5)
        expect(r.fy).toBe(0.5)
        const limite = arrastarFoco(2000, 1000, { zoom: 2, fx: 0.5, fy: 0.5 }, -99999, 99999, 200)
        expect(limite.fx).toBeLessThanOrEqual(1); expect(limite.fy).toBeGreaterThanOrEqual(0)
    })
})

describe('endereços de foto permitidos', () => {
    it('aceita https normal, recusa o resto', () => {
        expect(enderecoDeFotoPermitido('https://abc.public.blob.vercel-storage.com/1/cantina/banners/1.jpg')).toContain('https://abc.public.blob')
        for (const u of ['http://exemplo.pt/a.jpg', 'https://localhost/a.jpg', 'https://127.0.0.1/a.jpg', 'https://10.0.0.5/a.jpg', 'https://a.local/x', 'https://user:pass@exemplo.pt/a.jpg', 'ftp://exemplo.pt/a', 'javascript:alert(1)', 'file:///etc/passwd', '', null, 42, 'https://[::1]/a.jpg', 'https://intranet/a.jpg']) {
            expect(enderecoDeFotoPermitido(u as never), String(u)).toBeNull()
        }
    })
    it('só em desenvolvimento aceita http://localhost', () => {
        expect(enderecoDeFotoPermitido('http://127.0.0.1:3999/a.jpg')).toBeNull()
        expect(enderecoDeFotoPermitido('http://127.0.0.1:3999/a.jpg', true)).not.toBeNull()
    })
})

describe('pedido', () => {
    it('lê, limpa e limita tudo', () => {
        const p = lerPedido(new URLSearchParams({ modelo: 'nada', formato: 'x', t: 'a'.repeat(200), s: ' b ', p: '2,5', n: 'c', foto: 'http://x', zoom: '99', tb: '1' }))
        expect(p.modelo).toBe('toldo'); expect(p.formato).toBe('telao')
        expect(p.titulo).toHaveLength(LIMITES.titulo); expect(p.subtitulo).toBe('b'); expect(p.preco).toBe('2,50 €')
        expect(p.foto).toBeNull(); expect(p.ajuste.zoom).toBe(3); expect(p.tirarBranco).toBe(true)
    })
    it('os 4 modelos existem', () => {
        expect(MODELOS.map((m) => m.id)).toEqual(['toldo', 'giz', 'cafe', 'festa'])
    })
})

describe('confetes determinísticos', () => {
    it('a mesma semente dá a mesma sequência, entre 0 e 1', () => {
        const a = aleatorio(7), b = aleatorio(7)
        for (let i = 0; i < 50; i++) { const x = a(); expect(x).toBe(b()); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1) }
    })
})

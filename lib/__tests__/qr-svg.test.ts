// O QR das artes: texto com acentos não pode rebentar nem mudar o tamanho de forma errada.
import { describe, it, expect } from 'vitest'
import { qrSvg } from '@/lib/qr-svg'

describe('qrSvg', () => {
    it('devolve uma imagem SVG (data URL) para texto simples e com acentos', () => {
        for (const t of ['https://app.igrejaadmvc.org/oferta', 'BCD\n002\n1\nSCT\n\nAssociação Cristã\nPT50000201231234567890154\n\n\n\nOferta']) {
            const u = qrSvg(t)
            expect(u.startsWith('data:image/svg+xml;base64,')).toBe(true)
            expect(Buffer.from(u.split(',')[1], 'base64').toString()).toContain('<svg')
        }
    })
    it('os acentos contam como UTF-8 (2 bytes): o QR é maior do que com o mesmo texto sem acentos', () => {
        const tamanho = (t: string) => Number(/viewBox="0 0 (\d+) /.exec(Buffer.from(qrSvg(t).split(',')[1], 'base64').toString())![1])
        const sem = 'a'.repeat(60), com = 'ç'.repeat(60) // 60 bytes vs 120 bytes
        expect(tamanho(com)).toBeGreaterThan(tamanho(sem))
    })
})

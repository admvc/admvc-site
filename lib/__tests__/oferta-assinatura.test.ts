import { describe, it, expect, beforeAll } from 'vitest'
import { assinarEnderecoOferta, ofertaAssinada } from '@/lib/oferta-assinatura'
import { enderecoOferta } from '@/lib/oferta'

beforeAll(() => { process.env.SESSION_SECRET ??= 'x'.repeat(40) })

describe('endereço /oferta assinado', () => {
    const base = () => new URL(assinarEnderecoOferta(enderecoOferta('https://app.igrejaadmvc.org', { iban: 'PT50000201231234567890154', titular: 'Igreja ADMVC', mbway: '+351 965 039 027' })!))
    const ler = (u: URL) => ofertaAssinada(u.searchParams.get('i')!, u.searchParams.get('t') ?? '', u.searchParams.get('m') ?? '', u.searchParams.get('s') ?? undefined)
    it('o link do portal abre', () => { expect(ler(base())).toBe(true) })
    it('outro IBAN, titular ou MB WAY: não abre', () => {
        for (const [k, v] of [['i', 'GB82WEST12345698765432'], ['t', 'Outra pessoa'], ['m', '+351 911 111 111']]) {
            const u = base(); u.searchParams.set(k, v); expect(ler(u)).toBe(false)
        }
    })
    it('sem assinatura: não abre', () => { const u = base(); u.searchParams.delete('s'); expect(ler(u)).toBe(false) })
})

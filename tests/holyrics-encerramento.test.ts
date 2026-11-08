import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ default: {} }))
import { artesDeEncerramento, lerTipo, pastaEncerramento, urlDaAgendaSemana } from '@/lib/encerramento-artes'
import { SECAO_DA_PECA } from '@/lib/holyrics-culto'
import { AMOSTRA_SOCIAL, LIMITES_SOCIAL, lerPedidoSocial, limparSocial } from '@/lib/acaosocial-arte-dados'

const blob = (nome: string) => `https://abc123.public.blob.vercel-storage.com/${pastaEncerramento(1, 7)}${nome}.png`

describe('ENCERRAMENTO do Holyrics', () => {
    it('neutro continua a ir para ENCERRAMENTO', () => {
        expect(SECAO_DA_PECA.neutro).toBe('ENCERRAMENTO')
    })

    it('ordem fixa: Agenda → Assistência Social → Cantina, mesmo guardadas ao contrário', () => {
        const lista = artesDeEncerramento(urlDaAgendaSemana('https://app.exemplo.pt/', 'abc', 7), [
            { tipo: 'CANTINA', url: blob('cantina-1') }, { tipo: 'ASSISTENCIA', url: blob('assistencia-1') },
        ])
        expect(lista.map((a) => a.nome)).toEqual(['Agenda da semana', 'Assistência Social', 'Cantina'])
        expect(lista.every((a) => a.secao === 'ENCERRAMENTO')).toBe(true)
        // os nomes de ficheiro também ficam por ordem (e não chocam com os do kit, que são 01-…, 02-…)
        const nomes = lista.map((a) => a.ficheiro)
        expect([...nomes].sort()).toEqual(nomes)
        expect(lista[0].url).toBe('https://app.exemplo.pt/api/public/holyrics/agenda-semana?chave=abc&evento=7')
    })

    it('sem Assistência nem Cantina publicadas só vai a agenda; sem endereço do portal não vai a agenda', () => {
        expect(artesDeEncerramento(urlDaAgendaSemana('https://x.pt', 'k', 1), []).map((a) => a.nome)).toEqual(['Agenda da semana'])
        expect(artesDeEncerramento(null, [{ tipo: 'CANTINA', url: blob('c') }]).map((a) => a.nome)).toEqual(['Cantina'])
    })

    it('ignora ligações que não são do Blob público e tipos desconhecidos', () => {
        const lista = artesDeEncerramento(null, [{ tipo: 'CANTINA', url: 'https://evil.example.com/x.png' }, { tipo: 'OUTRO', url: blob('x') }])
        expect(lista).toEqual([])
    })

    it('a chave vai codificada no endereço da agenda', () => {
        expect(urlDaAgendaSemana('https://x.pt', 'a b&c', 3)).toContain('chave=a%20b%26c')
        expect(lerTipo('CANTINA')).toBe('CANTINA')
        expect(lerTipo('cantina')).toBeNull()
    })
})

describe('arte da Assistência Social', () => {
    it('lê o pedido com limites, estilo por omissão e sem caracteres de controlo', () => {
        const q = new URLSearchParams({ estilo: 'xx', t: 'a'.repeat(100), x: 'linha\n\tdois', a: '' })
        const p = lerPedidoSocial(q)
        expect(p.estilo).toBe('noite')
        expect(p.titulo).toHaveLength(LIMITES_SOCIAL.titulo)
        expect(p.texto).toBe('linha dois')
        expect(p.apelo).toBe('')
    })

    it('a amostra cabe nos limites', () => {
        expect(AMOSTRA_SOCIAL.titulo.length).toBeLessThanOrEqual(LIMITES_SOCIAL.titulo)
        expect(AMOSTRA_SOCIAL.texto.length).toBeLessThanOrEqual(LIMITES_SOCIAL.texto)
        expect(AMOSTRA_SOCIAL.apelo.length).toBeLessThanOrEqual(LIMITES_SOCIAL.apelo)
        expect(limparSocial(5, 10)).toBe('')
    })
})

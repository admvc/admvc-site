// Inscrições em eventos: texto da página, membro pelo telefone, código, WhatsApp e CSV.
import { describe, it, expect } from 'vitest'
import { lerDescricao, lerCampos, membroPeloTelefone, novoCodigo, inscricoesAbertas, linkWhatsApp, csvInscricoes, mensagemWhatsApp } from '@/lib/inscricoes'

describe('lerDescricao', () => {
    it('títulos, listas e parágrafos (sem HTML)', () => {
        expect(lerDescricao('Olá\nirmãs!\n\n## Participação\n• 5 €\n• prato\nFim <b>x</b>')).toEqual([
            { tipo: 'paragrafo', texto: 'Olá irmãs!' },
            { tipo: 'titulo', texto: 'Participação' },
            { tipo: 'lista', itens: ['5 €', 'prato'] },
            { tipo: 'paragrafo', texto: 'Fim <b>x</b>' },
        ])
    })
})

describe('lerCampos', () => {
    it('só campos válidos', () => {
        expect(lerCampos([{ id: 'a', rotulo: 'A', tipo: 'aceite', obrigatorio: true }, { id: 1 }, 'x'])).toHaveLength(1)
        expect(lerCampos(null)).toEqual([])
    })
})

describe('membroPeloTelefone', () => {
    const membros = [
        { id: 5, phone_1: '912 345 678', phone_2: null, is_active: true, password: null },        // conta do censo
        { id: 2, phone_1: null, phone_2: '+351912345678', is_active: true, password: 'hash' },   // conta com senha
        { id: 9, phone_1: '913000000', phone_2: null, is_active: false, password: 'hash' },
    ]
    it('reconhece com ou sem indicativo e prefere a conta ativa com senha', () => {
        expect(membroPeloTelefone('00351 912 345 678', membros)?.id).toBe(2)
    })
    it('desconhecido = visitante', () => {
        expect(membroPeloTelefone('960000000', membros)).toBeNull()
    })
})

describe('novoCodigo', () => {
    it('5 caracteres sem 0/O/1/I/L', () => {
        const c = novoCodigo()
        expect(c).toMatch(/^[A-Z2-9]{5}$/)
        expect(c).not.toMatch(/[01OIL]/)
    })
})

describe('inscricoesAbertas', () => {
    const agora = new Date('2026-11-01T12:00:00Z')
    it('estado e prazo', () => {
        expect(inscricoesAbertas({ estado: 'ABERTO', inscricoes_ate: null }, agora)).toBe(true)
        expect(inscricoesAbertas({ estado: 'RASCUNHO', inscricoes_ate: null }, agora)).toBe(false)
        expect(inscricoesAbertas({ estado: 'ABERTO', inscricoes_ate: new Date('2026-10-31T00:00:00Z') }, agora)).toBe(false)
    })
})

describe('WhatsApp e CSV', () => {
    it('número português ganha o 351', () => {
        expect(linkWhatsApp('912 345 678', 'olá')).toBe('https://wa.me/351912345678?text=ol%C3%A1')
        expect(linkWhatsApp('+55 11 98765-4321', 'x')).toBe('https://wa.me/5511987654321?text=x')
    })
    it('mensagem lembra o pagamento enquanto não pagou', () => {
        const e = { titulo: 'Chá de Mulheres', inicio: new Date('2026-11-27T19:30:00Z'), preco_eur: 5, pagamento: 'MB WAY para o +351 965 039 027' }
        const m = mensagemWhatsApp({ nome: 'Ana Werly', codigo: 'K7QX2', estado: 'CONFIRMADA', pago: false }, e)
        expect(m).toContain('Olá Ana!')
        expect(m).toContain('confirmada')
        expect(m).toContain('referência K7QX2')
        expect(mensagemWhatsApp({ nome: 'Ana', codigo: 'K7QX2', estado: 'CONFIRMADA', pago: true }, e)).not.toContain('pagamento')
    })
    it('CSV com ; e aspas quando é preciso', () => {
        const csv = csvInscricoes([{ codigo: 'A', nome: 'Ana; Werly', telefone: '1', email: null, estado: 'PENDENTE', pago: false, membro: true, quer_contacto: false, criado_em: new Date('2026-10-14T10:00:00Z') }])
        expect(csv.startsWith('﻿Código;Nome')).toBe(true)
        expect(csv).toContain('A;"Ana; Werly";1;;PENDENTE;não;sim;não;')
    })
})

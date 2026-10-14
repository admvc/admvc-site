// Formulário de evento com inscrição: validação, hora "de parede", caixas e endereço.
import { describe, it, expect } from 'vitest'
import { lerFormularioEvento, slugDe, horaDeParede, paraFormulario, lerLinhasCampos, camposParaLinhas } from '@/lib/inscricoes-form'

const form = (campos: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(campos)) f.set(k, v)
    return f
}
const base = { titulo: 'Chá de Mulheres', data: '2026-11-27', hora: '19:30', organizador: 'grupo:2', estado: 'ABERTO' }

describe('lerFormularioEvento', () => {
    it('lê o essencial com a hora "de parede"', () => {
        const r = lerFormularioEvento(form({ ...base, preco: '5,00', precisa_confirmacao: 'on', campos: 'Levo salgados *\nVou de boleia' }))
        expect(r.ok).toBe(true)
        if (!r.ok) return
        expect(r.dados.inicio.toISOString()).toBe('2026-11-27T19:30:00.000Z')
        expect(r.dados.preco_eur).toBe(5)
        expect(r.dados.precisa_confirmacao).toBe(true)
        expect(r.dados.aberto_visitantes).toBe(false)
        expect(r.dados.campos).toEqual([
            { id: 'c1', rotulo: 'Levo salgados', tipo: 'aceite', obrigatorio: true },
            { id: 'c2', rotulo: 'Vou de boleia', tipo: 'aceite', obrigatorio: false },
        ])
        expect(r.dados.organizador).toEqual({ tipo: 'grupo', id: 2 })
        expect(r.dados.cor_principal).toBe('#3F6B4F') // cor inválida/ausente → a de sempre
    })

    it('recusa o que falta ou não faz sentido', () => {
        expect(lerFormularioEvento(form({ ...base, titulo: 'x' })).ok).toBe(false)
        expect(lerFormularioEvento(form({ ...base, hora: '' })).ok).toBe(false)
        expect(lerFormularioEvento(form({ ...base, preco: '-3' })).ok).toBe(false)
        expect(lerFormularioEvento(form({ ...base, organizador: 'tenant:1' })).ok).toBe(false)
        expect(lerFormularioEvento(form({ ...base, estado: 'APAGADO' })).ok).toBe(false)
    })

    it('prazo sem hora = fim do dia; preço 0 = grátis', () => {
        const r = lerFormularioEvento(form({ ...base, ate_data: '2026-11-25', preco: '0' }))
        expect(r.ok && r.dados.inscricoes_ate?.toISOString()).toBe('2026-11-25T23:59:00.000Z')
        expect(r.ok && r.dados.preco_eur).toBeNull()
    })
})

describe('ajudas', () => {
    it('slug sem acentos', () => {
        expect(slugDe('Chá de Mulheres — 2026!')).toBe('cha-de-mulheres-2026')
        expect(slugDe('!!!')).toBe('evento')
    })
    it('hora de parede ida e volta', () => {
        expect(paraFormulario(horaDeParede('2026-07-04', '20:00'))).toEqual({ data: '2026-07-04', hora: '20:00' })
        expect(horaDeParede('04/07/2026', '20:00')).toBeNull()
    })
    it('caixas: linhas ↔ campos', () => {
        const c = lerLinhasCampos('A *\n\nB')
        expect(camposParaLinhas(c)).toBe('A *\nB')
    })
})

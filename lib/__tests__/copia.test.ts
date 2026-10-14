// Copia completa: a ordem do restauro e o que se recusa (sem base).
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ default: {}, ligacaoDoEndereco: () => ({ schema: 'public' }) }))

import { MODELOS, LIGACOES } from '@/generated/modelo'
import { camposFora } from '@/lib/copia/gerar'
import { confirmarSeparacao, lerCopia, NAO_SE_RESTAURAM, ordemDeInsercao, restauraveis } from '@/lib/copia/restaurar'

const copiaVazia = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({ app: 'admvc', versao: '0.1.0', gravadoEm: '2026-10-14T08:00:00.000Z', tabelas: {}, ligacoes: {}, ...extra })

describe('ordem do restauro', () => {
    it('cada tabela vem depois das tabelas para onde aponta', () => {
        const ordem = ordemDeInsercao()
        expect(ordem).toHaveLength(restauraveis().length)
        for (const m of restauraveis()) {
            for (const f of m.fields.filter((x) => x.kind === 'object' && x.relationFromFields.length > 0)) {
                if (NAO_SE_RESTAURAM.includes(f.type) || f.type === m.name) continue
                expect(ordem.indexOf(f.type), `${m.name} → ${f.type}`).toBeLessThan(ordem.indexOf(m.name))
            }
        }
    })

    it('o que nao se restaura nao depende do que se restaura (fora o registo, tratado a parte)', () => {
        expect(() => confirmarSeparacao()).not.toThrow()
    })

    it('as tabelas escondidas dos muitos-para-muitos estao todas', () => {
        expect(LIGACOES.map((l) => l.name)).toEqual(expect.arrayContaining(['_CargoToMembro', '_LideresGrupo', '_MembrosGrupo']))
    })
})

describe('o que a copia nao leva', () => {
    it('palavras-passe, tokens e avisos no telemovel', () => {
        expect(camposFora('Membro')).toEqual(expect.arrayContaining(['password', 'push_subscription']))
        expect(camposFora('Tenant')).toEqual(expect.arrayContaining(['holyrics_token', 'loyverse_token']))
        expect(camposFora('SuperAdmin')).toContain('password')
    })

    it('nenhum campo com nome de segredo escapa', () => {
        for (const m of MODELOS) {
            for (const f of m.fields.filter((x) => x.kind === 'scalar' && /password|senha|token|secret/i.test(x.name))) {
                expect(camposFora(m.name), `${m.name}.${f.name}`).toContain(f.name)
            }
        }
    })
})

describe('ler a copia', () => {
    it('recusa o que nao e uma copia desta app', () => {
        expect(() => lerCopia('nao e json')).toThrow(/não é uma cópia/)
        expect(() => lerCopia(JSON.stringify({ app: 'precificaragao', gravadoEm: '2026-01-01', tabelas: {} }))).toThrow(/não é uma cópia/)
        expect(() => lerCopia(copiaVazia({ gravadoEm: 'ontem' }))).toThrow(/não é uma cópia/)
        expect(() => lerCopia(copiaVazia({ tabelas: { Membro: 'x' } }))).toThrow(/não é uma cópia/)
    })

    it('recusa dados de uma tabela que ja nao existe', () => {
        expect(() => lerCopia(copiaVazia({ tabelas: { TabelaVelha: [{ id: 1 }] } }))).toThrow(/TabelaVelha/)
        expect(() => lerCopia(copiaVazia({ tabelas: { TabelaVelha: [] } }))).not.toThrow()
        expect(() => lerCopia(copiaVazia({ ligacoes: { _Velha: [{ A: 1, B: 2 }] } }))).toThrow(/_Velha/)
    })

    it('recusa linhas sem um campo hoje obrigatorio', () => {
        expect(() => lerCopia(copiaVazia({ tabelas: { Tenant: [{ id: 1 }] } }))).toThrow(/obrigatório/)
    })

    it('tabelas que faltam ficam vazias; colunas que ja nao existem saem com aviso', () => {
        const tenant = MODELOS.find((m) => m.name === 'Tenant')!
        const linha: Record<string, unknown> = { coluna_velha: 1 }
        for (const f of tenant.fields.filter((x) => (x.kind === 'scalar' || x.kind === 'enum') && x.isRequired && !x.hasDefaultValue && !x.isUpdatedAt)) {
            linha[f.name] = f.type === 'Int' ? 1 : 'x'
        }
        const c = lerCopia(copiaVazia({ tabelas: { Tenant: [linha] } }))
        expect(c.tabelas.Tenant[0]).not.toHaveProperty('coluna_velha')
        expect(c.avisos.join(' ')).toMatch(/coluna_velha/)
        expect(c.tabelas.Membro).toEqual([])
        expect(c.tabelas).not.toHaveProperty('SuperAdmin')
        expect(c.tabelas).not.toHaveProperty('AuditLog')
    })
})

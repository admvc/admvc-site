// Mapa das famílias: impressão da morada, consultas, um ponto por casa e resumo por bairro.
import { describe, it, expect } from 'vitest'
import { chaveMorada, consultasDeMorada, porLocalizar, pontosDasFamilias, resumoPorBairro, type MembroMapa } from '@/lib/mapa-familias'

const morada = { address_1: 'Rua da Paz', address_number: '12', postal_code: '3080-123', neighborhood: 'Buarcos', id_city: 'Figueira da Foz' }
const m = (id: number, extra: Partial<MembroMapa> = {}): MembroMapa => ({
    id, first_name: `Nome${id}`, last_name: 'Silva', familia_id: null, familia_nome: null, congregacao_id: 1,
    latitude: null, longitude: null, geo_fonte: null, geo_chave: null, geo_falhou: false, em_grupo: false,
    ...morada, ...extra,
})

describe('morada', () => {
    it('impressão ignora maiúsculas e espaços', () => {
        expect(chaveMorada({ ...morada, address_1: '  RUA da  Paz ' })).toBe(chaveMorada(morada))
    })
    it('consultas do mais exato ao menos', () => {
        expect(consultasDeMorada(morada).map(c => c.fonte)).toEqual(['morada', 'codigo-postal', 'bairro'])
        expect(consultasDeMorada(morada)[0].q).toBe('Rua da Paz 12, 3080-123, Figueira da Foz')
        expect(consultasDeMorada({ ...morada, address_1: null, postal_code: '3080123', id_city: null })[0].q).toBe('3080-123, Figueira da Foz')
    })
})

describe('porLocalizar', () => {
    it('sem ponto, ou ponto de outra morada → localizar; falhou com a mesma morada → não insistir', () => {
        expect(porLocalizar(m(1))).toBe(true)
        expect(porLocalizar(m(1, { latitude: 40, longitude: -8, geo_chave: chaveMorada(morada) }))).toBe(false)
        expect(porLocalizar(m(1, { latitude: 40, longitude: -8, geo_chave: 'outra' }))).toBe(true)
        expect(porLocalizar(m(1, { geo_falhou: true, geo_chave: chaveMorada(morada) }))).toBe(false)
        expect(porLocalizar(m(1, { address_1: null, postal_code: null, neighborhood: null }))).toBe(false)
    })
})

describe('pontosDasFamilias', () => {
    const k = chaveMorada(morada)
    it('um ponto por família, preferindo a posição do Censo; quem não tem família é uma casa', () => {
        const { pontos, semLocalizacao } = pontosDasFamilias([
            m(1, { familia_id: 9, familia_nome: 'Silva', latitude: 40.1, longitude: -8.8, geo_fonte: 'morada', geo_chave: k }),
            m(2, { familia_id: 9, familia_nome: 'Silva', latitude: 40.2, longitude: -8.9, geo_fonte: 'censo', geo_chave: k, em_grupo: true }),
            m(3, { latitude: 40.3, longitude: -8.7, geo_fonte: 'bairro', geo_chave: k }),
            m(4),
        ])
        expect(pontos).toHaveLength(2)
        const silva = pontos.find(p => p.familia_id === 9)!
        expect(silva).toMatchObject({ nome: 'Família Silva', pessoas: 2, lat: 40.2, fonte: 'censo', sem_grupo: false, bairro: 'Buarcos' })
        expect(pontos.find(p => p.chave === 'm3')).toMatchObject({ nome: 'Nome3 Silva', sem_grupo: true })
        expect(semLocalizacao.map(g => g.map(x => x.id))).toEqual([[4]])
    })
    it('ponto de uma morada antiga não conta', () => {
        const { pontos } = pontosDasFamilias([m(1, { latitude: 40, longitude: -8, geo_chave: 'antiga' })])
        expect(pontos).toHaveLength(0)
    })
    it('resumo por bairro', () => {
        const { pontos } = pontosDasFamilias([m(1, { latitude: 40, longitude: -8, geo_chave: k }), m(2, { latitude: 40, longitude: -8, geo_chave: k, em_grupo: true })])
        expect(resumoPorBairro(pontos)).toEqual([{ bairro: 'Buarcos', casas: 2, pessoas: 2, semGrupo: 1 }])
    })
})

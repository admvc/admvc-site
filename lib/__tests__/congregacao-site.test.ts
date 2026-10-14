// O que o site público mostra de cada congregação.
import { describe, it, expect } from 'vitest'
import { lerHorarios, mapaDe } from '@/lib/congregacao-site'

describe('lerHorarios', () => {
    it('uma linha por encontro, com · ou |', () => {
        expect(lerHorarios('Domingo · 10:00 · Culto da Família\nQuarta-feira | 20:00 | Oração')).toEqual([
            { dia: 'Domingo', hora: '10:00', nome: 'Culto da Família' },
            { dia: 'Quarta-feira', hora: '20:00', nome: 'Oração' },
        ])
    })

    it('ignora linhas vazias e aceita linhas incompletas', () => {
        expect(lerHorarios('\r\n  Sábado · 16:00 \n\n')).toEqual([{ dia: 'Sábado', hora: '16:00', nome: '' }])
    })

    it('vazio ou nulo = sem horários', () => {
        expect(lerHorarios(null)).toEqual([])
        expect(lerHorarios('   ')).toEqual([])
    })
})

describe('mapaDe', () => {
    it('usa o ponto quando existe', () => {
        expect(mapaDe({ latitude: 40.15, longitude: -8.84, endereco: 'x', cidade: 'y' }))
            .toBe('https://www.google.com/maps/search/?api=1&query=40.15,-8.84')
    })

    it('senão a morada', () => {
        expect(mapaDe({ latitude: null, longitude: null, endereco: 'Rua Elias Garcia 105', cidade: 'Barcelos' }))
            .toBe('https://www.google.com/maps/search/?api=1&query=Rua%20Elias%20Garcia%20105%2C%20Barcelos')
    })
})

describe('QR por congregação', () => {
    const lista = [{ id: 1, nome: 'Sede' }, { id: 7, nome: 'Montemor' }, { id: 9, nome: 'São João da Madeira' }]
    it('nome curto sem acentos', async () => {
        const { slugCongregacao } = await import('@/lib/congregacao-site')
        expect(slugCongregacao('São João da Madeira')).toBe('sao-joao-da-madeira')
        expect(slugCongregacao('  Montemor-o-Velho ')).toBe('montemor-o-velho')
    })
    it('acha pelo nome curto ou pelo número', async () => {
        const { acharCongregacao } = await import('@/lib/congregacao-site')
        expect(acharCongregacao(lista, 'montemor')?.id).toBe(7)
        expect(acharCongregacao(lista, 'Sao Joao da Madeira')?.id).toBe(9)
        expect(acharCongregacao(lista, '1')?.id).toBe(1)
        expect(acharCongregacao(lista, 'leiria')).toBeNull()
        expect(acharCongregacao(lista, '')).toBeNull()
        expect(acharCongregacao(lista, 99)).toBeNull()
    })
})

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

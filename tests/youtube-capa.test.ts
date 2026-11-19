import { describe, expect, it } from 'vitest'
import {
    capaEmBytes, categoriaDaCapa, estadoSugerido, estadoSugeridoPelaHora, lerEstadoCapa, lisboaEscrita, rodapeAgendada, tituloDaLive, type DadosCapa,
} from '@/lib/youtube-capa-dados'
import { LIMITE_CAPA_BYTES } from '@/lib/youtube'

const base: DadosCapa = { estado: 'agendada', categoria: 'regular', titulo: 'Tesouro em *vasos de barro*', culto: 'Culto Dominical da Família', preletor: 'Pr. João Bosco', rodape: 'DOMINGO · 10H00', foto: null }

describe('título da live', () => {
    const d = { tema: 'Tesouro em *vasos de barro*', culto: 'Culto Dominical da Família', preletor: 'Pr. João Bosco', data: new Date('2026-11-22T10:00:00Z') }
    it('agendada e em direto: Tema | Culto | Preletor', () => {
        expect(tituloDaLive('agendada', d)).toBe('Tesouro em vasos de barro | Culto Dominical da Família | Pr. João Bosco')
        expect(tituloDaLive('direto', d)).toBe(tituloDaLive('agendada', d))
    })
    it('arquivo: acrescenta a data', () => {
        expect(tituloDaLive('arquivo', d)).toBe('Tesouro em vasos de barro | Culto Dominical da Família | Pr. João Bosco | 22/11/2026')
    })
    it('sem tema, sem repetir, e no máximo 100 caracteres', () => {
        expect(tituloDaLive('agendada', { ...d, tema: '' })).toBe('Culto Dominical da Família | Pr. João Bosco')
        expect(tituloDaLive('agendada', { ...d, tema: 'culto dominical da família' })).toBe('culto dominical da família | Pr. João Bosco')
        expect(tituloDaLive('arquivo', { ...d, tema: 'x'.repeat(150) }).length).toBeLessThanOrEqual(100)
    })
    it('reserva: só o culto e a data', () => { expect(tituloDaLive('reserva', d)).toBe('Culto Dominical da Família | 22/11/2026') })
})

describe('estado da capa', () => {
    const culto = Date.parse('2026-11-22T10:00:00Z')
    it('pela hora: antes = agendada, durante = direto, depois = arquivo', () => {
        expect(estadoSugeridoPelaHora(culto, culto - 2 * 3600000)).toBe('agendada')
        expect(estadoSugeridoPelaHora(culto, culto - 5 * 60000)).toBe('direto')
        expect(estadoSugeridoPelaHora(culto, culto + 2 * 3600000)).toBe('direto')
        expect(estadoSugeridoPelaHora(culto, culto + 4 * 3600000)).toBe('arquivo')
    })
    it('o estado da live no YouTube manda sobre a hora', () => {
        expect(estadoSugerido('terminada', culto, culto - 3600000)).toBe('arquivo')
        expect(estadoSugerido('agendada', culto, culto + 3600000)).toBe('agendada')
        expect(estadoSugerido(null, culto, culto + 3600000)).toBe('direto')
    })
    it('lerEstadoCapa só aceita os conhecidos', () => {
        expect(lerEstadoCapa('direto')).toBe('direto')
        expect(lerEstadoCapa('outro')).toBeNull()
    })
    it('rodapé da agendada: dia da semana ou, longe, com a data', () => {
        const hoje = Date.parse('2026-11-19T00:00:00Z')
        expect(rodapeAgendada(new Date('2026-11-22T10:00:00Z'), hoje)).toBe('DOMINGO · 10H00')
        expect(rodapeAgendada(new Date('2026-12-05T19:30:00Z'), hoje)).toBe('SÁBADO, 5 DEZ · 19H30')
    })
    it('lisboaEscrita: hora de Lisboa', () => {
        expect(lisboaEscrita(Date.parse('2026-11-22T10:00:00Z'))).toBe('2026-11-22T10:00')
        expect(lisboaEscrita(Date.parse('2026-07-19T09:00:00Z'))).toBe('2026-07-19T10:00')
    })
})

describe('paleta da categoria', () => {
    it('pelo nome do evento, pelo tipo ou pela paleta escolhida no kit', () => {
        expect(categoriaDaCapa('Culto de Jovens', 'CULTO_REGULAR')).toBe('jovens')
        expect(categoriaDaCapa('Chá de Mulheres', 'CONVIVIO')).toBe('mulheres')
        expect(categoriaDaCapa('Quarta Profética', 'CULTO_REGULAR')).toBe('profetica')
        expect(categoriaDaCapa('Escola de líderes', 'FORMACAO')).toBe('formacao')
        expect(categoriaDaCapa('Culto', 'CULTO_REGULAR', 'jovens')).toBe('jovens')
        expect(categoriaDaCapa('Culto Dominical da Família', 'CULTO_REGULAR')).toBe('regular')
    })
})

describe('limite de 2 MB da capa (o desenho real é testado no ecrã: tmp/yt/capas-ver.mjs)', () => {
    it('passou de 2 MB com foto → refaz sem foto; sem foto e grande → erro', async () => {
        let chamadas = 0
        const desenhar = async (d: DadosCapa) => { chamadas++; return new Response(new Uint8Array(d.foto ? LIMITE_CAPA_BYTES + 10 : 1000)) }
        const png = await capaEmBytes({ ...base, foto: { url: 'https://x.public.blob.vercel-storage.com/a.png', w: 10, h: 10, recorte: true } }, desenhar)
        expect(png.length).toBe(1000)
        expect(chamadas).toBe(2)
        await expect(capaEmBytes(base, async () => new Response(new Uint8Array(LIMITE_CAPA_BYTES + 1)))).rejects.toThrow('2 MB')
    })
    it('foto que não se consegue buscar → refaz sem foto', async () => {
        const desenhar = async (d: DadosCapa) => { if (d.foto) throw new Error('fetch falhou'); return new Response(new Uint8Array(500)) }
        const png = await capaEmBytes({ ...base, foto: { url: 'https://x.public.blob.vercel-storage.com/a.png', w: 10, h: 10, recorte: false } }, desenhar)
        expect(png.length).toBe(500)
    })
})

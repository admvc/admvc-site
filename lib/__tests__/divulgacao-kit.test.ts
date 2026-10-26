// Receita do kit de Divulgação: capa do culto, oferta (QR) e Cantina — o que se guarda e o que vai no pedido da imagem.
import { describe, it, expect } from 'vitest'
import { normalizarReceita, paramsDaPeca, receitaVazia } from '@/lib/divulgacao-kit'
import { conteudoDaPeca } from '@/lib/divulgacao'

const FOTO = 'https://abc.public.blob.vercel-storage.com/divulgacao/1/comida.jpg'
const ev = { nome: 'Culto da Família', data: new Date('2026-10-25T18:00:00Z') }

describe('capa do culto', () => {
    it('título das redes (sem * nem |) ou o nome do culto, com dia, hora e preletor', () => {
        const r = { ...receitaVazia(), titulo: 'Culto na *Direção* | dos Jovens', preletor: 'Pr. X' }
        const q = paramsDaPeca(r, 'capa', '2026-10-25', ev)
        expect(q.get('capa')).toBe('Culto na Direção dos Jovens')
        expect(q.get('quando')).toBe('Domingo, 25 out · 18h00')
        expect(q.get('preletor')).toBe('Pr. X')
        expect(paramsDaPeca(receitaVazia(), 'capa', '2026-10-25', ev).get('capa')).toBe('Culto da Família')
    })
})

describe('oferta', () => {
    it('QR só quando se escolhe; o titular só vai com o QR', () => {
        const sem = paramsDaPeca({ ...receitaVazia(), iban: 'PT50 0002', titular: 'Igreja' }, 'oferta', '2026-10-25')
        expect(sem.get('qrOferta')).toBeNull()
        expect(sem.get('titular')).toBeNull()
        const banco = paramsDaPeca({ ...receitaVazia(), iban: 'PT50 0002', titular: 'Igreja', qrOferta: 'banco', mbway: '912' }, 'oferta', '2026-10-25')
        expect([banco.get('qrOferta'), banco.get('titular'), banco.get('mbway')]).toEqual(['banco', 'Igreja', '912'])
    })
    it('valores estranhos na receita guardada voltam ao seguro', () => {
        expect(normalizarReceita({ qrOferta: 'outro' }).qrOferta).toBe('nenhum')
    })
})

describe('cantina', () => {
    it('receita: textos cortados (até 4), foto só do nosso Blob', () => {
        const r = normalizarReceita({ cantina: { titulo: 'Cantina', subtitulo: 'Depois do culto', textos: ['a', '', 'b', 'c', 'd', 'e', 5], foto: { url: 'https://exemplo.com/x.jpg' } } })
        expect(r.cantina.textos).toEqual(['a', 'b', 'c', 'd'])
        expect(r.cantina.foto).toBeNull()
        expect(normalizarReceita({}).cantina.titulo).toBe('Cantina')
    })
    it('o pedido leva título, linha, textos (repetidos) e a foto com o tamanho', () => {
        const r = { ...receitaVazia(), cantina: { titulo: 'Cantina', subtitulo: 'Aberta', textos: ['IVA incluído', 'Alergénios: peça a lista'], foto: { url: FOTO, foco: '50% 40%', w: 800, h: 600 } } }
        const q = paramsDaPeca(r, 'cantina', '2026-10-25')
        expect(q.get('ct')).toBe('Cantina')
        expect(q.getAll('cx')).toEqual(['IVA incluído', 'Alergénios: peça a lista'])
        expect([q.get('cf'), q.get('cfw'), q.get('cfh'), q.get('cfoco')]).toEqual([FOTO, '800', '600', '50% 40%'])
    })
    it('conteúdo da peça: moldura de comida, sem versículo', () => {
        const c = conteudoDaPeca('cantina', { cantina: { titulo: '', textos: ['x', ''] }, semente: 's' })
        expect(c).toMatchObject({ titulo: 'Cantina', moldura: 'comida', textosLegais: ['x'], versiculo: null })
    })
})

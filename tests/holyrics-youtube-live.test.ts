import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashDaChave } from '@/lib/holyrics-chave'
import { ErroYoutube } from '@/lib/youtube'

const m = vi.hoisted(() => ({
    verLive: vi.fn(), aplicarLive: vi.fn(), rateLimit: vi.fn(), hash: { valor: '' },
}))

vi.mock('@/lib/prisma', () => ({ default: { tenant: { findUnique: async () => ({ holyrics_chave_hash: m.hash.valor }) } } }))
vi.mock('@/lib/rate-limit', () => ({ rateLimit: m.rateLimit, ipDoPedido: () => '1.2.3.4' }))
vi.mock('@/lib/divulgacao-publica', () => ({ tenantPublico: async () => 1 }))
vi.mock('@/lib/youtube-live', () => ({ verLive: m.verLive, aplicarLive: m.aplicarLive }))

import { POST } from '@/app/api/public/holyrics/youtube-live/route'

const pedido = (q: string) => new Request(`http://localhost/api/public/holyrics/youtube-live?${q}`, { method: 'POST' })
const CHAVE = 'chave-do-holyrics-123456'

beforeEach(() => {
    m.hash.valor = hashDaChave(CHAVE)
    m.rateLimit.mockReset().mockResolvedValue({ success: true })
    m.verLive.mockReset(); m.aplicarLive.mockReset()
})

describe('POST /api/public/holyrics/youtube-live', () => {
    it('chave errada ou em falta: 401 e nem toca no YouTube', async () => {
        expect((await POST(pedido('chave=errada&acao=ver&evento=1'))).status).toBe(401)
        expect((await POST(pedido('acao=ver&evento=1'))).status).toBe(401)
        expect((await POST(pedido(`chave=${CHAVE}x&acao=aplicar&evento=1&estado=direto`))).status).toBe(401)
        expect(m.verLive).not.toHaveBeenCalled()
        expect(m.aplicarLive).not.toHaveBeenCalled()
    })

    it('pedidos inválidos: 400', async () => {
        for (const q of ['acao=ver', 'acao=ver&evento=abc', 'acao=ver&evento=-3', 'acao=apagar&evento=1', 'acao=aplicar&evento=1', 'acao=aplicar&evento=1&estado=xpto', 'acao=ver&evento=1&estado=xpto']) {
            expect((await POST(pedido(`chave=${CHAVE}&${q}`))).status, q).toBe(400)
        }
    })

    it('limite de pedidos: 429', async () => {
        m.rateLimit.mockResolvedValue({ success: false })
        expect((await POST(pedido(`chave=${CHAVE}&acao=ver&evento=1`))).status).toBe(429)
    })

    it('ver: devolve a live, o estado sugerido e os títulos', async () => {
        m.verLive.mockResolvedValue({ ligado: true, culto: { id: 7, nome: 'Culto', data: '2026-11-22T10:00:00.000Z' }, live: { id: 'L1', titulo: 'Live', estado: 'agendada', quando: '2026-11-22T10:00', cultoId: 7, cultoNome: 'Culto' }, lives: [], estadoSugerido: 'agendada', titulos: { agendada: 'T', direto: 'T', arquivo: 'T | 22/11/2026', reserva: 'R' }, aviso: null, toleranciaMin: 90 })
        const r = await POST(pedido(`chave=${CHAVE}&acao=ver&evento=7`))
        expect(r.status).toBe(200)
        const j = await r.json()
        expect(j).toMatchObject({ ok: true, ligado: true, live: { id: 'L1' }, estadoSugerido: 'agendada' })
        expect(m.verLive).toHaveBeenCalledWith(1, 7)
    })

    it('ver sem live agendada: 200 com live null e aviso (não é erro)', async () => {
        m.verLive.mockResolvedValue({ ligado: true, culto: { id: 7, nome: 'C', data: 'x' }, live: null, lives: [], estadoSugerido: 'agendada', titulos: {}, aviso: 'Não encontrei nenhuma live do YouTube…', toleranciaMin: 90 })
        const j = await (await POST(pedido(`chave=${CHAVE}&acao=ver&evento=7`))).json()
        expect(j.live).toBeNull()
        expect(j.aviso).toContain('Não encontrei')
    })

    it('ver com o YouTube por ligar: 200 e "não ligado" (o módulo explica)', async () => {
        m.verLive.mockResolvedValue({ ligado: false, mensagem: 'O YouTube ainda não está ligado ao portal (faltam as credenciais do canal).' })
        const j = await (await POST(pedido(`chave=${CHAVE}&acao=ver&evento=7`))).json()
        expect(j).toMatchObject({ ok: true, ligado: false })
    })

    it('aplicar: regista com origem holyrics e devolve o resultado', async () => {
        m.aplicarLive.mockResolvedValue({ live: { id: 'L1' }, titulo: 'Tema | Culto', estado: 'direto', capaAplicada: true, aviso: null })
        const r = await POST(pedido(`chave=${CHAVE}&acao=aplicar&evento=7&estado=direto`))
        expect(r.status).toBe(200)
        expect(await r.json()).toMatchObject({ ok: true, titulo: 'Tema | Culto', estado: 'direto' })
        expect(m.aplicarLive).toHaveBeenCalledWith(1, 7, 'direto', { origem: 'holyrics', por: 'Holyrics' })
    })

    it('aplicar sem live: 404 com a mensagem em português', async () => {
        m.aplicarLive.mockRejectedValue(new ErroYoutube('sem-live', 'Não encontrei nenhuma live do YouTube para Domingo, 22 nov às 10h00.'))
        const r = await POST(pedido(`chave=${CHAVE}&acao=aplicar&evento=7&estado=agendada`))
        expect(r.status).toBe(404)
        expect((await r.json()).error).toContain('Não encontrei nenhuma live')
    })

    it('aplicar com o YouTube por ligar: 409; canal sem verificação / quota: 502 com a mensagem', async () => {
        m.aplicarLive.mockRejectedValueOnce(new ErroYoutube('nao-ligado', 'O YouTube ainda não está ligado ao portal.'))
        expect((await POST(pedido(`chave=${CHAVE}&acao=aplicar&evento=7&estado=agendada`))).status).toBe(409)
        m.aplicarLive.mockRejectedValueOnce(new ErroYoutube('quota', 'O YouTube já não aceita mais pedidos hoje.'))
        const r = await POST(pedido(`chave=${CHAVE}&acao=aplicar&evento=7&estado=agendada`))
        expect(r.status).toBe(502)
        expect((await r.json()).error).toContain('hoje')
    })

    it('erro inesperado: 500 sem detalhes técnicos', async () => {
        m.aplicarLive.mockRejectedValue(new Error('senha=abc segredo'))
        const r = await POST(pedido(`chave=${CHAVE}&acao=aplicar&evento=7&estado=agendada`))
        expect(r.status).toBe(500)
        expect(JSON.stringify(await r.json())).not.toContain('segredo')
    })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contextoYoutube, esquecerToken, instanteDeLisboa, type Transporte } from '@/lib/youtube'

const m = vi.hoisted(() => ({
    evento: { findFirst: vi.fn(), findMany: vi.fn() },
    registo: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({ default: { evento: m.evento, youtubeLiveRegisto: m.registo } }))

import { aplicarLive, ligarLivesAosCultos, passoAutomatico, verLive } from '@/lib/youtube-live'

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
const ENV = { YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 's', YOUTUBE_REFRESH_TOKEN: 'refresh-123456789' }

const CULTO = new Date('2026-11-22T10:00:00Z')   // 10h de Lisboa "escrita" em UTC (inverno)
const eventoBd = { id: 7, nome: 'Culto Dominical da Família', data: CULTO, tipo: 'CULTO_REGULAR', kitDivulgacao: { receita: { tema: 'Tesouro em vasos de barro', preletor: 'Pr. João Bosco' } }, sermoes: [] }

/** YouTube falso com uma live e um vídeo; guarda tudo o que lhe pedem. */
function youtubeFalso(opcoes: { ciclo?: string; inicio?: string; capa?: () => Response } = {}) {
    const pedidos: { url: string; init?: RequestInit }[] = []
    const transporte: Transporte = async (url, init) => {
        pedidos.push({ url, init })
        const u = new URL(url)
        if (u.hostname === 'oauth2.googleapis.com') return json({ access_token: 'a', expires_in: 3600 })
        if (u.pathname.endsWith('/liveBroadcasts')) return json({ items: [{ id: 'LIVE1', snippet: { title: 'Transmissão de 22 nov', scheduledStartTime: opcoes.inicio ?? '2026-11-22T10:00:00Z' }, status: { lifeCycleStatus: opcoes.ciclo ?? 'ready' } }] })
        if (u.pathname.endsWith('/thumbnails/set')) return (opcoes.capa ?? (() => json({ items: [{}] })))()
        if (u.pathname.endsWith('/videos')) return init?.method === 'PUT' ? json({}) : json({ items: [{ id: 'LIVE1', snippet: { title: 'Transmissão de 22 nov', description: 'Links', categoryId: '29', tags: ['igreja'] } }] })
        return json({}, 404)
    }
    return { ctx: contextoYoutube({ env: ENV, transporte })!, pedidos }
}

beforeEach(() => {
    esquecerToken()
    m.evento.findFirst.mockReset().mockResolvedValue(eventoBd)
    m.evento.findMany.mockReset().mockResolvedValue([{ id: 7, nome: eventoBd.nome, data: CULTO }])
    m.registo.create.mockReset().mockResolvedValue({})
    m.registo.findFirst.mockReset().mockResolvedValue(null)
    m.registo.findMany.mockReset().mockResolvedValue([])
})

describe('ligarLivesAosCultos', () => {
    const live = (id: string, inicio: string) => ({ id, titulo: id, estado: 'agendada' as const, inicioAgendado: Date.parse(inicio), inicioReal: null, fim: null, privacidade: 'public' })
    it('cada live fica com o culto da sua hora; sem culto à hora, sem ligação', () => {
        const cultos = [{ id: 1, nome: 'Domingo', data: new Date('2026-11-22T10:00:00Z') }, { id: 2, nome: 'Quarta', data: new Date('2026-11-25T20:00:00Z') }]
        const mapa = ligarLivesAosCultos([live('a', '2026-11-22T09:50:00Z'), live('b', '2026-11-25T20:00:00Z'), live('c', '2026-11-28T10:00:00Z')], cultos)
        expect(mapa.get('a')?.id).toBe(1)
        expect(mapa.get('b')?.id).toBe(2)
        expect(mapa.has('c')).toBe(false)
    })
    it('duas lives para o mesmo culto: só a mais próxima fica ligada', () => {
        const mapa = ligarLivesAosCultos([live('longe', '2026-11-22T11:00:00Z'), live('perto', '2026-11-22T10:05:00Z')], [{ id: 1, nome: 'D', data: CULTO }])
        expect(mapa.has('perto')).toBe(true)
        expect(mapa.has('longe')).toBe(false)
    })
})

describe('verLive', () => {
    it('sem credenciais: "não ligado", sem rebentar e sem tocar na base', async () => {
        const r = await verLive(1, 7, { ctx: null })
        expect(r).toMatchObject({ ligado: false })
        expect(m.evento.findFirst).not.toHaveBeenCalled()
    })
    it('acha a live do culto, sugere o estado pela live e dá os títulos de cada estado', async () => {
        const { ctx } = youtubeFalso()
        const r = await verLive(1, 7, { ctx, agora: () => instanteDeLisboa(CULTO) - 3 * 3600000 })
        if (!r.ligado) throw new Error('devia estar ligado')
        expect(r.live).toMatchObject({ id: 'LIVE1', estado: 'agendada', quando: '2026-11-22T10:00', cultoId: 7 })
        expect(r.estadoSugerido).toBe('agendada')
        expect(r.titulos.agendada).toBe('Tesouro em vasos de barro | Culto Dominical da Família | Pr. João Bosco')
        expect(r.titulos.arquivo.endsWith('| 22/11/2026')).toBe(true)
        expect(r.aviso).toBeNull()
    })
    it('sem live à hora do culto: live null e aviso em português', async () => {
        const { ctx } = youtubeFalso({ inicio: '2026-11-24T10:00:00Z' })
        const r = await verLive(1, 7, { ctx })
        if (!r.ligado) throw new Error('devia estar ligado')
        expect(r.live).toBeNull()
        expect(r.aviso).toContain('Não encontrei nenhuma live')
    })
})

describe('aplicarLive', () => {
    it('gera a capa, põe-na, troca o título preservando o resto e regista', async () => {
        const { ctx, pedidos } = youtubeFalso()
        const capa = vi.fn().mockResolvedValue(PNG)
        const r = await aplicarLive(1, 7, 'direto', { origem: 'portal', por: 'Ana Silva' }, { ctx, capa })
        expect(r).toMatchObject({ estado: 'direto', capaAplicada: true, aviso: null, live: { id: 'LIVE1' } })
        expect(capa).toHaveBeenCalledWith(expect.objectContaining({ estado: 'direto', categoria: 'regular', titulo: 'Tesouro em vasos de barro', preletor: 'Pr. João Bosco' }))
        expect(pedidos.some((p) => p.url.includes('/thumbnails/set') && p.url.includes('videoId=LIVE1'))).toBe(true)
        const put = pedidos.find((p) => p.init?.method === 'PUT')!
        const corpo = JSON.parse(String(put.init?.body))
        expect(corpo.snippet).toMatchObject({ categoryId: '29', tags: ['igreja'], description: 'Links', title: 'Tesouro em vasos de barro | Culto Dominical da Família | Pr. João Bosco' })
        expect(m.registo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tenant_id: 1, evento_id: 7, broadcast_id: 'LIVE1', estado: 'direto', origem: 'portal', por: 'Ana Silva', resultado: 'ok' }) })
    })
    it('sem live à hora: erro sem-live (e fica no registo como erro)', async () => {
        const { ctx, pedidos } = youtubeFalso({ inicio: '2026-11-29T10:00:00Z' })
        await expect(aplicarLive(1, 7, 'agendada', { origem: 'holyrics', por: 'Holyrics' }, { ctx, capa: async () => PNG })).rejects.toMatchObject({ codigo: 'sem-live' })
        expect(pedidos.some((p) => p.url.includes('thumbnails'))).toBe(false)
        expect(m.registo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ resultado: 'erro', origem: 'holyrics' }) })
    })
    it('sem credenciais: não-ligado, sem registo e sem chamadas', async () => {
        await expect(aplicarLive(1, 7, 'agendada', { origem: 'portal', por: null }, { ctx: null })).rejects.toMatchObject({ codigo: 'nao-ligado' })
        expect(m.registo.create).not.toHaveBeenCalled()
    })
    it('canal sem verificação: o título troca-se na mesma e há um aviso', async () => {
        const { ctx, pedidos } = youtubeFalso({ capa: () => json({ error: { code: 403, errors: [{ reason: 'forbidden' }] } }, 403) })
        const r = await aplicarLive(1, 7, 'agendada', { origem: 'portal', por: 'Ana' }, { ctx, capa: async () => PNG })
        expect(r.capaAplicada).toBe(false)
        expect(r.aviso).toContain('verific')
        expect(pedidos.some((p) => p.init?.method === 'PUT')).toBe(true)
    })
    it('quota esgotada na capa: falha, não troca o título e regista o erro', async () => {
        const { ctx, pedidos } = youtubeFalso({ capa: () => json({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } }, 403) })
        await expect(aplicarLive(1, 7, 'agendada', { origem: 'portal', por: 'Ana' }, { ctx, capa: async () => PNG })).rejects.toMatchObject({ codigo: 'quota' })
        expect(pedidos.some((p) => p.init?.method === 'PUT')).toBe(false)
        expect(m.registo.create).toHaveBeenCalledWith({ data: expect.objectContaining({ resultado: 'erro', mensagem: expect.stringContaining('hoje') }) })
    })
})

describe('passoAutomatico (cron)', () => {
    it('sem credenciais: não faz nada', async () => {
        expect(await passoAutomatico(1, { ctx: null })).toEqual({ ligado: false, cultos: 0, passos: [] })
    })
    it('live em direto → capa "direto", uma só vez', async () => {
        const { ctx } = youtubeFalso({ ciclo: 'live' })
        const r = await passoAutomatico(1, { ctx, capa: async () => PNG })
        expect(r.passos).toEqual([{ eventoId: 7, liveId: 'LIVE1', estado: 'direto', resultado: 'aplicada' }])
        // já registado → não repete
        m.registo.findFirst.mockResolvedValue({ id: 1 })
        expect((await passoAutomatico(1, { ctx, capa: async () => PNG })).passos).toEqual([])
    })
    it('live terminada → arquivo; live só agendada → nada', async () => {
        expect((await passoAutomatico(1, { ctx: youtubeFalso({ ciclo: 'complete' }).ctx, capa: async () => PNG })).passos[0]).toMatchObject({ estado: 'arquivo', resultado: 'aplicada' })
        esquecerToken()
        expect((await passoAutomatico(1, { ctx: youtubeFalso({ ciclo: 'ready' }).ctx, capa: async () => PNG })).passos).toEqual([])
    })
    it('sem cultos hoje: não chama o YouTube (poupa quota)', async () => {
        m.evento.findMany.mockResolvedValue([])
        const { ctx, pedidos } = youtubeFalso({ ciclo: 'live' })
        expect(await passoAutomatico(1, { ctx })).toEqual({ ligado: true, cultos: 0, passos: [] })
        expect(pedidos).toHaveLength(0)
    })
})

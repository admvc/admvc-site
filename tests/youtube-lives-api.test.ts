import { beforeEach, describe, expect, it } from 'vitest'
import {
    apagarLiveYoutube, atualizarLiveYoutube, atualizarTextos, contextoYoutube, corpoDaLive, criarLiveYoutube, criarStream, esquecerToken, ligarALiveAChave,
    lerDadosDaChave, listarLives, type Transporte,
} from '@/lib/youtube'

const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { 'Content-Type': 'application/json' } })
const ENV = { YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 's', YOUTUBE_REFRESH_TOKEN: 'refresh-123456789' }
let pedidos: { url: string; init?: RequestInit }[] = []
function ctx(resposta: (url: string, init?: RequestInit) => Response) {
    const t: Transporte = async (url, init) => { pedidos.push({ url, init }); return new URL(url).hostname === 'oauth2.googleapis.com' ? json({ access_token: 'a', expires_in: 3600 }) : resposta(url, init) }
    return contextoYoutube({ env: ENV, transporte: t })!
}
const ultimo = () => pedidos[pedidos.length - 1]
beforeEach(() => { esquecerToken(); pedidos = [] })

describe('liveBroadcasts', () => {
    it('insert: corpo certo (Auto Start/Stop, DVR, pública, sem monitor) e hora em UTC com a mudança de hora', async () => {
        const c = ctx(() => json({ id: 'LIVE9' }))
        // 10h de Lisboa: inverno = 10:00Z; verão = 09:00Z
        expect((await criarLiveYoutube(c, { titulo: 'T', descricao: 'D', inicioMs: Date.parse('2026-11-22T10:00:00Z') })).id).toBe('LIVE9')
        let corpo = JSON.parse(ultimo().init!.body as string)
        expect(ultimo().url).toContain('liveBroadcasts?part=snippet,status,contentDetails')
        expect(ultimo().init!.method).toBe('POST')
        expect(corpo).toEqual({
            snippet: { title: 'T', description: 'D', scheduledStartTime: '2026-11-22T10:00:00.000Z' },
            status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
            contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, latencyPreference: 'normal', monitorStream: { enableMonitorStream: false } },
        })
        await criarLiveYoutube(c, { titulo: 'T', descricao: 'D', inicioMs: Date.parse('2026-07-12T09:00:00Z') })
        corpo = JSON.parse(ultimo().init!.body as string)
        expect(corpo.snippet.scheduledStartTime).toBe('2026-07-12T09:00:00.000Z')
    })
    it('limpa < > e corta o título a 100 caracteres', () => {
        const b = corpoDaLive({ titulo: `<b>${'x'.repeat(150)}`, descricao: 'a<b>', inicioMs: 0 })
        expect(b.snippet.title).toHaveLength(100)
        expect(b.snippet.title).not.toMatch(/[<>]/)
        expect(b.snippet.description).toBe('ab')
    })
    it('update (só snippet), delete e bind/unbind', async () => {
        const c = ctx(() => json({}))
        await atualizarLiveYoutube(c, 'L1', { titulo: 'N', descricao: 'D', inicioMs: Date.parse('2026-11-22T11:00:00Z') })
        expect(ultimo().init!.method).toBe('PUT')
        expect(ultimo().url).toContain('liveBroadcasts?part=snippet')
        expect(JSON.parse(ultimo().init!.body as string)).toEqual({ id: 'L1', snippet: { title: 'N', description: 'D', scheduledStartTime: '2026-11-22T11:00:00.000Z' } })
        await apagarLiveYoutube(c, 'L1')
        expect(ultimo().init!.method).toBe('DELETE')
        expect(ultimo().url).toContain('liveBroadcasts?id=L1')
        await ligarALiveAChave(c, 'L1', 'S1')
        expect(ultimo().init!.method).toBe('POST')
        expect(new URL(ultimo().url).searchParams.get('streamId')).toBe('S1')
        await ligarALiveAChave(c, 'L1', null)
        expect(new URL(ultimo().url).searchParams.has('streamId')).toBe(false)
    })
    it('a lista traz o estado e a chave a que cada live está ligada', async () => {
        const c = ctx(() => json({ items: [{ id: 'A', snippet: { title: 't', scheduledStartTime: '2026-11-22T10:00:00Z' }, status: { lifeCycleStatus: 'ready' }, contentDetails: { boundStreamId: 'S1' } }] }))
        const [l] = await listarLives(c)
        expect(l).toMatchObject({ id: 'A', ciclo: 'ready', streamId: 'S1', estado: 'agendada' })
        expect(pedidos.find((p) => p.url.includes('liveBroadcasts'))!.url).toContain('part=id,snippet,status,contentDetails')
    })
    it('videos.update na criação: lê antes, reenvia o que já havia e põe categoria 29 e idioma pt-PT', async () => {
        const c = ctx((u, i) => i?.method === 'PUT' ? json({}) : json({ items: [{ id: 'L1', snippet: { title: 'x', description: 'y', categoryId: '22', tags: ['igreja'] } }] }))
        await atualizarTextos(c, 'L1', { titulo: 'Novo', descricao: 'Desc', categoriaId: '29', idioma: 'pt-PT' })
        expect(JSON.parse(ultimo().init!.body as string).snippet).toMatchObject({ title: 'Novo', description: 'Desc', categoryId: '29', tags: ['igreja'], defaultLanguage: 'pt-PT', defaultAudioLanguage: 'pt-PT' })
    })
})

describe('liveStreams', () => {
    it('insert: RTMP, resolução e fps variáveis, reutilizável; só devolve o id', async () => {
        const c = ctx(() => json({ id: 'S1', cdn: { ingestionInfo: { streamName: 'SEGREDO' } } }))
        expect(await criarStream(c)).toEqual({ id: 'S1' })
        expect(JSON.parse(ultimo().init!.body as string)).toEqual({ snippet: { title: 'ADMVC · YoloBox' }, cdn: { ingestionType: 'rtmp', resolution: 'variable', frameRate: 'variable' }, contentDetails: { isReusable: true } })
    })
    it('servidor e chave lêem-se com part=cdn; sem stream devolve null', async () => {
        const c = ctx(() => json({ items: [{ id: 'S1', cdn: { ingestionInfo: { ingestionAddress: 'rtmp://a.rtmp.youtube.com/live2', streamName: 'abc' } } }] }))
        expect(await lerDadosDaChave(c, 'S1')).toEqual({ servidor: 'rtmp://a.rtmp.youtube.com/live2', chave: 'abc' })
        expect(ultimo().url).toContain('part=id,cdn')
        expect(await lerDadosDaChave(ctx(() => json({ items: [] })), 'S2')).toBeNull()
    })
})

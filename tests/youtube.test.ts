import { beforeEach, describe, expect, it } from 'vitest'
import {
    ErroYoutube, atualizarTextos, contextoYoutube, definirCapa, esquecerToken, instanteDeLisboa, lerCredenciais, limparTitulo, listarLives, ligarLiveAoCulto,
    obterAccessToken, tipoDaImagem, youtubeLigado, type LiveYoutube, type Transporte,
} from '@/lib/youtube'

const ENV = { YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 'segredo', YOUTUBE_REFRESH_TOKEN: 'refresh-123456789' }
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])

type Pedido = { url: string; init?: RequestInit }
/** Um YouTube falso: devolve as respostas por ordem de caminho e guarda os pedidos. */
function falso(respostas: Record<string, () => Response>) {
    const pedidos: Pedido[] = []
    const transporte: Transporte = async (url, init) => {
        pedidos.push({ url, init })
        const u = new URL(url)
        const r = respostas[u.hostname === 'oauth2.googleapis.com' ? 'token' : u.pathname]
        if (!r) return json({ error: { code: 404 } }, 404)
        return r()
    }
    return { transporte, pedidos }
}
const token = () => json({ access_token: 'acesso-1', expires_in: 3600 })
const ctxDe = (t: Transporte, agora = () => 1_000_000) => contextoYoutube({ env: ENV, transporte: t, agora })!

beforeEach(() => esquecerToken())

describe('credenciais', () => {
    it('sem as três variáveis = não ligado, sem rebentar', () => {
        expect(youtubeLigado({})).toBe(false)
        expect(lerCredenciais({ YOUTUBE_CLIENT_ID: 'x', YOUTUBE_CLIENT_SECRET: 'y' })).toBeNull()
        expect(contextoYoutube({ env: {} })).toBeNull()
    })
    it('com as três = ligado', () => {
        expect(youtubeLigado(ENV)).toBe(true)
        expect(contextoYoutube({ env: ENV })?.cred.refreshToken).toBe('refresh-123456789')
    })
})

describe('access token', () => {
    it('pede com o refresh token e reaproveita até caducar', async () => {
        const f = falso({ token })
        const ctx = ctxDe(f.transporte)
        expect(await obterAccessToken(ctx)).toBe('acesso-1')
        expect(await obterAccessToken(ctx)).toBe('acesso-1')
        expect(f.pedidos).toHaveLength(1)
        const corpo = new URLSearchParams(String(f.pedidos[0].init?.body))
        expect(corpo.get('grant_type')).toBe('refresh_token')
        expect(corpo.get('refresh_token')).toBe('refresh-123456789')
    })
    it('invalid_grant → mensagem de autorização em português', async () => {
        const f = falso({ token: () => json({ error: 'invalid_grant' }, 400) })
        await expect(obterAccessToken(ctxDe(f.transporte))).rejects.toMatchObject({ codigo: 'sem-autorizacao', message: expect.stringContaining('autorização') })
    })
    it('sem rede → erro de rede em português (nunca mostra o refresh token)', async () => {
        const ctx = ctxDe(async () => { throw new Error('ECONNRESET refresh-123456789') })
        const e = (await obterAccessToken(ctx).catch((x) => x)) as ErroYoutube
        expect(e.codigo).toBe('rede')
        expect(e.message).not.toContain('refresh-123456789')
    })
})

describe('listarLives', () => {
    const lista = () => json({
        items: [
            { id: 'A', snippet: { title: 'Domingo', scheduledStartTime: '2026-11-22T10:00:00Z' }, status: { lifeCycleStatus: 'ready', privacyStatus: 'unlisted' } },
            { id: 'B', snippet: { title: 'Agora', scheduledStartTime: '2026-11-22T10:00:00Z', actualStartTime: '2026-11-22T10:05:00Z' }, status: { lifeCycleStatus: 'live' } },
            { id: 'C', snippet: { title: 'Fim', actualEndTime: '2026-11-15T12:00:00Z', scheduledStartTime: '2026-11-15T10:00:00Z' }, status: { lifeCycleStatus: 'complete' } },
            { id: 'D', snippet: { title: 'Revogada' }, status: { lifeCycleStatus: 'revoked' } },
        ],
    })
    it('mine=true, estados traduzidos e revogadas ignoradas', async () => {
        const f = falso({ token, '/youtube/v3/liveBroadcasts': lista })
        const lives = await listarLives(ctxDe(f.transporte))
        expect(lives.map((l) => [l.id, l.estado])).toEqual([['A', 'agendada'], ['B', 'direto'], ['C', 'terminada']])
        const url = new URL(f.pedidos[1].url)
        expect(url.searchParams.get('mine')).toBe('true')
        expect((f.pedidos[1].init?.headers as Record<string, string>).Authorization).toBe('Bearer acesso-1')
    })
    it('quota esgotada → mensagem de quota', async () => {
        const f = falso({ token, '/youtube/v3/liveBroadcasts': () => json({ error: { code: 403, errors: [{ reason: 'quotaExceeded' }] } }, 403) })
        await expect(listarLives(ctxDe(f.transporte))).rejects.toMatchObject({ codigo: 'quota' })
    })
    it('401 da API → sem autorização', async () => {
        const f = falso({ token, '/youtube/v3/liveBroadcasts': () => json({ error: { code: 401 } }, 401) })
        await expect(listarLives(ctxDe(f.transporte))).rejects.toMatchObject({ codigo: 'sem-autorizacao' })
    })
})

describe('Lisboa e a ligação ao culto', () => {
    it('inverno: Lisboa = UTC; verão: Lisboa = UTC+1', () => {
        expect(instanteDeLisboa(new Date('2026-11-22T10:00:00Z'))).toBe(Date.parse('2026-11-22T10:00:00Z'))
        expect(instanteDeLisboa(new Date('2026-07-19T10:00:00Z'))).toBe(Date.parse('2026-07-19T09:00:00Z'))
    })
    const live = (id: string, inicio: string, estado: LiveYoutube['estado'] = 'agendada'): LiveYoutube => ({ id, titulo: id, estado, inicioAgendado: Date.parse(inicio), inicioReal: null, fim: null, privacidade: 'public' })
    it('liga a live mais próxima da hora do culto, dentro da tolerância', () => {
        const lives = [live('longe', '2026-11-22T14:00:00Z'), live('quase', '2026-11-22T09:45:00Z'), live('certa', '2026-11-22T10:00:00Z')]
        const r = ligarLiveAoCulto(lives, new Date('2026-11-22T10:00:00Z'))
        expect(r?.live.id).toBe('certa')
        expect(ligarLiveAoCulto([lives[1]], new Date('2026-11-22T10:00:00Z'))?.diferencaMin).toBe(-15)
    })
    it('culto de verão: 10h de Lisboa = 09:00Z', () => {
        expect(ligarLiveAoCulto([live('v', '2026-07-19T09:00:00Z')], new Date('2026-07-19T10:00:00Z'))?.live.id).toBe('v')
        expect(ligarLiveAoCulto([live('v', '2026-07-19T10:00:00Z')], new Date('2026-07-19T10:00:00Z'), { toleranciaMin: 30 })).toBeNull()
    })
    it('sem live à hora = null; por omissão ignora as terminadas', () => {
        expect(ligarLiveAoCulto([live('x', '2026-11-23T10:00:00Z')], new Date('2026-11-22T10:00:00Z'))).toBeNull()
        const fim = live('f', '2026-11-22T10:00:00Z', 'terminada')
        expect(ligarLiveAoCulto([fim], new Date('2026-11-22T10:00:00Z'))).toBeNull()
        expect(ligarLiveAoCulto([fim], new Date('2026-11-22T10:00:00Z'), { estados: ['terminada'] })?.live.id).toBe('f')
    })
})

describe('thumbnails.set', () => {
    it('envia o PNG em bruto para o vídeo certo', async () => {
        const f = falso({ token, '/upload/youtube/v3/thumbnails/set': () => json({ items: [{}] }) })
        await definirCapa(ctxDe(f.transporte), 'VID123', PNG)
        const p = f.pedidos[1]
        expect(new URL(p.url).searchParams.get('videoId')).toBe('VID123')
        expect(new URL(p.url).searchParams.get('uploadType')).toBe('media')
        expect((p.init?.headers as Record<string, string>)['Content-Type']).toBe('image/png')
        expect(p.init?.body).toBe(PNG)
    })
    it('recusa o que não é PNG/JPEG e o que passa de 2 MB, sem chamar o Google', async () => {
        const f = falso({})
        await expect(definirCapa(ctxDe(f.transporte), 'V', new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]))).rejects.toMatchObject({ codigo: 'imagem' })
        const grande = new Uint8Array(2 * 1024 * 1024 + 1); grande.set(PNG)
        await expect(definirCapa(ctxDe(f.transporte), 'V', grande)).rejects.toMatchObject({ codigo: 'imagem', message: expect.stringContaining('2 MB') })
        expect(f.pedidos).toHaveLength(0)
    })
    it('JPEG é reconhecido', () => { expect(tipoDaImagem(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg') })
    it('canal sem verificação → mensagem a pedir a verificação por telefone', async () => {
        const f = falso({ token, '/upload/youtube/v3/thumbnails/set': () => json({ error: { code: 403, message: 'The authenticated user doesn\'t have permissions to upload and set custom video thumbnails.', errors: [{ reason: 'forbidden' }] } }, 403) })
        await expect(definirCapa(ctxDe(f.transporte), 'V', PNG)).rejects.toMatchObject({ codigo: 'sem-verificacao', message: expect.stringContaining('verific') })
    })
    it('vídeo que já não existe', async () => {
        const f = falso({ token, '/upload/youtube/v3/thumbnails/set': () => json({ error: { code: 404, errors: [{ reason: 'videoNotFound' }] } }, 404) })
        await expect(definirCapa(ctxDe(f.transporte), 'V', PNG)).rejects.toMatchObject({ codigo: 'video' })
    })
})

describe('videos.update', () => {
    const atual = {
        id: 'V', snippet: {
            title: 'Antigo', description: 'Descrição com links', categoryId: '29', tags: ['igreja', 'culto'], defaultLanguage: 'pt',
            channelId: 'canal', publishedAt: '2026-01-01T00:00:00Z', thumbnails: { default: {} }, channelTitle: 'ADMVC', liveBroadcastContent: 'upcoming', localized: { title: 'x' },
        },
    }
    it('lê antes e reenvia categoryId, etiquetas, descrição e idioma (só troca o título)', async () => {
        let corpo: { id: string; snippet: Record<string, unknown> } | null = null
        const f = falso({
            token,
            '/youtube/v3/videos': () => (f.pedidos.at(-1)?.init?.method === 'PUT' ? ((corpo = JSON.parse(String(f.pedidos.at(-1)?.init?.body))), json({ id: 'V' })) : json({ items: [atual] })),
        })
        const r = await atualizarTextos(ctxDe(f.transporte), 'V', { titulo: 'Tema | Culto | Pr. X' })
        expect(r.titulo).toBe('Tema | Culto | Pr. X')
        expect(f.pedidos[1].init?.method ?? 'GET').toBe('GET')
        expect(f.pedidos[2].init?.method).toBe('PUT')
        expect(new URL(f.pedidos[2].url).searchParams.get('part')).toBe('snippet')
        expect(corpo!.id).toBe('V')
        expect(corpo!.snippet).toEqual({ title: 'Tema | Culto | Pr. X', description: 'Descrição com links', categoryId: '29', tags: ['igreja', 'culto'], defaultLanguage: 'pt' })
        expect(corpo!.snippet).not.toHaveProperty('thumbnails')
        expect(corpo!.snippet).not.toHaveProperty('publishedAt')
    })
    it('a descrição só muda se for dada', async () => {
        let corpo: { snippet: Record<string, unknown> } | null = null
        const f = falso({ token, '/youtube/v3/videos': () => (f.pedidos.at(-1)?.init?.method === 'PUT' ? ((corpo = JSON.parse(String(f.pedidos.at(-1)?.init?.body))), json({})) : json({ items: [atual] })) })
        await atualizarTextos(ctxDe(f.transporte), 'V', { titulo: 'Novo', descricao: 'Outra <b>' })
        expect(corpo!.snippet.description).toBe('Outra b')
    })
    it('vídeo inexistente → erro de vídeo, sem PUT', async () => {
        const f = falso({ token, '/youtube/v3/videos': () => json({ items: [] }) })
        await expect(atualizarTextos(ctxDe(f.transporte), 'V', { titulo: 'x' })).rejects.toMatchObject({ codigo: 'video' })
        expect(f.pedidos.some((p) => p.init?.method === 'PUT')).toBe(false)
    })
    it('título limpo: sem < >, no máximo 100 caracteres', () => {
        expect(limparTitulo('A <b>  B')).toBe('A b B')
        expect(limparTitulo('x'.repeat(150))).toHaveLength(100)
    })
})

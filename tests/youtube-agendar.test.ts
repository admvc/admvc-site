import { beforeEach, describe, expect, it, vi } from 'vitest'
import { contextoYoutube, esquecerToken, instanteDeLisboa, type Transporte } from '@/lib/youtube'
import { reporSimulado, transporteSimulado } from '@/lib/youtube-simulado'

type Ev = { id: number; tenant_id: number; nome: string; data: Date; tipo: string; transmitir_youtube: boolean | null; youtube_live_id: string | null; youtube_live_criada_em: Date | null }
const bd = vi.hoisted(() => ({ eventos: [] as Ev[], streamId: null as string | null, registos: [] as Record<string, unknown>[], escritasTenant: [] as unknown[] }))

const igual = (a: unknown, b: unknown) => (a ?? null) === (b ?? null)
vi.mock('@/lib/prisma', () => ({
    default: {
        evento: {
            findMany: async ({ where }: { where: Record<string, any> }) => bd.eventos.filter((e) =>
                (!where.id || (typeof where.id === 'number' ? e.id === where.id : where.id.in.includes(e.id)))
                && (!where.data || ((!where.data.gte || e.data >= where.data.gte) && (!where.data.lt || e.data < where.data.lt)))
                && (!where.youtube_live_id || (where.youtube_live_id.not === null ? e.youtube_live_id !== null : true))),
            findFirst: async ({ where }: { where: { id: number } }) => {
                const e = bd.eventos.find((x) => x.id === where.id)
                return e ? { ...e, kitDivulgacao: { receita: { tema: e.id === 1 ? 'Tesouro em vasos de barro' : '', preletor: 'Pr. João' } }, sermoes: [] } : null
            },
            updateMany: async ({ where, data }: { where: Record<string, any>; data: Partial<Ev> }) => {
                const alvo = bd.eventos.filter((e) => e.id === where.id && ('youtube_live_id' in where ? igual(e.youtube_live_id, where.youtube_live_id) : true))
                alvo.forEach((e) => Object.assign(e, data))
                return { count: alvo.length }
            },
        },
        tenant: {
            findUnique: async () => ({ nome: 'Igreja ADMVC', instagram_handle: 'admvc', youtube_stream_id: bd.streamId }),
            update: async (a: { data: { youtube_stream_id: string | null } }) => { bd.escritasTenant.push(a.data); bd.streamId = a.data.youtube_stream_id; return {} },
        },
        youtubeLiveRegisto: {
            create: async ({ data }: { data: Record<string, unknown> }) => { bd.registos.push({ ...data, criado_em: new Date() }); return {} },
            findMany: async ({ where }: { where: Record<string, any> }) => bd.registos.filter((r) => (!where.estado || r.estado === where.estado) && (!where.broadcast_id?.in || where.broadcast_id.in.includes(r.broadcast_id)) && (!where.origem?.in || where.origem.in.includes(r.origem)) && (!where.evento_id || r.evento_id !== null)),
            findFirst: async () => null,
        },
    },
}))

import { sincronizarLives } from '@/lib/youtube-agendar'
import { estadoDaChave, gerarOutraChave, ligarYoloBox } from '@/lib/youtube-chave'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])
const ENV = { YOUTUBE_CLIENT_ID: 'id', YOUTUBE_CLIENT_SECRET: 's', YOUTUBE_REFRESH_TOKEN: 'refresh-123456789' }
const AGORA = Date.parse('2026-11-19T12:00:00Z')   // quinta-feira; Lisboa = UTC no inverno
const D = (s: string) => new Date(`${s}:00Z`)

let pedidos: { url: string; metodo: string; corpo?: string }[] = []
function ctx() {
    const sim = transporteSimulado({ YOUTUBE_SIMULADO_LIVES: 'nenhuma' })
    const transporte: Transporte = async (url, init) => { pedidos.push({ url, metodo: init?.method ?? 'GET', corpo: typeof init?.body === 'string' ? init.body : undefined }); return sim(url, init) }
    return contextoYoutube({ env: ENV, transporte })!
}
const dep = () => ({ ctx: ctx(), agora: () => AGORA, capa: async () => PNG })
const ev = (id: number, data: string, extra: Partial<Ev> = {}): Ev => ({ id, tenant_id: 1, nome: id === 1 ? 'Culto Dominical da Família' : 'Quarta Profética', data: D(data), tipo: 'CULTO_REGULAR', transmitir_youtube: null, youtube_live_id: null, youtube_live_criada_em: null, ...extra })
const chamadas = (metodo: string, parte: string) => pedidos.filter((p) => p.metodo === metodo && p.url.includes(parte))

beforeEach(() => {
    esquecerToken(); reporSimulado(); pedidos = []
    bd.registos = []; bd.streamId = 'STREAM_FIXA'; bd.escritasTenant = []
    bd.eventos = [ev(1, '2026-11-22T10:00'), ev(2, '2026-11-25T20:00'), ev(3, '2026-11-29T10:00'), ev(4, '2026-11-21T19:00')]
})

describe('cron: criar só o que falta', () => {
    it('cria as lives dos próximos 7 dias (e só essas), com Auto Start/Stop, capa e categoria', async () => {
        await ctx().transporte('https://www.googleapis.com/youtube/v3/liveStreams?part=id', { method: 'POST', body: JSON.stringify({ snippet: { title: 'x' } }) })   // cria a stream simulada STREAM101
        bd.streamId = 'STREAM101'; pedidos = []
        const r = await sincronizarLives(1, { origem: 'cron' }, dep())
        expect(r.acoes.filter((a) => a.acao === 'criar' && a.ok)).toHaveLength(2)
        const inserts = chamadas('POST', '/liveBroadcasts?part=snippet,status,contentDetails')
        expect(inserts).toHaveLength(2)
        const corpo = JSON.parse(inserts[0].corpo!)
        expect(corpo.contentDetails).toMatchObject({ enableAutoStart: true, enableAutoStop: true, enableDvr: true })
        expect(corpo.status).toMatchObject({ privacyStatus: 'public', selfDeclaredMadeForKids: false })
        expect(corpo.snippet.title).toContain('Tesouro em vasos de barro')
        expect(corpo.snippet.scheduledStartTime).toBe('2026-11-22T10:00:00.000Z')
        expect(chamadas('POST', '/thumbnails/set')).toHaveLength(2)
        expect(JSON.parse(chamadas('PUT', '/videos?part=snippet')[0].corpo!).snippet).toMatchObject({ categoryId: '29', defaultLanguage: 'pt-PT' })
        expect(bd.eventos[0].youtube_live_id).toMatch(/^SIMLIVE/)
        expect(bd.eventos[2].youtube_live_id).toBeNull()   // 29/11: fora dos 7 dias
        expect(bd.eventos[3].youtube_live_id).toBeNull()   // sábado: não é por regra
    })

    it('não duplica: uma 2.ª passagem logo a seguir não cria nem atualiza nada', async () => {
        await sincronizarLives(1, { origem: 'cron' }, dep())
        pedidos = []
        const r = await sincronizarLives(1, { origem: 'cron' }, dep())
        expect(r.acoes.filter((a) => a.acao !== 'ligar à chave' && a.acao !== 'desligar da chave')).toEqual([])
        expect(chamadas('POST', '/liveBroadcasts?part=snippet')).toHaveLength(0)
        expect(chamadas('PUT', 'liveBroadcasts')).toHaveLength(0)
    })

    it('duas passagens ao mesmo tempo: só uma cria (reserva atómica)', async () => {
        await Promise.all([sincronizarLives(1, { origem: 'cron' }, dep()), sincronizarLives(1, { origem: 'cron' }, dep())])
        expect(chamadas('POST', '/liveBroadcasts?part=snippet,status,contentDetails')).toHaveLength(2)   // 2 cultos, 1 live cada
    })

    it('o culto mudou de hora → liveBroadcasts.update com a hora nova e capa nova', async () => {
        await sincronizarLives(1, { origem: 'cron' }, dep())
        bd.eventos[0].data = D('2026-11-22T11:00'); pedidos = []
        const r = await sincronizarLives(1, { origem: 'cron' }, dep())
        expect(r.acoes.some((a) => a.acao === 'atualizar' && a.ok)).toBe(true)
        const put = chamadas('PUT', '/liveBroadcasts?part=snippet')[0]
        expect(JSON.parse(put.corpo!).snippet.scheduledStartTime).toBe('2026-11-22T11:00:00.000Z')
        expect(chamadas('POST', '/thumbnails/set')).toHaveLength(1)
    })

    it('transmitir_youtube=false → apaga a live que ainda não começou; o culto apagado da Agenda também', async () => {
        await sincronizarLives(1, { origem: 'cron' }, dep())
        const id1 = bd.eventos[0].youtube_live_id!
        bd.eventos[0].transmitir_youtube = false
        bd.eventos = bd.eventos.filter((e) => e.id !== 2)
        pedidos = []
        await sincronizarLives(1, { origem: 'cron' }, dep())
        expect(chamadas('DELETE', '/liveBroadcasts').map((p) => new URL(p.url).searchParams.get('id'))).toContain(id1)
        expect(chamadas('DELETE', '/liveBroadcasts')).toHaveLength(2)
        expect(bd.eventos[0].youtube_live_id).toBeNull()
    })

    it('não apaga uma live que já começou', async () => {
        await sincronizarLives(1, { origem: 'cron' }, dep())
        bd.eventos[0].transmitir_youtube = false; pedidos = []
        const sim = transporteSimulado({ YOUTUBE_SIMULADO_CICLO: 'live', YOUTUBE_SIMULADO_LIVES: 'nenhuma' })
        const r = await sincronizarLives(1, { origem: 'cron' }, { ...dep(), ctx: contextoYoutube({ env: ENV, transporte: async (u, i) => { pedidos.push({ url: u, metodo: i?.method ?? 'GET' }); return sim(u, i) } })! })
        expect(chamadas('DELETE', '/liveBroadcasts')).toHaveLength(0)
        expect(r.acoes.filter((a) => a.acao === 'apagar')).toEqual([])
    })

    it('liga à chave só a próxima live e passa para a seguinte quando a anterior acaba', async () => {
        await sincronizarLives(1, { origem: 'cron' }, dep())
        const [l1, l2] = [bd.eventos[0].youtube_live_id!, bd.eventos[1].youtube_live_id!]
        const ligadas = (u: string) => new URL(u).searchParams
        const bind1 = chamadas('POST', '/liveBroadcasts/bind').filter((p) => ligadas(p.url).get('streamId'))
        expect(bind1.map((p) => ligadas(p.url).get('id'))).toEqual([l1])
        // depois do culto de domingo a live acaba: a seguinte (quarta) passa a ser a ligada
        pedidos = []
        const sim = transporteSimulado({ YOUTUBE_SIMULADO_LIVES: 'nenhuma' })
        const aTerminar: Transporte = async (u, i) => {
            const r = await sim(u, i)
            if (new URL(u).pathname.endsWith('/liveBroadcasts') && (i?.method ?? 'GET') === 'GET') {
                const j = await r.json(); for (const it of j.items) if (it.id === l1) it.status.lifeCycleStatus = 'complete'
                return new Response(JSON.stringify(j), { headers: { 'Content-Type': 'application/json' } })
            }
            pedidos.push({ url: u, metodo: i?.method ?? 'GET' }); return r
        }
        await sincronizarLives(1, { origem: 'cron' }, { ...dep(), agora: () => Date.parse('2026-11-22T14:00:00Z'), ctx: contextoYoutube({ env: ENV, transporte: aTerminar })! })
        const bind2 = chamadas('POST', '/liveBroadcasts/bind').filter((p) => ligadas(p.url).get('streamId'))
        expect(bind2.map((p) => ligadas(p.url).get('id'))).toContain(l2)
    })

    it('ensaio: diz o que faria e não escreve nada (nem no YouTube nem na base)', async () => {
        const r = await sincronizarLives(1, { origem: 'cron', ensaio: true }, dep())
        expect(r.acoes.filter((a) => a.acao === 'criar')).toHaveLength(2)
        expect(pedidos.filter((p) => p.metodo !== 'GET' && !p.url.includes('oauth2'))).toEqual([])
        expect(bd.eventos.every((e) => e.youtube_live_id === null)).toBe(true)
    })

    it('adota a live feita à mão à hora do culto em vez de criar outra', async () => {
        const c = ctx()
        const mao = await (await c.transporte('https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet', { method: 'POST', body: JSON.stringify({ snippet: { title: 'À mão', scheduledStartTime: '2026-11-22T09:50:00.000Z' } }) })).json()
        await sincronizarLives(1, { origem: 'cron' }, { ...dep(), ctx: c })
        expect(bd.eventos[0].youtube_live_id).toBe(mao.id)
        expect(chamadas('POST', '/liveBroadcasts?part=snippet,status,contentDetails')).toHaveLength(1)   // só a quarta é criada; o domingo adotou a live à mão
    })
})

describe('LA1: a chave fixa', () => {
    it('o ecrã mostra servidor e chave mas NUNCA os grava (nem na base, nem em logs)', async () => {
        bd.streamId = null
        const log = vi.spyOn(console, 'log').mockImplementation(() => {}), erro = vi.spyOn(console, 'error').mockImplementation(() => {}), aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const r = await ligarYoloBox(1, { ctx: ctx() })
        expect(r.criadaAgora).toBe(true)
        expect(r.servidor).toMatch(/^rtmp:\/\//)
        expect(r.chave.length).toBeGreaterThan(10)
        expect(bd.escritasTenant).toEqual([{ youtube_stream_id: expect.stringMatching(/^STREAM/) }])
        const tudo = JSON.stringify([bd.escritasTenant, bd.registos, bd.eventos, log.mock.calls, erro.mock.calls, aviso.mock.calls])
        expect(tudo).not.toContain(r.chave)
        expect(tudo).not.toContain(r.servidor)
        const stream = pedidos.find((p) => p.metodo === 'POST' && p.url.includes('/liveStreams'))!
        expect(JSON.parse(stream.corpo!)).toEqual({ snippet: { title: 'ADMVC · YoloBox' }, cdn: { ingestionType: 'rtmp', resolution: 'variable', frameRate: 'variable' }, contentDetails: { isReusable: true } })
        log.mockRestore(); erro.mockRestore(); aviso.mockRestore()
    })
    it('se já existe, não cria outra; "gerar outra" cria nova, guarda só o id e apaga a antiga', async () => {
        bd.streamId = null
        const c = ctx()
        const a = await ligarYoloBox(1, { ctx: c })
        const idAntigo = bd.streamId
        const b = await ligarYoloBox(1, { ctx: c })
        expect(b.criadaAgora).toBe(false)
        expect(b.chave).toBe(a.chave)
        const n = await gerarOutraChave(1, { ctx: c })
        expect(n.chave).not.toBe(a.chave)
        expect(n.antigaApagada).toBe(true)
        expect(bd.streamId).not.toBe(idAntigo)
        expect(JSON.stringify(bd.escritasTenant)).not.toContain(n.chave)
        expect(await estadoDaChave(1, { ctx: c })).toEqual({ ligado: true, temChave: true })
    })
})

describe('hora de verão', () => {
    it('o culto de 10h de Lisboa em julho vai para o YouTube às 09:00 UTC', async () => {
        bd.eventos = [ev(1, '2026-07-12T10:00')]
        await sincronizarLives(1, { origem: 'cron' }, { ...dep(), agora: () => Date.parse('2026-07-08T12:00:00Z') })
        const corpo = JSON.parse(chamadas('POST', '/liveBroadcasts?part=snippet,status,contentDetails')[0].corpo!)
        expect(corpo.snippet.scheduledStartTime).toBe('2026-07-12T09:00:00.000Z')
        expect(Date.parse(corpo.snippet.scheduledStartTime)).toBe(instanteDeLisboa(D('2026-07-12T10:00')))
    })
})

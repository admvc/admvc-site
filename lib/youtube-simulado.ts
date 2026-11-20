// YouTube FALSO, só para ver o ecrã e a rota em desenvolvimento sem chamar o Google: liga-se com YOUTUBE_SIMULADO=1
// (recusa-se na produção). As lives simuladas vêm de YOUTUBE_SIMULADO_LIVES (instantes ISO separados por vírgula; por omissão
// o próximo domingo às 10h00 e a próxima quarta às 20h00, hora de Lisboa; "nenhuma" = começa sem lives). Guarda o que lhe mudam em memória:
// também liveBroadcasts (insert, update, delete, bind) e liveStreams (list, insert, delete) para as lives agendadas pelo portal.
// YOUTUBE_SIMULADO_CICLO=ready|live|complete força o estado de todas as lives simuladas.
import type { Transporte } from '@/lib/youtube'
import { instanteDeLisboa } from '@/lib/youtube'

export const simuladoAtivo = (env: Record<string, string | undefined> = process.env) => env.YOUTUBE_SIMULADO === '1' && env.NODE_ENV !== 'production'

type VideoFalso = { id: string; titulo: string; descricao: string; categoryId: string; tags: string[]; inicio: number; ciclo: string; capaBytes: number; streamId: string | null; privacidade: string; idioma?: string }
type StreamFalsa = { id: string; titulo: string; servidor: string; chave: string }
const global = globalThis as unknown as { __ytSimulado?: Map<string, VideoFalso>; __ytSimuladoStreams?: Map<string, StreamFalsa>; __ytSimuladoSeq?: number }

/** Só para os testes e para recomeçar o ensaio: esquece tudo o que o YouTube falso guardava. */
export function reporSimulado() { global.__ytSimulado = undefined; global.__ytSimuladoStreams = undefined; global.__ytSimuladoSeq = undefined }

function proximo(diaSemana: number, hora: number): number {
    const agora = new Date()
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), hora, 0))
    while (d.getUTCDay() !== diaSemana || instanteDeLisboa(d) < agora.getTime()) d.setUTCDate(d.getUTCDate() + 1)
    return instanteDeLisboa(d)
}

function videos(env: Record<string, string | undefined>): Map<string, VideoFalso> {
    if (global.__ytSimulado) return global.__ytSimulado
    const m = new Map<string, VideoFalso>()
    const bruto = (env.YOUTUBE_SIMULADO_LIVES ?? '').trim()
    const lista = bruto === 'nenhuma' ? [] : bruto.split(',').map((s) => Date.parse(s.trim())).filter(Number.isFinite)
    const inicios = bruto === 'nenhuma' ? [] : lista.length ? lista : [proximo(0, 10), proximo(3, 20)]
    inicios.forEach((inicio, i) => m.set(`SIMULADO${i + 1}`, { id: `SIMULADO${i + 1}`, titulo: 'Transmissão em direto de 22 nov. 2026 (simulada)', descricao: 'Descrição de teste', categoryId: '29', tags: ['igreja', 'teste'], inicio, ciclo: 'ready', capaBytes: 0, streamId: null, privacidade: 'unlisted' }))
    return (global.__ytSimulado = m)
}

const streams = () => (global.__ytSimuladoStreams ??= new Map<string, StreamFalsa>())
const proximoId = (p: string) => `${p}${(global.__ytSimuladoSeq = (global.__ytSimuladoSeq ?? 100) + 1)}`

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
const naoExiste = () => json({ error: { code: 404, errors: [{ reason: 'videoNotFound' }] } }, 404)

export function transporteSimulado(env: Record<string, string | undefined> = process.env): Transporte {
    return async (url, init) => {
        const u = new URL(url)
        const metodo = init?.method ?? 'GET'
        if (u.hostname === 'oauth2.googleapis.com') return json({ access_token: 'token-simulado', expires_in: 3600 })
        const vs = videos(env)
        const ciclo = (v: VideoFalso) => env.YOUTUBE_SIMULADO_CICLO || v.ciclo

        // ---- chaves (liveStreams) ----
        if (u.pathname.endsWith('/liveStreams')) {
            const ss = streams()
            if (metodo === 'POST') {
                const c = JSON.parse(String(init?.body)) as { snippet?: { title?: string } }
                const id = proximoId('STREAM')
                ss.set(id, { id, titulo: c.snippet?.title ?? '', servidor: 'rtmp://a.rtmp.youtube.com/live2', chave: `sim-${id.toLowerCase()}-abcd-efgh` })
                return json({ id, snippet: { title: c.snippet?.title }, contentDetails: { isReusable: true } })
            }
            if (metodo === 'DELETE') { ss.delete(u.searchParams.get('id') ?? ''); return new Response(null, { status: 204 }) }
            const so = u.searchParams.get('id')
            const lista = [...ss.values()].filter((s) => !so || s.id === so)
            return json({ items: lista.map((s) => ({ id: s.id, snippet: { title: s.titulo }, contentDetails: { isReusable: true }, cdn: { ingestionInfo: { ingestionAddress: s.servidor, streamName: s.chave } } })) })
        }

        // ---- lives (liveBroadcasts) ----
        if (u.pathname.endsWith('/liveBroadcasts/bind')) {
            const v = vs.get(u.searchParams.get('id') ?? '')
            if (!v) return naoExiste()
            const alvo = u.searchParams.get('streamId')
            v.streamId = alvo && streams().has(alvo) ? alvo : null
            return json({ id: v.id, contentDetails: { boundStreamId: v.streamId ?? undefined } })
        }
        if (u.pathname.endsWith('/liveBroadcasts')) {
            if (metodo === 'POST') {
                const c = JSON.parse(String(init?.body)) as { snippet: { title: string; description?: string; scheduledStartTime: string }; status?: { privacyStatus?: string } }
                const id = proximoId('SIMLIVE')
                vs.set(id, { id, titulo: c.snippet.title, descricao: c.snippet.description ?? '', categoryId: '22', tags: [], inicio: Date.parse(c.snippet.scheduledStartTime), ciclo: 'created', capaBytes: 0, streamId: null, privacidade: c.status?.privacyStatus ?? 'public' })
                return json({ id })
            }
            if (metodo === 'PUT') {
                const c = JSON.parse(String(init?.body)) as { id: string; snippet: { title: string; description?: string; scheduledStartTime: string } }
                const v = vs.get(c.id)
                if (!v) return naoExiste()
                v.titulo = c.snippet.title; v.descricao = c.snippet.description ?? v.descricao; v.inicio = Date.parse(c.snippet.scheduledStartTime)
                return json({ id: v.id })
            }
            if (metodo === 'DELETE') {
                const id = u.searchParams.get('id') ?? ''
                if (!vs.has(id)) return naoExiste()
                vs.delete(id)
                return new Response(null, { status: 204 })
            }
            return json({ items: [...vs.values()].map((v) => ({ id: v.id, snippet: { title: v.titulo, scheduledStartTime: new Date(v.inicio).toISOString() }, status: { lifeCycleStatus: ciclo(v), privacyStatus: v.privacidade }, contentDetails: v.streamId ? { boundStreamId: v.streamId } : {} })) })
        }
        if (u.pathname.endsWith('/thumbnails/set')) {
            const v = vs.get(u.searchParams.get('videoId') ?? '')
            if (!v) return naoExiste()
            v.capaBytes = (init?.body as Uint8Array | undefined)?.length ?? 0
            return json({ items: [{}] })
        }
        if (u.pathname.endsWith('/videos')) {
            if (metodo === 'GET') {
                const v = vs.get(u.searchParams.get('id') ?? '')
                return json({ items: v ? [{ id: v.id, snippet: { title: v.titulo, description: v.descricao, categoryId: v.categoryId, tags: v.tags, channelId: 'canal', publishedAt: '2026-01-01T00:00:00Z' } }] : [] })
            }
            const corpo = JSON.parse(String(init?.body)) as { id: string; snippet: { title: string; description?: string; categoryId?: string; defaultLanguage?: string } }
            const v = vs.get(corpo.id)
            if (!v) return naoExiste()
            v.titulo = corpo.snippet.title
            if (corpo.snippet.description !== undefined) v.descricao = corpo.snippet.description
            if (corpo.snippet.categoryId) v.categoryId = corpo.snippet.categoryId
            if (corpo.snippet.defaultLanguage) v.idioma = corpo.snippet.defaultLanguage
            return json({ id: v.id })
        }
        return json({ error: { code: 404 } }, 404)
    }
}

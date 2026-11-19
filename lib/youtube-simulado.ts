// YouTube FALSO, só para ver o ecrã e a rota em desenvolvimento sem chamar o Google: liga-se com YOUTUBE_SIMULADO=1
// (recusa-se na produção). As lives simuladas vêm de YOUTUBE_SIMULADO_LIVES (instantes ISO separados por vírgula; por omissão
// o próximo domingo às 10h00 e a próxima quarta às 20h00, hora de Lisboa). Guarda o que lhe mudam em memória.
// YOUTUBE_SIMULADO_CICLO=ready|live|complete força o estado de todas as lives simuladas.
import type { Transporte } from '@/lib/youtube'
import { instanteDeLisboa } from '@/lib/youtube'

export const simuladoAtivo = (env: Record<string, string | undefined> = process.env) => env.YOUTUBE_SIMULADO === '1' && env.NODE_ENV !== 'production'

type VideoFalso = { id: string; titulo: string; descricao: string; categoryId: string; tags: string[]; inicio: number; ciclo: string; capaBytes: number }
const global = globalThis as unknown as { __ytSimulado?: Map<string, VideoFalso> }

function proximo(diaSemana: number, hora: number): number {
    const agora = new Date()
    const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), hora, 0))
    while (d.getUTCDay() !== diaSemana || instanteDeLisboa(d) < agora.getTime()) d.setUTCDate(d.getUTCDate() + 1)
    return instanteDeLisboa(d)
}

function videos(env: Record<string, string | undefined>): Map<string, VideoFalso> {
    if (global.__ytSimulado) return global.__ytSimulado
    const m = new Map<string, VideoFalso>()
    const lista = (env.YOUTUBE_SIMULADO_LIVES ?? '').split(',').map((s) => Date.parse(s.trim())).filter(Number.isFinite)
    const inicios = lista.length ? lista : [proximo(0, 10), proximo(3, 20)]
    inicios.forEach((inicio, i) => m.set(`SIMULADO${i + 1}`, { id: `SIMULADO${i + 1}`, titulo: 'Transmissão em direto de 22 nov. 2026 (simulada)', descricao: 'Descrição de teste', categoryId: '29', tags: ['igreja', 'teste'], inicio, ciclo: 'ready', capaBytes: 0 }))
    return (global.__ytSimulado = m)
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

export function transporteSimulado(env: Record<string, string | undefined> = process.env): Transporte {
    return async (url, init) => {
        const u = new URL(url)
        if (u.hostname === 'oauth2.googleapis.com') return json({ access_token: 'token-simulado', expires_in: 3600 })
        const vs = videos(env)
        if (u.pathname.endsWith('/liveBroadcasts')) {
            return json({ items: [...vs.values()].map((v) => ({ id: v.id, snippet: { title: v.titulo, scheduledStartTime: new Date(v.inicio).toISOString() }, status: { lifeCycleStatus: env.YOUTUBE_SIMULADO_CICLO || v.ciclo, privacyStatus: 'unlisted' } })) })
        }
        if (u.pathname.endsWith('/thumbnails/set')) {
            const v = vs.get(u.searchParams.get('videoId') ?? '')
            if (!v) return json({ error: { code: 404, errors: [{ reason: 'videoNotFound' }] } }, 404)
            v.capaBytes = (init?.body as Uint8Array | undefined)?.length ?? 0
            return json({ items: [{}] })
        }
        if (u.pathname.endsWith('/videos')) {
            if ((init?.method ?? 'GET') === 'GET') {
                const v = vs.get(u.searchParams.get('id') ?? '')
                return json({ items: v ? [{ id: v.id, snippet: { title: v.titulo, description: v.descricao, categoryId: v.categoryId, tags: v.tags, channelId: 'canal', publishedAt: '2026-01-01T00:00:00Z' } }] : [] })
            }
            const corpo = JSON.parse(String(init?.body)) as { id: string; snippet: { title: string; description?: string } }
            const v = vs.get(corpo.id)
            if (!v) return json({ error: { code: 404, errors: [{ reason: 'videoNotFound' }] } }, 404)
            v.titulo = corpo.snippet.title
            if (corpo.snippet.description !== undefined) v.descricao = corpo.snippet.description
            return json({ id: v.id })
        }
        return json({ error: { code: 404 } }, 404)
    }
}

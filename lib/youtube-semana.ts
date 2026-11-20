// LA6 — os cultos dos próximos 7 dias com o estado da live de cada um (por criar / agendada / ligada à chave / no ar / terminada / não transmitir).
import prisma from '@/lib/prisma'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { ErroYoutube, MENSAGEM_NAO_LIGADO, listarLives, type LiveYoutube } from '@/lib/youtube'
import { contextoDoPortal, type Dependencias } from '@/lib/youtube-live'
import { DIAS_DE_ANTECEDENCIA, MARCA_A_CRIAR, TIPOS_NO_PAINEL, cultoTransmite, estadoDoCulto, type EstadoLiveCulto } from '@/lib/youtube-regra'

export type LinhaSemana = {
    id: number; nome: string; quando: string            // "2026-11-22T10:00" (hora de Lisboa)
    estado: EstadoLiveCulto
    liveId: string | null; link: string | null
    quer: boolean                                       // vai (ou não) ter live, já contando a regra
    escolha: boolean | null                             // o que a Mídia escolheu (null = a regra)
}
export type SemanaDeLives = { ligado: false; mensagem: string } | { ligado: true; temChave: boolean; linhas: LinhaSemana[]; aviso: string | null }

export const linkDaLive = (id: string) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`

export async function livesDaSemana(tenantId: number, dep: Dependencias = {}): Promise<SemanaDeLives> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) return { ligado: false, mensagem: MENSAGEM_NAO_LIGADO }
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const [eventos, tenant] = await Promise.all([
        prisma.evento.findMany({
            where: { tenant_id: tenantId, data: { gte: hoje, lt: new Date(hoje.getTime() + (DIAS_DE_ANTECEDENCIA + 1) * 86400000) } },
            orderBy: { data: 'asc' }, take: 60,
            select: { id: true, nome: true, data: true, tipo: true, transmitir_youtube: true, youtube_live_id: true },
        }),
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } }),
    ])
    const streamId = tenant?.youtube_stream_id ?? null
    let lives: LiveYoutube[] = [], aviso: string | null = null
    try { lives = await listarLives(ctx) } catch (e) { aviso = e instanceof ErroYoutube ? e.message : 'Não consegui ver as lives do canal.' }
    const porId = new Map(lives.map((l) => [l.id, l]))
    const linhas: LinhaSemana[] = eventos
        .filter((e) => TIPOS_NO_PAINEL.includes(e.tipo) || e.transmitir_youtube !== null || (e.youtube_live_id && e.youtube_live_id !== MARCA_A_CRIAR))
        .map((e) => {
            const quer = cultoTransmite(e)
            const liveId = e.youtube_live_id && e.youtube_live_id !== MARCA_A_CRIAR ? e.youtube_live_id : null
            const live = liveId ? porId.get(liveId) : undefined
            return {
                id: e.id, nome: e.nome, quando: e.data.toISOString().slice(0, 16), estado: estadoDoCulto(quer, live, streamId),
                liveId: live ? liveId : null, link: live && liveId ? linkDaLive(liveId) : null, quer, escolha: e.transmitir_youtube,
            }
        })
    return { ligado: true, temChave: !!streamId, linhas, aviso }
}

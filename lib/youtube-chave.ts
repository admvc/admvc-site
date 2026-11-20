// LA1 — a chave fixa do YoloBox. O portal cria UMA stream reutilizável ("ADMVC · YoloBox", RTMP) e guarda só o id dela (Tenant.youtube_stream_id).
// O servidor e a chave lêem-se do YouTube na hora de os mostrar: NUNCA se gravam na base, em logs ou em ficheiros.
import prisma from '@/lib/prisma'
import {
    ErroYoutube, MENSAGEM_NAO_LIGADO, TITULO_DA_CHAVE, apagarStream, criarStream, lerDadosDaChave, listarStreams,
    type DadosDaChave,
} from '@/lib/youtube'
import { contextoDoPortal, type Dependencias } from '@/lib/youtube-live'

export type EstadoDaChave = { ligado: false; mensagem: string } | { ligado: true; temChave: boolean }
export type ChaveParaMostrar = { servidor: string; chave: string; criadaAgora: boolean }

/** Sem segredos: só diz se o YouTube está ligado e se já há chave fixa. */
export async function estadoDaChave(tenantId: number, dep: Dependencias = {}): Promise<EstadoDaChave> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) return { ligado: false, mensagem: MENSAGEM_NAO_LIGADO }
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } })
    return { ligado: true, temChave: !!t?.youtube_stream_id }
}

async function guardarId(tenantId: number, id: string | null) {
    await prisma.tenant.update({ where: { id: tenantId }, data: { youtube_stream_id: id } })
}

/**
 * Garante a chave fixa (cria se não existir; reaproveita uma já chamada "ADMVC · YoloBox" para nunca haver duas) e devolve o servidor e a chave,
 * lidos agora do YouTube. O que sai daqui vai só para o ecrã de quem carregou.
 */
export async function ligarYoloBox(tenantId: number, dep: Dependencias = {}): Promise<ChaveParaMostrar> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) throw new ErroYoutube('nao-ligado', MENSAGEM_NAO_LIGADO)
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } })
    let id = t?.youtube_stream_id ?? null
    let criadaAgora = false
    let dados: DadosDaChave | null = id ? await lerDadosDaChave(ctx, id) : null
    if (!dados) {
        // não há id, ou a chave foi apagada no YouTube: procura uma com o nome certo, senão cria
        const existente = (await listarStreams(ctx)).find((s) => s.titulo === TITULO_DA_CHAVE && s.reutilizavel)
        if (existente) id = existente.id
        else { id = (await criarStream(ctx)).id; criadaAgora = true }
        await guardarId(tenantId, id)
        dados = await lerDadosDaChave(ctx, id)
    }
    if (!dados) throw new ErroYoutube('outro', 'O YouTube criou a chave mas ainda não a mostra. Tente daqui a pouco.')
    return { ...dados, criadaAgora }
}

/**
 * "Gerar outra chave": cria uma stream nova, passa a ser a do portal e tenta apagar a antiga (quem tinha a chave antiga deixa de poder
 * transmitir). Quem trata do YoloBox tem de colar a nova no YoloCast. A ligação das lives à nova faz-se na passagem seguinte do cron.
 */
export async function gerarOutraChave(tenantId: number, dep: Dependencias = {}): Promise<ChaveParaMostrar & { antigaApagada: boolean }> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) throw new ErroYoutube('nao-ligado', MENSAGEM_NAO_LIGADO)
    const antes = (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } }))?.youtube_stream_id ?? null
    const nova = await criarStream(ctx)
    await guardarId(tenantId, nova.id)
    let antigaApagada = false
    if (antes) { try { await apagarStream(ctx, antes); antigaApagada = true } catch { antigaApagada = false } }
    const dados = await lerDadosDaChave(ctx, nova.id)
    if (!dados) throw new ErroYoutube('outro', 'O YouTube criou a chave mas ainda não a mostra. Tente daqui a pouco.')
    return { ...dados, criadaAgora: true, antigaApagada }
}

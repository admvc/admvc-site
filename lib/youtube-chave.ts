// LA1 — a chave fixa do YoloBox. O portal cria UMA stream reutilizável ("ADMVC · YoloBox", RTMP) e guarda só o id dela (Tenant.youtube_stream_id).
// O servidor e a chave lêem-se do YouTube na hora de os mostrar: NUNCA se gravam na base, em logs ou em ficheiros.
import { createHash } from 'node:crypto'
import prisma from '@/lib/prisma'
import {
    ErroYoutube, MENSAGEM_NAO_LIGADO, TITULO_DA_CHAVE, apagarStream, criarStream, lerDadosDaChave, listarStreams, listarStreamsComChave,
    type ContextoYoutube, type DadosDaChave,
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

// ---- Chave criada à mão no YouTube Studio (20/11) ------------------------------------------------------------------------
// O portal precisa do ID da stream (para ligar as lives), não da chave. Quem cola a chave: procura-se no canal a stream com essa chave.
// Se o YouTube não deixar ver a lista agora, guarda-se só o HASH da chave ("pendente:<sha256>") e cada passagem do cron tenta outra vez.
// A chave em si nunca fica gravada.
const PENDENTE = 'pendente:'
const hashDaChave = (chave: string) => createHash('sha256').update(chave.trim()).digest('hex')
export const chavePendente = (v: string | null | undefined) => !!v && v.startsWith(PENDENTE)

async function procurarPeloHash(ctx: ContextoYoutube, hash: string): Promise<string | null> {
    const lista = await listarStreamsComChave(ctx)
    return lista.find((s) => hashDaChave(s.chave) === hash)?.id ?? null
}

/** Usar uma chave criada à mão: liga já, ou fica pendente até o YouTube deixar ver a lista. */
export async function usarChaveColada(tenantId: number, chave: string, dep: Dependencias = {}): Promise<{ ligada: boolean; mensagem: string }> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) throw new ErroYoutube('nao-ligado', MENSAGEM_NAO_LIGADO)
    const limpa = chave.trim()
    if (!/^[A-Za-z0-9-]{8,80}$/.test(limpa)) throw new ErroYoutube('outro', 'Isto não parece uma chave de stream do YouTube (ex.: abcd-efgh-ijkl-mnop-qrst).')
    const hash = hashDaChave(limpa)
    try {
        const id = await procurarPeloHash(ctx, hash)
        if (!id) throw new ErroYoutube('outro', 'Não encontrei essa chave neste canal. Confirme no YouTube Studio (Emitir em direto → Stream) que copiou a chave inteira.')
        await guardarId(tenantId, id)
        return { ligada: true, mensagem: 'Chave ligada. As lives do portal passam a usar esta chave.' }
    } catch (e) {
        if (!(e instanceof ErroYoutube) || e.codigo !== 'outro' || /Não encontrei essa chave/.test(e.message)) throw e
        await guardarId(tenantId, PENDENTE + hash)
        return { ligada: false, mensagem: 'Guardei a chave, mas o YouTube não deixou confirmá-la agora. O portal volta a tentar sozinho (no cron) e as lives ligam-se assim que confirmar. Cole já esta chave no YoloCast.' }
    }
}

/** O ID da stream do portal; se a chave colada ainda está pendente, tenta confirmá-la agora (null se ainda não der). */
export async function streamIdConfirmado(tenantId: number, valor: string | null, ctx: ContextoYoutube): Promise<string | null> {
    if (!chavePendente(valor)) return valor
    try {
        const id = await procurarPeloHash(ctx, valor!.slice(PENDENTE.length))
        if (id) await guardarId(tenantId, id)
        return id
    } catch { return null }
}

/**
 * Garante a chave fixa (cria se não existir; reaproveita uma já chamada "ADMVC · YoloBox" para nunca haver duas) e devolve o servidor e a chave,
 * lidos agora do YouTube. O que sai daqui vai só para o ecrã de quem carregou.
 */
export async function ligarYoloBox(tenantId: number, dep: Dependencias = {}): Promise<ChaveParaMostrar> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) throw new ErroYoutube('nao-ligado', MENSAGEM_NAO_LIGADO)
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } })
    if (chavePendente(t?.youtube_stream_id)) {
        const confirmado = await streamIdConfirmado(tenantId, t!.youtube_stream_id, ctx)
        if (!confirmado) throw new ErroYoutube('outro', 'A chave que colou ainda não foi confirmada pelo YouTube (o portal tenta sozinho). Use no YoloCast a chave que copiou do YouTube Studio.')
    }
    let id = (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { youtube_stream_id: true } }))?.youtube_stream_id ?? null
    let criadaAgora = false
    let dados: DadosDaChave | null = id ? await lerDadosDaChave(ctx, id) : null
    if (!dados) {
        // não há id, ou a chave foi apagada no YouTube: procura uma com o nome certo, senão cria
        // a lista às vezes dá 500 (backendError) no YouTube: sem ela, cria-se uma chave nova em vez de travar aqui
        const lista = await listarStreams(ctx).catch((e) => { if (e instanceof ErroYoutube && e.codigo === 'outro') return []; throw e })
        const existente = lista.find((s) => s.titulo === TITULO_DA_CHAVE && s.reutilizavel)
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

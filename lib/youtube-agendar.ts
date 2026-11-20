// O portal agenda as lives sozinho (LA3, LA4, LA5): a cada passagem do cron (ou ao carregar em "Criar agora") vê os cultos dos próximos
// 7 dias, compara com o YouTube e só faz o que falta — criar a live (com título, descrição, capa "agendada", categoria e idioma), atualizar
// se o culto mudou, apagar se deixou de transmitir (só se ainda não começou) e ligar à chave fixa SÓ a próxima live. Idempotente.
// Fala com o Google só por lib/youtube.ts (transporte injetável); a decisão está em lib/youtube-regra.ts (puro).
import { chavePendente, streamIdConfirmado } from '@/lib/youtube-chave'
import prisma from '@/lib/prisma'
import {
    ErroYoutube, MENSAGEM_NAO_LIGADO, apagarLiveYoutube, atualizarLiveYoutube, criarLiveYoutube, instanteDeLisboa, ligarALiveAChave, listarLives,
    type LiveYoutube,
} from '@/lib/youtube'
import { lisboaEscrita } from '@/lib/youtube-capa-dados'
import { aplicarLive, contextoDoPortal, dadosDoCulto, registar, tituloDoEstado, type Dependencias, type Origem } from '@/lib/youtube-live'
import {
    DIAS_DE_ANTECEDENCIA, MARCA_A_CRIAR, cultoTransmite, descricaoDaLive, planearLigacao, planearLives, type AcaoLive, type CultoPlano,
} from '@/lib/youtube-regra'

const SITE = 'https://www.igrejaadmvc.org'
const CATEGORIA_ONG = '29'   // categoria 29 do YouTube (Nonprofits & Activism)
const IDIOMA = 'pt-PT'

export type PassoLive = { acao: string; eventoId?: number; liveId?: string; ok: boolean; mensagem?: string }
export type ResultadoSync = { ligado: boolean; ensaio: boolean; temChave: boolean; cultos: number; acoes: PassoLive[]; avisos: string[] }

export type OpcoesSync = {
    ensaio?: boolean                 // só diz o que faria (lê o YouTube, não escreve em lado nenhum)
    origem?: Origem
    por?: string | null
    soEvento?: number                // o botão "Criar agora": só este culto, sem o limite dos 7 dias
    dias?: number
}

type DadosIgreja = { nome: string; instagram: string | null; streamId: string | null }

async function dadosDaIgreja(tenantId: number): Promise<DadosIgreja> {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { nome: true, instagram_handle: true, youtube_stream_id: true } })
    return { nome: t?.nome ?? 'Igreja', instagram: t?.instagram_handle ?? null, streamId: t?.youtube_stream_id ?? null }
}

/** A descrição da live de um culto (tema, preletor, quando e os links da igreja). */
async function descricaoDe(tenantId: number, eventoId: number, igreja: DadosIgreja): Promise<string> {
    const c = await dadosDoCulto(tenantId, eventoId)
    if (!c) return ''
    return descricaoDaLive({ nome: c.nome, data: c.data, tema: c.tema, preletor: c.preletor, igreja: igreja.nome, site: SITE, instagram: igreja.instagram })
}

export async function sincronizarLives(tenantId: number, o: OpcoesSync = {}, dep: Dependencias = {}): Promise<ResultadoSync> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    const base: ResultadoSync = { ligado: false, ensaio: !!o.ensaio, temChave: false, cultos: 0, acoes: [], avisos: [] }
    if (!ctx) return { ...base, avisos: [MENSAGEM_NAO_LIGADO] }
    const agoraMs = (dep.agora ?? Date.now)()
    const dias = o.dias ?? DIAS_DE_ANTECEDENCIA
    const origem = o.origem ?? 'cron'
    const por = o.por ?? (origem === 'cron' ? 'Automático' : null)
    const igreja = await dadosDaIgreja(tenantId)
    if (chavePendente(igreja.streamId)) igreja.streamId = o.ensaio ? null : await streamIdConfirmado(tenantId, igreja.streamId, ctx)   // chave colada à mão, ainda por confirmar
    const res: ResultadoSync = { ...base, ligado: true, temChave: !!igreja.streamId }
    if (!igreja.streamId) res.avisos.push('Ainda não há chave fixa: as lives criam-se, mas só ficam ligadas ao YoloBox depois de "Ligar o YoloBox".')

    // os cultos: de há 1 dia a daqui a `dias`+1 dias (as horas guardadas são as de Lisboa "escritas" em UTC)
    const agoraEscrito = Date.parse(`${lisboaEscrita(agoraMs)}:00Z`)
    const eventos = await prisma.evento.findMany({
        where: o.soEvento ? { tenant_id: tenantId, id: o.soEvento } : { tenant_id: tenantId, data: { gte: new Date(agoraEscrito - 86400000), lt: new Date(agoraEscrito + (dias + 1) * 86400000) } },
        orderBy: { data: 'asc' }, take: 80,
        select: { id: true, nome: true, data: true, tipo: true, transmitir_youtube: true, youtube_live_id: true, youtube_live_criada_em: true },
    })
    res.cultos = eventos.length

    const cultos: CultoPlano[] = []
    for (const e of eventos) {
        const quer = cultoTransmite(e)
        let titulo = ''
        if (quer) { const d = await dadosDoCulto(tenantId, e.id); titulo = d ? tituloDoEstado(d, 'agendada') : e.nome }
        cultos.push({ id: e.id, nome: e.nome, data: e.data, tipo: e.tipo, transmitir_youtube: e.transmitir_youtube, liveId: e.youtube_live_id, liveCriadaEm: e.youtube_live_criada_em, titulo })
    }

    let lives: LiveYoutube[]
    try { lives = await listarLives(ctx) } catch (e) { return { ...res, avisos: [...res.avisos, e instanceof ErroYoutube ? e.message : 'Não consegui ver as lives do canal.'] } }

    // capas já registadas (ou desistidas: 3 falhas nas últimas 24 h) — para saber se falta a capa "agendada"
    const ids = cultos.map((c) => c.liveId).filter((x): x is string => !!x && x !== MARCA_A_CRIAR)
    const comCapa = new Set<string>()
    if (ids.length) {
        const regs = await prisma.youtubeLiveRegisto.findMany({ where: { tenant_id: tenantId, broadcast_id: { in: ids }, estado: 'agendada' }, select: { broadcast_id: true, resultado: true, criado_em: true }, take: 500 })
        const falhas = new Map<string, number>()
        for (const r of regs) {
            if (r.resultado === 'ok') comCapa.add(r.broadcast_id)
            else if (agoraMs - r.criado_em.getTime() < 86400000) falhas.set(r.broadcast_id, (falhas.get(r.broadcast_id) ?? 0) + 1)
        }
        for (const [id, n] of falhas) if (n >= 3) comCapa.add(id)
    }

    // lives que o portal criou para um culto que foi apagado da Agenda: apagam-se (só se ainda não começaram)
    const orfas: string[] = []
    if (!o.soEvento) {
        const porComecar = new Set(lives.filter((l) => l.ciclo === 'created' || l.ciclo === 'ready').map((l) => l.id))
        const regs = await prisma.youtubeLiveRegisto.findMany({
            where: { tenant_id: tenantId, estado: 'agendada', resultado: 'ok', origem: { in: ['cron', 'portal'] }, evento_id: { not: null }, criado_em: { gte: new Date(agoraMs - 45 * 86400000) } },
            select: { broadcast_id: true, evento_id: true }, take: 300,
        })
        const cand = regs.filter((r) => porComecar.has(r.broadcast_id))
        if (cand.length) {
            const existem = new Set((await prisma.evento.findMany({ where: { tenant_id: tenantId, id: { in: [...new Set(cand.map((r) => r.evento_id as number))] } }, select: { id: true } })).map((e) => e.id))
            for (const r of cand) if (!existem.has(r.evento_id as number) && !orfas.includes(r.broadcast_id)) orfas.push(r.broadcast_id)
        }
    }

    const livesVivas = lives.filter((l) => !orfas.includes(l.id))
    const acoes = planearLives(cultos, livesVivas, { agora: agoraMs, dias, comCapa, soEvento: o.soEvento })
    const porId = new Map(cultos.map((c) => [c.id, c]))
    const descricoes = new Map<number, string>()
    const descricaoDoEvento = async (id: number) => { if (!descricoes.has(id)) descricoes.set(id, await descricaoDe(tenantId, id, igreja)); return descricoes.get(id)! }

    if (o.ensaio) {
        for (const id of orfas) res.acoes.push({ acao: 'apagar (culto apagado)', liveId: id, ok: true, mensagem: 'ensaio: não foi feito' })
        res.acoes.push(...acoes.map((a) => ({ acao: a.acao, eventoId: a.eventoId, liveId: 'liveId' in a ? a.liveId : undefined, ok: true, mensagem: 'ensaio: não foi feito' })))
        if (igreja.streamId) {
            const cultoDaLive = new Set(cultos.map((c) => c.liveId))
            for (const a of planearLigacao(lives.filter((l) => cultoDaLive.has(l.id)), igreja.streamId, agoraMs)) res.acoes.push({ acao: a.acao === 'ligar' ? 'ligar à chave' : 'desligar da chave', liveId: a.liveId, ok: true, mensagem: 'ensaio: não foi feito' })
        }
        return res
    }

    // ---- 1.ª fase: criar, adotar, atualizar, apagar ----
    let mudou = false
    let parar = false
    for (const id of orfas) {
        try {
            await apagarLiveYoutube(ctx, id)
            await registar(tenantId, { eventoId: null, liveId: id, liveTitulo: '-', tituloAplicado: null, estado: 'agendada', origem, por, ok: true, mensagem: 'Live apagada: o culto já não existe na Agenda.' })
            res.acoes.push({ acao: 'apagar (culto apagado)', liveId: id, ok: true }); mudou = true
        } catch (e) {
            res.acoes.push({ acao: 'apagar (culto apagado)', liveId: id, ok: false, mensagem: e instanceof ErroYoutube ? e.message : 'Não consegui apagar a live.' })
            if (e instanceof ErroYoutube && (e.codigo === 'quota' || e.codigo === 'sem-autorizacao')) parar = true
        }
    }
    for (const a of acoes) {
        if (parar) break
        try {
            const m = await executar(a)
            res.acoes.push({ acao: a.acao, eventoId: a.eventoId, liveId: m.liveId ?? ('liveId' in a ? a.liveId : undefined), ok: true, mensagem: m.aviso })
            if (a.acao !== 'capa') mudou = true
        } catch (e) {
            const msg = e instanceof ErroYoutube ? e.message : 'Não foi possível fazer este passo.'
            res.acoes.push({ acao: a.acao, eventoId: a.eventoId, liveId: 'liveId' in a ? a.liveId : undefined, ok: false, mensagem: msg })
            if (e instanceof ErroYoutube && (e.codigo === 'quota' || e.codigo === 'sem-autorizacao' || e.codigo === 'nao-ligado')) parar = true
            if (!(e instanceof ErroYoutube)) console.error('[YOUTUBE] Passo das lives falhou:', a.acao, e instanceof Error ? e.message : e)
        }
    }

    async function executar(a: AcaoLive): Promise<{ liveId?: string; aviso?: string }> {
        const c = porId.get(a.eventoId)!
        if (a.acao === 'limpar') { await prisma.evento.updateMany({ where: { id: a.eventoId, tenant_id: tenantId }, data: { youtube_live_id: null, youtube_live_criada_em: null } }); return {} }
        if (a.acao === 'apagar') {
            await apagarLiveYoutube(ctx!, a.liveId)
            await prisma.evento.updateMany({ where: { id: a.eventoId, tenant_id: tenantId }, data: { youtube_live_id: null, youtube_live_criada_em: null } })
            await registar(tenantId, { eventoId: a.eventoId, liveId: a.liveId, liveTitulo: c.titulo || c.nome, tituloAplicado: null, estado: 'agendada', origem, por, ok: true, mensagem: 'Live apagada: o culto deixou de ser transmitido.' })
            return {}
        }
        if (a.acao === 'adotar') {
            await prisma.evento.updateMany({ where: { id: a.eventoId, tenant_id: tenantId }, data: { youtube_live_id: a.liveId, youtube_live_criada_em: new Date(agoraMs) } })
            await aplicarLive(tenantId, a.eventoId, 'agendada', { origem, por }, { ...dep, ctx }, { descricao: await descricaoDoEvento(a.eventoId) })
            return {}
        }
        if (a.acao === 'capa') { await aplicarLive(tenantId, a.eventoId, 'agendada', { origem, por }, { ...dep, ctx }, { descricao: await descricaoDoEvento(a.eventoId) }); return {} }
        if (a.acao === 'atualizar') {
            const descricao = await descricaoDoEvento(a.eventoId)
            if (a.motivo === 'hora') await atualizarLiveYoutube(ctx!, a.liveId, { titulo: c.titulo, descricao, inicioMs: instanteDeLisboa(c.data) })
            await aplicarLive(tenantId, a.eventoId, 'agendada', { origem, por }, { ...dep, ctx }, { descricao })
            return {}
        }
        // criar: primeiro reserva o culto (se outra passagem chegar ao mesmo tempo, só uma cria), depois cria no YouTube
        const reservado = await prisma.evento.updateMany({
            where: { id: a.eventoId, tenant_id: tenantId, youtube_live_id: c.liveId },
            data: { youtube_live_id: MARCA_A_CRIAR, youtube_live_criada_em: new Date(agoraMs) },
        })
        if (reservado.count === 0) return { aviso: 'outra passagem já está a tratar deste culto' }
        let id: string
        const descricao = await descricaoDoEvento(a.eventoId)
        try {
            id = (await criarLiveYoutube(ctx!, { titulo: c.titulo, descricao, inicioMs: instanteDeLisboa(c.data) })).id
        } catch (e) {
            await prisma.evento.updateMany({ where: { id: a.eventoId, tenant_id: tenantId, youtube_live_id: MARCA_A_CRIAR }, data: { youtube_live_id: null, youtube_live_criada_em: null } })
            throw e
        }
        await prisma.evento.updateMany({ where: { id: a.eventoId, tenant_id: tenantId }, data: { youtube_live_id: id, youtube_live_criada_em: new Date(agoraMs) } })
        // capa "agendada", título, descrição, categoria e idioma (se a capa falhar, o registo fica com erro e a próxima passagem repete)
        await aplicarLive(tenantId, a.eventoId, 'agendada', { origem, por }, { ...dep, ctx }, { descricao, categoriaId: CATEGORIA_ONG, idioma: IDIOMA })
        return { liveId: id }
    }

    // ---- 2.ª fase (LA4): só a próxima live fica ligada à chave ----
    if (igreja.streamId && !parar) {
        try {
            const depois = await prisma.evento.findMany({ where: { tenant_id: tenantId, youtube_live_id: { not: null }, data: { gte: new Date(agoraEscrito - 86400000) } }, select: { youtube_live_id: true }, take: 200 })
            const nossas = new Set(depois.map((e) => e.youtube_live_id).filter((x): x is string => !!x && x !== MARCA_A_CRIAR))
            const atuais = mudou ? await listarLives(ctx) : lives
            for (const p of planearLigacao(atuais.filter((l) => nossas.has(l.id)), igreja.streamId, agoraMs)) {
                try {
                    await ligarALiveAChave(ctx, p.liveId, p.acao === 'ligar' ? p.streamId : null)
                    res.acoes.push({ acao: p.acao === 'ligar' ? 'ligar à chave' : 'desligar da chave', liveId: p.liveId, ok: true })
                } catch (e) {
                    res.acoes.push({ acao: p.acao === 'ligar' ? 'ligar à chave' : 'desligar da chave', liveId: p.liveId, ok: false, mensagem: e instanceof ErroYoutube ? e.message : 'Não consegui ligar à chave.' })
                }
            }
        } catch (e) { res.avisos.push(e instanceof ErroYoutube ? e.message : 'Não consegui ligar a live à chave.') }
    }
    return res
}

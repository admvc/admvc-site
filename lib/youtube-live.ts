// Capas e títulos das lives do YouTube ligados à Agenda: ver a live do culto, aplicar a capa do estado, registar, e o passo
// automático (Em direto / Arquivo) para o cron. Fala com o Google só através de lib/youtube.ts (transporte injetável).
import prisma from '@/lib/prisma'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { normalizarReceita, quandoDoEvento, type Receita } from '@/lib/divulgacao-kit'
import {
    ErroYoutube, MENSAGEM_NAO_LIGADO, TOLERANCIA_MIN, atualizarTextos, contextoYoutube, definirCapa, instanteDeLisboa, listarLives, ligarLiveAoCulto,
    type ContextoYoutube, type LiveYoutube,
} from '@/lib/youtube'
import { simuladoAtivo, transporteSimulado } from '@/lib/youtube-simulado'
import {
    ESTADOS_CAPA, categoriaDaCapa, coresDaCapa, dataDoArquivo, estadoSugerido, lisboaEscrita, pedidoIgual, rodapeAgendada, tituloDaLive, type DadosCapa, type EstadoCapa,
} from '@/lib/youtube-capa-dados'

/** O contexto do portal: as credenciais do ambiente (ou o YouTube falso em desenvolvimento com YOUTUBE_SIMULADO=1). */
export function contextoDoPortal(): ContextoYoutube | null {
    if (simuladoAtivo()) return contextoYoutube({ env: { YOUTUBE_CLIENT_ID: 'simulado', YOUTUBE_CLIENT_SECRET: 'simulado', YOUTUBE_REFRESH_TOKEN: 'simulado' }, transporte: transporteSimulado() })
    return contextoYoutube()
}

export type Dependencias = {
    ctx?: ContextoYoutube | null
    agora?: () => number
    capa?: (d: DadosCapa) => Promise<Uint8Array>
}

// ---- dados do culto ---------------------------------------------------------------------------------------------------------

export type DadosDoCulto = {
    id: number; nome: string; data: Date; tipo: string
    tema: string; preletor: string; paletaDoKit: string | null
    liveId: string | null                 // Evento.youtube_live_id: a live que o portal criou para este culto
    foto: DadosCapa['foto']
    kit?: Receita | null                  // a receita do kit (a guardada, ou a que se está a mexer na pré-visualização)
    cultoTxt?: string                     // a linha pequena da capa e o "culto" do título: o subtítulo escrito, senão o nome do culto
}

/**
 * O culto com o que a Divulgação já sabe, já com a edição da capa do YouTube (kit.capaYt): título grande (a edição, senão o tema do kit
 * ou do sermão), preletor, subtítulo e foto (a horizontal, senão a vertical; "sem foto" tira-a). `kitNovo` = uma receita ainda por
 * guardar (a pré-visualização), no lugar da guardada.
 */
export async function dadosDoCulto(tenantId: number, eventoId: number, kitNovo?: Receita): Promise<DadosDoCulto | null> {
    const e = await prisma.evento.findFirst({
        where: { id: eventoId, tenant_id: tenantId },
        select: {
            id: true, nome: true, data: true, tipo: true, youtube_live_id: true,
            kitDivulgacao: { select: { receita: true } },
            sermoes: { orderBy: { created_at: 'desc' }, take: 1, select: { titulo: true, pregador: { select: { first_name: true, last_name: true } } } },
        },
    })
    if (!e) return null
    const kit = kitNovo ?? (e.kitDivulgacao ? normalizarReceita(e.kitDivulgacao.receita) : null)
    const sermao = e.sermoes[0]
    const capa = kit?.capaYt
    const tema = capa?.titulo || kit?.tema || sermao?.titulo || ''
    const preletor = capa?.preletor || kit?.preletor || (sermao ? `${sermao.pregador.first_name} ${sermao.pregador.last_name}`.trim() : '')
    const f = kit && capa?.foto !== 'sem' ? (kit.fotoH?.recorte ? kit.fotoH : kit.fotoV?.recorte ? kit.fotoV : kit.fotoH ?? kit.fotoV) : null
    return {
        id: e.id, nome: e.nome, data: e.data, tipo: e.tipo, tema, preletor,
        liveId: e.youtube_live_id && e.youtube_live_id !== 'a-criar' ? e.youtube_live_id : null,
        paletaDoKit: kit && kit.paleta !== 'preto-laranja' ? kit.paleta : null,   // a paleta de origem não conta: é a que ninguém escolheu
        foto: f && f.w && f.h ? { url: f.url, w: f.w, h: f.h, recorte: !!f.recorte } : null,
        kit, cultoTxt: capa?.subtitulo || e.nome,
    }
}

/** Os dados da capa de um estado: o padrão escolhido e a edição do kit (sem escolha: igual às artes do culto). */
export function dadosDaCapa(c: DadosDoCulto, estado: EstadoCapa, hojeMs: number): DadosCapa {
    const kit = c.kit ?? normalizarReceita({})   // sem kit guardado: as artes por omissão (e a capa igual a elas)
    const capa = kit.capaYt
    const padrao = capa?.padrao ?? 'igual'
    const categoria = categoriaDaCapa(c.nome, c.tipo, c.paletaDoKit)
    const rodape = estado === 'arquivo' ? dataDoArquivo(c.data) : estado === 'agendada' ? (capa.quando ? capa.quando.toUpperCase() : rodapeAgendada(c.data, hojeMs)) : ''
    const reserva = estado === 'reserva'
    const base: DadosCapa = {
        estado, categoria, titulo: reserva ? 'Culto *em direto*' : c.tema || c.nome, culto: reserva ? '' : c.cultoTxt ?? c.nome, preletor: reserva ? '' : c.preletor, rodape,
        foto: reserva ? null : c.foto, padrao,
        cores: coresDaCapa(padrao, categoria, capa.paleta),
        fotoLado: capa.foto === 'esquerda' ? 'esquerda' : 'direita',
        fundo: capa.fundo !== 'cores' && kit.fundo ? kit.fundo : null,
    }
    if (padrao === 'igual') base.igual = pedidoIgual(kit, capa, { nome: c.nome, data: c.data, tema: c.tema }, estado, rodape)
    return base
}

export const tituloDoEstado = (c: DadosDoCulto, estado: EstadoCapa) => tituloDaLive(estado, { tema: c.tema, culto: c.cultoTxt ?? c.nome, preletor: c.preletor, data: c.data })

// ---- ver ---------------------------------------------------------------------------------------------------------------------

export type LiveVista = { id: string; titulo: string; estado: 'agendada' | 'direto' | 'terminada'; quando: string; cultoId: number | null; cultoNome: string | null }

export type RespostaVer =
    | { ligado: false; mensagem: string }
    | {
        ligado: true
        culto: { id: number; nome: string; data: string }
        live: LiveVista | null
        lives: LiveVista[]                       // as agendadas/ativas (e as terminadas há pouco) do canal, cada uma ligada ao seu culto
        estadoSugerido: EstadoCapa
        titulos: Record<EstadoCapa, string>
        aviso: string | null                     // ex.: "Sem live à hora do culto"
        toleranciaMin: number
    }

/** Liga cada live ao culto da Agenda mais próximo da hora dela (dentro da tolerância); um culto fica com a live mais próxima. */
export function ligarLivesAosCultos(lives: LiveYoutube[], cultos: { id: number; nome: string; data: Date }[], toleranciaMin = TOLERANCIA_MIN): Map<string, { id: number; nome: string }> {
    const melhor = new Map<string, { id: number; nome: string; dif: number }>()
    for (const c of cultos) {
        const lig = ligarLiveAoCulto(lives, c.data, { estados: ['agendada', 'direto', 'terminada'], toleranciaMin })
        if (!lig) continue
        const dif = Math.abs(lig.diferencaMin), atual = melhor.get(lig.live.id)
        if (!atual || dif < atual.dif) melhor.set(lig.live.id, { id: c.id, nome: c.nome, dif })
    }
    return new Map([...melhor].map(([liveId, c]) => [liveId, { id: c.id, nome: c.nome }]))
}

const vista = (l: LiveYoutube, c?: { id: number; nome: string }): LiveVista => ({
    id: l.id, titulo: l.titulo, estado: l.estado, quando: lisboaEscrita((l.inicioReal ?? l.inicioAgendado) ?? 0),
    cultoId: c?.id ?? null, cultoNome: c?.nome ?? null,
})

/** Os cultos de ontem a daqui a 21 dias (para ligar as lives). */
async function cultosProximos(tenantId: number, hoje: Date) {
    return prisma.evento.findMany({
        where: { tenant_id: tenantId, data: { gte: new Date(hoje.getTime() - 86400000), lt: new Date(hoje.getTime() + 22 * 86400000) } },
        orderBy: { data: 'asc' }, take: 60, select: { id: true, nome: true, data: true },
    })
}

export async function verLive(tenantId: number, eventoId: number, dep: Dependencias = {}): Promise<RespostaVer> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) return { ligado: false, mensagem: MENSAGEM_NAO_LIGADO }
    const culto = await dadosDoCulto(tenantId, eventoId)
    if (!culto) throw new ErroYoutube('outro', 'Culto não encontrado.')
    const agora = (dep.agora ?? Date.now)()
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const [todas, cultos] = await Promise.all([listarLives(ctx), cultosProximos(tenantId, hoje)])
    const cultosComEste = cultos.some((c) => c.id === culto.id) ? cultos : [...cultos, { id: culto.id, nome: culto.nome, data: culto.data }]
    const ligacoes = ligarLivesAosCultos(todas, cultosComEste)
    const pelaId = culto.liveId ? todas.find((l) => l.id === culto.liveId) : undefined
    const ligada = pelaId ? { live: pelaId } : ligarLiveAoCulto(todas, culto.data, { estados: ['agendada', 'direto', 'terminada'] })
    const live = ligada ? vista(ligada.live, { id: culto.id, nome: culto.nome }) : null
    const titulos = Object.fromEntries(ESTADOS_CAPA.map((e) => [e, tituloDoEstado(culto, e)])) as Record<EstadoCapa, string>
    return {
        ligado: true,
        culto: { id: culto.id, nome: culto.nome, data: culto.data.toISOString() },
        live,
        // a lista mostra o que está por fazer: agendadas e em direto (as terminadas só quando é a deste culto)
        lives: todas.filter((l) => l.estado !== 'terminada' || l.id === ligada?.live.id).map((l) => vista(l, ligacoes.get(l.id))),
        estadoSugerido: estadoSugerido(ligada?.live.estado ?? null, instanteDeLisboa(culto.data), agora),
        titulos,
        aviso: live ? null : mensagemSemLive(culto.data),
        toleranciaMin: TOLERANCIA_MIN,
    }
}

export function mensagemSemLive(data: Date): string {
    const q = quandoDoEvento(data)
    return `Não encontrei nenhuma live do YouTube para ${q.quando} às ${q.hora} (com até ${TOLERANCIA_MIN} minutos de diferença). Agende-a no YouTube à hora do culto e volte a tentar.`
}

// ---- aplicar -----------------------------------------------------------------------------------------------------------------

export type Origem = 'portal' | 'holyrics' | 'cron'
export type ResultadoAplicar = { live: LiveVista; titulo: string; estado: EstadoCapa; capaAplicada: boolean; aviso: string | null }

export async function registar(tenantId: number, d: { eventoId: number | null; liveId: string; liveTitulo: string; tituloAplicado: string | null; estado: EstadoCapa; origem: Origem; por: string | null; ok: boolean; mensagem: string | null }) {
    try {
        await prisma.youtubeLiveRegisto.create({
            data: {
                tenant_id: tenantId, evento_id: d.eventoId, broadcast_id: d.liveId, live_titulo: d.liveTitulo.slice(0, 200), titulo_aplicado: d.tituloAplicado?.slice(0, 200) ?? null,
                estado: d.estado, origem: d.origem, por: d.por?.slice(0, 80) ?? null, resultado: d.ok ? 'ok' : 'erro', mensagem: d.mensagem?.slice(0, 400) ?? null,
            },
        })
    } catch (e) { console.error('[YOUTUBE] Não consegui registar a aplicação:', e instanceof Error ? e.message : e) }
}

/**
 * Aplica o estado à live do culto: gera a capa, thumbnails.set e videos.update. Regista sempre (também os erros).
 * Se só a capa falhar por o canal não estar verificado, o título troca-se na mesma e devolve-se um aviso.
 * Lança ErroYoutube (mensagem em português) quando não dá.
 */
export async function aplicarLive(tenantId: number, eventoId: number, estado: EstadoCapa, quem: { origem: Origem; por: string | null }, dep: Dependencias = {}, extra: { descricao?: string; categoriaId?: string; idioma?: string } = {}): Promise<ResultadoAplicar> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) throw new ErroYoutube('nao-ligado', MENSAGEM_NAO_LIGADO)
    const culto = await dadosDoCulto(tenantId, eventoId)
    if (!culto) throw new ErroYoutube('outro', 'Culto não encontrado.')
    let liveId = '', liveTitulo = '', titulo: string | null = null
    try {
        const todas = await listarLives(ctx)
        // a live que o portal criou para o culto (youtube_live_id) vem primeiro; só sem ela se procura pela data e hora
        const pelaId = culto.liveId ? todas.find((l) => l.id === culto.liveId) : undefined
        const ligada: { live: LiveYoutube } | null = pelaId ? { live: pelaId } : ligarLiveAoCulto(todas, culto.data, { estados: ['agendada', 'direto', 'terminada'] })
        if (!ligada) throw new ErroYoutube('sem-live', mensagemSemLive(culto.data))
        liveId = ligada.live.id; liveTitulo = ligada.live.titulo
        const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
        const png = await (dep.capa ?? (await import('@/lib/youtube-capa')).capaLive)(dadosDaCapa(culto, estado, hoje))
        let aviso: string | null = null, capaAplicada = true
        try { await definirCapa(ctx, liveId, png) } catch (e) {
            if (e instanceof ErroYoutube && e.codigo === 'sem-verificacao') { aviso = `Título trocado, mas a capa não: ${e.message}`; capaAplicada = false } else throw e
        }
        titulo = (await atualizarTextos(ctx, liveId, { titulo: tituloDoEstado(culto, estado), ...extra })).titulo
        await registar(tenantId, { eventoId, liveId, liveTitulo, tituloAplicado: titulo, estado, origem: quem.origem, por: quem.por, ok: true, mensagem: aviso })
        return { live: vista(ligada.live, { id: culto.id, nome: culto.nome }), titulo, estado, capaAplicada, aviso }
    } catch (e) {
        const mensagem = e instanceof ErroYoutube ? e.message : 'Não foi possível desenhar ou enviar a capa.'
        await registar(tenantId, { eventoId, liveId: liveId || '-', liveTitulo, tituloAplicado: titulo, estado, origem: quem.origem, por: quem.por, ok: false, mensagem })
        throw e instanceof ErroYoutube ? e : new ErroYoutube('outro', mensagem)
    }
}

// ---- automático (cron) -------------------------------------------------------------------------------------------------------

export type PassoAutomatico = { eventoId: number; liveId: string; estado: EstadoCapa; resultado: 'aplicada' | 'erro'; mensagem?: string }

/**
 * Para o cron do dia do culto: as lives que arrancaram passam a "Em direto"; as que acabaram, a "Arquivo". Cada live/estado só
 * uma vez (consulta o registo). Sem YouTube ligado ou sem cultos hoje, não faz nada (e não gasta quota).
 */
export async function passoAutomatico(tenantId: number, dep: Dependencias = {}): Promise<{ ligado: boolean; cultos: number; passos: PassoAutomatico[] }> {
    const ctx = dep.ctx === undefined ? contextoDoPortal() : dep.ctx
    if (!ctx) return { ligado: false, cultos: 0, passos: [] }
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const cultos = await prisma.evento.findMany({
        where: { tenant_id: tenantId, data: { gte: new Date(hoje.getTime() - 86400000 + 12 * 3600000), lt: new Date(hoje.getTime() + 86400000) } },
        orderBy: { data: 'asc' }, take: 20, select: { id: true, nome: true, data: true },
    })
    if (!cultos.length) return { ligado: true, cultos: 0, passos: [] }
    const lives = await listarLives(ctx)
    const passos: PassoAutomatico[] = []
    for (const c of cultos) {
        const ligada = ligarLiveAoCulto(lives, c.data, { estados: ['direto', 'terminada'] })
        if (!ligada) continue
        const estado: EstadoCapa = ligada.live.estado === 'direto' ? 'direto' : 'arquivo'
        const feito = await prisma.youtubeLiveRegisto.findFirst({ where: { tenant_id: tenantId, broadcast_id: ligada.live.id, estado, resultado: 'ok' }, select: { id: true } })
        if (feito) continue
        try {
            await aplicarLive(tenantId, c.id, estado, { origem: 'cron', por: 'Automático' }, dep)
            passos.push({ eventoId: c.id, liveId: ligada.live.id, estado, resultado: 'aplicada' })
        } catch (e) {
            passos.push({ eventoId: c.id, liveId: ligada.live.id, estado, resultado: 'erro', mensagem: e instanceof Error ? e.message : 'erro' })
        }
    }
    return { ligado: true, cultos: cultos.length, passos }
}

/** Os últimos registos (para o ecrã). */
export async function ultimosRegistos(tenantId: number, eventoId: number, n = 6) {
    const r = await prisma.youtubeLiveRegisto.findMany({ where: { tenant_id: tenantId, evento_id: eventoId }, orderBy: { criado_em: 'desc' }, take: n })
    return r.map((x) => ({ id: x.id, quando: x.criado_em.toISOString(), estado: x.estado, origem: x.origem, por: x.por, ok: x.resultado === 'ok', titulo: x.titulo_aplicado, mensagem: x.mensagem, live: x.live_titulo }))
}

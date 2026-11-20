// YouTube Data API v3 para as lives da igreja: achar a live agendada/ativa, ligá-la ao culto da Agenda, trocar a capa
// (thumbnails.set) e o título/descrição (videos.update). O transporte (fetch) é injetável: os testes usam um falso e NUNCA
// se fala com o Google a não ser com credenciais reais nas variáveis de ambiente.
//
// Variáveis de ambiente (só na Vercel / no .env local; o refresh token NUNCA entra em ficheiros do repo nem em logs):
//   YOUTUBE_CLIENT_ID · YOUTUBE_CLIENT_SECRET · YOUTUBE_REFRESH_TOKEN   (âmbito youtube.force-ssl, conta dona do canal)
// Sem as três, o estado é "não ligado" (youtubeLigado() = false) e nada rebenta.

export type Transporte = (url: string, init?: RequestInit) => Promise<Response>

export type CodigoErroYoutube = 'nao-ligado' | 'sem-autorizacao' | 'sem-live' | 'sem-verificacao' | 'quota' | 'imagem' | 'video' | 'rede' | 'outro'

/** Erro com mensagem já em português, pronta a mostrar a quem carregou no botão. */
export class ErroYoutube extends Error {
    constructor(public codigo: CodigoErroYoutube, mensagem: string) { super(mensagem); this.name = 'ErroYoutube' }
}

export type CredenciaisYoutube = { clientId: string; clientSecret: string; refreshToken: string }
export type ContextoYoutube = { cred: CredenciaisYoutube; transporte: Transporte; agora: () => number }

/** As credenciais do ambiente, ou null se faltar alguma (= "não ligado"). */
export function lerCredenciais(env: Record<string, string | undefined> = process.env): CredenciaisYoutube | null {
    const clientId = env.YOUTUBE_CLIENT_ID?.trim(), clientSecret = env.YOUTUBE_CLIENT_SECRET?.trim(), refreshToken = env.YOUTUBE_REFRESH_TOKEN?.trim()
    return clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : null
}

export const youtubeLigado = (env: Record<string, string | undefined> = process.env) => lerCredenciais(env) !== null

export const MENSAGEM_NAO_LIGADO = 'O YouTube ainda não está ligado ao portal (faltam as credenciais do canal).'

/** O contexto para falar com o YouTube; null quando não há credenciais. */
export function contextoYoutube(opcoes: { env?: Record<string, string | undefined>; transporte?: Transporte; agora?: () => number } = {}): ContextoYoutube | null {
    const cred = lerCredenciais(opcoes.env ?? process.env)
    if (!cred) return null
    return { cred, transporte: opcoes.transporte ?? ((url, init) => fetch(url, init)), agora: opcoes.agora ?? Date.now }
}

// ---- erros ------------------------------------------------------------------------------------------------------------------

type CorpoErro = { error?: { code?: number; message?: string; errors?: { reason?: string; message?: string }[] } | string; error_description?: string }

async function lerCorpo(r: Response): Promise<CorpoErro> {
    try { return (await r.json()) as CorpoErro } catch { return {} }
}

/** Traduz um erro do Google para português (sem repetir o texto técnico dele, que pode ter dados da conta). */
export function traduzirErro(status: number, corpo: CorpoErro, passo: 'token' | 'lista' | 'capa' | 'video' | 'criar'): ErroYoutube {
    const razoes = typeof corpo.error === 'object' ? (corpo.error?.errors ?? []).map((e) => e.reason ?? '') : []
    const msg = typeof corpo.error === 'object' ? (corpo.error?.message ?? '') : ''
    const tem = (...r: string[]) => razoes.some((x) => r.includes(x))
    if (passo === 'token' || corpo.error === 'invalid_grant' || tem('authError') || status === 401) {
        return new ErroYoutube('sem-autorizacao', 'O portal já não tem autorização do YouTube (a ligação caducou ou foi retirada). O administrador tem de voltar a autorizar a conta do canal.')
    }
    if (tem('quotaExceeded', 'rateLimitExceeded', 'dailyLimitExceeded') || status === 429) {
        return new ErroYoutube('quota', 'O YouTube já não aceita mais pedidos hoje (quota diária esgotada). Tente amanhã ou faça a troca à mão no YouTube Studio.')
    }
    if (tem('liveStreamingNotEnabled', 'insufficientLivePermissions')) {
        return new ErroYoutube('sem-verificacao', 'O canal ainda não tem as transmissões em direto ativadas (youtube.com/features; o YouTube pode demorar até 24 horas a ativá-las).')
    }
    if (passo === 'capa' && (tem('forbidden') || status === 403)) {
        if (/thumbnail|miniatura/i.test(msg) || tem('forbidden')) {
            return new ErroYoutube('sem-verificacao', 'O canal ainda não pode pôr capas personalizadas: falta verificá-lo por telefone no YouTube (youtube.com/verify).')
        }
    }
    if (passo === 'capa' && (tem('invalidImage', 'mediaBodyRequired', 'imageTooLarge', 'badContent') || status === 400)) {
        return new ErroYoutube('imagem', 'O YouTube não aceitou a imagem da capa (tem de ser PNG ou JPEG até 2 MB).')
    }
    if (tem('videoNotFound', 'liveBroadcastNotFound', 'notFound') || status === 404) {
        return new ErroYoutube('video', 'Essa live já não existe no YouTube (foi apagada ou mudou). Volte a procurar.')
    }
    if (status === 403) return new ErroYoutube('sem-autorizacao', 'O YouTube recusou o pedido: a conta autorizada não tem permissão neste canal.')
    return new ErroYoutube('outro', `O YouTube respondeu com um erro (${status || 'sem código'}). Tente daqui a pouco.`)
}

async function pedir(ctx: ContextoYoutube, url: string, init: RequestInit, passo: 'lista' | 'capa' | 'video' | 'criar', token: string): Promise<Response> {
    let r: Response
    try {
        r = await ctx.transporte(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` } })
    } catch {
        throw new ErroYoutube('rede', 'Não consegui falar com o YouTube (sem rede?). Tente daqui a pouco.')
    }
    // 5xx do Google costuma ser passageiro: as leituras repetem-se uma vez (as escritas não, para não criar em duplicado)
    if (r.status >= 500 && (init.method ?? 'GET') === 'GET') {
        await new Promise((ok) => setTimeout(ok, 1500))
        try { r = await ctx.transporte(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` } }) } catch { /* fica a resposta anterior */ }
    }
    if (!r.ok) {
        const corpo = await lerCorpo(r)
        const razoes = typeof corpo.error === 'object' ? (corpo.error?.errors ?? []).map((e) => e.reason ?? '').filter(Boolean).join(',') : String(corpo.error ?? '')
        const mensagem = typeof corpo.error === 'object' ? (corpo.error?.message ?? '') : ''
        // fica nos registos da Vercel (sem o token): que pedido, que código e que motivo deu o Google
        console.error(`[youtube] ${init.method ?? 'GET'} ${url.replace(API, '').split('?')[0]} (${passo}) → ${r.status} ${razoes} ${mensagem}`.slice(0, 500))
        const e = traduzirErro(r.status, corpo, passo)
        if (e.codigo === 'outro' && razoes) e.message = `${e.message} (motivo: ${razoes})`
        throw e
    }
    return r
}

// ---- token de acesso ------------------------------------------------------------------------------------------------------

let guardado: { chave: string; token: string; expira: number } | null = null

/** Pede (ou reaproveita, até 1 min antes de caducar) um access token a partir do refresh token. */
export async function obterAccessToken(ctx: ContextoYoutube): Promise<string> {
    const chave = `${ctx.cred.clientId}:${ctx.cred.refreshToken.slice(-8)}`
    if (guardado && guardado.chave === chave && guardado.expira - 60000 > ctx.agora()) return guardado.token
    let r: Response
    try {
        r = await ctx.transporte('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: ctx.cred.clientId, client_secret: ctx.cred.clientSecret, refresh_token: ctx.cred.refreshToken, grant_type: 'refresh_token' }).toString(),
        })
    } catch {
        throw new ErroYoutube('rede', 'Não consegui falar com o YouTube (sem rede?). Tente daqui a pouco.')
    }
    if (!r.ok) throw traduzirErro(r.status, await lerCorpo(r), 'token')
    const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number }
    if (!j.access_token) throw traduzirErro(401, {}, 'token')
    guardado = { chave, token: j.access_token, expira: ctx.agora() + (j.expires_in ?? 3600) * 1000 }
    return j.access_token
}

/** Só para os testes. */
export const esquecerToken = () => { guardado = null }

// ---- lives ------------------------------------------------------------------------------------------------------------------

export type EstadoLiveYoutube = 'agendada' | 'direto' | 'terminada'

export type LiveYoutube = {
    id: string                       // id da live = id do vídeo
    titulo: string
    estado: EstadoLiveYoutube        // agendada (created/ready/testing…), direto (live), terminada (complete)
    inicioAgendado: number | null    // instante real (ms)
    inicioReal: number | null
    fim: number | null
    privacidade: string              // public | unlisted | private
    ciclo?: string                   // lifeCycleStatus do YouTube (created, ready, live, complete…)
    streamId?: string | null         // a chave (liveStream) a que está ligada, se estiver
}

type Transmissao = {
    id: string
    snippet?: { title?: string; scheduledStartTime?: string; actualStartTime?: string; actualEndTime?: string }
    status?: { lifeCycleStatus?: string; privacyStatus?: string }
    contentDetails?: { boundStreamId?: string }
}

const ms = (s?: string) => { const t = s ? Date.parse(s) : NaN; return Number.isFinite(t) ? t : null }

export function estadoDaTransmissao(ciclo: string | undefined): EstadoLiveYoutube | null {
    if (ciclo === 'live' || ciclo === 'liveStarting') return 'direto'
    if (ciclo === 'complete' || ciclo === 'completeStarting') return 'terminada'
    if (ciclo === 'created' || ciclo === 'ready' || ciclo === 'testing' || ciclo === 'testStarting') return 'agendada'
    return null   // revoked e desconhecidos: ignorados
}

/**
 * As lives do canal (liveBroadcasts.list com mine=true): agendadas, em direto e as terminadas há pouco (para a capa de arquivo).
 * Uma só chamada (1 unidade de quota); os estados filtram-se aqui.
 */
export async function listarLives(ctx: ContextoYoutube): Promise<LiveYoutube[]> {
    const token = await obterAccessToken(ctx)
    const r = await pedir(ctx, 'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,status,contentDetails&mine=true&maxResults=50', { method: 'GET' }, 'lista', token)
    const j = (await r.json()) as { items?: Transmissao[] }
    const lives: LiveYoutube[] = []
    for (const t of j.items ?? []) {
        const estado = estadoDaTransmissao(t.status?.lifeCycleStatus)
        if (!estado || !t.id) continue
        lives.push({
            id: t.id, titulo: t.snippet?.title ?? '', estado, privacidade: t.status?.privacyStatus ?? 'public',
            ciclo: t.status?.lifeCycleStatus, streamId: t.contentDetails?.boundStreamId ?? null,
            inicioAgendado: ms(t.snippet?.scheduledStartTime), inicioReal: ms(t.snippet?.actualStartTime), fim: ms(t.snippet?.actualEndTime),
        })
    }
    return lives
}

// ---- ligar a live ao culto ------------------------------------------------------------------------------------------------

/** Tolerância por omissão entre a hora do culto e a da live: 90 minutos (cobre "agendei às 9h45 para o culto das 10h"). */
export const TOLERANCIA_MIN = 90

/** O instante real (ms) de uma hora de Lisboa "escrita" em UTC (como o portal guarda os cultos). Trata o horário de verão. */
export function instanteDeLisboa(escritaEmUtc: Date): number {
    const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Lisbon', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const desvio = (instante: number) => {
        const p = Object.fromEntries(fmt.formatToParts(new Date(instante)).map((x) => [x.type, x.value]))
        return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instante
    }
    const alvo = escritaEmUtc.getTime()
    let t = alvo - desvio(alvo)
    t = alvo - desvio(t)
    return t
}

/** O instante de referência de uma live para a comparação com o culto: o real se já arrancou, senão o agendado. */
const referenciaDaLive = (l: LiveYoutube) => l.inicioReal ?? l.inicioAgendado

export type LigacaoLive = { live: LiveYoutube; diferencaMin: number }

/**
 * A live que corresponde ao culto: a mais próxima da hora do culto, até `toleranciaMin` minutos de diferença.
 * Só aceita lives dos estados pedidos (por omissão agendadas e em direto; para o arquivo, as terminadas).
 */
export function ligarLiveAoCulto(lives: LiveYoutube[], cultoEscritoEmUtc: Date, opcoes: { estados?: EstadoLiveYoutube[]; toleranciaMin?: number } = {}): LigacaoLive | null {
    const estados = opcoes.estados ?? ['agendada', 'direto']
    const tol = (opcoes.toleranciaMin ?? TOLERANCIA_MIN) * 60000
    const alvo = instanteDeLisboa(cultoEscritoEmUtc)
    let melhor: LigacaoLive | null = null
    let melhorDif = Infinity
    for (const l of lives) {
        const ref = referenciaDaLive(l)
        if (!estados.includes(l.estado) || ref === null) continue
        const dif = Math.abs(ref - alvo)
        if (dif <= tol && dif < melhorDif) { melhor = { live: l, diferencaMin: Math.round((ref - alvo) / 60000) }; melhorDif = dif }
    }
    return melhor
}

// ---- capa e título --------------------------------------------------------------------------------------------------------

export const LIMITE_CAPA_BYTES = 2 * 1024 * 1024

/** PNG ou JPEG pelos primeiros bytes (não confia no que o chamador diz). */
export function tipoDaImagem(bytes: Uint8Array): 'image/png' | 'image/jpeg' | null {
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
    return null
}

/** thumbnails.set: a capa da live (PNG/JPEG até 2 MB). */
export async function definirCapa(ctx: ContextoYoutube, videoId: string, imagem: Uint8Array): Promise<void> {
    const tipo = tipoDaImagem(imagem)
    if (!tipo) throw new ErroYoutube('imagem', 'A capa não é PNG nem JPEG.')
    if (imagem.length > LIMITE_CAPA_BYTES) throw new ErroYoutube('imagem', 'A capa tem mais de 2 MB (o YouTube não a aceita).')
    const token = await obterAccessToken(ctx)
    await pedir(ctx, `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`,
        { method: 'POST', headers: { 'Content-Type': tipo, 'Content-Length': String(imagem.length) }, body: imagem as unknown as BodyInit }, 'capa', token)
}

type SnippetVideo = Record<string, unknown> & { title?: string; description?: string; categoryId?: string }

/** Campos do snippet que o videos.update aceita; os outros (só de leitura) não se reenviam. */
const CAMPOS_ESCRITA = ['title', 'description', 'tags', 'categoryId', 'defaultLanguage', 'defaultAudioLanguage'] as const

export const LIMITE_TITULO = 100
export const LIMITE_DESCRICAO = 5000

/** O YouTube não aceita < nem > no título/descrição e o título tem no máximo 100 caracteres. */
export const limparTitulo = (t: string) => t.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITE_TITULO).trim()
export const limparDescricao = (t: string) => t.replace(/[<>]/g, '').slice(0, LIMITE_DESCRICAO)

/**
 * videos.update: muda o título (e a descrição, se dada). LÊ ANTES o snippet e reenvia categoryId, etiquetas e o resto —
 * senão o YouTube apaga os campos que faltarem.
 */
export async function atualizarTextos(ctx: ContextoYoutube, videoId: string, novo: { titulo: string; descricao?: string; categoriaId?: string; idioma?: string }): Promise<{ titulo: string }> {
    const token = await obterAccessToken(ctx)
    const lido = await pedir(ctx, `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}`, { method: 'GET' }, 'video', token)
    const j = (await lido.json()) as { items?: { snippet?: SnippetVideo }[] }
    const atual = j.items?.[0]?.snippet
    if (!atual) throw new ErroYoutube('video', 'Essa live já não existe no YouTube (foi apagada ou mudou). Volte a procurar.')
    const snippet: Record<string, unknown> = {}
    for (const c of CAMPOS_ESCRITA) if (atual[c] !== undefined) snippet[c] = atual[c]
    const titulo = limparTitulo(novo.titulo)
    if (!titulo) throw new ErroYoutube('outro', 'O título ficaria vazio.')
    snippet.title = titulo
    if (novo.descricao !== undefined) snippet.description = limparDescricao(novo.descricao)
    if (novo.categoriaId) snippet.categoryId = novo.categoriaId
    if (novo.idioma) { snippet.defaultLanguage = novo.idioma; snippet.defaultAudioLanguage = novo.idioma }
    // categoryId é obrigatório no update: se o vídeo não a trouxe, usa "Pessoas e blogues"
    if (!snippet.categoryId) snippet.categoryId = '22'
    await pedir(ctx, 'https://www.googleapis.com/youtube/v3/videos?part=snippet',
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: videoId, snippet }) }, 'video', token)
    return { titulo }
}

// ---- criar e gerir lives (LA1, LA3, LA4) -----------------------------------------------------------------------------------

const API = 'https://www.googleapis.com/youtube/v3'
const JSON_H = { 'Content-Type': 'application/json' }

export type StreamYoutube = { id: string; titulo: string; reutilizavel: boolean }
/** O que se mostra no ecrã "Ligar o YoloBox". NUNCA se grava (nem na base nem em logs): lê-se do YouTube na hora. */
export type DadosDaChave = { servidor: string; chave: string }

export const TITULO_DA_CHAVE = 'ADMVC · YoloBox'

type CorpoStream = { id?: string; snippet?: { title?: string }; contentDetails?: { isReusable?: boolean }; cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } } }

/** As chaves (liveStreams) do canal, sem a chave em si. */
export async function listarStreams(ctx: ContextoYoutube): Promise<StreamYoutube[]> {
    const token = await obterAccessToken(ctx)
    const r = await pedir(ctx, `${API}/liveStreams?part=id,snippet,contentDetails&mine=true&maxResults=50`, { method: 'GET' }, 'lista', token)
    const j = (await r.json()) as { items?: CorpoStream[] }
    return (j.items ?? []).filter((s) => s.id).map((s) => ({ id: s.id!, titulo: s.snippet?.title ?? '', reutilizavel: s.contentDetails?.isReusable !== false }))
}

/** liveStreams.insert: a chave fixa (RTMP, resolução e fps variáveis, reutilizável). Devolve só o id. */
export async function criarStream(ctx: ContextoYoutube, titulo = TITULO_DA_CHAVE): Promise<{ id: string }> {
    const token = await obterAccessToken(ctx)
    const corpo = (resolution: string, frameRate: string) => ({
        method: 'POST', headers: JSON_H,
        body: JSON.stringify({ snippet: { title: titulo }, cdn: { ingestionType: 'rtmp', resolution, frameRate }, contentDetails: { isReusable: true } }),
    })
    const url = `${API}/liveStreams?part=snippet,cdn,contentDetails`
    let r: Response
    try {
        r = await pedir(ctx, url, corpo('variable', 'variable'), 'criar', token)
    } catch (e) {
        // o YouTube às vezes dá 500 com "variable": tenta-se uma vez com 1080p/30fps (o YoloBox manda 1080p30); um 500 não criou nada
        if (!(e instanceof ErroYoutube) || e.codigo !== 'outro' || !/\(5\d\d\)/.test(e.message)) throw e
        r = await pedir(ctx, url, corpo('1080p', '30fps'), 'criar', token)
    }
    const j = (await r.json()) as CorpoStream
    if (!j.id) throw new ErroYoutube('outro', 'O YouTube não devolveu a chave criada.')
    return { id: j.id }
}

/** O servidor e a chave de uma stream, lidos na hora (liveStreams.list part=cdn). null se a stream já não existe. */
export async function lerDadosDaChave(ctx: ContextoYoutube, streamId: string): Promise<DadosDaChave | null> {
    const token = await obterAccessToken(ctx)
    const r = await pedir(ctx, `${API}/liveStreams?part=id,cdn&id=${encodeURIComponent(streamId)}`, { method: 'GET' }, 'lista', token)
    const j = (await r.json()) as { items?: CorpoStream[] }
    const info = j.items?.[0]?.cdn?.ingestionInfo
    if (!info?.ingestionAddress || !info.streamName) return null
    return { servidor: info.ingestionAddress, chave: info.streamName }
}

export async function apagarStream(ctx: ContextoYoutube, streamId: string): Promise<void> {
    const token = await obterAccessToken(ctx)
    await pedir(ctx, `${API}/liveStreams?id=${encodeURIComponent(streamId)}`, { method: 'DELETE' }, 'video', token)
}

export type NovaLive = { titulo: string; descricao: string; inicioMs: number }

/** O corpo do liveBroadcasts.insert: pública, não é para crianças, Auto Start/Stop, DVR, latência normal, sem monitor. */
export function corpoDaLive(l: NovaLive) {
    return {
        snippet: { title: limparTitulo(l.titulo), description: limparDescricao(l.descricao), scheduledStartTime: new Date(l.inicioMs).toISOString() },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
        contentDetails: { enableAutoStart: true, enableAutoStop: true, enableDvr: true, latencyPreference: 'normal', monitorStream: { enableMonitorStream: false } },
    }
}

/** liveBroadcasts.insert. Devolve o id da live. */
export async function criarLiveYoutube(ctx: ContextoYoutube, l: NovaLive): Promise<{ id: string }> {
    const token = await obterAccessToken(ctx)
    const r = await pedir(ctx, `${API}/liveBroadcasts?part=snippet,status,contentDetails`, { method: 'POST', headers: JSON_H, body: JSON.stringify(corpoDaLive(l)) }, 'criar', token)
    const j = (await r.json()) as { id?: string }
    if (!j.id) throw new ErroYoutube('outro', 'O YouTube não devolveu a live criada.')
    return { id: j.id }
}

/** liveBroadcasts.update (só o snippet: título, descrição e hora; o resto fica como está). */
export async function atualizarLiveYoutube(ctx: ContextoYoutube, id: string, l: NovaLive): Promise<void> {
    const token = await obterAccessToken(ctx)
    const { snippet } = corpoDaLive(l)
    await pedir(ctx, `${API}/liveBroadcasts?part=snippet`, { method: 'PUT', headers: JSON_H, body: JSON.stringify({ id, snippet }) }, 'video', token)
}

/** liveBroadcasts.delete (só se a live ainda não começou: quem chama confirma o estado). */
export async function apagarLiveYoutube(ctx: ContextoYoutube, id: string): Promise<void> {
    const token = await obterAccessToken(ctx)
    await pedir(ctx, `${API}/liveBroadcasts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, 'video', token)
}

/** liveBroadcasts.bind: liga a live à chave; sem streamId, desliga. */
export async function ligarALiveAChave(ctx: ContextoYoutube, id: string, streamId: string | null): Promise<void> {
    const token = await obterAccessToken(ctx)
    const q = new URLSearchParams({ id, part: 'id,contentDetails' })
    if (streamId) q.set('streamId', streamId)
    await pedir(ctx, `${API}/liveBroadcasts/bind?${q.toString()}`, { method: 'POST' }, 'video', token)
}

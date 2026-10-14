// Falar com o Holyrics a partir do navegador. O Holyrics corre no computador da
// midia, na rede da igreja: o servidor da app nao chega la, o navegador sim.
// Usado pelo "Culto no Holyrics" (/midia/culto) e pelo "Alterar músicas".

export type MusicaParaHolyrics = { musicaId: string; titulo: string; artista: string | null; holyricsId: string | null }
export type EstadoNoHolyrics = 'enviada' | 'ja-estava' | 'nao-encontrada'
export type ResultadoMusica = { musicaId: string; titulo: string; estado: EstadoNoHolyrics }

type Resposta = { status?: string; error?: string; data?: unknown }
type MusicaHolyrics = { id: string | number; title: string; artist?: string }

/** O navegador nao chegou ao Holyrics (outra rede, Holyrics fechado ou pedido bloqueado). */
export class SemLigacaoHolyrics extends Error {}

// O Holyrics exige JSON (sem ele: 415) e responde bem ao pedido previo (OPTIONS) do
// navegador. `targetAddressSpace`: o Chrome deixa uma pagina https falar com um aparelho
// em http na rede local (pede autorizacao uma vez).
const OPCOES = (corpo: object) => ({
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), targetAddressSpace: 'local',
}) as RequestInit

export function clienteHolyrics(url: string, token: string) {
    const base = url.replace(/\/$/, '')
    return async function pedir(acao: string, corpo: object = {}): Promise<Resposta> {
        let r: Response
        try {
            r = await fetch(`${base}/api/${acao}?token=${encodeURIComponent(token)}`, OPCOES(corpo))
        } catch {
            throw new SemLigacaoHolyrics()
        }
        return r.json().catch(() => ({}))
    }
}

// "Grande É o Senhor!" e "grande e o senhor" sao a mesma musica
const normalizar = (t: string) =>
    t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/**
 * Junta as musicas a lista do Holyrics, pela ordem do culto:
 * - as que nao tem ligacao procuram-se pelo titulo (e guarda-se a ligacao com `ligar`);
 * - as que ja estao na lista do Holyrics nao se repetem (mesclar).
 */
export async function enviarParaHolyrics(
    url: string,
    token: string,
    musicas: MusicaParaHolyrics[],
    ligar: (pares: { musicaId: string; holyricsId: string }[]) => Promise<unknown>,
): Promise<ResultadoMusica[]> {
    const pedir = clienteHolyrics(url, token)

    const ids = new Map<string, string>()   // musicaId -> id no Holyrics
    const novas: { musicaId: string; holyricsId: string }[] = []
    for (const m of musicas) {
        if (m.holyricsId) { ids.set(m.musicaId, m.holyricsId); continue }
        if (ids.has(m.musicaId)) continue
        const j = await pedir('SearchSong', { text: m.titulo, title: true, limit: 20 })
        const lista: MusicaHolyrics[] = j.status === 'ok' && Array.isArray(j.data) ? j.data : []
        const iguais = lista.filter((x) => normalizar(x.title || '') === normalizar(m.titulo))
        const achada = iguais.find((x) => m.artista && x.artist && normalizar(x.artist) === normalizar(m.artista)) ?? iguais[0]
        if (achada) {
            ids.set(m.musicaId, String(achada.id))
            novas.push({ musicaId: m.musicaId, holyricsId: String(achada.id) })
        }
    }
    // So serve para a proxima vez: se falhar, o envio continua
    if (novas.length) await ligar(novas).catch(() => {})

    const jaNaLista = new Set<string>()
    try {
        const j = await pedir('GetLyricsPlaylist')
        if (Array.isArray(j.data)) (j.data as { id?: unknown }[]).forEach((x) => x?.id != null && jaNaLista.add(String(x.id)))
    } catch (e) {
        if (e instanceof SemLigacaoHolyrics) throw e
    }

    const enviar = [...new Set(musicas.map((m) => ids.get(m.musicaId)).filter((id): id is string => !!id && !jaNaLista.has(id)))]
    if (enviar.length) {
        const j = await pedir('AddSongsToPlaylist', { ids: enviar })
        if (j.status && j.status !== 'ok') throw new Error(j.error || 'O Holyrics recusou o pedido. Veja as permissões do token no Holyrics.')
    }

    return musicas.map((m) => {
        const id = ids.get(m.musicaId)
        return { musicaId: m.musicaId, titulo: m.titulo, estado: !id ? 'nao-encontrada' : jaNaLista.has(id) ? 'ja-estava' : 'enviada' }
    })
}

export const MENSAGEM_SEM_LIGACAO =
    'Não chegou ao Holyrics. Abra esta página no computador da mídia, com o Holyrics aberto e na rede da igreja.'

/** Testa a ligacao a partir do navegador (o servidor da app nunca chega a rede da igreja). */
export async function testarHolyrics(url: string, token: string): Promise<{ ok: boolean; texto: string }> {
    if (!url || !token) return { ok: false, texto: 'Falta o endereço ou o token.' }
    let r: Response
    try {
        r = await fetch(`${url.replace(/\/$/, '')}/api/GetLyricsPlaylist?token=${encodeURIComponent(token)}`, OPCOES({}))
    } catch {
        return { ok: false, texto: MENSAGEM_SEM_LIGACAO }
    }
    const j: Resposta | null = await r.json().catch(() => null)
    if (!j) return {
        ok: false,
        texto: `O endereço responde (${r.status}), mas não é a API do Holyrics. No Holyrics: Arquivo → Configurações → API Server: ative-o e use aqui a porta que lá aparece.`,
    }
    if (j.status === 'ok') return { ok: true, texto: 'Ligado ao Holyrics.' }
    return { ok: false, texto: `O Holyrics respondeu: ${j.error || 'erro'}. Veja o token e as permissões dele no Holyrics.` }
}

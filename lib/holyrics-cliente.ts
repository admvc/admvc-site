// Falar com o Holyrics a partir do navegador. O Holyrics corre no computador da
// midia, na rede da igreja: o servidor da app nao chega la, o navegador sim.
// Usado pelo "Alterar músicas".

import { normalizarTitulo } from '@/lib/csdb-dados'

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

// "Grande É o Senhor!" e "grande e o senhor" sao a mesma musica: compara-se pelo titulo
// normalizado (a mesma funcao do titulo_norm guardado nas musicas).
const normalizar = normalizarTitulo

/**
 * Textos a pesquisar no Holyrics, do mais exato ao mais largo. O Holyrics pode nao ser
 * insensivel a acentos: tenta-se o titulo tal como esta, sem acentos e, por fim, a palavra
 * mais comprida (o resultado e sempre filtrado depois pelo titulo normalizado).
 */
export function consultasDeBusca(titulo: string): string[] {
    const original = titulo.trim()
    const norm = normalizarTitulo(titulo)
    const palavras = norm.split(' ').filter(Boolean).sort((a, b) => b.length - a.length)
    const maisComprida = palavras[0] && palavras[0].length >= 4 ? palavras[0] : ''
    return [...new Set([original, norm, maisComprida].filter((t) => t.length >= 2))]
}

/** Das musicas que o Holyrics devolveu, a que e a mesma (titulo normalizado; com varias, a do mesmo artista). */
export function escolherNoHolyrics<T extends { id: string | number; title?: string; artist?: string }>(lista: T[], titulo: string, artista: string | null): T | null {
    const alvo = normalizar(titulo)
    const iguais = lista.filter((x) => normalizar(x.title || '') === alvo)
    return iguais.find((x) => artista && x.artist && normalizar(x.artist) === normalizar(artista)) ?? iguais[0] ?? null
}

export type MusicaDoPortal = { id: string; titulo: string; artista: string | null; titulo_norm: string | null; holyrics_id: string | null }

/**
 * Ao trazer uma musica do Holyrics: qual das musicas do portal e a mesma? So as que ainda nao tem
 * ligacao ao Holyrics, com o mesmo titulo normalizado e artista igual (ou um dos dois por preencher).
 * Assim "Gloria" e "Glória" nao viram duas musicas.
 */
export function musicaParaLigar(portal: MusicaDoPortal[], titulo: string, artista: string | null | undefined): MusicaDoPortal | null {
    const alvo = normalizar(titulo)
    const art = normalizar(artista || '')
    const mesmas = portal.filter((p) => !p.holyrics_id && (p.titulo_norm || normalizar(p.titulo)) === alvo)
    return mesmas.find((p) => art && p.artista && normalizar(p.artista) === art)
        ?? mesmas.find((p) => !art || !p.artista)
        ?? null
}

/** Ja existe no portal (mesmo titulo normalizado e artista compativel), mesmo que ligada a outra musica do Holyrics? */
export function jaExisteNoPortal(portal: MusicaDoPortal[], titulo: string, artista: string | null | undefined): boolean {
    const alvo = normalizar(titulo)
    const art = normalizar(artista || '')
    return portal.some((p) => (p.titulo_norm || normalizar(p.titulo)) === alvo && (!art || !p.artista || normalizar(p.artista) === art))
}

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
        let achada: MusicaHolyrics | null = null
        for (const texto of consultasDeBusca(m.titulo)) {
            const j = await pedir('SearchSong', { text: texto, title: true, limit: 100 })
            const lista: MusicaHolyrics[] = j.status === 'ok' && Array.isArray(j.data) ? j.data : []
            achada = escolherNoHolyrics(lista, m.titulo, m.artista)
            if (achada) break
        }
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

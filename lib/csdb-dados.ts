// lib/csdb-dados.ts
// Lógica PURA do CSDB (csdb.app): normalizar títulos, ler a resposta da API e
// mapear os links. Sem rede nem base de dados — por isso testa-se à parte
// (tests/csdb-dados.test.ts). O cliente com cache e travão está em lib/csdb.ts.

// ── Tipos que o resto do portal usa ──────────────────────────────────────────

export interface LigacaoCsdb {
    tipo: string
    url: string
}

export interface FaixaCsdb {
    id: number
    titulo: string
    artista: string | null
    ano: number | null
    idioma: string | null
    isrc: string | null
    bpm: number | null
    tom: string | null
    compasso: string | null
    duracao_seg: number | null
    obra: { id: number; titulo: string; idioma: string | null } | null
    original: { id: number; titulo: string; idioma: string | null } | null
    compositores: string[]
    ligacoes: LigacaoCsdb[]
}

export type ResumoFaixaCsdb = Omit<FaixaCsdb, 'ligacoes' | 'compositores' | 'isrc' | 'compasso'>

/** O que se grava na música quando se escolhe uma faixa do CSDB. */
export interface DadosDaFaixa {
    titulo: string
    artista: string | null
    tom: string | null
    bpm: number | null
    link_cifra: string | null
    link_letra: string | null
    link_video: string | null
    link_audio: string | null
    link_playback: string | null
    csdb_track_id: number
    csdb_work_id: number | null
    isrc: string | null
    ano: number | null
    duracao_seg: number | null
    idioma: string | null
    compasso: string | null
    compositores: string[]
    links: Record<string, string>
}

// ── Texto ─────────────────────────────────────────────────────────────────────

/** Título sem acentos nem maiúsculas, só letras/números e espaços simples. "Glória!" = "gloria". */
export function normalizarTitulo(s: string | null | undefined): string {
    return (s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

/** 375 -> "6:15"; null se não houver duração. */
export function formatarDuracao(seg: number | null | undefined): string | null {
    if (seg == null || !Number.isFinite(seg) || seg <= 0) return null
    const s = Math.round(seg)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

const NOMES_IDIOMA: Record<string, string> = {
    por: 'Português', eng: 'Inglês', spa: 'Espanhol', fra: 'Francês', ita: 'Italiano', deu: 'Alemão',
    heb: 'Hebraico', lat: 'Latim', kor: 'Coreano', jpn: 'Japonês', zho: 'Chinês', rus: 'Russo',
}

export function nomeIdioma(codigo: string | null | undefined): string | null {
    if (!codigo) return null
    return NOMES_IDIOMA[codigo.toLowerCase()] ?? codigo.toUpperCase()
}

/** Tom no formato do portal (G, Am, F#, Bb). Devolve null se não for reconhecível. */
export function tomDoCsdb(k: unknown): string | null {
    if (typeof k !== 'string') return null
    const s = k.trim()
    if (!s) return null
    if (/^[A-G][#b]?m?$/.test(s)) return s
    const m = /^([A-G][#b]?)\s*(m|min|minor|menor)$/i.exec(s)
    return m ? `${m[1]}m` : null
}

// ── Leitura da resposta da API ───────────────────────────────────────────────

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : null)
const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const inteiro = (v: unknown): number | null => {
    const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
    return Number.isFinite(n) ? Math.round(n) : null
}

/** Nome por que o perfil é conhecido (alias) ou o nome completo. */
export function nomeDoPerfil(p: unknown): string | null {
    const o = obj(p)
    if (!o) return null
    return texto(o.alias) ?? texto(o.name)
}

function perfisDe(refs: unknown, tipo: string): string[] {
    if (!Array.isArray(refs)) return []
    const nomes: string[] = []
    for (const r of refs) {
        const o = obj(r)
        if (!o || o.type !== tipo) continue
        const n = nomeDoPerfil(o.profile)
        if (n && !nomes.includes(n)) nomes.push(n)
    }
    return nomes
}

/** Artistas da gravação (o primeiro é o principal). */
export function artistasDaFaixa(faixa: unknown): string[] {
    return perfisDe(obj(faixa)?.references, 'artist')
}

/** Artista a mostrar: o principal; com vários, "A, B". */
export function escolherArtista(faixa: unknown): string | null {
    const a = artistasDaFaixa(faixa)
    if (a.length === 0) return null
    return a.slice(0, 2).join(', ')
}

/** Compositores: os autores das obras da faixa, sem repetidos. */
export function compositoresDaFaixa(faixa: unknown): string[] {
    const works = obj(faixa)?.works
    if (!Array.isArray(works)) return []
    const nomes: string[] = []
    for (const w of works) {
        for (const n of perfisDe(obj(w)?.references, 'author')) if (!nomes.includes(n)) nomes.push(n)
    }
    return nomes.slice(0, 12)
}

function ligacaoDe(v: unknown): { id: number; titulo: string; idioma: string | null } | null {
    const o = obj(v)
    const id = inteiro(o?.id)
    const titulo = texto(o?.title)
    return o && id != null && titulo ? { id, titulo, idioma: texto(o.language) } : null
}

/** Só endereços http(s) (o CSDB é fonte externa: nada de javascript: nem data:). */
export function urlSegura(v: unknown): string | null {
    const s = texto(v)
    if (!s) return null
    try {
        const u = new URL(s)
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
    } catch {
        return null
    }
}

function ligacoesDe(v: unknown): LigacaoCsdb[] {
    if (!Array.isArray(v)) return []
    const r: LigacaoCsdb[] = []
    for (const x of v) {
        const o = obj(x)
        const tipo = texto(o?.type)
        const url = urlSegura(o?.url)
        if (tipo && url && !r.some((l) => l.tipo === tipo)) r.push({ tipo, url })
    }
    return r
}

/** Uma faixa da API (search/track, track/{id}, recordings…) no formato do portal. null se estiver incompleta. */
export function lerFaixa(bruto: unknown): FaixaCsdb | null {
    const o = obj(bruto)
    if (!o) return null
    const id = inteiro(o.id)
    const titulo = texto(o.title)
    if (id == null || !titulo) return null
    const obras = Array.isArray(o.works) ? o.works : []
    const obra = ligacaoDe(obras[0])
    const original = ligacaoDe(obj(obras[0])?.derived_from)
    const bpm = inteiro(o.bpm)
    const dur = inteiro(o.duration)
    return {
        id,
        titulo,
        artista: escolherArtista(o),
        ano: inteiro(o.year),
        idioma: texto(o.language),
        isrc: texto(o.isrc),
        bpm: bpm != null && bpm >= 30 && bpm <= 300 ? bpm : null,
        tom: tomDoCsdb(o.key),
        compasso: texto(o.time_sig),
        duracao_seg: dur != null && dur > 0 ? dur : null,
        obra,
        original,
        compositores: compositoresDaFaixa(o),
        ligacoes: ligacoesDe(o.external_links),
    }
}

export function resumirFaixa(f: FaixaCsdb): ResumoFaixaCsdb {
    return {
        id: f.id, titulo: f.titulo, artista: f.artista, ano: f.ano, idioma: f.idioma,
        bpm: f.bpm, tom: f.tom, duracao_seg: f.duracao_seg, obra: f.obra, original: f.original,
    }
}

// ── Links ────────────────────────────────────────────────────────────────────

/** Primeiro link existente de uma lista de tipos, por ordem de preferência. */
function primeiro(l: Record<string, string>, tipos: string[]): string | null {
    for (const t of tipos) if (l[t]) return l[t]
    return null
}

/** Os external_links do CSDB nos campos da música. `*_bt` é playback (backing track). */
export function mapearLinks(ligacoes: LigacaoCsdb[]) {
    const links: Record<string, string> = {}
    for (const l of ligacoes) if (!links[l.tipo]) links[l.tipo] = l.url
    return {
        links,
        link_cifra: primeiro(links, ['cifra_club']),
        link_letra: primeiro(links, ['letras_mus']),
        link_video: primeiro(links, ['youtube_video']),
        link_audio: primeiro(links, ['spotify', 'youtube', 'apple_music', 'deezer', 'amazon_music']),
        link_playback: primeiro(links, ['youtube_bt', 'spotify_bt', 'deezer_bt']),
    }
}

/** A faixa do CSDB no que se grava na música. */
export function dadosDaFaixa(f: FaixaCsdb): DadosDaFaixa {
    const l = mapearLinks(f.ligacoes)
    return {
        titulo: f.titulo,
        artista: f.artista,
        tom: f.tom,
        bpm: f.bpm,
        link_cifra: l.link_cifra,
        link_letra: l.link_letra,
        link_video: l.link_video,
        link_audio: l.link_audio,
        link_playback: l.link_playback,
        csdb_track_id: f.id,
        csdb_work_id: f.obra?.id ?? null,
        isrc: f.isrc,
        ano: f.ano,
        duracao_seg: f.duracao_seg,
        idioma: f.idioma,
        compasso: f.compasso,
        compositores: f.compositores,
        links: l.links,
    }
}

/** Nome legível de cada plataforma, para os botões "Ouvir também em". */
export const PLATAFORMAS: { tipo: string; nome: string }[] = [
    { tipo: 'spotify', nome: 'Spotify' },
    { tipo: 'youtube', nome: 'YouTube Music' },
    { tipo: 'apple_music', nome: 'Apple Music' },
    { tipo: 'deezer', nome: 'Deezer' },
    { tipo: 'amazon_music', nome: 'Amazon Music' },
]

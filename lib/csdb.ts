// lib/csdb.ts
// Cliente do CSDB (csdb.app, banco de músicas cristãs) — SÓ no servidor.
// - A chave (CSDB_TOKEN) nunca sai daqui: o navegador fala com as nossas rotas.
// - Cache de 30 dias na base (tabela csdb_cache): o mesmo pedido não se repete.
// - Travão por igreja: no máximo LIMITE_POR_MINUTO pedidos REAIS ao CSDB por minuto
//   (os que vêm da cache não contam). Os limites da API não são públicos.
// - Uma repetição em 429/5xx/falha de rede; erros claros em português.
// - Só a API oficial (scraping é proibido pelos termos). Guardar dados públicos é permitido.

import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { lerFaixa, resumirFaixa, type FaixaCsdb, type ResumoFaixaCsdb } from '@/lib/csdb-dados'

const BASE = 'https://api.csdb.app/v1/'
const CACHE_DIAS = 30
const LIMITE_POR_MINUTO = 20
const VERSAO_CACHE = 'v1'

export class CsdbErro extends Error {
    constructor(public status: number, mensagem: string) {
        super(mensagem)
        this.name = 'CsdbErro'
    }
}

export function csdbConfigurado(): boolean {
    return !!process.env.CSDB_TOKEN?.trim()
}

// ── Cache ────────────────────────────────────────────────────────────────────

async function lerCache<T>(chave: string): Promise<T | null> {
    try {
        const r = await prisma.csdbCache.findUnique({ where: { chave } })
        if (r && r.expira_em.getTime() > Date.now()) return r.resposta as T
    } catch (e) {
        console.error('[CSDB] cache indisponível (leitura):', (e as Error).message)
    }
    return null
}

async function gravarCache(chave: string, valor: unknown) {
    const expira_em = new Date(Date.now() + CACHE_DIAS * 24 * 3600 * 1000)
    const resposta = valor as Prisma.InputJsonValue
    try {
        await prisma.csdbCache.upsert({
            where: { chave },
            create: { chave, resposta, expira_em },
            update: { resposta, expira_em, criado_em: new Date() },
        })
    } catch (e) {
        console.error('[CSDB] cache indisponível (escrita):', (e as Error).message)
    }
}

// ── Pedido à API ─────────────────────────────────────────────────────────────

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** GET à API. Devolve { estado, corpo }; 404 e "sem resultados" (500 vazio) chegam ao chamador. */
async function pedir(caminho: string, tenantId: number): Promise<{ estado: number; corpo: unknown }> {
    const token = process.env.CSDB_TOKEN?.trim()
    if (!token) throw new CsdbErro(503, 'CSDB não configurado.')

    const lim = await rateLimit(`csdb:${tenantId}`, LIMITE_POR_MINUTO, 60_000)
    if (!lim.success) throw new CsdbErro(429, 'Muitos pedidos ao CSDB. Tenta daqui a um minuto.')

    let ultimo = 0
    for (let tentativa = 0; tentativa < 2; tentativa++) {
        try {
            const r = await fetch(BASE + caminho, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                signal: AbortSignal.timeout(9000),
                cache: 'no-store',
            })
            ultimo = r.status
            console.log(`[CSDB] GET ${caminho.split('?')[0]} -> ${r.status}`)
            if (r.status === 429 || r.status >= 500) {
                if (tentativa === 0) {
                    const ra = Number(r.headers.get('retry-after'))
                    await espera(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 3) * 1000 : 600)
                    continue
                }
                if (r.status >= 500) return { estado: r.status, corpo: null }
                throw new CsdbErro(429, 'O CSDB pediu para esperar. Tenta daqui a um minuto.')
            }
            const texto = await r.text()
            let corpo: unknown = null
            try { corpo = texto ? JSON.parse(texto) : null } catch { /* corpo não-JSON */ }
            return { estado: r.status, corpo }
        } catch (e) {
            if (e instanceof CsdbErro) throw e
            console.error('[CSDB] falha de rede:', (e as Error).message)
            if (tentativa === 0) { await espera(600); continue }
            throw new CsdbErro(502, 'Não foi possível falar com o CSDB. Tenta mais tarde.')
        }
    }
    throw new CsdbErro(502, `O CSDB não respondeu bem (${ultimo}). Tenta mais tarde.`)
}

function resultado(corpo: unknown): Record<string, unknown> | null {
    if (!corpo || typeof corpo !== 'object') return null
    const c = corpo as { status?: string; result?: unknown }
    return c.status === 'ok' && c.result && typeof c.result === 'object' ? (c.result as Record<string, unknown>) : null
}

function erroDeEstado(estado: number): CsdbErro {
    if (estado === 401 || estado === 403) return new CsdbErro(502, 'O CSDB recusou a chave do portal. Avisa a administração.')
    return new CsdbErro(502, `O CSDB não respondeu bem (${estado}). Tenta mais tarde.`)
}

// ── Funções públicas ─────────────────────────────────────────────────────────

/** Pesquisa de faixas (título + artista). Até 12 resultados. */
export async function procurarFaixas(q: string, tenantId: number): Promise<ResumoFaixaCsdb[]> {
    const termo = q.trim().replace(/\s+/g, ' ').slice(0, 100)
    if (termo.length < 2) throw new CsdbErro(400, 'Escreve pelo menos 2 letras.')
    const chave = `${VERSAO_CACHE}:search:${termo.toLowerCase()}`
    const guardado = await lerCache<ResumoFaixaCsdb[]>(chave)
    if (guardado) return guardado

    const { estado, corpo } = await pedir(`search/track?q=${encodeURIComponent(termo)}`, tenantId)
    // Sem resultados o CSDB responde 500 com o corpo vazio: é "nada encontrado", não é falha.
    if (estado >= 500 && corpo == null) return []
    const res = resultado(corpo)
    if (estado !== 200 || !res) throw erroDeEstado(estado)
    const lista = Array.isArray(res.tracks) ? res.tracks : []
    const faixas = lista.map(lerFaixa).filter((f): f is FaixaCsdb => !!f).slice(0, 12).map(resumirFaixa)
    await gravarCache(chave, faixas)
    return faixas
}

/** A faixa completa (com links e compositores). */
export async function obterFaixa(id: number, tenantId: number): Promise<FaixaCsdb> {
    if (!Number.isInteger(id) || id <= 0) throw new CsdbErro(400, 'Faixa inválida.')
    const chave = `${VERSAO_CACHE}:track:${id}`
    const guardado = await lerCache<FaixaCsdb>(chave)
    if (guardado) return guardado

    const { estado, corpo } = await pedir(`track/${id}`, tenantId)
    if (estado === 404) throw new CsdbErro(404, 'Esta música já não existe no CSDB.')
    const res = resultado(corpo)
    const faixa = estado === 200 && res ? lerFaixa(res) : null
    if (!faixa) throw erroDeEstado(estado)
    await gravarCache(chave, faixa)
    return faixa
}

export interface RelacionadosCsdb {
    original: { id: number; titulo: string; idioma: string | null } | null
    gravacoes: ResumoFaixaCsdb[]
    versoes: { id: number; titulo: string; idioma: string | null; ano: number | null }[]
}

/** Outras gravações da mesma obra e versões/traduções (a original, se esta for tradução). */
export async function relacionadosDaFaixa(faixa: FaixaCsdb, tenantId: number): Promise<RelacionadosCsdb> {
    const vazio: RelacionadosCsdb = { original: faixa.original, gravacoes: [], versoes: [] }
    if (!faixa.obra) return vazio
    const obraId = faixa.obra.id
    const chave = `${VERSAO_CACHE}:rel:${obraId}`
    const guardado = await lerCache<Omit<RelacionadosCsdb, 'original'>>(chave)
    if (guardado) return { original: faixa.original, ...guardado }

    const [rec, ver] = await Promise.all([
        pedir(`work/${obraId}/recordings?limit=10`, tenantId),
        pedir(`work/${obraId}/versions?limit=10`, tenantId),
    ])
    const recs = resultado(rec.corpo)
    const vers = resultado(ver.corpo)
    const gravacoes = (Array.isArray(recs?.recordings) ? recs.recordings : [])
        .map(lerFaixa).filter((f): f is FaixaCsdb => !!f).map(resumirFaixa).slice(0, 10)
    const versoes = (Array.isArray(vers?.versions) ? vers.versions : [])
        .map((v) => {
            const o = v as { id?: unknown; title?: unknown; language?: unknown; year?: unknown }
            return typeof o.id === 'number' && typeof o.title === 'string'
                ? { id: o.id, titulo: o.title, idioma: typeof o.language === 'string' ? o.language : null, ano: typeof o.year === 'number' ? o.year : null }
                : null
        })
        .filter((v): v is NonNullable<typeof v> => !!v).slice(0, 10)
    // Só se guarda se os dois pedidos correram bem (uma falha não fica 30 dias na cache)
    if (rec.estado === 200 && ver.estado === 200) await gravarCache(chave, { gravacoes, versoes })
    return { original: faixa.original, gravacoes, versoes }
}

/**
 * Faixas populares do CSDB em português (popular/track). A API já responde em português por omissão
 * e ignora o parâmetro de idioma, por isso filtra-se aqui por language === 'por'. Cache de 30 dias.
 */
export async function popularesCsdb(tenantId: number): Promise<ResumoFaixaCsdb[]> {
    const chave = `${VERSAO_CACHE}:popular:por`
    const guardado = await lerCache<ResumoFaixaCsdb[]>(chave)
    if (guardado) return guardado

    const { estado, corpo } = await pedir('popular/track?limit=30', tenantId)
    const res = resultado(corpo)
    if (estado !== 200 || !res) throw erroDeEstado(estado)
    const lista = Array.isArray(res.tracks) ? res.tracks : []
    const faixas = lista.map(lerFaixa).filter((f): f is FaixaCsdb => !!f)
        .filter((f) => (f.idioma ?? 'por').toLowerCase() === 'por')
        .slice(0, 30).map(resumirFaixa)
    await gravarCache(chave, faixas)
    return faixas
}

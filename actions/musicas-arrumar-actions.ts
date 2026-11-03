'use server'

// L4 — Arrumar o repertório: ligar músicas ao CSDB (propostas com confiança) e juntar duplicadas.
// Só quem gere o repertório; tudo dentro da igreja. Os dados do CSDB vêm sempre do servidor
// (obterFaixa) — do navegador só chegam ids.

import { revalidatePath } from 'next/cache'
import prisma, { getTenantClient } from '@/lib/prisma'
import { requireLouvorPermission } from '@/lib/louvor-permissoes'
import { CsdbErro, obterFaixa, procurarFaixas } from '@/lib/csdb'
import { dadosDaFaixa, type ResumoFaixaCsdb } from '@/lib/csdb-dados'
import { chaveForaDoCsdb, confiancaDaProposta, frasesDoResumo, juntarMusicas, resumirJuncao, type Confianca } from '@/lib/musicas-juntar'

export type Proposta = ResumoFaixaCsdb & { confianca: Confianca }
type Falha = { ok: false; error: string; esperar?: number }
const MAX_LOTE = 5

function falha(e: unknown, padrao: string): Falha {
    if (e instanceof CsdbErro) return { ok: false, error: e.message, ...(e.status === 429 ? { esperar: 60 } : {}) }
    return { ok: false, error: (e instanceof Error && e.message) || padrao }
}

async function exigirGestor() {
    const sessao = await requireLouvorPermission()
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

// ── "Não está no CSDB": sem coluna nova, guarda-se na tabela csdb_cache (chave por igreja + música) ──

const DEZ_ANOS = 10 * 365 * 24 * 3600 * 1000

export async function marcarForaDoCsdb(musicaId: string): Promise<{ ok: true } | Falha> {
    try {
        const { sessao, db } = await exigirGestor()
        const m = await db.musica.findUnique({ where: { id: musicaId }, select: { id: true } })
        if (!m) return { ok: false, error: 'Música não encontrada.' }
        const chave = chaveForaDoCsdb(sessao.tenantId, musicaId)
        const expira_em = new Date(Date.now() + DEZ_ANOS)
        await prisma.csdbCache.upsert({
            where: { chave },
            create: { chave, resposta: { musica_id: musicaId }, expira_em },
            update: { expira_em },
        })
        revalidatePath('/louvor/musicas/ligar')
        return { ok: true }
    } catch (e) {
        return falha(e, 'Não foi possível marcar.')
    }
}

export async function desmarcarForaDoCsdb(musicaId: string): Promise<{ ok: true } | Falha> {
    try {
        const { sessao } = await exigirGestor()
        await prisma.csdbCache.deleteMany({ where: { chave: chaveForaDoCsdb(sessao.tenantId, musicaId) } })
        revalidatePath('/louvor/musicas/ligar')
        return { ok: true }
    } catch (e) {
        return falha(e, 'Não foi possível desfazer.')
    }
}

// ── Propostas ─────────────────────────────────────────────────────────────────

/** Faixas do CSDB que já estão ligadas a outra música desta igreja (não se propõem). */
async function faixasEmUso(db: ReturnType<typeof getTenantClient>): Promise<Set<number>> {
    const l = await db.musica.findMany({ where: { csdb_track_id: { not: null } }, select: { csdb_track_id: true } })
    return new Set(l.map((x) => x.csdb_track_id!))
}

export interface PropostasDeMusica { musicaId: string; propostas: Proposta[] }

/** Procura no CSDB a melhor proposta de cada música (lote pequeno: cada música custa 1 pedido, ou 2). */
export async function proporLigacoes(ids: string[]): Promise<{ ok: true; resultados: PropostasDeMusica[]; falta: string[] } | Falha> {
    try {
        const { sessao, db } = await exigirGestor()
        const lista = [...new Set(ids)].filter((i) => typeof i === 'string').slice(0, MAX_LOTE)
        if (lista.length === 0) return { ok: true, resultados: [], falta: [] }
        const musicas = await db.musica.findMany({ where: { id: { in: lista }, csdb_track_id: null }, select: { id: true, titulo: true, artista: true } })
        const emUso = await faixasEmUso(db)
        const resultados: PropostasDeMusica[] = []
        const falta: string[] = []
        for (const m of musicas) {
            try {
                let faixas = await procurarFaixas(`${m.titulo} ${m.artista ?? ''}`.trim(), sessao.tenantId)
                if (faixas.length === 0 && m.artista) faixas = await procurarFaixas(m.titulo, sessao.tenantId)
                const propostas = faixas
                    .filter((f) => !emUso.has(f.id))
                    .map((f) => ({ ...f, confianca: confiancaDaProposta(m, f) }))
                const peso = { alta: 0, media: 1, baixa: 2 } as const
                propostas.sort((a, b) => peso[a.confianca] - peso[b.confianca])
                resultados.push({ musicaId: m.id, propostas: propostas.slice(0, 5) })
            } catch (e) {
                // Travão a meio: devolve o que já tem e diz o que falta (o navegador espera e continua)
                if (e instanceof CsdbErro && e.status === 429) {
                    falta.push(...musicas.map((x) => x.id).filter((id) => !resultados.some((r) => r.musicaId === id)))
                    return { ok: true, resultados, falta }
                }
                throw e
            }
        }
        return { ok: true, resultados, falta }
    } catch (e) {
        return falha(e, 'Não foi possível procurar no CSDB.')
    }
}

/** "Escolher outra": pesquisa livre. */
export async function procurarOutras(q: string): Promise<{ ok: true; faixas: ResumoFaixaCsdb[] } | Falha> {
    try {
        const { sessao, db } = await exigirGestor()
        const texto = String(q ?? '').trim()
        if (texto.length < 2 || texto.length > 100) return { ok: false, error: 'Escreve entre 2 e 100 letras.' }
        const [faixas, emUso] = await Promise.all([procurarFaixas(texto, sessao.tenantId), faixasEmUso(db)])
        return { ok: true, faixas: faixas.filter((f) => !emUso.has(f.id)) }
    } catch (e) {
        return falha(e, 'Não foi possível procurar no CSDB.')
    }
}

// ── Confirmar ─────────────────────────────────────────────────────────────────

async function ligarUma(db: ReturnType<typeof getTenantClient>, tenantId: number, musicaId: string, trackId: number) {
    if (!Number.isInteger(trackId) || trackId <= 0) throw new Error('Faixa do CSDB inválida.')
    const m = await db.musica.findUnique({
        where: { id: musicaId },
        select: { id: true, csdb_track_id: true, artista: true, tom: true, bpm: true, link_cifra: true, link_letra: true, link_video: true, link_audio: true },
    })
    if (!m) throw new Error('Música não encontrada.')
    if (m.csdb_track_id === trackId) return
    const outra = await db.musica.findFirst({ where: { csdb_track_id: trackId, NOT: { id: musicaId } }, select: { id: true } })
    if (outra) throw new Error('Esta faixa do CSDB já está ligada a outra música (provavelmente uma duplicada: junta-as primeiro).')
    const f = dadosDaFaixa(await obterFaixa(trackId, tenantId))
    await db.musica.update({
        where: { id: musicaId },
        data: {
            csdb_track_id: f.csdb_track_id, csdb_work_id: f.csdb_work_id, isrc: f.isrc, ano: f.ano,
            duracao_seg: f.duracao_seg, idioma: f.idioma, compasso: f.compasso, compositores: f.compositores,
            links: f.links, link_playback: f.link_playback, csdb_atualizado_em: new Date(),
            // o que já estava escrito não se muda; só se enche o que estava vazio
            ...(!m.artista && f.artista ? { artista: f.artista } : {}),
            ...(!m.tom && f.tom ? { tom: f.tom } : {}),
            ...(m.bpm == null && f.bpm != null ? { bpm: f.bpm } : {}),
            ...(!m.link_cifra && f.link_cifra ? { link_cifra: f.link_cifra } : {}),
            ...(!m.link_letra && f.link_letra ? { link_letra: f.link_letra } : {}),
            ...(!m.link_video && f.link_video ? { link_video: f.link_video } : {}),
            ...(!m.link_audio && f.link_audio ? { link_audio: f.link_audio } : {}),
        },
    })
    // se estava marcada como "não está no CSDB", a marca já não faz sentido
    await prisma.csdbCache.deleteMany({ where: { chave: chaveForaDoCsdb(tenantId, musicaId) } })
}

export async function confirmarLigacao(musicaId: string, trackId: number): Promise<{ ok: true } | Falha> {
    try {
        const { sessao, db } = await exigirGestor()
        await ligarUma(db, sessao.tenantId, musicaId, trackId)
        revalidatePath('/louvor/musicas'); revalidatePath('/louvor/musicas/ligar'); revalidatePath(`/louvor/musicas/${musicaId}`)
        return { ok: true }
    } catch (e) {
        return falha(e, 'Não foi possível ligar.')
    }
}

/** Confirma várias (as de confiança alta). Para no travão e diz o que falta. */
export async function confirmarLote(pares: { musicaId: string; trackId: number }[]): Promise<
    { ok: true; ligadas: string[]; falhadas: { musicaId: string; error: string }[]; falta: string[]; esperar?: number } | Falha> {
    try {
        const { sessao, db } = await exigirGestor()
        const lista = pares.slice(0, MAX_LOTE)
        const ligadas: string[] = []
        const falhadas: { musicaId: string; error: string }[] = []
        const usadas = new Set<number>()
        for (let i = 0; i < lista.length; i++) {
            const p = lista[i]
            try {
                if (usadas.has(p.trackId)) throw new Error('Outra música deste lote tem a mesma faixa: confirma uma de cada vez.')
                await ligarUma(db, sessao.tenantId, p.musicaId, p.trackId)
                usadas.add(p.trackId)
                ligadas.push(p.musicaId)
            } catch (e) {
                if (e instanceof CsdbErro && e.status === 429) {
                    revalidatePath('/louvor/musicas/ligar')
                    return { ok: true, ligadas, falhadas, falta: lista.slice(i).map((x) => x.musicaId), esperar: 60 }
                }
                falhadas.push({ musicaId: p.musicaId, error: (e instanceof Error && e.message) || 'Erro.' })
            }
        }
        revalidatePath('/louvor/musicas'); revalidatePath('/louvor/musicas/ligar')
        return { ok: true, ligadas, falhadas, falta: [] }
    } catch (e) {
        return falha(e, 'Não foi possível ligar.')
    }
}

// ── Juntar duplicadas ─────────────────────────────────────────────────────────

function idsValidos(ficaId: string, outras: string[]) {
    const ids = [...new Set((outras ?? []).filter((i) => typeof i === 'string' && i !== ficaId))]
    if (typeof ficaId !== 'string' || !ficaId || ids.length === 0 || ids.length > 20) throw new Error('Escolhe a música que fica e as duplicadas.')
    return ids
}

export async function resumoDaJuncao(ficaId: string, outras: string[]): Promise<{ ok: true; frases: string[] } | Falha> {
    try {
        const { sessao } = await exigirGestor()
        const r = await resumirJuncao(sessao.tenantId, ficaId, idsValidos(ficaId, outras))
        return { ok: true, frases: frasesDoResumo(r) }
    } catch (e) {
        return falha(e, 'Não foi possível preparar a junção.')
    }
}

export async function juntarDuplicadas(ficaId: string, outras: string[]): Promise<{ ok: true; frases: string[] } | Falha> {
    try {
        const { sessao } = await exigirGestor()
        const r = await juntarMusicas(sessao.tenantId, ficaId, idsValidos(ficaId, outras))
        revalidatePath('/louvor/musicas'); revalidatePath('/louvor/musicas/ligar'); revalidatePath('/escalas')
        return { ok: true, frases: frasesDoResumo(r) }
    } catch (e) {
        return falha(e, 'Não foi possível juntar.')
    }
}

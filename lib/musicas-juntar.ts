// lib/musicas-juntar.ts
// L4 — arrumar o repertório: confiança das propostas do CSDB, grupos de músicas
// duplicadas e "juntar" (mover os cultos para a que fica, sem perder nada).
// A primeira metade é lógica PURA (testada em tests/musicas-juntar.test.ts);
// a segunda faz o acesso à base, sempre com tenant_id.

import { Prisma } from '@prisma/client'
import { normalizarTitulo } from '@/lib/csdb-dados'

// ── Confiança ────────────────────────────────────────────────────────────────

export type Confianca = 'alta' | 'media' | 'baixa'

/** alta = título e artista iguais; média = título igual; baixa = o resto. (Sem acentos/maiúsculas.) */
export function confiancaDaProposta(
    musica: { titulo: string; artista: string | null },
    faixa: { titulo: string; artista: string | null },
): Confianca {
    if (normalizarTitulo(musica.titulo) !== normalizarTitulo(faixa.titulo)) return 'baixa'
    const a = normalizarTitulo(musica.artista)
    const b = normalizarTitulo(faixa.artista)
    return a && b && a === b ? 'alta' : 'media'
}

const PESO: Record<Confianca, number> = { alta: 0, media: 1, baixa: 2 }

/** Melhor primeiro; a ordem do CSDB desempata. */
export function ordenarPorConfianca<T extends { confianca: Confianca }>(lista: T[]): T[] {
    return lista.map((x, i) => ({ x, i })).sort((p, q) => PESO[p.x.confianca] - PESO[q.x.confianca] || p.i - q.i).map((p) => p.x)
}

// ── Duplicados ───────────────────────────────────────────────────────────────

export interface MusicaParaAgrupar {
    id: string
    titulo: string
    titulo_norm: string | null
    artista: string | null
    csdb_track_id: number | null
    csdb_work_id: number | null
    cultos: number
    preenchidos: number
}

export interface GrupoDuplicado<T extends MusicaParaAgrupar = MusicaParaAgrupar> {
    musicas: T[]
    motivo: 'obra' | 'titulo'
    /** Sugestão do que fica: a ligada ao CSDB, depois a mais usada, depois a mais completa. */
    sugerida: string
}

export function sugerirQueFica<T extends MusicaParaAgrupar>(ms: T[]): T {
    return [...ms].sort((a, b) =>
        Number(b.csdb_track_id != null) - Number(a.csdb_track_id != null)
        || b.cultos - a.cultos
        || b.preenchidos - a.preenchidos
        || a.id.localeCompare(b.id))[0]
}

/** Grupos de 2+ músicas: mesma obra do CSDB, ou mesmo título normalizado + mesmo artista normalizado. */
export function agruparDuplicados<T extends MusicaParaAgrupar>(musicas: T[]): GrupoDuplicado<T>[] {
    const pai = new Map<string, string>()
    const raiz = (x: string): string => {
        let r = x
        while (pai.get(r) !== r) r = pai.get(r)!
        pai.set(x, r)
        return r
    }
    for (const m of musicas) pai.set(m.id, m.id)
    const unir = (a: string, b: string) => { pai.set(raiz(a), raiz(b)) }

    const porObra = new Map<number, string>()
    const porTitulo = new Map<string, string>()
    const viaObra = new Set<string>()
    for (const m of musicas) {
        if (m.csdb_work_id != null) {
            const o = porObra.get(m.csdb_work_id)
            if (o) { unir(m.id, o); viaObra.add(m.id); viaObra.add(o) } else porObra.set(m.csdb_work_id, m.id)
        }
        const t = m.titulo_norm || normalizarTitulo(m.titulo)
        if (t) {
            const chave = `${t}|${normalizarTitulo(m.artista)}`
            const o = porTitulo.get(chave)
            if (o) unir(m.id, o)
            else porTitulo.set(chave, m.id)
        }
    }
    const grupos = new Map<string, T[]>()
    for (const m of musicas) {
        const r = raiz(m.id)
        grupos.set(r, [...(grupos.get(r) ?? []), m])
    }
    return [...grupos.values()]
        .filter((g) => g.length > 1)
        .map((g) => ({
            musicas: g,
            motivo: g.some((m) => viaObra.has(m.id)) ? ('obra' as const) : ('titulo' as const),
            sugerida: sugerirQueFica(g).id,
        }))
        .sort((a, b) => (a.musicas[0].titulo_norm ?? a.musicas[0].titulo).localeCompare(b.musicas[0].titulo_norm ?? b.musicas[0].titulo))
}

// ── Fusão de campos ──────────────────────────────────────────────────────────

export interface CamposMusica {
    artista: string | null
    bpm: number | null
    tom: string | null
    link_video: string | null
    link_letra: string | null
    link_cifra: string | null
    link_audio: string | null
    cifra_interna: string | null
    holyrics_id: string | null
    csdb_track_id: number | null
    csdb_work_id: number | null
    isrc: string | null
    ano: number | null
    duracao_seg: number | null
    idioma: string | null
    compasso: string | null
    compositores: string[]
    links: unknown
    link_playback: string | null
    csdb_atualizado_em: Date | null
}

/** Os campos que vêm do CSDB: copiam-se todos juntos (ou nenhum). */
const BLOCO_CSDB = [
    'csdb_track_id', 'csdb_work_id', 'isrc', 'ano', 'duracao_seg', 'idioma', 'compasso',
    'compositores', 'links', 'link_playback', 'csdb_atualizado_em',
] as const
const SIMPLES = ['artista', 'bpm', 'tom', 'link_video', 'link_letra', 'link_cifra', 'link_audio', 'cifra_interna', 'holyrics_id'] as const

const vazio = (v: unknown) => v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)

/**
 * Do que a "outra" sabe e a que fica não: devolve só o que preenche campos vazios da que fica.
 * Nunca substitui um valor da que fica. O bloco do CSDB só passa se a que fica ainda não tem faixa.
 */
export function fundirCampos(fica: CamposMusica, outra: CamposMusica): { dados: Partial<CamposMusica>; preenchidos: string[] } {
    const dados: Record<string, unknown> = {}
    const preenchidos: string[] = []
    for (const k of SIMPLES) {
        if (vazio(fica[k]) && !vazio(outra[k])) { dados[k] = outra[k]; preenchidos.push(k) }
    }
    if (fica.csdb_track_id == null && outra.csdb_track_id != null) {
        for (const k of BLOCO_CSDB) dados[k] = outra[k]
        preenchidos.push('csdb')
    }
    return { dados: dados as Partial<CamposMusica>, preenchidos }
}

/** Quantos campos úteis a música tem preenchidos (para sugerir a que fica). */
export function contarPreenchidos(m: CamposMusica): number {
    return [...SIMPLES, ...BLOCO_CSDB].filter((k) => !vazio(m[k as keyof CamposMusica])).length
}

// ── Plano da junção ──────────────────────────────────────────────────────────

export interface RefCulto { id: string; evento_id: number }

/** Os cultos da duplicada passam para a que fica; se a que fica já está nesse culto, fica o tom e a posição dela. */
export function planearReferencias(daFica: RefCulto[], daOutra: RefCulto[]) {
    const emFica = new Set(daFica.map((r) => r.evento_id))
    return {
        mover: daOutra.filter((r) => !emFica.has(r.evento_id)),
        repetidos: daOutra.filter((r) => emFica.has(r.evento_id)),
    }
}

export interface ResumoJuncao {
    ficaId: string
    ficaTitulo: string
    outras: { id: string; titulo: string; passam: number; repetidos: number; preenchidos: string[] }[]
    passam: number
    repetidos: number
}

const NOMES_CAMPOS: Record<string, string> = {
    artista: 'artista', bpm: 'BPM', tom: 'tom', link_video: 'vídeo', link_letra: 'letra', link_cifra: 'cifra (link)',
    link_audio: 'áudio', cifra_interna: 'cifra do portal', holyrics_id: 'ligação ao Holyrics', csdb: 'dados do CSDB',
}
export const nomeDoCampo = (k: string) => NOMES_CAMPOS[k] ?? k

export function frasesDoResumo(r: ResumoJuncao): string[] {
    const f: string[] = []
    if (r.passam) f.push(`${r.passam} culto${r.passam === 1 ? '' : 's'} passa${r.passam === 1 ? '' : 'm'} para «${r.ficaTitulo}», com o tom que tocaram.`)
    if (r.repetidos) f.push(`${r.repetidos} culto${r.repetidos === 1 ? '' : 's'} já tinha${r.repetidos === 1 ? '' : 'm'} as duas: fica a posição e o tom de «${r.ficaTitulo}».`)
    if (!r.passam && !r.repetidos) f.push('Nenhum culto usa a duplicada.')
    const campos = [...new Set(r.outras.flatMap((o) => o.preenchidos))].map(nomeDoCampo)
    if (campos.length) f.push(`Campos vazios que ficam preenchidos: ${campos.join(', ')}.`)
    f.push(`A duplicada é apagada depois (${r.outras.length}).`)
    return f
}

// ── Acesso à base (tudo com tenant_id) ───────────────────────────────────────

const CAMPOS_SELECT = {
    id: true, titulo: true, artista: true, bpm: true, tom: true, link_video: true, link_letra: true, link_cifra: true,
    link_audio: true, cifra_interna: true, holyrics_id: true, csdb_track_id: true, csdb_work_id: true, isrc: true,
    ano: true, duracao_seg: true, idioma: true, compasso: true, compositores: true, links: true, link_playback: true,
    csdb_atualizado_em: true,
} as const

// O cliente da base carrega-se só quando é preciso (a parte pura testa-se sem base)
async function bd() { return (await import('@/lib/prisma')).default }
type Cliente = Prisma.TransactionClient

async function carregar(tx: Cliente, tenantId: number, ficaId: string, outrasIds: string[]) {
    const ids = [ficaId, ...outrasIds]
    if (new Set(ids).size !== ids.length || outrasIds.length === 0) throw new Error('Escolhe a música que fica e pelo menos uma duplicada diferente.')
    const musicas = await tx.musica.findMany({ where: { tenant_id: tenantId, id: { in: ids } }, select: CAMPOS_SELECT })
    if (musicas.length !== ids.length) throw new Error('Música não encontrada.')
    const refs = await tx.repertorioEvento.findMany({
        where: { tenant_id: tenantId, musica_id: { in: ids } }, select: { id: true, evento_id: true, musica_id: true },
    })
    const fica = musicas.find((m) => m.id === ficaId)!
    return { fica, outras: outrasIds.map((id) => musicas.find((m) => m.id === id)!), refs }
}

/** O que a junção vai fazer (para mostrar antes de confirmar). Não altera nada. */
export async function resumirJuncao(tenantId: number, ficaId: string, outrasIds: string[]): Promise<ResumoJuncao> {
    const prisma = await bd()
    const { fica, outras, refs } = await carregar(prisma, tenantId, ficaId, outrasIds)
    const eventosFica = new Set(refs.filter((r) => r.musica_id === ficaId).map((r) => r.evento_id))
    const resumo: ResumoJuncao = { ficaId, ficaTitulo: fica.titulo, outras: [], passam: 0, repetidos: 0 }
    const atual = { ...fica } as CamposMusica
    for (const o of outras) {
        const plano = planearReferencias(
            [...eventosFica].map((e) => ({ id: '', evento_id: e })),
            refs.filter((r) => r.musica_id === o.id),
        )
        const f = fundirCampos(atual, o as CamposMusica)
        Object.assign(atual, f.dados)
        for (const m of plano.mover) eventosFica.add(m.evento_id)
        resumo.outras.push({ id: o.id, titulo: o.titulo, passam: plano.mover.length, repetidos: plano.repetidos.length, preenchidos: f.preenchidos })
        resumo.passam += plano.mover.length
        resumo.repetidos += plano.repetidos.length
    }
    return resumo
}

/**
 * Junta as duplicadas na que fica, numa transação: move os cultos (mantendo o tom tocado de cada um),
 * preenche os campos vazios da que fica e só então apaga as duplicadas.
 */
export async function juntarMusicas(tenantId: number, ficaId: string, outrasIds: string[]): Promise<ResumoJuncao> {
    const prisma = await bd()
    return prisma.$transaction(async (tx) => {
        const { fica, outras, refs } = await carregar(tx, tenantId, ficaId, outrasIds)
        const eventosFica = new Set(refs.filter((r) => r.musica_id === ficaId).map((r) => r.evento_id))
        const resumo: ResumoJuncao = { ficaId, ficaTitulo: fica.titulo, outras: [], passam: 0, repetidos: 0 }
        const atual = { ...fica } as CamposMusica
        const eventosTocados = new Set<number>()

        for (const o of outras) {
            const plano = planearReferencias(
                [...eventosFica].map((e) => ({ id: '', evento_id: e })),
                refs.filter((r) => r.musica_id === o.id),
            )
            // 1. cultos: os que a que fica não tem mudam de música (tom e posição mantêm-se); os repetidos saem
            if (plano.mover.length) {
                await tx.repertorioEvento.updateMany({
                    where: { tenant_id: tenantId, id: { in: plano.mover.map((r) => r.id) } },
                    data: { musica_id: ficaId },
                })
            }
            if (plano.repetidos.length) {
                await tx.repertorioEvento.deleteMany({ where: { tenant_id: tenantId, id: { in: plano.repetidos.map((r) => r.id) } } })
            }
            for (const r of [...plano.mover, ...plano.repetidos]) eventosTocados.add(r.evento_id)
            for (const m of plano.mover) eventosFica.add(m.evento_id)

            // 2. campos vazios da que fica; o que é único (faixa do CSDB, Holyrics) sai primeiro da duplicada
            const f = fundirCampos(atual, o as CamposMusica)
            if (f.dados.csdb_track_id != null || f.dados.holyrics_id != null) {
                await tx.musica.updateMany({
                    where: { tenant_id: tenantId, id: o.id },
                    data: {
                        ...(f.dados.csdb_track_id != null ? { csdb_track_id: null } : {}),
                        ...(f.dados.holyrics_id != null ? { holyrics_id: null } : {}),
                    },
                })
            }
            if (Object.keys(f.dados).length) {
                const d = f.dados
                await tx.musica.updateMany({
                    where: { tenant_id: tenantId, id: ficaId },
                    data: { ...d, links: d.links === undefined ? undefined : (d.links ?? Prisma.JsonNull) } as Prisma.MusicaUpdateManyMutationInput,
                })
                Object.assign(atual, d)
            }
            resumo.outras.push({ id: o.id, titulo: o.titulo, passam: plano.mover.length, repetidos: plano.repetidos.length, preenchidos: f.preenchidos })
            resumo.passam += plano.mover.length
            resumo.repetidos += plano.repetidos.length
        }

        // 3. só agora a(s) duplicada(s): garantir que já não há nada a apontar para elas
        const sobras = await tx.repertorioEvento.count({ where: { tenant_id: tenantId, musica_id: { in: outrasIds } } })
        if (sobras > 0) throw new Error('Ainda há cultos ligados à duplicada; nada foi alterado.')
        await tx.musica.deleteMany({ where: { tenant_id: tenantId, id: { in: outrasIds } } })

        // 4. renumerar as posições dos cultos onde saiu uma repetida (sem buracos)
        for (const eventoId of eventosTocados) {
            const linhas = await tx.repertorioEvento.findMany({
                where: { tenant_id: tenantId, evento_id: eventoId }, orderBy: { ordem: 'asc' }, select: { id: true, ordem: true },
            })
            for (let i = 0; i < linhas.length; i++) {
                if (linhas[i].ordem !== i + 1) await tx.repertorioEvento.update({ where: { id: linhas[i].id }, data: { ordem: i + 1 } })
            }
        }
        return resumo
    }, { timeout: 20_000 })
}

// ── "Não está no CSDB" (sem coluna nova: guarda-se na tabela csdb_cache, por igreja + música) ──

export const chaveForaDoCsdb = (tenantId: number, musicaId: string) => `v1:semcsdb:${tenantId}:${musicaId}`

export async function idsForaDoCsdb(tenantId: number): Promise<Set<string>> {
    const prisma = await bd()
    const prefixo = `v1:semcsdb:${tenantId}:`
    const linhas = await prisma.csdbCache.findMany({ where: { chave: { startsWith: prefixo } }, select: { chave: true } })
    return new Set(linhas.map((l) => l.chave.slice(prefixo.length)))
}

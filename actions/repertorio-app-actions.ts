'use server'

// Acoes do repertorio e da setlist de um culto (app nova). So quem gere o
// repertorio (admin, lider ou delegado do louvor); tudo dentro da igreja.

import { revalidatePath } from 'next/cache'
import { getTenantClient } from '@/lib/prisma'
import { requireLouvorPermission } from '@/lib/louvor-permissoes'

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string }

async function exigirGestor() {
    const sessao = await requireLouvorPermission()
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

function erro(e: unknown, padrao: string): { ok: false; error: string } {
    return { ok: false, error: (e instanceof Error && e.message) || padrao }
}

const tomValido = (t: string) => /^[A-G][#b]?(m|maj7|m7|7|9|sus2|sus4|add9)?(\/[A-G][#b]?)?$/.test(t.trim())

function revalidar(eventoId?: number) {
    if (eventoId) {
        revalidatePath(`/escalas/culto/${eventoId}`)
        revalidatePath(`/louvor/setlist/${eventoId}`)
    }
    revalidatePath('/louvor/musicas')
    revalidatePath('/escalas')
}

// ── SETLIST DE UM CULTO ───────────────────────────────────────────────────────

/** Junta uma musica do repertorio ao fim da setlist do culto. */
export async function adicionarMusicaNaEscala(eventoId: number, musicaId: string, tom: string): Promise<Resultado> {
    try {
        const { db, sessao } = await exigirGestor()
        const t = tom.trim()
        if (!tomValido(t)) return { ok: false, error: 'Tom inválido (ex.: G, Am, F#, D/F#).' }
        const [evento, musica, ultima] = await Promise.all([
            db.evento.findUnique({ where: { id: eventoId }, select: { id: true } }),
            db.musica.findUnique({ where: { id: musicaId }, select: { id: true } }),
            db.repertorioEvento.findFirst({ where: { evento_id: eventoId }, orderBy: { ordem: 'desc' }, select: { ordem: true } }),
        ])
        if (!evento || !musica) return { ok: false, error: 'Culto ou música não encontrados.' }
        const ja = await db.repertorioEvento.findFirst({ where: { evento_id: eventoId, musica_id: musicaId }, select: { id: true } })
        if (ja) return { ok: false, error: 'Esta música já está neste culto.' }
        await db.repertorioEvento.create({
            data: { evento_id: eventoId, musica_id: musicaId, tom_tocado: t, ordem: (ultima?.ordem ?? 0) + 1, tenant_id: sessao.tenantId },
        })
        revalidar(eventoId)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao juntar a música.')
    }
}

/** Tira uma musica da setlist e renumera as restantes. */
export async function tirarMusicaDaEscala(itemId: string): Promise<Resultado> {
    try {
        const { db } = await exigirGestor()
        const item = await db.repertorioEvento.findUnique({ where: { id: itemId }, select: { evento_id: true } })
        if (!item) return { ok: false, error: 'Música não encontrada neste culto.' }
        await db.repertorioEvento.delete({ where: { id: itemId } })
        const resto = await db.repertorioEvento.findMany({ where: { evento_id: item.evento_id }, orderBy: { ordem: 'asc' }, select: { id: true } })
        await db.$transaction(resto.map((r, i) => db.repertorioEvento.update({ where: { id: r.id }, data: { ordem: i + 1 } })))
        revalidar(item.evento_id)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao tirar a música.')
    }
}

/** Sobe (-1) ou desce (+1) uma musica na setlist. */
export async function moverMusicaNaEscala(itemId: string, direcao: -1 | 1): Promise<Resultado> {
    try {
        const { db } = await exigirGestor()
        const item = await db.repertorioEvento.findUnique({ where: { id: itemId }, select: { evento_id: true } })
        if (!item) return { ok: false, error: 'Música não encontrada neste culto.' }
        const lista = await db.repertorioEvento.findMany({ where: { evento_id: item.evento_id }, orderBy: { ordem: 'asc' }, select: { id: true } })
        const i = lista.findIndex((r) => r.id === itemId)
        const j = i + direcao
        if (j < 0 || j >= lista.length) return { ok: true }
        ;[lista[i], lista[j]] = [lista[j], lista[i]]
        await db.$transaction(lista.map((r, k) => db.repertorioEvento.update({ where: { id: r.id }, data: { ordem: k + 1 } })))
        revalidar(item.evento_id)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao mudar a ordem.')
    }
}

/** Muda o tom em que a musica vai ser tocada neste culto. */
export async function mudarTomNaEscala(itemId: string, tom: string): Promise<Resultado> {
    try {
        const { db } = await exigirGestor()
        const t = tom.trim()
        if (!tomValido(t)) return { ok: false, error: 'Tom inválido (ex.: G, Am, F#, D/F#).' }
        const item = await db.repertorioEvento.findUnique({ where: { id: itemId }, select: { evento_id: true } })
        if (!item) return { ok: false, error: 'Música não encontrada neste culto.' }
        await db.repertorioEvento.update({ where: { id: itemId }, data: { tom_tocado: t } })
        revalidar(item.evento_id)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao mudar o tom.')
    }
}

// ── REPERTORIO ────────────────────────────────────────────────────────────────

export interface DadosMusica {
    titulo: string
    artista?: string | null
    tom?: string | null
    bpm?: number | null
    link_letra?: string | null
    link_cifra?: string | null
    link_audio?: string | null
    link_video?: string | null
}

function limparLink(v: string | null | undefined, nome: string): string | null {
    const s = (v ?? '').trim()
    if (!s) return null
    let u: URL
    try { u = new URL(s) } catch { throw new Error(`O link de ${nome} não é válido.`) }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`O link de ${nome} não é válido.`)
    return u.toString()
}

function limparMusica(d: DadosMusica) {
    const titulo = (d.titulo ?? '').trim()
    if (!titulo) throw new Error('Falta o nome da música.')
    if (titulo.length > 120) throw new Error('O nome da música é demasiado longo.')
    const tom = (d.tom ?? '').trim() || null
    if (tom && !tomValido(tom)) throw new Error('Tom inválido (ex.: G, Am, F#, D/F#).')
    const bpm = d.bpm == null || Number.isNaN(Number(d.bpm)) ? null : Math.round(Number(d.bpm))
    if (bpm !== null && (bpm < 30 || bpm > 300)) throw new Error('O BPM deve estar entre 30 e 300.')
    return {
        titulo,
        artista: (d.artista ?? '').trim().slice(0, 120) || null,
        tom,
        bpm,
        link_letra: limparLink(d.link_letra, 'letra'),
        link_cifra: limparLink(d.link_cifra, 'cifra'),
        link_audio: limparLink(d.link_audio, 'áudio'),
        link_video: limparLink(d.link_video, 'vídeo'),
    }
}

/** Cria uma musica no repertorio da igreja (e, se vier um culto, junta-a a setlist). */
export async function criarMusica(dados: DadosMusica, culto?: { eventoId: number; tom: string }): Promise<Resultado<{ id: string }>> {
    try {
        const { db, sessao } = await exigirGestor()
        const limpo = limparMusica(dados)
        const igual = await db.musica.findFirst({
            where: { titulo: { equals: limpo.titulo, mode: 'insensitive' }, artista: limpo.artista ? { equals: limpo.artista, mode: 'insensitive' } : null },
            select: { id: true },
        })
        if (igual) return { ok: false, error: 'Esta música já está no repertório.' }
        const m = await db.musica.create({ data: { ...limpo, tenant_id: sessao.tenantId }, select: { id: true } })
        if (culto) {
            const r = await adicionarMusicaNaEscala(culto.eventoId, m.id, culto.tom || limpo.tom || '')
            if (r.ok === false) return { ok: false, error: `Música criada, mas não entrou no culto: ${r.error}` }
        }
        revalidar()
        return { ok: true, id: m.id }
    } catch (e) {
        return erro(e, 'Erro ao criar a música.')
    }
}

export async function editarMusica(id: string, dados: DadosMusica): Promise<Resultado> {
    try {
        const { db } = await exigirGestor()
        const existe = await db.musica.findUnique({ where: { id }, select: { id: true } })
        if (!existe) return { ok: false, error: 'Música não encontrada.' }
        await db.musica.update({ where: { id }, data: limparMusica(dados) })
        revalidar()
        revalidatePath(`/louvor/musicas/${id}`)
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao guardar a música.')
    }
}

/** Apaga uma musica que nunca foi usada num culto (as usadas ficam no historico). */
export async function apagarMusica(id: string): Promise<Resultado> {
    try {
        const { db } = await exigirGestor()
        const m = await db.musica.findUnique({ where: { id }, select: { id: true, _count: { select: { eventos: true } } } })
        if (!m) return { ok: false, error: 'Música não encontrada.' }
        if (m._count.eventos > 0) return { ok: false, error: 'Esta música já foi tocada num culto e fica no histórico. Não pode ser apagada.' }
        await db.musica.delete({ where: { id } })
        revalidar()
        return { ok: true }
    } catch (e) {
        return erro(e, 'Erro ao apagar a música.')
    }
}

/** Pesquisa no repertorio (para juntar a um culto). */
export async function pesquisarRepertorio(texto: string) {
    try {
        const { db } = await exigirGestor()
        const t = texto.trim()
        const lista = await db.musica.findMany({
            where: t ? { OR: [{ titulo: { contains: t, mode: 'insensitive' } }, { artista: { contains: t, mode: 'insensitive' } }, { cifra_interna: { contains: t, mode: 'insensitive' } }] } : {},
            select: { id: true, titulo: true, artista: true, tom: true },
            orderBy: { titulo: 'asc' },
            take: 30,
        })
        return { ok: true as const, musicas: lista }
    } catch (e) {
        return erro(e, 'Erro ao pesquisar.')
    }
}

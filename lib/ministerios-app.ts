// lib/ministerios-app.ts
// Consultas da navegacao "a la LouveApp": os meus ministerios, as escalas de um
// ministerio (por culto) e a pagina de uma escala (equipa + musicas).
// Recebem a sessao ja verificada; tudo passa pelo cliente da igreja.

import { getTenantClient } from '@/lib/prisma'
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import { estadoDaEscala, type EstadoEscala } from '@/lib/escalas-app'

function inicioDeHoje() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

const nomeDe = (m: { first_name: string; last_name: string }) => `${m.first_name} ${m.last_name}`.trim()

export interface Pessoa {
    nome: string
    avatar: string | null
}

// ── MINISTERIOS ───────────────────────────────────────────────────────────────

export interface MeuMinisterio {
    id: number
    nome: string
    foto: string | null
    eLouvor: boolean
    minhas: number      // as minhas proximas escalas neste ministerio
    cultos: number      // proximos cultos com escala neste ministerio
    pessoas: number     // integrantes
    musicas: number     // so no louvor: musicas do repertorio
}

/** Ministerios onde a pessoa esta (ou lidera). Admin: os que fazem escalas (tem funcoes). */
export async function meusMinisterios(sessao: SessionData): Promise<MeuMinisterio[]> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = inicioDeHoje()
    const deptos = await db.departamento.findMany({
        where: isAdmin(sessao.role)
            ? {
                OR: [
                    { funcoes: { some: {} } },
                    { lider_id: sessao.membroId },
                    { integrantes: { some: { membro_id: sessao.membroId } } },
                ],
            }
            : { OR: [{ lider_id: sessao.membroId }, { integrantes: { some: { membro_id: sessao.membroId } } }] },
        select: {
            id: true, nome: true, foto_url: true, e_louvor: true,
            _count: { select: { integrantes: true } },
        },
        orderBy: { nome: 'asc' },
    })
    if (deptos.length === 0) return []

    const ids = deptos.map((d) => d.id)
    const [proximas, totalMusicas] = await Promise.all([
        db.escala.findMany({
            where: { departamento_id: { in: ids }, evento: { data: { gte: hoje } } },
            select: { departamento_id: true, evento_id: true, membro_id: true },
        }),
        deptos.some((d) => d.e_louvor) ? db.musica.count() : Promise.resolve(0),
    ])

    return deptos.map((d) => {
        const doDepto = proximas.filter((e) => e.departamento_id === d.id)
        return {
            id: d.id,
            nome: d.nome,
            foto: d.foto_url,
            eLouvor: d.e_louvor,
            minhas: new Set(doDepto.filter((e) => e.membro_id === sessao.membroId).map((e) => e.evento_id)).size,
            cultos: new Set(doDepto.map((e) => e.evento_id)).size,
            pessoas: d._count.integrantes,
            musicas: d.e_louvor ? totalMusicas : 0,
        }
    })
}

/** Ve as escalas do ministerio: admin, quem gere, o lider ou um integrante. */
export async function podeVerMinisterio(sessao: SessionData, deptoId: number): Promise<boolean> {
    if (isAdmin(sessao.role)) return true
    const db = getTenantClient(sessao.tenantId)
    const n = await db.departamento.count({
        where: {
            id: deptoId,
            OR: [{ lider_id: sessao.membroId }, { integrantes: { some: { membro_id: sessao.membroId } } }],
        },
    })
    return n > 0 || (await podeGerirEscalasDoDepartamento(sessao, deptoId))
}

// ── ESCALAS DE UM MINISTERIO ──────────────────────────────────────────────────

export interface CultoDoMinisterio {
    id: number
    nome: string
    data: string
    pessoas: Pessoa[]
    confirmados: number
    musicas: number
    funcoesTotal: number
    funcoesPreenchidas: number
    euEstou: boolean
}

/**
 * Proximas: os cultos das proximas 6 semanas (mesmo os ainda sem ninguem,
 * para o lider os montar; para os outros so os que ja tem escala).
 * Anteriores: os ultimos 20 cultos que tiveram escala deste ministerio.
 */
export async function cultosDoMinisterio(
    sessao: SessionData,
    deptoId: number,
    quando: 'proximas' | 'anteriores',
    gere: boolean,
): Promise<CultoDoMinisterio[]> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = inicioDeHoje()
    const [funcoes, depto] = await Promise.all([
        db.funcaoDepartamento.findMany({ where: { departamento_id: deptoId }, select: { id: true } }),
        db.departamento.findUnique({ where: { id: deptoId }, select: { e_louvor: true } }),
    ])

    const eventos = await db.evento.findMany({
        where: quando === 'proximas'
            ? {
                data: { gte: hoje, lte: new Date(Date.now() + 42 * 86400000) },
                ...(gere ? {} : { escalas: { some: { departamento_id: deptoId } } }),
            }
            : { data: { lt: hoje }, escalas: { some: { departamento_id: deptoId } } },
        select: {
            id: true, nome: true, data: true,
            escalas: {
                where: { departamento_id: deptoId },
                select: {
                    membro_id: true, funcao_id: true, confirmado: true, motivo_recusa: true,
                    membro: { select: { first_name: true, last_name: true, avatar_file: true } },
                },
                orderBy: { id: 'asc' },
            },
            _count: { select: { repertorio: true } },
        },
        orderBy: { data: quando === 'proximas' ? 'asc' : 'desc' },
        take: 20,
    })

    return eventos.map((ev) => {
        const ativas = ev.escalas.filter((e) => !e.motivo_recusa)
        const vistos = new Set<number>()
        const pessoas: Pessoa[] = []
        for (const e of ativas) {
            if (vistos.has(e.membro_id)) continue
            vistos.add(e.membro_id)
            pessoas.push({ nome: nomeDe(e.membro), avatar: e.membro.avatar_file })
        }
        return {
            id: ev.id,
            nome: ev.nome,
            data: ev.data.toISOString(),
            pessoas,
            confirmados: new Set(ativas.filter((e) => e.confirmado).map((e) => e.membro_id)).size,
            musicas: depto?.e_louvor ? ev._count.repertorio : 0,
            funcoesTotal: funcoes.length,
            funcoesPreenchidas: new Set(ativas.map((e) => e.funcao_id).filter(Boolean)).size,
            euEstou: ev.escalas.some((e) => e.membro_id === sessao.membroId),
        }
    })
}

// ── PAGINA DA ESCALA ──────────────────────────────────────────────────────────

export interface Participante {
    escalaId: number
    membroId: number
    nome: string
    avatar: string | null
    funcao: string
    estado: EstadoEscala
    motivo: string | null
}

export interface MusicaDaEscala {
    id: string          // id do item da setlist (RepertorioEvento)
    musicaId: string
    ordem: number
    titulo: string
    artista: string | null
    tomOriginal: string | null
    tom: string
    bpm: number | null
    temCifra: boolean
    holyricsId: string | null
    links: { letra: string | null; cifra: string | null; audio: string | null; video: string | null }
}

export interface DadosEscala {
    evento: { id: number; nome: string; data: string }
    departamento: { id: number; nome: string; eLouvor: boolean }
    participantes: Participante[]
    funcoes: { id: number; nome: string; pessoas: Participante[] }[]
    musicas: MusicaDaEscala[]
    minhas: { id: number; funcao: string; estado: EstadoEscala; motivo: string | null }[]
    gere: boolean           // pode mudar as pessoas
    gereMusicas: boolean    // pode mudar as musicas
}

/** Tudo o que a pagina de uma escala mostra. null se nao existir ou nao puder ver. */
export async function dadosDaEscala(sessao: SessionData, eventoId: number, deptoId: number): Promise<DadosEscala | null> {
    if (!eventoId || !deptoId) return null
    const db = getTenantClient(sessao.tenantId)
    const [depto, evento] = await Promise.all([
        db.departamento.findUnique({ where: { id: deptoId }, select: { id: true, nome: true, e_louvor: true } }),
        db.evento.findUnique({ where: { id: eventoId }, select: { id: true, nome: true, data: true } }),
    ])
    if (!depto || !evento) return null

    const [funcoes, escalas, repertorio, gere] = await Promise.all([
        db.funcaoDepartamento.findMany({ where: { departamento_id: deptoId }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
        db.escala.findMany({
            where: { evento_id: eventoId, departamento_id: deptoId },
            include: {
                membro: { select: { first_name: true, last_name: true, avatar_file: true } },
                funcao_ref: { select: { nome: true } },
            },
            orderBy: { id: 'asc' },
        }),
        depto.e_louvor
            ? db.repertorioEvento.findMany({ where: { evento_id: eventoId }, include: { musica: true }, orderBy: { ordem: 'asc' } })
            : Promise.resolve([]),
        podeGerirEscalasDoDepartamento(sessao, deptoId),
    ])

    const estouNela = escalas.some((e) => e.membro_id === sessao.membroId)
    if (!estouNela && !gere && !(await podeVerMinisterio(sessao, deptoId))) return null

    const participantes: Participante[] = escalas.map((e) => ({
        escalaId: e.id,
        membroId: e.membro_id,
        nome: nomeDe(e.membro),
        avatar: e.membro.avatar_file,
        funcao: e.funcao_ref?.nome || e.funcao,
        estado: estadoDaEscala(e),
        motivo: e.motivo_recusa,
    }))

    return {
        evento: { id: evento.id, nome: evento.nome, data: evento.data.toISOString() },
        departamento: { id: depto.id, nome: depto.nome, eLouvor: depto.e_louvor },
        participantes,
        funcoes: funcoes.map((f) => ({ id: f.id, nome: f.nome, pessoas: participantes.filter((p) => escalas.find((e) => e.id === p.escalaId)?.funcao_id === f.id) })),
        musicas: repertorio.map((r) => ({
            id: r.id,
            musicaId: r.musica_id,
            ordem: r.ordem,
            titulo: r.musica.titulo,
            artista: r.musica.artista,
            tomOriginal: r.musica.tom,
            tom: r.tom_tocado,
            bpm: r.musica.bpm,
            temCifra: !!r.musica.cifra_interna,
            holyricsId: r.musica.holyrics_id,
            links: { letra: r.musica.link_letra, cifra: r.musica.link_cifra, audio: r.musica.link_audio, video: r.musica.link_video },
        })),
        minhas: escalas
            .filter((e) => e.membro_id === sessao.membroId)
            .map((e) => ({ id: e.id, funcao: e.funcao_ref?.nome || e.funcao, estado: estadoDaEscala(e), motivo: e.motivo_recusa })),
        gere,
        gereMusicas: depto.e_louvor && (gere || (await podeGerirRepertorio(sessao))),
    }
}

// ── REPERTORIO ────────────────────────────────────────────────────────────────

export interface MusicaDoRepertorio {
    id: string
    titulo: string
    artista: string | null
    tom: string | null
    bpm: number | null
    temCifra: boolean
    vezes: number
    ultimaVez: string | null
}

/** O repertorio da igreja, por titulo, com quantas vezes e quando foi tocada. */
export async function repertorioDaIgreja(sessao: SessionData): Promise<MusicaDoRepertorio[]> {
    const db = getTenantClient(sessao.tenantId)
    const agora = new Date()
    const musicas = await db.musica.findMany({
        select: {
            id: true, titulo: true, artista: true, tom: true, bpm: true, cifra_interna: true,
            eventos: { where: { evento: { data: { lte: agora } } }, select: { evento: { select: { data: true } } } },
        },
        orderBy: { titulo: 'asc' },
    })
    return musicas.map((m) => {
        const datas = m.eventos.map((e) => e.evento.data.getTime())
        return {
            id: m.id,
            titulo: m.titulo,
            artista: m.artista,
            tom: m.tom,
            bpm: m.bpm,
            temCifra: !!m.cifra_interna,
            vezes: datas.length,
            ultimaVez: datas.length ? new Date(Math.max(...datas)).toISOString() : null,
        }
    })
}

export interface MusicaDetalhe {
    id: string
    titulo: string
    artista: string | null
    tom: string | null
    bpm: number | null
    cifra: string | null
    links: { letra: string | null; cifra: string | null; audio: string | null; video: string | null }
    tocadas: { eventoId: number; nome: string; data: string; tom: string }[]
}

export async function musicaDoRepertorio(sessao: SessionData, id: string): Promise<MusicaDetalhe | null> {
    const db = getTenantClient(sessao.tenantId)
    const m = await db.musica.findUnique({
        where: { id },
        include: {
            eventos: {
                select: { tom_tocado: true, evento: { select: { id: true, nome: true, data: true } } },
                orderBy: { evento: { data: 'desc' } },
                take: 10,
            },
        },
    })
    if (!m) return null
    return {
        id: m.id,
        titulo: m.titulo,
        artista: m.artista,
        tom: m.tom,
        bpm: m.bpm,
        cifra: m.cifra_interna,
        links: { letra: m.link_letra, cifra: m.link_cifra, audio: m.link_audio, video: m.link_video },
        tocadas: m.eventos.map((e) => ({ eventoId: e.evento.id, nome: e.evento.nome, data: e.evento.data.toISOString(), tom: e.tom_tocado })),
    }
}

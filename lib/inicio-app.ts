// lib/inicio-app.ts
// O resto do Inicio (alem das escalas): termos por assinar, aniversariantes do
// mes e os cultos da semana. Recebem a sessao ja verificada.

import { getTenantClient } from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'
import { lerArea, type PontoArea } from '@/lib/area-grupo'

/** O membro tem de aceitar (ou renovar) os termos de protecao de dados. */
export async function termosPorAssinar(sessao: SessionData): Promise<boolean> {
    const db = getTenantClient(sessao.tenantId)
    const m = await db.membro.findUnique({ where: { id: sessao.membroId }, select: { gdpr_aceite: true, gdpr_validade: true } })
    if (!m) return false
    return !m.gdpr_aceite || (!!m.gdpr_validade && m.gdpr_validade < new Date())
}

export interface Aniversariante {
    id: number
    nome: string
    avatar: string | null
    dia: number
    hoje: boolean
}

/** Quem faz anos este mes (membros ativos), pelo dia. */
export async function aniversariantesDoMes(sessao: SessionData): Promise<Aniversariante[]> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = new Date()
    const membros = await db.membro.findMany({
        where: { is_active: true, birthdate: { not: null } },
        select: { id: true, first_name: true, last_name: true, avatar_file: true, birthdate: true },
    })
    return membros
        .filter((m) => m.birthdate!.getUTCMonth() === hoje.getMonth())
        .map((m) => ({
            id: m.id,
            nome: `${m.first_name} ${m.last_name}`.trim(),
            avatar: m.avatar_file,
            dia: m.birthdate!.getUTCDate(),
            hoje: m.birthdate!.getUTCDate() === hoje.getDate(),
        }))
        // Primeiro quem faz anos de hoje em diante, depois os que ja passaram
        .sort((a, b) => {
            const d = hoje.getDate()
            const ja = (x: Aniversariante) => (x.dia < d ? 1 : 0)
            return ja(a) - ja(b) || a.dia - b.dia
        })
}

export interface CultoDaSemana {
    id: number
    nome: string
    data: string
}

/** Cultos e eventos dos proximos 7 dias. */
export async function cultosDaSemana(sessao: SessionData): Promise<CultoDaSemana[]> {
    const db = getTenantClient(sessao.tenantId)
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const eventos = await db.evento.findMany({
        where: { data: { gte: inicio, lt: new Date(inicio.getTime() + 7 * 86400000) } },
        select: { id: true, nome: true, data: true },
        orderBy: { data: 'asc' },
        take: 8,
    })
    return eventos.map((e) => ({ id: e.id, nome: e.nome, data: e.data.toISOString() }))
}

export interface MeuGrupo {
    id: number
    nome: string
    quando: string
    morada: string
    mapa: string | null
    lideres: string[]
    souLider: boolean
    latitude: number | null
    longitude: number | null
    area: PontoArea[] | null
}

/** Grupos em que participo ou que lidero, com quando e onde se juntam. */
export async function meusGrupos(sessao: SessionData): Promise<MeuGrupo[]> {
    const db = getTenantClient(sessao.tenantId)
    const eu = { some: { id: sessao.membroId } }
    const grupos = await db.grupo.findMany({
        where: { OR: [{ membros: eu }, { lideres: eu }] },
        select: {
            id: true, nome: true, dia_semana: true, horario: true, endereco: true, numero: true,
            bairro: true, cidade: true, latitude: true, longitude: true, area: true,
            lideres: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { nome: 'asc' },
    })
    return grupos.map((g) => {
        const morada = [[g.endereco, g.numero].filter(Boolean).join(', '), g.bairro, g.cidade]
            .map((p) => p?.trim()).filter(Boolean).join(' · ')
        const destino = g.latitude != null && g.longitude != null ? `${g.latitude},${g.longitude}` : morada
        return {
            id: g.id,
            nome: g.nome,
            quando: [g.dia_semana, g.horario].map((p) => p?.trim()).filter(Boolean).join(', às '),
            morada,
            mapa: destino ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}` : null,
            lideres: g.lideres.map((l) => `${l.first_name} ${l.last_name}`.trim()),
            souLider: g.lideres.some((l) => l.id === sessao.membroId),
            latitude: g.latitude,
            longitude: g.longitude,
            area: lerArea(g.area),
        }
    })
}

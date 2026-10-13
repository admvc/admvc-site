// lib/inicio-app.ts
// O resto do Inicio (alem das escalas): termos por assinar, aniversariantes do
// mes e os cultos da semana. Recebem a sessao ja verificada.

import { getTenantClient } from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'

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
        .sort((a, b) => a.dia - b.dia)
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

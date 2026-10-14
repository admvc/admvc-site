// Quem gere as inscrições de um evento: admins da igreja, os líderes do grupo
// organizador ou, se for um departamento, o líder e quem gere as escalas dele.

import prisma from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'

type EventoDono = { tenant_id: number; grupo_id: number | null; departamento_id: number | null }

export async function podeGerirEvento(sessao: SessionData | null, e: EventoDono): Promise<boolean> {
    if (!sessao || sessao.tenantId !== e.tenant_id) return false
    if (sessao.role === 'ADMIN' || sessao.role === 'CONGREGATION_ADMIN') return true
    if (e.grupo_id) {
        const n = await prisma.grupo.count({ where: { id: e.grupo_id, lideres: { some: { id: sessao.membroId } } } })
        if (n > 0) return true
    }
    if (e.departamento_id) {
        const d = await prisma.departamento.findFirst({
            where: {
                id: e.departamento_id,
                OR: [
                    { lider_id: sessao.membroId },
                    { integrantes: { some: { membro_id: sessao.membroId, pode_gerir_escalas: true } } },
                ],
            },
            select: { id: true },
        })
        if (d) return true
    }
    return false
}

/** Os eventos com inscrição que esta pessoa gere (mais recentes primeiro). */
export async function eventosQueGere(sessao: SessionData) {
    const admin = sessao.role === 'ADMIN' || sessao.role === 'CONGREGATION_ADMIN'
    return prisma.eventoInscricao.findMany({
        where: {
            tenant_id: sessao.tenantId,
            ...(admin ? {} : {
                OR: [
                    { grupo: { lideres: { some: { id: sessao.membroId } } } },
                    { departamento: { lider_id: sessao.membroId } },
                    { departamento: { integrantes: { some: { membro_id: sessao.membroId, pode_gerir_escalas: true } } } },
                ],
            }),
        },
        orderBy: { inicio: 'desc' },
        select: {
            id: true, slug: true, titulo: true, inicio: true, estado: true, cor_principal: true,
            _count: { select: { inscricoes: { where: { estado: { not: 'CANCELADA' } } } } },
        },
    })
}

/** A igreja das páginas públicas (a mesma do formulário de visitantes). */
export async function igrejaPublica() {
    return (await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true, nome: true } }))
        ?? (await prisma.tenant.findFirst({ orderBy: { id: 'asc' }, select: { id: true, nome: true } }))
}

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
            id: true, slug: true, titulo: true, inicio: true, estado: true, cor_principal: true, convite_visivel: true, divulgar_em: true,
            _count: { select: { inscricoes: { where: { estado: { not: 'CANCELADA' } } } } },
        },
    })
}

/** A igreja das páginas públicas (a mesma do formulário de visitantes). */
export async function igrejaPublica() {
    return (await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true, nome: true } }))
        ?? (await prisma.tenant.findFirst({ orderBy: { id: 'asc' }, select: { id: true, nome: true } }))
}

/** Quem gere o evento (para os avisos no telemóvel): líderes do grupo ou do departamento. */
export async function gestoresDoEvento(e: EventoDono): Promise<number[]> {
    const ids = new Set<number>()
    if (e.grupo_id) {
        const g = await prisma.grupo.findUnique({ where: { id: e.grupo_id }, select: { lideres: { select: { id: true } } } })
        g?.lideres.forEach(l => ids.add(l.id))
    }
    if (e.departamento_id) {
        const d = await prisma.departamento.findUnique({
            where: { id: e.departamento_id },
            select: { lider_id: true, integrantes: { where: { pode_gerir_escalas: true }, select: { membro_id: true } } },
        })
        if (d?.lider_id) ids.add(d.lider_id)
        d?.integrantes.forEach(i => ids.add(i.membro_id))
    }
    return [...ids]
}

/** Grupos e departamentos que esta pessoa pode pôr a organizar um evento. */
export async function organizadoresPossiveis(sessao: SessionData) {
    const admin = sessao.role === 'ADMIN' || sessao.role === 'CONGREGATION_ADMIN'
    const [grupos, departamentos] = await Promise.all([
        prisma.grupo.findMany({
            where: { tenant_id: sessao.tenantId, ...(admin ? {} : { lideres: { some: { id: sessao.membroId } } }) },
            select: { id: true, nome: true }, orderBy: { nome: 'asc' },
        }),
        prisma.departamento.findMany({
            where: {
                tenant_id: sessao.tenantId,
                ...(admin ? {} : { OR: [{ lider_id: sessao.membroId }, { integrantes: { some: { membro_id: sessao.membroId, pode_gerir_escalas: true } } }] }),
            },
            select: { id: true, nome: true }, orderBy: { nome: 'asc' },
        }),
    ])
    return [
        ...grupos.map(g => ({ valor: `grupo:${g.id}`, nome: `Grupo · ${g.nome}` })),
        ...departamentos.map(d => ({ valor: `departamento:${d.id}`, nome: d.nome })),
    ]
}

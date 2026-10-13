'use server'

// O lider de um ministerio (ou alguem nomeado por ele) SUGERE uma pessoa para a
// equipa, com as funcoes; um administrador aprova (Administracao → Estrutura →
// Gerir departamento → Interessados). Guarda-se como InteresseDepartamento.

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { sendPushToMembros } from '@/lib/web-push'

async function exigirGestor(deptoId: number) {
    const sessao = await requireAuth()
    if (!(await podeGerirEscalasDoDepartamento(sessao, deptoId))) {
        throw new Error('Só o líder do ministério (ou alguém nomeado por ele) pode sugerir pessoas.')
    }
    return { sessao, db: getTenantClient(sessao.tenantId) }
}

const nome = (m: { first_name: string; last_name: string }) => `${m.first_name} ${m.last_name}`.trim()

/** Membros activos da igreja que ainda nao estao nesta equipa (pesquisa pelo nome). */
export async function procurarMembrosParaSugerir(deptoId: number, texto: string) {
    try {
        const { db } = await exigirGestor(deptoId)
        const t = texto.trim()
        if (t.length < 2) return { ok: true as const, membros: [] }
        const partes = t.split(/\s+/)
        const lista = await db.membro.findMany({
            where: {
                is_active: true,
                ministerios: { none: { departamento_id: deptoId } },
                AND: partes.map((p) => ({ OR: [{ first_name: { contains: p, mode: 'insensitive' as const } }, { last_name: { contains: p, mode: 'insensitive' as const } }] })),
            },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
            take: 15,
        })
        return { ok: true as const, membros: lista.map((m) => ({ id: m.id, nome: nome(m) })) }
    } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao pesquisar.' }
    }
}

/** Sugere uma pessoa para a equipa (fica pendente ate um administrador aprovar). */
export async function sugerirPessoaNoMinisterio(deptoId: number, membroId: number, funcoesIds: number[], mensagem?: string) {
    try {
        const { sessao, db } = await exigirGestor(deptoId)
        const [depto, membro, jaEsta, funcoes] = await Promise.all([
            db.departamento.findUnique({ where: { id: deptoId }, select: { id: true, nome: true } }),
            db.membro.findFirst({ where: { id: membroId, is_active: true }, select: { first_name: true, last_name: true } }),
            db.integranteDepartamento.count({ where: { membro_id: membroId, departamento_id: deptoId } }),
            db.funcaoDepartamento.findMany({ where: { id: { in: funcoesIds }, departamento_id: deptoId }, select: { id: true } }),
        ])
        if (!depto || !membro) return { ok: false as const, error: 'Pessoa ou ministério não encontrados.' }
        if (jaEsta) return { ok: false as const, error: 'Esta pessoa já está na equipa.' }

        const dados = {
            sugerido_por_id: sessao.membroId,
            funcoes_ids: funcoes.map((f) => f.id),
            mensagem: (mensagem ?? '').trim().slice(0, 300) || null,
            status: 'PENDENTE',
            criado_em: new Date(),
        }
        await db.interesseDepartamento.upsert({
            where: { membro_id_departamento_id: { membro_id: membroId, departamento_id: deptoId } },
            create: { ...dados, membro_id: membroId, departamento_id: deptoId, tenant_id: sessao.tenantId },
            update: dados,
        })

        // Avisar os administradores da igreja
        const admins = await db.membro.findMany({ where: { role: { in: ['ADMIN', 'CONGREGATION_ADMIN'] }, is_active: true }, select: { id: true } })
        if (admins.length) {
            await sendPushToMembros(admins.map((a) => a.id), {
                title: `Sugestão para ${depto.nome}`,
                body: `${nome(membro)} foi sugerido(a) para a equipa. Aprove em Administração → Estrutura.`,
                url: '/admin/configuracoes',
            }).catch(() => {})
        }

        revalidatePath('/admin/configuracoes')
        return { ok: true as const }
    } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : 'Erro ao enviar a sugestão.' }
    }
}

/** Sugestoes desta equipa ainda por aprovar (para o lider ver o que ja pediu). */
export async function sugestoesPendentes(deptoId: number) {
    const { db } = await exigirGestor(deptoId)
    const lista = await db.interesseDepartamento.findMany({
        where: { departamento_id: deptoId, status: 'PENDENTE' },
        select: { id: true, criado_em: true, membro: { select: { first_name: true, last_name: true } } },
        orderBy: { criado_em: 'desc' },
    })
    return lista.map((s) => ({ id: s.id, nome: nome(s.membro), data: s.criado_em.toISOString() }))
}

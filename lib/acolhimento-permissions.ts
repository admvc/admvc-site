// lib/acolhimento-permissions.ts

export type AcolhimentoRole = 'LIDER' | 'MEMBRO' | 'ADMIN' | 'NONE'

const TERMOS_ACOLHIMENTO = ['acolhimento', 'integração']

export function getAcolhimentoRole(
    membroLogado: {
        ministerios: Array<{ departamento?: { nome: string } | null }>
        departamentos_liderados: Array<{ nome: string }>
    },
    sessionRole: string
): AcolhimentoRole {
    if (sessionRole === 'ADMIN' || sessionRole === 'CONGREGATION_ADMIN') return 'ADMIN'

    const isLider = membroLogado.departamentos_liderados.some(d =>
        TERMOS_ACOLHIMENTO.some(t => d.nome.toLowerCase().includes(t))
    )
    if (isLider) return 'LIDER'

    const isMembro = membroLogado.ministerios.some(m =>
        TERMOS_ACOLHIMENTO.some(t => m.departamento?.nome.toLowerCase().includes(t))
    )
    if (isMembro) return 'MEMBRO'

    return 'NONE'
}

export function podeVerRelatorio(role: AcolhimentoRole): boolean {
    return role === 'ADMIN' || role === 'LIDER'
}

export function podeGerirEquipa(role: AcolhimentoRole): boolean {
    return role === 'ADMIN' || role === 'LIDER'
}

export function podeVerNotasLider(role: AcolhimentoRole): boolean {
    return role === 'ADMIN' || role === 'LIDER'
}

/**
 * Quem pode ficar responsável por visitantes: integrantes e líderes dos
 * departamentos de acolhimento/integração da igreja (por ordem de nome).
 */
export async function equipaAcolhimento(tenantId: number): Promise<Array<{ id: number; nome: string }>> {
    const { default: prisma } = await import('@/lib/prisma')
    const deps = await prisma.departamento.findMany({
        where: {
            tenant_id: tenantId,
            OR: TERMOS_ACOLHIMENTO.map(t => ({ nome: { contains: t, mode: 'insensitive' as const } })),
        },
        select: {
            lider: { select: { id: true, first_name: true, last_name: true, is_active: true } },
            integrantes: { select: { membro: { select: { id: true, first_name: true, last_name: true, is_active: true } } } },
        },
    })
    const porId = new Map<number, string>()
    for (const d of deps) {
        for (const m of [d.lider, ...d.integrantes.map(i => i.membro)]) {
            if (m && m.is_active) porId.set(m.id, `${m.first_name} ${m.last_name}`.trim())
        }
    }
    return [...porId].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
}

/**
 * Para as actions de visitantes: a sessao tem de ser da equipa de acolhimento
 * (nivel MEMBRO) ou lider/admin (nivel LIDER), e o visitante tem de ser da
 * mesma igreja. Lanca erro se nao.
 */
export async function exigirAcolhimento(nivel: 'MEMBRO' | 'LIDER', visitanteId?: number) {
    const { requireAuth } = await import('@/lib/auth-utils')
    const { default: prisma } = await import('@/lib/prisma')
    const sessao = await requireAuth()
    const membro = await prisma.membro.findUnique({
        where: { id: sessao.membroId },
        select: {
            ministerios: { select: { departamento: { select: { nome: true } } } },
            departamentos_liderados: { select: { nome: true } },
        },
    })
    const papel = membro ? getAcolhimentoRole(membro, sessao.role) : 'NONE'
    const ok = nivel === 'LIDER' ? podeGerirEquipa(papel) : papel !== 'NONE'
    if (!ok) throw new Error(nivel === 'LIDER' ? 'Só líderes do acolhimento.' : 'Só a equipa de acolhimento.')
    if (visitanteId !== undefined) {
        const v = await prisma.visitante.findUnique({ where: { id: visitanteId }, select: { tenant_id: true } })
        if (!v || v.tenant_id !== sessao.tenantId) throw new Error('Visitante não encontrado.')
    }
    return sessao
}

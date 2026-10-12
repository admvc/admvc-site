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

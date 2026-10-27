// lib/obreiros-permissions.ts

export type ObreirosRole = 'LIDER' | 'MEMBRO' | 'ADMIN' | 'NONE'

export const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

export function getObreirosRole(
    membroLogado: {
        ministerios: Array<{ departamento?: { nome: string } | null }>
        departamentos_liderados: Array<{ nome: string }>
    },
    sessionRole: string
): ObreirosRole {
    if (sessionRole === 'ADMIN' || sessionRole === 'CONGREGATION_ADMIN') return 'ADMIN'

    const isLider = membroLogado.departamentos_liderados.some(d =>
        TERMOS_DIACONIA.some(t => d.nome.toLowerCase().includes(t))
    )
    if (isLider) return 'LIDER'

    const isMembro = membroLogado.ministerios.some(m =>
        TERMOS_DIACONIA.some(t => m.departamento?.nome.toLowerCase().includes(t))
    )
    if (isMembro) return 'MEMBRO'

    return 'NONE'
}

export function podeGerirObreiros(role: ObreirosRole): boolean {
    return role === 'ADMIN' || role === 'LIDER'
}

export function podeVerRelatorio(role: ObreirosRole): boolean {
    return role === 'ADMIN' || role === 'LIDER'
}

/**
 * Para as actions dos obreiros: equipa da Diaconia (nivel MEMBRO) ou
 * lider/admin para o relatorio (nivel RELATORIO). Lanca erro se nao.
 */
export async function exigirObreiros(nivel: 'MEMBRO' | 'RELATORIO') {
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
    const papel = membro ? getObreirosRole(membro, sessao.role) : 'NONE'
    const ok = nivel === 'RELATORIO' ? podeVerRelatorio(papel) : papel !== 'NONE'
    if (!ok) throw new Error('Sem permissão: só para a equipa da Diaconia.')
    return sessao
}

/**
 * Quem preenche a "Mensagem do culto" (pregador, tema, texto): um
 * administrador, ou quem gere um ministerio de Diaconia/Obreiros (o lider ou
 * alguem nomeado por ele). Antes bastava o papel "LEADER" (qualquer lider).
 */
export async function podeEditarMensagemDoCulto(sessao: { membroId: number; role: string; tenantId: number }): Promise<boolean> {
    const { isAdmin } = await import('@/lib/auth-utils')
    if (isAdmin(sessao.role)) return true
    const { getTenantClient } = await import('@/lib/prisma')
    const { gereDepartamento } = await import('@/lib/escalas-permissoes')
    const n = await getTenantClient(sessao.tenantId).departamento.count({
        where: {
            AND: [
                { OR: TERMOS_DIACONIA.map((t) => ({ nome: { contains: t, mode: 'insensitive' as const } })) },
                gereDepartamento(sessao.membroId),
            ],
        },
    })
    return n > 0
}

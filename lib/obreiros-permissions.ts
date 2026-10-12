// lib/obreiros-permissions.ts

export type ObreirosRole = 'LIDER' | 'MEMBRO' | 'ADMIN' | 'NONE'

const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

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

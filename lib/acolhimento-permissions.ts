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

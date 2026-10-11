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

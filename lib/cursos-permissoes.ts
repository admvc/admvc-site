import prisma from '@/lib/prisma'
import { isAdmin } from '@/lib/auth-utils'

/**
 * Verifica se o membro pode gerir cursos (criar, aprovar, editar, remover).
 * Permite: ADMIN, líderes de departamento, e membros da Diaconia com função Discipulado ou Pastor.
 */
export async function podeGerirCursos(membroId: number, role: string): Promise<boolean> {
    // Admin tem acesso total
    if (isAdmin(role)) return true

    const membro = await prisma.membro.findUnique({
        where: { id: membroId },
        select: {
            // Líder de departamento (qualquer)
            departamentos_liderados: { select: { id: true, nome: true } },
            // Integrante de departamentos com funções
            ministerios: {
                include: {
                    departamento: { select: { nome: true } },
                    funcoes: {
                        include: {
                            funcao: { select: { nome: true } },
                        },
                    },
                },
            },
        },
    })

    if (!membro) return false

    // Líder de qualquer departamento pode gerir
    if (membro.departamentos_liderados.length > 0) return true

    // Membro da Diaconia com função Discipulado ou Pastor
    const diaconiaterms = ['diaconia', 'diácono', 'diacono', 'diaconato']
    const funcoesPermitidas = ['discipulado', 'pastor']

    for (const min of membro.ministerios) {
        const deptoNome = min.departamento?.nome?.toLowerCase() || ''
        const isDiaconia = diaconiaterms.some(t => deptoNome.includes(t))

        if (isDiaconia) {
            // Verificar se tem função de Discipulado ou Pastor
            const temFuncao = min.funcoes.some((fs: any) => {
                const funcaoNome = fs.funcao?.nome?.toLowerCase() || ''
                return funcoesPermitidas.some(f => funcaoNome.includes(f))
            })
            if (temFuncao) return true
        }
    }

    return false
}

/**
 * Verifica se o membro pode gerir sermões (criar, editar, remover pregações).
 * Permite apenas: ADMIN e membros da Diaconia com função Discipulado ou Pastor.
 */
export async function podeGerirSermoes(membroId: number, role: string): Promise<boolean> {
    if (isAdmin(role)) return true

    const membro = await prisma.membro.findUnique({
        where: { id: membroId },
        select: {
            ministerios: {
                include: {
                    departamento: { select: { nome: true } },
                    funcoes: {
                        include: {
                            funcao: { select: { nome: true } },
                        },
                    },
                },
            },
        },
    })

    if (!membro) return false

    const diaconiaterms = ['diaconia', 'diácono', 'diacono', 'diaconato']
    const funcoesPermitidas = ['discipulado', 'pastor']

    for (const min of membro.ministerios) {
        const deptoNome = min.departamento?.nome?.toLowerCase() || ''
        const isDiaconia = diaconiaterms.some(t => deptoNome.includes(t))

        if (isDiaconia) {
            const temFuncao = min.funcoes.some((fs: any) => {
                const funcaoNome = fs.funcao?.nome?.toLowerCase() || ''
                return funcoesPermitidas.some(f => funcaoNome.includes(f))
            })
            if (temFuncao) return true
        }
    }

    return false
}

// lib/equipas.ts
// Acesso por equipa: varios modulos estao abertos a quem pertence (ou lidera)
// um departamento cujo nome contem certas palavras — ex. Assistencia Social:
// "social", "despensa", "assist". As paginas ja usavam esta regra para deixar
// entrar; as actions usam-na aqui para nao se contornar.

import prisma from '@/lib/prisma'
import { isAdmin, requireAuth, type Role, type SessionData } from '@/lib/auth-utils'

function normalizar(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** O membro pertence ou lidera um departamento cujo nome contem um dos termos? */
export async function pertenceAEquipa(membroId: number, termos: string[]): Promise<boolean> {
    const membro = await prisma.membro.findUnique({
        where: { id: membroId },
        select: {
            ministerios: { select: { departamento: { select: { nome: true } } } },
            departamentos_liderados: { select: { nome: true } },
        },
    })
    if (!membro) return false
    const t = termos.map(normalizar)
    const nomes = [
        ...membro.ministerios.map((m) => m.departamento?.nome ?? ''),
        ...membro.departamentos_liderados.map((d) => d.nome),
    ].map(normalizar)
    return nomes.some((n) => t.some((termo) => n.includes(termo)))
}

/**
 * Exige sessao e: admin, um dos `papeis` indicados, ou pertencer a equipa.
 * Lanca erro se nao (as actions apanham-no e devolvem a mensagem).
 */
export async function exigirEquipa(termos: string[], papeis: Role[] = [], nomeEquipa = 'esta equipa'): Promise<SessionData> {
    const sessao = await requireAuth()
    if (isAdmin(sessao.role) || papeis.includes(sessao.role as Role)) return sessao
    if (await pertenceAEquipa(sessao.membroId, termos)) return sessao
    throw new Error(`Sem permissão: só para ${nomeEquipa}.`)
}

// Equipas usadas em mais de um sitio (os mesmos termos das paginas)
export const EQUIPA_SOCIAL = ['social', 'despensa', 'assist']
export const EQUIPA_CANTINA = ['cantina']
export const EQUIPA_MIDIA = ['mídia', 'midia', 'comunica']

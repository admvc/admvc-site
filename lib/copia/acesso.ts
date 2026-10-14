/**
 * Quem pode descarregar e restaurar copias: um Super Admin com o papel ADMIN.
 * A copia leva a base de todas as igrejas; o restauro substitui-a.
 */

import prisma from '@/lib/prisma'
import { getSASession, type SASessionData } from '@/lib/sa-auth'

export const SEM_PERMISSAO_COPIA = 'Só um Super Admin com o papel ADMIN pode fazer cópias e restaurar.'

/** A sessao, se for de um ADMIN; null para os outros (e sem sessao). */
export async function saAdmin(): Promise<SASessionData | null> {
    const s = await getSASession()
    if (!s) return null
    const sa = await prisma.superAdmin.findUnique({ where: { id: s.saId }, select: { role: true } })
    return sa?.role === 'ADMIN' ? s : null
}

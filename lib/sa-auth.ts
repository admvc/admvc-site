// lib/sa-auth.ts
// Autenticação separada para Super Admin da plataforma SaaS

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { COOKIE_SA, impressaoDaSenha, lerSessao } from '@/lib/sessao-core'

export interface SASessionData {
    saId: number
    email: string
}

/**
 * Le o cookie de sessao do Super Admin: verifica a assinatura e confirma na
 * base que a conta existe, esta ativa e nao mudou de senha.
 */
export async function getSASession(): Promise<SASessionData | null> {
    const cookieStore = await cookies()
    const payload = await lerSessao(cookieStore.get(COOKIE_SA)?.value)
    if (!payload || payload.t !== 'sa') return null

    const sa = await prisma.superAdmin.findUnique({
        where: { id: payload.sa },
        select: { id: true, email: true, is_active: true, password: true },
    })
    if (!sa || !sa.is_active) return null
    if ((await impressaoDaSenha(sa.password)) !== payload.pw) return null

    return { saId: sa.id, email: sa.email }
}

/**
 * Exige sessão de Super Admin. Redireciona para login se não autenticado.
 * Usar em todas as pages e actions do super-admin.
 */
export async function requireSAAuth(): Promise<SASessionData> {
    const session = await getSASession()
    if (!session) redirect('/super-admin/login')
    return session
}

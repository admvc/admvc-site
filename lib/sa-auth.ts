// lib/sa-auth.ts
// Autenticação separada para Super Admin da plataforma SaaS

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface SASessionData {
    saId: number
    email: string
}

const SA_COOKIE = 'admvc_sa_session'

/**
 * Parseia o cookie de sessão do Super Admin.
 * Formato: "sa_id:X|email:Y"
 */
export async function getSASession(): Promise<SASessionData | null> {
    const cookieStore = await cookies()
    const session = cookieStore.get(SA_COOKIE)
    if (!session?.value) return null

    let saId: number | null = null
    let email: string | null = null

    session.value.split('|').forEach(part => {
        const [key, val] = part.split(':')
        if (key === 'sa_id') saId = parseInt(val)
        if (key === 'email') email = val
    })

    if (!saId || isNaN(saId)) return null
    return { saId, email: email || '' }
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

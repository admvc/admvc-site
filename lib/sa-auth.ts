// lib/sa-auth.ts
// Autenticação separada para Super Admin da plataforma SaaS

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { COOKIE_SA, impressaoDaSenha, lerSessao } from '@/lib/sessao-core'
import { ipDoPedido } from '@/lib/rate-limit'

/** VIEWER só vê; SUPPORT vê e entra nas igrejas (impersonar); ADMIN faz tudo. */
export type PapelSA = 'ADMIN' | 'SUPPORT' | 'VIEWER'
const NIVEL: Record<PapelSA, number> = { VIEWER: 0, SUPPORT: 1, ADMIN: 2 }
export const PAPEIS_SA: PapelSA[] = ['ADMIN', 'SUPPORT', 'VIEWER']

export function papelChega(papel: string, minimo: PapelSA): boolean {
    return (NIVEL[papel as PapelSA] ?? -1) >= NIVEL[minimo]
}

export interface SASessionData {
    saId: number
    email: string
    nome: string
    role: PapelSA
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
        select: { id: true, email: true, nome: true, role: true, is_active: true, password: true },
    })
    if (!sa || !sa.is_active) return null
    if ((await impressaoDaSenha(sa.password)) !== payload.pw) return null

    return { saId: sa.id, email: sa.email, nome: sa.nome, role: (PAPEIS_SA.includes(sa.role as PapelSA) ? sa.role : 'VIEWER') as PapelSA }
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

/**
 * Para as actions: a sessão, se o papel chegar; senão um erro para mostrar.
 * Uso: `const s = await exigirPapelSA('ADMIN'); if ('error' in s) return s`
 */
export async function exigirPapelSA(minimo: PapelSA): Promise<SASessionData | { error: string }> {
    const session = await requireSAAuth()
    if (!papelChega(session.role, minimo)) {
        return { error: minimo === 'ADMIN' ? 'Só um Super Admin com o papel ADMIN pode fazer isto.' : 'O seu papel só permite consultar.' }
    }
    return session
}

/** Fica no registo de ações do Cloud (quem, o quê, de que IP). Nunca falha a ação. */
export async function registarAcaoSA(saId: number, acao: string, detalhes: string) {
    try {
        const ip = ipDoPedido(await headers())
        await prisma.superAdminLog.create({ data: { sa_id: saId, acao, detalhes: detalhes.slice(0, 1000), ip } })
    } catch (err) {
        console.error('[SA] Falha a registar ação:', err)
    }
}

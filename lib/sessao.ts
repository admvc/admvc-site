// lib/sessao.ts
// Criar e apagar os cookies de sessao (so no servidor). A assinatura esta em
// lib/sessao-core.ts; a leitura verificada em lib/auth-utils.ts e lib/sa-auth.ts.

import { cookies } from 'next/headers'
import { assinarSessao, COOKIE_MEMBRO, COOKIE_SA, impressaoDaSenha } from '@/lib/sessao-core'

function opcoes(maxAge: number) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge,
    }
}

export interface MembroParaSessao {
    id: number
    tenant_id: number
    role: string
    password: string | null
    congregacao_id?: number | null
    plano?: string | null
}

/** Grava a sessao do membro. `segundos` e a validade (por omissao, 7 dias). */
export async function criarSessaoMembro(m: MembroParaSessao, segundos = 60 * 60 * 24 * 7) {
    const valor = await assinarSessao({
        t: 'm',
        id: m.id,
        tid: m.tenant_id,
        role: m.role,
        plano: m.plano || 'FREE',
        ...(m.congregacao_id ? { cong: m.congregacao_id } : {}),
        pw: await impressaoDaSenha(m.password),
        exp: Math.floor(Date.now() / 1000) + segundos,
    })
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_MEMBRO, valor, opcoes(segundos))
}

/** Grava a sessao do Super Admin (8 horas). */
export async function criarSessaoSA(sa: { id: number; password: string }, segundos = 60 * 60 * 8) {
    const valor = await assinarSessao({
        t: 'sa',
        sa: sa.id,
        pw: await impressaoDaSenha(sa.password),
        exp: Math.floor(Date.now() / 1000) + segundos,
    })
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_SA, valor, opcoes(segundos))
}

export async function apagarSessaoMembro() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_MEMBRO)
}

export async function apagarSessaoSA() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_SA)
}

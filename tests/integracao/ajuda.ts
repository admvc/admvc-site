// Ajudas dos testes de integracao: "entrar" como um membro da base de teste
// (cookie assinado a serio, lido pelo codigo real) e ler dados para conferir.

import { cookies } from './cookies'
import prisma from '@/lib/prisma'
import { assinarSessao, impressaoDaSenha, COOKIE_MEMBRO } from '@/lib/sessao-core'

export async function membroPorEmail(email: string) {
    const m = await prisma.membro.findUnique({ where: { email } })
    if (!m) throw new Error(`Falta ${email} na base de teste: correr npm run test:db:preparar`)
    return m
}

/** Passa a "estar com sessao" deste membro. */
export async function entrarComo(email: string) {
    const m = await membroPorEmail(email)
    cookies.set(COOKIE_MEMBRO, await assinarSessao({
        t: 'm', id: m.id, tid: m.tenant_id, role: m.role, plano: 'PREMIUM',
        pw: await impressaoDaSenha(m.password), exp: Math.floor(Date.now() / 1000) + 3600,
    }))
    return m
}

export function sair() {
    cookies.clear()
}

/** Corre a action e devolve o resultado, ou { lancou: mensagem } se lancar. */
export async function tentar<T>(f: () => Promise<T>): Promise<T | { lancou: string }> {
    try {
        return await f()
    } catch (e: any) {
        return { lancou: String(e?.message ?? e) }
    }
}

/** Recusado = lancou erro, ou devolveu ok/sucesso/success false, ou trouxe error/erro. */
export function foiRecusado(r: any): boolean {
    if (r == null) return false
    if (typeof r === 'object' && 'lancou' in r) return true
    if (r.ok === false || r.sucesso === false || r.success === false) return true
    return !!(r.error || r.erro)
}

export { prisma }

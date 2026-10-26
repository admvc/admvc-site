// lib/erros-app.ts
// Guarda os erros da app na tabela erros_app (vistos em /super-admin/erros).
// Nunca lança: registar um erro não pode criar outro.

import prisma from '@/lib/prisma'
import { sessaoDoCookie } from '@/lib/auth-utils'
import { codigoErro, type TipoErro } from '@/lib/erros-tipos'

const DIAS_GUARDADOS = 90

const corta = (v: unknown, max: number) => (typeof v === 'string' && v ? v.slice(0, max) : null)

/** Tira do endereço o que não deve ficar no registo (links de entrar/repor a senha levam códigos). */
export function semSegredos(url: string | null | undefined): string | null {
    if (!url) return null
    try {
        const u = new URL(url, 'http://x')
        for (const k of [...u.searchParams.keys()]) if (/token|senha|password|secret|^(code|codigo|key|s)$/i.test(k)) u.searchParams.set(k, '…')
        return url.startsWith('/') ? u.pathname + u.search : u.toString()
    } catch { return url.split('?')[0] }
}

export interface NovoErro {
    origem: 'CLIENTE' | 'SERVIDOR'
    tipo: TipoErro
    mensagem: string
    stack?: string | null
    digest?: string | null
    url?: string | null
    userAgent?: string | null
    codigo?: string | null
    cookieSessao?: string
}

/** Lê um cookie do cabeçalho "cookie" (para o onRequestError, que não tem cookies()). */
export function cookieDoCabecalho(cabecalho: string | null | undefined, nome: string): string | undefined {
    for (const parte of (cabecalho ?? '').split(';')) {
        const [k, ...v] = parte.trim().split('=')
        if (k === nome) return decodeURIComponent(v.join('='))
    }
    return undefined
}

export async function registarErro(e: NovoErro): Promise<string | null> {
    try {
        const sessao = e.cookieSessao ? await sessaoDoCookie(e.cookieSessao).catch(() => null) : null
        let membroNome: string | null = null
        if (sessao) {
            const m = await prisma.membro.findUnique({ where: { id: sessao.membroId }, select: { first_name: true, last_name: true } }).catch(() => null)
            membroNome = m ? `${m.first_name} ${m.last_name}`.trim() : null
        }
        const codigo = e.codigo && /^[A-Z0-9]{6}$/.test(e.codigo) ? e.codigo : codigoErro()
        await prisma.erroApp.create({
            data: {
                codigo,
                origem: e.origem,
                tipo: e.tipo,
                mensagem: corta(e.mensagem, 1000) ?? '(sem mensagem)',
                stack: corta(e.stack, 6000),
                digest: corta(e.digest, 100),
                url: corta(semSegredos(e.url), 500),
                user_agent: corta(e.userAgent, 400),
                tenant_id: sessao?.tenantId ?? null,
                membro_id: sessao?.membroId ?? null,
                membro_nome: membroNome,
            },
        })
        // Limpeza de vez em quando (1 em 50), para não crescer sem fim.
        if (Math.random() < 0.02) {
            await prisma.erroApp.deleteMany({ where: { criado_em: { lt: new Date(Date.now() - DIAS_GUARDADOS * 86400000) } } })
        }
        return codigo
    } catch (err) {
        console.error('[ERROS] não foi possível registar:', err)
        return null
    }
}

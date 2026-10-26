// lib/erros-servidor.ts — chamado pelo onRequestError (instrumentation.ts), só em Node.
import type { Instrumentation } from 'next'
import { registarErro, cookieDoCabecalho } from '@/lib/erros-app'
import { COOKIE_MEMBRO } from '@/lib/sessao-core'

type Args = Parameters<Instrumentation.onRequestError>

export async function registarErroDoServidor(err: Args[0], request: Args[1], context: Args[2]) {
    try {
        const e = err as Error & { digest?: string }
        const cab = (k: string) => {
            const v = request.headers[k]
            return Array.isArray(v) ? v[0] : v
        }
        await registarErro({
            origem: 'SERVIDOR',
            tipo: 'SERVIDOR',
            mensagem: `${e?.name ?? 'Error'}: ${e?.message ?? String(err)} [${context.routeType} ${context.routePath}]`,
            stack: e?.stack,
            digest: e?.digest,
            url: `${request.method} ${request.path}`,
            userAgent: cab('user-agent'),
            cookieSessao: cookieDoCabecalho(cab('cookie'), COOKIE_MEMBRO),
        })
    } catch (e) {
        console.error('[ERROS] onRequestError falhou:', e)
    }
}

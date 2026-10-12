// Mocks do Next para os testes de integracao (setupFiles do vitest.integracao).
import { vi } from 'vitest'
import { cookies } from './cookies'

vi.mock('next/headers', () => ({
    cookies: async () => ({
        get: (n: string) => (cookies.has(n) ? { name: n, value: cookies.get(n)! } : undefined),
        set: (n: string, v: string) => { cookies.set(n, v) },
        delete: (n: string) => { cookies.delete(n) },
    }),
    headers: async () => new Headers({ 'x-forwarded-for': '127.0.0.1', 'user-agent': 'vitest' }),
}))
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (f: any) => f }))
vi.mock('next/navigation', () => ({
    redirect: (u: string) => { throw new Error(`NEXT_REDIRECT:${u}`) },
    notFound: () => { throw new Error('NEXT_NOT_FOUND') },
}))
vi.mock('@/lib/redis', () => ({ redis: null, cached: (_k: string, _t: number, f: any) => f(), invalidatePrefix: async () => {} }))
vi.mock('@/lib/mail', () => ({
    enviarEmailNotificacaoEquipa: async () => ({ ok: true }),
    enviarEmailBoasVindas: async () => ({ ok: true }),
    enviarEmailNovaSenha: async () => ({ ok: true }),
}))

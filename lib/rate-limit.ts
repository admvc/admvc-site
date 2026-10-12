// lib/rate-limit.ts
// Limite de pedidos partilhado entre instancias (Upstash Redis). Na Vercel cada
// instancia tem a sua memoria, por isso um contador em memoria nao protege.
// Sem Redis configurado (desenvolvimento) ou se o Redis falhar, usa a memoria.

import { Ratelimit } from '@upstash/ratelimit'
import { redis } from '@/lib/redis'

const limitadores = new Map<string, Ratelimit>()

function limitador(limit: number, windowMs: number): Ratelimit | null {
    if (!redis) return null
    const chave = `${limit}:${windowMs}`
    let rl = limitadores.get(chave)
    if (!rl) {
        rl = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
            prefix: `rl:${chave}`,
        })
        limitadores.set(chave, rl)
    }
    return rl
}

// ── Em memoria (so quando nao ha Redis) ──────────────────────────────────────
const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimitEmMemoria(identifier: string, limit: number, windowMs: number) {
    const now = Date.now()
    for (const [key, value] of requests) {
        if (now > value.resetAt) requests.delete(key)
    }
    const record = requests.get(identifier)
    if (!record) {
        requests.set(identifier, { count: 1, resetAt: now + windowMs })
        return { success: true, remaining: limit - 1 }
    }
    if (record.count >= limit) return { success: false, remaining: 0 }
    record.count++
    return { success: true, remaining: limit - record.count }
}

/**
 * Conta mais um pedido de `identifier` e diz se ainda cabe no limite
 * (`limit` pedidos em `windowMs` milissegundos).
 */
export async function rateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): Promise<{
    success: boolean
    remaining: number
}> {
    const rl = limitador(limit, windowMs)
    if (rl) {
        try {
            const r = await rl.limit(identifier)
            return { success: r.success, remaining: r.remaining }
        } catch (err) {
            console.error('[RATE LIMIT] Redis indisponivel, a usar memoria:', err)
        }
    }
    return rateLimitEmMemoria(identifier, limit, windowMs)
}

/** IP do cliente: o primeiro valor de x-forwarded-for (o que a Vercel pos). */
export function ipDoPedido(h: Headers): string {
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
}

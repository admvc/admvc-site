import { Redis } from '@upstash/redis'

// Singleton — seguro a nível de módulo (sem conexão TCP persistente)
// Se as env vars não existirem, redis fica null e tudo funciona sem cache.
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const redis: Redis | null = url && token
    ? new Redis({ url, token })
    : null

// ── Helper de cache genérico ─────────────────────────────────────────────────
// Tenta ler do Redis; se miss, executa a função e guarda com TTL.
// Fail-open: se o Redis não estiver disponível, executa a query diretamente.
export async function cached<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>,
): Promise<T> {
    if (redis) {
        try {
            const hit = await redis.get<T>(key)
            if (hit !== null && hit !== undefined) return hit
        } catch {
            // Redis down — fail-open
        }
    }

    const data = await fn()

    if (redis) {
        try {
            await redis.set(key, data, { ex: ttlSeconds })
        } catch {
            // Redis down — não bloqueia
        }
    }

    return data
}

// ── Invalidação por padrão ───────────────────────────────────────────────────
// Apaga todas as keys que começam com o prefixo dado.
// Útil para invalidar cache de um tenant inteiro ou de uma entidade.
export async function invalidatePrefix(prefix: string) {
    if (!redis) return
    try {
        let cursor: string | number = 0
        do {
            const [nextCursor, keys] = await redis.scan(Number(cursor), { match: `${prefix}*`, count: 100 })
            cursor = nextCursor
            if (keys.length > 0) {
                await redis.del(...keys)
            }
        } while (Number(cursor) !== 0)
    } catch {
        // Redis down — falha silenciosa
    }
}

// ── Invalidação de key única ─────────────────────────────────────────────────
export async function invalidateKey(...keys: string[]) {
    if (!redis) return
    try {
        if (keys.length > 0) await redis.del(...keys)
    } catch {
        // Redis down — falha silenciosa
    }
}

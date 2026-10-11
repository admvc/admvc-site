// lib/rate-limit.ts
// Simple in-memory rate limiter (good for single-instance deployments)
// For multi-instance (Vercel), consider @upstash/ratelimit

const requests = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(identifier: string, limit: number = 10, windowMs: number = 60000): {
    success: boolean
    remaining: number
} {
    const now = Date.now()
    const record = requests.get(identifier)

    if (!record || now > record.resetAt) {
        requests.set(identifier, { count: 1, resetAt: now + windowMs })
        return { success: true, remaining: limit - 1 }
    }

    if (record.count >= limit) {
        return { success: false, remaining: 0 }
    }

    record.count++
    return { success: true, remaining: limit - record.count }
}

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of requests) {
        if (now > value.resetAt) requests.delete(key)
    }
}, 60000)

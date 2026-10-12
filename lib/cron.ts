// lib/cron.ts
// As rotas de cron so correm com o CRON_SECRET certo (a Vercel envia-o em
// "Authorization: Bearer ..."). Sem CRON_SECRET configurado, ninguem passa.

export function cronAutorizado(request: Request): boolean {
    const segredo = process.env.CRON_SECRET
    if (!segredo) return false
    return request.headers.get('authorization') === `Bearer ${segredo}`
}

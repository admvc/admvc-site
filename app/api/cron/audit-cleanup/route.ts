// app/api/cron/audit-cleanup/route.ts
// Vercel Cron — limpa logs de auditoria antigos conforme retenção do plano
// Configurar em vercel.json: { "crons": [{ "path": "/api/cron/audit-cleanup", "schedule": "0 3 * * *" }] }

import { NextResponse } from 'next/server'
import { limparLogsAntigos } from '@/lib/audit'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resultado = await limparLogsAntigos()
    return NextResponse.json({
        ok: true,
        removidos: resultado.removidos,
        timestamp: new Date().toISOString(),
    })
}

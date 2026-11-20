// app/api/cron/rotinas/route.ts
// Para o cron-job.org, DE HORA A HORA (NÃO está no vercel.json). A cada passagem só faz algo na hora do alerta (por omissão 18h de Lisboa:
// os cultos de AMANHÃ; 8h: os de HOJE ainda por postar). Avisa por email + push quem está escalado no telão e o líder; o registo
// (rotina_registos) impede repetir. Protegida como os outros crons: Authorization: Bearer <CRON_SECRET>.
// `?ensaio=1` não envia nada nem regista: devolve o que faria. Só no ensaio, `&tipo=d1|dia` mostra o que faria a outra hora.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { cronAutorizado } from '@/lib/cron'
import { enviarAlertas } from '@/lib/rotina-alertas'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
    if (!cronAutorizado(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const q = new URL(request.url).searchParams
    const ensaio = q.get('ensaio') === '1'
    const forcar = ensaio ? (q.get('tipo') === 'd1' ? 'alerta_d1' : q.get('tipo') === 'dia' ? 'alerta_dia' : undefined) : undefined
    try {
        const igrejas = await prisma.tenant.findMany({ where: { status: 'ATIVO' }, select: { id: true } })
        const resultados = []
        for (const t of igrejas) resultados.push({ igreja: t.id, ...(await enviarAlertas(t.id, new Date(), { ensaio, forcar })) })
        return NextResponse.json({ ok: true, ...(ensaio ? { ensaio: true } : {}), resultados })
    } catch (error) {
        console.error('[CRON ROTINAS] Erro:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Erro ao correr as rotinas.' }, { status: 500 })
    }
}

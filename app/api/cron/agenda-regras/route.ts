// app/api/cron/agenda-regras/route.ts
// Cron diário (ver vercel.json): mantém os próximos 3 meses das regras repetidas da agenda (reuniões de grupo e
// cultos direcionados) sempre criados. Não repete nem mexe no que já existe. `?ensaio=1` só diz quantas regras há.
import { NextResponse } from 'next/server'
import prisma, { getTenantClient } from '@/lib/prisma'
import { cronAutorizado } from '@/lib/cron'
import { gerarRegra, type RegraGerar } from '@/lib/agenda-regras'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
    if (!cronAutorizado(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const regras = await prisma.regraAgenda.findMany({ where: { ativo: true } })
    if (new URL(request.url).searchParams.get('ensaio') === '1') return NextResponse.json({ ok: true, ensaio: true, regras: regras.length })

    let criados = 0
    const avisos: string[] = []
    for (const r of regras) {
        try {
            const res = await gerarRegra(getTenantClient(r.tenant_id), r.tenant_id, r as RegraGerar)
            criados += res.criados
            avisos.push(...res.avisos.map((a) => `regra ${r.id}: ${a}`))
        } catch (e) {
            avisos.push(`regra ${r.id}: ${e instanceof Error ? e.message : 'erro'}`)
        }
    }
    return NextResponse.json({ ok: true, regras: regras.length, criados, avisos })
}

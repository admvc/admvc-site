// app/api/cron/youtube-live/route.ts
// Para o cron-job.org (a cada 2 minutos no dia do culto; NÃO está no vercel.json): quando a live do culto arranca passa a capa
// "EM DIRETO · AGORA"; quando termina, a de arquivo com a data e o título final. Cada live/estado só uma vez (registo).
// Protegida como os outros crons: Authorization: Bearer <CRON_SECRET>. `?ensaio=1` só diz se o YouTube está ligado e quantos cultos há hoje.
import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { youtubeLigado } from '@/lib/youtube'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { passoAutomatico } from '@/lib/youtube-live'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
    if (!cronAutorizado(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (new URL(request.url).searchParams.get('ensaio') === '1') return NextResponse.json({ ok: true, ensaio: true, ligado: youtubeLigado() || simuladoAtivo() })
    const tenantId = await tenantPublico()
    if (!tenantId) return NextResponse.json({ ok: true, ligado: false, cultos: 0, passos: [] })
    try {
        return NextResponse.json({ ok: true, ...(await passoAutomatico(tenantId)) })
    } catch (e) {
        // erro do YouTube (quota, autorização…): responde 200 com o aviso para o cron-job.org não desligar o trabalho
        return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : 'erro' })
    }
}

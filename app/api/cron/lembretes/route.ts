// app/api/cron/lembretes/route.ts
// Cron diario (de manha, ver vercel.json): avisa quem serve amanha (vespera) e
// quem serve hoje. A conta esta em lib/lembretes-escala.ts.
// `?ensaio=1` so diz o que enviaria, sem enviar.
import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import { sendPushToMembro } from '@/lib/web-push'
import { lembretesDeHoje } from '@/lib/lembretes-escala'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!cronAutorizado(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const lembretes = await lembretesDeHoje()
        if (new URL(request.url).searchParams.get('ensaio') === '1') {
            return NextResponse.json({ ok: true, ensaio: true, lembretes: lembretes.length, exemplos: lembretes.slice(0, 5) })
        }

        let enviados = 0
        let semAvisos = 0
        for (const l of lembretes) {
            const r = await sendPushToMembro(l.membroId, { title: l.title, body: l.body, url: l.url })
            if (r.sent) enviados++
            else semAvisos++
        }
        return NextResponse.json({ ok: true, lembretes: lembretes.length, enviados, semAvisos })
    } catch (error) {
        console.error('[CRON LEMBRETES] Erro:', error)
        return NextResponse.json({ error: 'Erro ao enviar os lembretes.' }, { status: 500 })
    }
}

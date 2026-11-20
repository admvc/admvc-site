// app/api/cron/youtube-live/route.ts
// Para o cron-job.org (uma vez por dia e a cada 2 minutos no dia do culto; NÃO está no vercel.json). Cada passagem faz duas coisas, ambas idempotentes:
//  1. as lives dos próximos 7 dias (lib/youtube-agendar.ts): cria as que faltam, atualiza se o culto mudou de hora/tema, apaga se deixou de ser
//     transmitido (só antes de começar) e liga à chave fixa SÓ a próxima;
//  2. a capa "EM DIRETO · AGORA" quando a live arranca e a de arquivo quando termina (lib/youtube-live.ts).
// Protegida como os outros crons: Authorization: Bearer <CRON_SECRET>. `?ensaio=1` só diz o que faria (lê o YouTube, não escreve nada).
import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { ErroYoutube } from '@/lib/youtube'
import { simuladoAtivo } from '@/lib/youtube-simulado'
import { youtubeLigado } from '@/lib/youtube'
import { passoAutomatico } from '@/lib/youtube-live'
import { sincronizarLives } from '@/lib/youtube-agendar'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const texto = (e: unknown) => (e instanceof ErroYoutube || e instanceof Error ? e.message : 'erro')

export async function GET(request: Request) {
    if (!cronAutorizado(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const ensaio = new URL(request.url).searchParams.get('ensaio') === '1'
    const tenantId = await tenantPublico()
    if (!tenantId) return NextResponse.json({ ok: true, ligado: false, cultos: 0, passos: [] })
    if (ensaio && !(youtubeLigado() || simuladoAtivo())) return NextResponse.json({ ok: true, ensaio: true, ligado: false })

    // erro do YouTube (quota, autorização…): responde 200 com o aviso para o cron-job.org não desligar o trabalho
    let lives: Awaited<ReturnType<typeof sincronizarLives>> | { erro: string }
    try { lives = await sincronizarLives(tenantId, { ensaio, origem: 'cron' }) } catch (e) { lives = { erro: texto(e) } }
    if (ensaio) return NextResponse.json({ ok: true, ensaio: true, lives })
    try {
        return NextResponse.json({ ok: true, lives, ...(await passoAutomatico(tenantId)) })
    } catch (e) {
        return NextResponse.json({ ok: false, lives, erro: texto(e) })
    }
}

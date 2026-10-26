// GET /api/agenda/semana?semana=AAAA-MM-DD&c=<casa> — os cartões da "Programação da semana" (sem as mudanças à mão),
// para o editor da página da Agenda os mostrar e deixar mudar. Só a Mídia e a administração.
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { segundaDaSemana } from '@/lib/agenda'
import { cartoesDaSemana } from '@/lib/agenda-semana'

export const runtime = 'nodejs'

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })
    const url = new URL(request.url)
    const pedida = url.searchParams.get('semana')
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const segunda = segundaDaSemana(pedida && /^\d{4}-\d{2}-\d{2}$/.test(pedida) ? pedida : hoje)
    const cong = Number(url.searchParams.get('c')) || null
    const cartoes = await cartoesDaSemana(auth.sessao.tenantId, segunda, cong)
    return NextResponse.json({ semana: segunda, cartoes }, { headers: { 'Cache-Control': 'private, no-store' } })
}

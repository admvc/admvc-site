import { NextResponse } from 'next/server'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { cultosPublicados, tenantPublico } from '@/lib/divulgacao-publica'

export const dynamic = 'force-dynamic'

// Os cultos dos próximos 14 dias com artes publicadas (para partilhar). Só as artes das REDES, nunca as do telão.
export async function GET(request: Request) {
    try {
        const { success } = await rateLimit(`divulgacao:${ipDoPedido(request.headers)}`, 30, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })

        const tenant = await tenantPublico()
        if (!tenant) return NextResponse.json({ ok: true, data: [] })
        const cultos = await cultosPublicados(tenant)
        return NextResponse.json({ ok: true, data: cultos.map(({ telao: _telao, ...c }) => c) }, { headers: { 'Cache-Control': 'public, max-age=60' } })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao buscar divulgação:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

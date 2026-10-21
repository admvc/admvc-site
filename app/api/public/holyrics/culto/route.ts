// Para o módulo do Holyrics "Receber o culto do portal", com a chave gerada em Mídia (sem login).
//   ?chave=…            → { cultos: [{ id, data, nome, musicas, artes }] } (de hoje a +21 dias)
//   ?chave=…&evento=N   → { culto, musicas, artes (só as do TELÃO, com a secção da lista), escala, rotina }
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { cultoCompleto, cultosDoApp } from '@/lib/holyrics-culto'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { success } = await rateLimit(`holyrics-culto:${ipDoPedido(request.headers)}`, 20, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })

        const q = new URL(request.url).searchParams
        const tenantId = await tenantPublico()
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
        if (!tenantId || !chaveCerta(q.get('chave'), tenant?.holyrics_chave_hash)) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const evento = Number(q.get('evento'))
        if (q.get('evento')) {
            const c = Number.isInteger(evento) && evento > 0 ? await cultoCompleto(tenantId, evento) : null
            return c ? NextResponse.json({ ok: true, ...c }, { headers: { 'Cache-Control': 'no-store' } }) : NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
        }
        return NextResponse.json({ ok: true, cultos: await cultosDoApp(tenantId, 21) }, { headers: { 'Cache-Control': 'no-store' } })
    } catch (error) {
        console.error('[API PUBLIC] Erro no culto para o Holyrics:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

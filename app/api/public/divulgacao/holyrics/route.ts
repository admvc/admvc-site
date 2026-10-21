// Para o módulo do Holyrics ("Trazer as artes do culto"), com a chave gerada em Mídia (sem login).
//   ?chave=…            → { cultos: [{ id, data, nome, artes }] } (de hoje a +14 dias, com artes publicadas)
//   ?chave=…&evento=N   → { culto: { id, nome, data, artes: [{ nome, ficheiro, url }] } } só as artes do TELÃO, pela ordem das peças
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { cultosPublicados, tenantPublico } from '@/lib/divulgacao-publica'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { success } = await rateLimit(`holyrics-artes:${ipDoPedido(request.headers)}`, 20, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })

        const q = new URL(request.url).searchParams
        const tenantId = await tenantPublico()
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
        if (!tenantId || !chaveCerta(q.get('chave'), tenant?.holyrics_chave_hash)) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const evento = Number(q.get('evento')) || undefined
        const cultos = await cultosPublicados(tenantId, 14, evento)
        if (evento) {
            const c = cultos[0]
            if (!c || c.telao.length === 0) return NextResponse.json({ error: 'Este culto não tem artes do telão publicadas.' }, { status: 404 })
            return NextResponse.json({
                ok: true,
                culto: { id: c.id, nome: c.nome, data: c.data, artes: c.telao.map((a, n) => ({ nome: a.nome, ficheiro: `${String(n + 1).padStart(2, '0')}-${a.id}.png`, url: a.url })) },
            })
        }
        return NextResponse.json({ ok: true, cultos: cultos.filter((c) => c.telao.length > 0).map((c) => ({ id: c.id, nome: c.nome, data: c.data, artes: c.telao.length })) })
    } catch (error) {
        console.error('[API PUBLIC] Erro nas artes do Holyrics:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

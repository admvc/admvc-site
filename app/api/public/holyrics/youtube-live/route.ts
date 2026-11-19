// Para o módulo do Holyrics "Capa na live do YouTube", com a chave gerada em Mídia (sem login). O Holyrics NUNCA tem credenciais do Google:
// quem fala com o YouTube é o portal.
//   POST ?chave=…&acao=ver&evento=N[&estado=…]      → { ligado, culto, live (ou null), lives, estadoSugerido, titulos, aviso }
//   POST ?chave=…&acao=aplicar&evento=N&estado=…    → { ok, live, titulo, estado, capaAplicada, aviso }  (troca a capa e o título e regista)
// Erros em português: { error } com 401 (chave), 400 (pedido), 404 (sem live), 409 (YouTube não ligado), 429, 502 (YouTube).
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { ErroYoutube } from '@/lib/youtube'
import { lerEstadoCapa } from '@/lib/youtube-capa-dados'
import { aplicarLive, verLive } from '@/lib/youtube-live'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HTTP: Record<string, number> = { 'nao-ligado': 409, 'sem-autorizacao': 502, 'sem-live': 404, 'sem-verificacao': 502, quota: 502, imagem: 502, video: 404, rede: 502, outro: 502 }

export async function POST(request: Request) {
    try {
        const { success } = await rateLimit(`holyrics-live:${ipDoPedido(request.headers)}`, 20, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })

        const q = new URL(request.url).searchParams
        const tenantId = await tenantPublico()
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
        if (!tenantId || !chaveCerta(q.get('chave'), tenant?.holyrics_chave_hash)) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const acao = q.get('acao')
        const evento = Number(q.get('evento'))
        const estadoPedido = q.get('estado')
        const estado = lerEstadoCapa(estadoPedido)
        if ((acao !== 'ver' && acao !== 'aplicar') || !Number.isInteger(evento) || evento <= 0 || (estadoPedido && !estado) || (acao === 'aplicar' && !estado)) {
            return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        }
        const headers = { 'Cache-Control': 'no-store' }

        if (acao === 'ver') return NextResponse.json({ ok: true, ...(await verLive(tenantId, evento)) }, { headers })

        // aplicar mexe no canal: limite mais apertado
        const { success: podeAplicar } = await rateLimit(`holyrics-live-aplicar:${ipDoPedido(request.headers)}`, 6, 60000)
        if (!podeAplicar) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })
        const r = await aplicarLive(tenantId, evento, estado!, { origem: 'holyrics', por: 'Holyrics' })
        return NextResponse.json({ ok: true, ...r }, { headers })
    } catch (error) {
        if (error instanceof ErroYoutube) return NextResponse.json({ error: error.message, codigo: error.codigo }, { status: HTTP[error.codigo] ?? 502 })
        console.error('[API PUBLIC] Erro na capa da live para o Holyrics:', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

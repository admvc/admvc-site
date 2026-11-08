// A "Programação da semana" do culto em imagem de telão (1920×1080, PNG), para a secção ENCERRAMENTO do Holyrics.
//   ?chave=…&evento=N → PNG da semana (segunda a domingo) em que cai o culto N; num culto de domingo, a semana seguinte
// Sem login: só com a chave do módulo (a mesma das outras rotas /api/public/holyrics). Só devolve a imagem, nunca texto com dados.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { segundaDaSemana } from '@/lib/agenda'
import { cartoesDaSemana, editarCartoes, lerEdicao } from '@/lib/agenda-semana'
import { desenharSemana } from '@/lib/agenda-semana-imagem'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { success } = await rateLimit(`holyrics-agenda:${ipDoPedido(request.headers)}`, 12, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 })

        const q = new URL(request.url).searchParams
        const tenantId = await tenantPublico()
        const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
        if (!tenantId || !chaveCerta(q.get('chave'), tenant?.holyrics_chave_hash)) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        const eventoId = Number(q.get('evento'))
        if (!Number.isInteger(eventoId) || eventoId <= 0) return NextResponse.json({ error: 'Culto inválido.' }, { status: 400 })
        const evento = await prisma.evento.findFirst({ where: { id: eventoId, tenant_id: tenantId }, select: { data: true } })
        if (!evento) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })

        // Num culto de domingo, a semana que interessa anunciar é a seguinte (começa amanhã). A data é Lisboa escrita em UTC.
        const dia = new Date(evento.data)
        if (dia.getUTCDay() === 0) dia.setUTCDate(dia.getUTCDate() + 1)
        const segunda = segundaDaSemana(dia.toISOString().slice(0, 10))
        const edicao = lerEdicao(new URLSearchParams())
        const cartoes = editarCartoes(await cartoesDaSemana(tenantId, segunda, null), edicao)
        const img = await desenharSemana({ cartoes, tamanho: 'telao', variante: 'escuro', titulo: edicao.titulo, rodape: '' })
        img.headers.set('Cache-Control', 'no-store')
        return img
    } catch (error) {
        console.error('[API PUBLIC] Erro na agenda da semana para o Holyrics:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

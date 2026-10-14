import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { inscricoesAbertas } from '@/lib/inscricoes'
import { igrejaPublica } from '@/lib/inscricoes-acesso'

export const dynamic = 'force-dynamic'

// Eventos com inscrições abertas, para o site público (www) mostrar o botão
// "Inscrever-me". Só o que a página pública já mostra; nada das inscrições.
export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        if (!(await rateLimit(`inscricoes-publicas:${ip}`, 30, 60000)).success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }
        const igreja = await igrejaPublica()
        if (!igreja) return NextResponse.json({ ok: true, data: [] })

        const origem = (process.env.APP_URL || 'https://app.igrejaadmvc.org').replace(/\/+$/, '')
        const eventos = await prisma.eventoInscricao.findMany({
            where: { tenant_id: igreja.id, estado: 'ABERTO' },
            orderBy: { inicio: 'asc' },
            select: { slug: true, titulo: true, subtitulo: true, inicio: true, inscricoes_ate: true, estado: true, local: true, preco_eur: true, cor_principal: true },
        })
        const data = eventos.filter(e => inscricoesAbertas(e)).map(e => ({
            slug: e.slug, titulo: e.titulo, subtitulo: e.subtitulo, inicio: e.inicio, local: e.local,
            preco_eur: e.preco_eur, cor: e.cor_principal, url: `${origem}/i/${e.slug}`,
        }))
        return NextResponse.json({ ok: true, data })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao buscar inscrições:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

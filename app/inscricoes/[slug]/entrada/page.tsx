// /inscricoes/<slug>/entrada — no dia: quem chegou (procurar, tocar "Chegou" ou ler o QR do código).
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEvento } from '@/lib/inscricoes-acesso'
import EntradaClient from './EntradaClient'

export const dynamic = 'force-dynamic'

export default async function EntradaPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/inscricoes/${slug}/entrada`)
    const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!evento || !(await podeGerirEvento(sessao, evento))) notFound()

    const inscricoes = await prisma.inscricao.findMany({
        where: { evento_inscricao_id: evento.id, estado: { not: 'CANCELADA' } },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, codigo: true, estado: true, pago: true, presente_em: true },
    })

    return (
        <main className="app-novo max-w-2xl mx-auto px-4 pt-20 md:pt-8 pb-24">
            <EntradaClient
                slug={evento.slug}
                titulo={evento.titulo}
                cor={evento.cor_principal}
                cobra={!!evento.preco_eur && evento.preco_eur > 0}
                inscricoes={inscricoes.map(i => ({ ...i, presente: !!i.presente_em, presente_em: undefined }))}
            />
        </main>
    )
}

// /inscricoes/<slug>/sorteio — sorteio entre quem chegou (ou, sem entradas marcadas, entre as confirmadas).
import { notFound, redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEvento } from '@/lib/inscricoes-acesso'
import SorteioClient from './SorteioClient'

export const dynamic = 'force-dynamic'

export default async function SorteioPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/inscricoes/${slug}/sorteio`)
    const evento = await prisma.eventoInscricao.findUnique({ where: { tenant_id_slug: { tenant_id: sessao.tenantId, slug } } })
    if (!evento || !(await podeGerirEvento(sessao, evento))) notFound()

    const ativas = await prisma.inscricao.findMany({
        where: { evento_inscricao_id: evento.id, estado: { not: 'CANCELADA' } },
        select: { id: true, nome: true, estado: true, presente_em: true },
    })
    const presentes = ativas.filter(i => i.presente_em)
    const base = presentes.length > 0 ? presentes : ativas.filter(i => i.estado === 'CONFIRMADA')

    return (
        <main className="app-novo max-w-xl mx-auto px-4 pt-20 md:pt-8 pb-24">
            <SorteioClient
                slug={evento.slug}
                titulo={evento.titulo}
                cor={evento.cor_principal}
                origem={presentes.length > 0 ? 'presentes' : 'confirmadas'}
                participantes={base.map(i => ({ id: i.id, nome: i.nome }))}
            />
        </main>
    )
}

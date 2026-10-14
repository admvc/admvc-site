// app/doar/page.tsx — /doar sem igreja no endereço: vai para a da sessão, ou
// para a primeira igreja ativa (o mesmo critério das boas-vindas)
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DoarSemIgreja() {
    const tenantId = (await getSessionData())?.tenantId
    const tenant = (tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true } }) : null)
        ?? await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { slug: true } })

    if (!tenant?.slug) notFound()
    redirect(`/doar/${tenant.slug}`)
}

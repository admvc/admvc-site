// app/super-admin/igrejas/[id]/modulos/page.tsx
import prismaGlobal from '@/lib/prisma'
import { notFound } from 'next/navigation'
import GestaoModulosClient from '@/components/superadmin/GestaoModulosClient'
import { requireSAAuth } from '@/lib/sa-auth'

export const dynamic = 'force-dynamic'

export default async function GestaoModulosPage({ params }: { params: Promise<{ id: string }> }) {
    await requireSAAuth()

    const { id } = await params
    const igrejaId = Number(id)
    if (isNaN(igrejaId)) notFound()

    const igreja = await prismaGlobal.tenant.findUnique({
        where: { id: igrejaId },
        include: {
            _count: { select: { membros: true, congregacoes: true, departamentos: true } }
        }
    })

    if (!igreja) notFound()

    return (
        <GestaoModulosClient
            igreja={{
                id: igreja.id,
                nome: igreja.nome,
                slug: igreja.slug,
                plano: igreja.plano,
                modulos_custom: igreja.modulos_custom as string[] | null,
                _count: igreja._count,
            }}
        />
    )
}

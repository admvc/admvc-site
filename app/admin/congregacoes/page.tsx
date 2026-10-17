// app/admin/congregacoes/page.tsx
import { getTenantClient } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import GestaoCongregacoesClient from '@/components/igreja/GestaoCongregacoesClient'
import Breadcrumbs from '@/components/Breadcrumbs'
import { getTenantIdFromHeaders } from '@/lib/db'

export default async function CongregacoesPage() {
    const tenantIdStr = await getTenantIdFromHeaders()

    if (!tenantIdStr) {
        redirect(`/membros/login?error=${encodeURIComponent('Igreja nao identificada.')}`)
    }

    const db = getTenantClient(Number(tenantIdStr))

    const [congregacoes, membrosSemCongregacao] = await Promise.all([
        db.congregacao.findMany({
            orderBy: { nome: 'asc' },
            include: {
                _count: { select: { membros: true, grupos: true } },
                membros: {
                    select: { id: true, first_name: true, last_name: true },
                    orderBy: { first_name: 'asc' }
                }
            }
        }),
        db.membro.findMany({
            where: { congregacao_id: null, is_active: true },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' }
        })
    ])

    return (
        <div className="bg-bg min-h-screen pb-20">
            <Breadcrumbs items={[{ label: 'Congregações' }]} />
            <GestaoCongregacoesClient
                congregacoes={congregacoes}
                membrosSemCongregacao={membrosSemCongregacao}
            />
        </div>
    )
}

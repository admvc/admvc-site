// app/admin/personalizacao/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { redirect } from 'next/navigation'
import PersonalizacaoClient from '@/components/admin/PersonalizacaoClient'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function PersonalizacaoPage() {
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()
    if (!tenantId) redirect('/membros/login')

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            cor_primaria: true,
            cor_secundaria: true,
            cor_fundo: true,
            logo_url: true,
            nome: true,
            youtube_channel_id: true,
            instagram_handle: true,
        }
    })

    if (!tenant) redirect('/admin/dashboard')

    return (
        <>
            <Breadcrumbs items={[{ label: 'Personalização' }]} />
            <PersonalizacaoClient tenant={tenant} />
        </>
    )
}

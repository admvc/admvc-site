import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import HolyricsController from '@/components/midia/HolyricsController'

export default async function HolyricsPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const tenantId = await getTenantIdFromHeaders()

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            holyrics_url: true,
            holyrics_token: true,
        }
    })

    return (
        <HolyricsController
            holyricsUrl={tenant?.holyrics_url || ''}
            holyricsToken={tenant?.holyrics_token || ''}
        />
    )
}

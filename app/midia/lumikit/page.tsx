// app/midia/lumikit/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import LumikitClient from '@/components/midia/LumikitClient'
import type { LumikitConfig } from '@/actions/midia-actions'

export default async function LumikitPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const tenantId = await getTenantIdFromHeaders()
    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { holyrics_url: true, holyrics_token: true, lumikit_cenas: true }
    })

    const config = (tenant?.lumikit_cenas as LumikitConfig | null) || { scenes: [] }

    return (
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Iluminacao</h1>
                <p className="text-xs text-muted">Controlo de cenas via Holyrics + Lumikit.</p>
            </header>
            <LumikitClient
                holyricsUrl={tenant?.holyrics_url || ''}
                holyricsToken={tenant?.holyrics_token || ''}
                scenes={config.scenes}
            />
        </main>
    )
}

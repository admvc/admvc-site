// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import AdminSidebar from '@/components/admin/AdminSidebar'
import CongregacaoFilter from '@/components/admin/CongregacaoFilter'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSessionData()

    if (!session || !['ADMIN', 'CONGREGATION_ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso Restrito a Administradores')
    }

    let admin: any = null
    let tenant: any = null
    let congregacoes: any[] = []

    try {
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        const results = await Promise.all([
            db.membro.findUnique({
                where: { id: session.membroId },
                select: { first_name: true, congregacao_id: true, congregacao: { select: { nome: true } } }
            }),
            tenantId ? db.tenant.findUnique({
                where: { id: tenantId },
                select: { nome: true, logo_url: true }
            }) : null,
            tenantId ? db.congregacao.findMany({
                where: { tenant_id: tenantId },
                select: { id: true, nome: true, cidade: true },
                orderBy: { nome: 'asc' }
            }) : [],
        ])
        admin = results[0]
        tenant = results[1]
        congregacoes = results[2] as any[]
    } catch (err) {
        console.error('[ADMIN LAYOUT] Erro ao carregar dados:', err)
    }

    const isCongAdmin = session.role === 'CONGREGATION_ADMIN'
    const congFixa = isCongAdmin ? admin?.congregacao_id : undefined

    return (
        <div className="min-h-screen bg-bg flex flex-col md:flex-row">
            <AdminSidebar
                adminNome={admin?.first_name}
                igrejaName={tenant?.nome}
                logoUrl={tenant?.logo_url}
                congregacaoNome={admin?.congregacao?.nome}
                role={session.role}
                congregacaoFilter={
                    congregacoes.length > 0 ? (
                        <CongregacaoFilter
                            congregacoes={congregacoes}
                            selected={congFixa ?? undefined}
                            disabled={isCongAdmin}
                        />
                    ) : undefined
                }
            />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    )
}

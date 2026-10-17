// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import AdminSidebar from '@/components/admin/AdminSidebar'
import CongregacaoFilter from '@/components/admin/CongregacaoFilter'
import { modulosAtivosDaIgreja } from '@/lib/modulos'
import FaixaImpersonacao from '@/components/ui/FaixaImpersonacao'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await getSessionData()

    if (!session || !['ADMIN', 'CONGREGATION_ADMIN'].includes(session.role)) {
        redirect(`/membros/dashboard?error=${encodeURIComponent('Acesso Restrito a Administradores')}`)
    }

    let admin: any = null
    let tenant: any = null
    let congregacoes: any[] = []
    let modulos: string[] = []
    let louvorId: number | null = null
    let obreiros = false

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
            modulosAtivosDaIgreja(),
            db.departamento.findFirst({ where: { e_louvor: true }, select: { id: true }, orderBy: { id: 'asc' } }),
            // Ha um ministerio de Diaconia/Obreiros? (a pagina dos Obreiros procura-o pelo nome)
            db.departamento.count({ where: { OR: ['diaconia', 'diácono', 'diacono', 'obreiro'].map((t) => ({ nome: { contains: t, mode: 'insensitive' as const } })) } }),
        ])
        admin = results[0]
        tenant = results[1]
        congregacoes = results[2] as any[]
        modulos = results[3] as string[]
        louvorId = (results[4] as { id: number } | null)?.id ?? null
        obreiros = (results[5] as number) > 0
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
                modulos={modulos}
                louvorHref={louvorId ? `/escalas?equipa=${louvorId}` : null}
                obreiros={obreiros}
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
                <FaixaImpersonacao />
                {children}
            </main>
        </div>
    )
}

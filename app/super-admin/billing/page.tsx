import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import BillingClient from '@/components/superadmin/BillingClient'
import { CreditCard } from 'lucide-react'

export default async function BillingPage() {
    await requireSAAuth()

    const tenants = await prismaGlobal.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            nome: true,
            slug: true,
            plano: true,
            status: true,
            valor_mensal: true,
            plano_inicio: true,
            plano_fim: true,
        },
    })

    const historico = await prismaGlobal.planoHistorico.findMany({
        orderBy: { criado_em: 'desc' },
        take: 20,
    })

    // Enrich historico with tenant names
    const tenantMap = new Map(tenants.map(t => [t.id, t.nome]))
    const historicoEnriched = historico.map(h => ({
        ...h,
        plano_inicio: null as string | null,
        plano_fim: null as string | null,
        criado_em: h.criado_em.toISOString(),
        tenantNome: tenantMap.get(h.tenant_id) || undefined,
    }))

    // Serialize dates for client
    const tenantsForClient = tenants.map(t => ({
        ...t,
        plano_inicio: t.plano_inicio?.toISOString() || null,
        plano_fim: t.plano_fim?.toISOString() || null,
    }))

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="border-b border-[#222] pb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Plataforma</p>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 mt-2">
                    <CreditCard size={32} className="text-blue-400" /> Facturacao
                </h1>
                <p className="text-xs text-gray-500 mt-2">Gestao de planos, valores e estado de facturacao de todas as igrejas.</p>
            </div>

            <BillingClient tenants={tenantsForClient} historico={historicoEnriched} />
        </main>
    )
}

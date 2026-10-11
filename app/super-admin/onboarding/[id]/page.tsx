import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import { notFound } from 'next/navigation'
import OnboardingWizard from '@/components/superadmin/OnboardingWizard'
import Link from 'next/link'
import { ArrowLeft, Rocket } from 'lucide-react'

export default async function OnboardingPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>
    searchParams: Promise<{ step?: string }>
}) {
    await requireSAAuth()

    const { id } = await params
    const { step } = await searchParams
    const tenantId = parseInt(id)
    if (isNaN(tenantId)) notFound()

    const igreja = await prismaGlobal.tenant.findUnique({
        where: { id: tenantId },
        select: {
            id: true,
            nome: true,
            slug: true,
            plano: true,
            logo_url: true,
            cor_primaria: true,
            cor_secundaria: true,
            onboarding_completo: true,
        },
    })
    if (!igreja) notFound()

    const congregacoes = await prismaGlobal.congregacao.findMany({
        where: { tenant_id: tenantId },
        orderBy: { id: 'asc' },
        select: { id: true, nome: true, cidade: true, endereco: true },
    })

    const departamentos = await prismaGlobal.departamento.findMany({
        where: { tenant_id: tenantId },
        orderBy: { id: 'asc' },
        select: { id: true, nome: true, descricao: true, is_global: true },
    })

    const admin = await prismaGlobal.membro.findFirst({
        where: { tenant_id: tenantId, role: 'ADMIN' },
        select: { id: true, first_name: true, last_name: true, email: true },
    })

    const initialStep = Math.min(Math.max(parseInt(step || '1') || 1, 1), 5)

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#222] pb-6">
                <div className="flex items-center gap-4">
                    <Link href="/super-admin/igrejas" className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-[#222] text-gray-400 hover:text-white transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Onboarding</p>
                        <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3 mt-1">
                            <Rocket size={24} className="text-blue-400" /> {igreja.nome}
                        </h1>
                    </div>
                </div>
                {igreja.onboarding_completo && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
                        Concluido
                    </span>
                )}
            </div>

            {/* Wizard */}
            <OnboardingWizard
                igreja={igreja}
                congregacoes={congregacoes}
                departamentos={departamentos}
                admin={admin}
                initialStep={initialStep}
            />
        </main>
    )
}

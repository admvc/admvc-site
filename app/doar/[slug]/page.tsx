import prisma from '@/lib/prisma'
import { getTenantClient } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Heart, Shield } from 'lucide-react'
import FormDonativo from '@/components/financeiro/FormDonativo'

export const dynamic = 'force-dynamic'

export default async function PaginaDonativo({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params

    // Fetch tenant by slug
    const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, nome: true, slug: true, logo_url: true, cor_primaria: true }
    })

    if (!tenant) notFound()

    const db = getTenantClient(tenant.id)

    // Fetch active fundos
    const fundos = await db.fundoFinanceiro.findMany({
        where: { ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' }
    })

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-lg mx-auto px-6 py-6 flex items-center justify-center gap-3">
                    {tenant.logo_url ? (
                        <img src={tenant.logo_url} alt={tenant.nome} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: tenant.cor_primaria || '#3F6B4F' }}
                        >
                            <Heart size={24} className="text-white" />
                        </div>
                    )}
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-gray-900">{tenant.nome}</h1>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Donativo Online</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-lg mx-auto px-6 py-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Fazer um donativo</h2>
                        <p className="text-gray-500 text-sm">
                            A sua contribuicao faz a diferenca. Obrigado pela sua generosidade.
                        </p>
                    </div>

                    <FormDonativo tenantSlug={slug} fundos={fundos} />
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-lg mx-auto px-6 pb-12">
                <div className="flex items-center justify-center gap-2 text-gray-400 text-xs">
                    <Shield size={14} />
                    <span>Donativo seguro &mdash; os seus dados sao confidenciais</span>
                </div>
            </footer>
        </div>
    )
}

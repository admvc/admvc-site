import { requireSAAuth } from '@/lib/sa-auth'
import prismaGlobal from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Palette } from 'lucide-react'
import GestaoTemaClient from '@/components/superadmin/GestaoTemaClient'

export default async function TemaIgrejaPage({ params }: { params: Promise<{ id: string }> }) {
    await requireSAAuth()
    const { id } = await params

    const tenant = await prismaGlobal.tenant.findUnique({
        where: { id: Number(id) },
        select: {
            id: true, nome: true, slug: true,
            cor_primaria: true, cor_secundaria: true, cor_fundo: true,
            logo_url: true, plano: true,
        },
    })

    if (!tenant) redirect('/super-admin/igrejas')

    return (
        <main className="max-w-6xl mx-auto py-10 px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">

            {/* HEADER */}
            <div className="space-y-4">
                <Link href="/super-admin/igrejas"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">
                    <ArrowLeft size={12} /> Voltar a Igrejas
                </Link>

                <header className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: tenant.cor_primaria }}>
                        <Palette size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">
                            Tema Visual
                        </h1>
                        <p className="text-xs text-zinc-400 mt-1">
                            {tenant.nome} <span className="text-zinc-600">({tenant.slug})</span>
                        </p>
                    </div>
                </header>
            </div>

            <GestaoTemaClient tenant={tenant} />
        </main>
    )
}

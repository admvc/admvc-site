import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import ImpersonarClient from '@/components/superadmin/ImpersonarClient'
import { UserCog, AlertTriangle } from 'lucide-react'

export default async function ImpersonarPage() {
    await requireSAAuth()

    const igrejas = await prismaGlobal.tenant.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, slug: true, plano: true },
    })

    return (
        <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="border-b border-[#222] pb-6">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <UserCog size={32} className="text-blue-500" /> Impersonar Igreja
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Aceder como administrador de uma igreja sem necessidade de password.
                </p>
            </div>

            {/* Warning Banner */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5 flex items-start gap-4">
                <AlertTriangle size={24} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm font-bold text-orange-400">Atencao: Todas as acoes serao registadas no log</p>
                    <p className="text-xs text-orange-400/70 mt-1">
                        A impersonacao cria uma sessao de 2 horas. Todas as atividades ficam registadas no historico de auditoria.
                    </p>
                </div>
            </div>

            {/* Church Selector */}
            <ImpersonarClient igrejas={igrejas} />
        </main>
    )
}

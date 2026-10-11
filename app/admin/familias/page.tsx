// app/admin/familias/page.tsx
import Link from 'next/link'
import { getDb } from '@/lib/db'
import NovaFamiliaModal from '@/components/familias/NovaFamiliaModal'
import FamiliasGrid from '@/components/familias/FamiliasGrid'
import { UserX } from 'lucide-react'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function AdminFamiliasPage() {
    const db = await getDb()
    const [familias, qtdMembrosSemVinculo] = await Promise.all([
        db.familia.findMany({
            include: {
                members: {
                    select: {
                        id: true, first_name: true, last_name: true,
                        avatar_file: true, parentesco: true
                    }
                }
            },
            orderBy: { surname: 'asc' }
        }),
        db.membro.count({ where: { familia_id: null } }),
    ])

    const nomesFamiliasExistentes = familias.map(f => f.surname)
    const totalMembrosFamilia = familias.reduce((sum, f) => sum + f.members.length, 0)

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <Breadcrumbs items={[{ label: 'Famílias' }]} />

            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Familias</h1>
                    <p className="text-xs text-muted">
                        {familias.length} familias · {totalMembrosFamilia} membros vinculados
                        {qtdMembrosSemVinculo > 0 && ` · ${qtdMembrosSemVinculo} sem vinculo`}
                    </p>
                </div>
                <NovaFamiliaModal familiasExistentes={nomesFamiliasExistentes} />
            </header>

            {qtdMembrosSemVinculo > 0 && (
                <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <UserX size={14} className="text-orange-500 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                            {qtdMembrosSemVinculo} membro{qtdMembrosSemVinculo !== 1 ? 's' : ''} sem familia
                        </p>
                    </div>
                    <Link href="/admin/membros" className="text-[9px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-800 transition-colors">
                        Ver
                    </Link>
                </div>
            )}

            <FamiliasGrid familias={familias} />
        </main>
    )
}

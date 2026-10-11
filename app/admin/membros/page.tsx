// app/admin/membros/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import MembrosListClient from '@/components/admin/MembrosListClient'
import BotaoGerarQrCodes from '@/components/admin/BotaoGerarQrCodes'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function ListaMembrosAdmin({ searchParams }: { searchParams: Promise<{ congregacao?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined

    const membros = await db.membro.findMany({
        where: congFilter ? { congregacao_id: congFilter } : undefined,
        orderBy: { created_at: 'desc' },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_1: true,
            gender: true,
            id_city: true,
            avatar_file: true,
            status: true,
            role: true,
            baptism_status: true,
            church_role: true,
            data_admissao: true,
            gdpr_aceite: true,
            gdpr_validade: true,
            permanecer_aceite: true,
            permanecer_validade: true,
            familia_id: true,
            qr_code: true,
            departamentos_liderados: { select: { id: true } },
            ministerios: { select: { departamento: { select: { nome: true } } } },
        }
    })

    // KPIs
    const total = membros.length
    const ativos = membros.filter(m => ['ATIVO', 'Ativo'].includes(m.status ?? '')).length
    const pendentes = membros.filter(m => ['PENDENTE', 'Pendente'].includes(m.status ?? '')).length
    const semFamilia = membros.filter(m => !m.familia_id).length

    const semQr = membros.filter(m => !m.qr_code).length

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6">
            <Breadcrumbs items={[{ label: 'Membros' }]} />
            {semQr > 0 && (
                <div className="bg-bg2 border border-soft rounded-2xl p-4 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-muted">
                        {semQr} membro{semQr !== 1 ? 's' : ''} sem QR Code
                    </p>
                    <BotaoGerarQrCodes />
                </div>
            )}
            <MembrosListClient
                membros={membros}
                kpis={{ total, ativos, pendentes, semFamilia }}
            />
        </main>
    )
}
// app/admin/membros/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import MembrosListClient from '@/components/admin/MembrosListClient'
import BotaoGerarQrCodes from '@/components/admin/BotaoGerarQrCodes'
import Breadcrumbs from '@/components/Breadcrumbs'
import Link from 'next/link'
import AtribuirCasa from '@/components/admin/AtribuirCasa'

export default async function ListaMembrosAdmin({ searchParams }: { searchParams: Promise<{ congregacao?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    // "sem" = só os membros sem congregação (para os atribuir de uma vez)
    const soSemCasa = params.congregacao === 'sem' && session?.role === 'ADMIN'
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao && !soSemCasa ? Number(params.congregacao) : undefined

    const [membros, semCasa, congregacoes] = await Promise.all([db.membro.findMany({
        where: soSemCasa ? { congregacao_id: null } : congFilter ? { congregacao_id: congFilter } : undefined,
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
    }),
        session?.role === 'ADMIN' ? db.membro.count({ where: { congregacao_id: null } }) : Promise.resolve(0),
        db.congregacao.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    ])

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
                    <p className="text-[14px] font-bold text-muted">
                        {semQr} membro{semQr !== 1 ? 's' : ''} sem QR Code
                    </p>
                    <BotaoGerarQrCodes />
                </div>
            )}
            {soSemCasa ? (
                <AtribuirCasa congregacoes={congregacoes} membros={membros.map(m => ({ id: m.id, nome: `${m.first_name} ${m.last_name ?? ''}`.trim() }))} />
            ) : semCasa > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <p className="text-[14px] font-semibold text-amber-800">
                        {semCasa} membro{semCasa !== 1 ? 's' : ''} sem congregação: não aparece{semCasa !== 1 ? 'm' : ''} quando se escolhe uma casa.
                    </p>
                    <Link href="/admin/membros?congregacao=sem" className="text-sm font-semibold text-figueira hover:underline">Atribuir a casa →</Link>
                </div>
            )}
            <MembrosListClient
                membros={membros}
                kpis={{ total, ativos, pendentes, semFamilia }}
            />
        </main>
    )
}
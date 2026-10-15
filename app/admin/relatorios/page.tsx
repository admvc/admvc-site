// app/admin/relatorios/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import RelatoriosClient from '@/components/relatorios/RelatoriosClient'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ congregacao?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    // O filtro de congregação do menu (admin de congregação: sempre a sua)
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined
    const membros = await db.membro.findMany({
        // Membros ativos: os do censo vêm como APROVADO (antes ficavam de fora)
        where: { is_active: true, status: { notIn: ['INATIVO', 'ARQUIVADO'] }, ...(congFilter ? { congregacao_id: congFilter } : {}) },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            birthdate: true,
            gender: true,
            marital_status: true,
            baptism_status: true,
            data_admissao: true,
            id_city: true,
            state: true,
            neighborhood: true,
            role: true,
            church_role: true,
            termo_aceite: true,
        }
    });

    return (
        <>
            <Breadcrumbs items={[{ label: 'Relatórios' }]} />
            <RelatoriosClient membros={membros} />
        </>
    );
}
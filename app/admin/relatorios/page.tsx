// app/admin/relatorios/page.tsx
import { getDb } from '@/lib/db'
import RelatoriosClient from '@/components/relatorios/RelatoriosClient'
import Breadcrumbs from '@/components/Breadcrumbs'

export const dynamic = 'force-dynamic'

export default async function RelatoriosPage() {
    const db = await getDb()
    const membros = await db.membro.findMany({
        where: { status: { in: ['Ativo', 'ATIVO'] } },
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
            role: true,
            church_role: true,
            // 👇 NOVA LINHA ADICIONADA AQUI:
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
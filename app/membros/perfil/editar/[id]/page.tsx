// app/membros/perfil/[id]/page.tsx
import { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import MeuPerfilClient from '@/components/membros/MeuPerfilClient'

export default async function EditarMeuPerfilPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const { id: idParam } = await params
    const idParaEditar = Number(idParam)

    // Segurança: só o próprio membro ou ADMIN
    const podeEditar = session.membroId === idParaEditar || isAdmin(session.role)
    if (!podeEditar) {
        redirect('/membros/dashboard?error=Sem permissão para editar este perfil')
    }

    const headersList = await headers()
    const tenantIdStr = headersList.get('x-tenant-id')
    if (!tenantIdStr) redirect('/membros/login?error=Igreja não identificada.')

    const db = getTenantClient(Number(tenantIdStr))

    const [membro, escolaridades, departamentos, interessesExistentes] = await Promise.all([
        db.membro.findUnique({
            where: { id: idParaEditar },
            include: {
                ministerios: { include: { departamento: true } },
                cargos: true,
                grupos: true,
                familia: true,
            }
        }),
        db.escolaridade.findMany({ orderBy: { id: 'asc' } }),
        db.departamento.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
        db.interesseDepartamento.findMany({
            where: { membro_id: idParaEditar },
            select: { departamento_id: true, status: true }
        }),
    ])

    if (!membro) redirect('/membros/dashboard')

    return (
        <div className="bg-bg min-h-screen pt-10">
            <MeuPerfilClient
                membro={membro}
                escolaridades={escolaridades}
                departamentos={departamentos}
                interessesExistentes={interessesExistentes}
            />
        </div>
    )
}
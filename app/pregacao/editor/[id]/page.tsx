import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import EditorSermao from '@/components/pregacao/EditorSermao'

export default async function EditorSermaoPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const { id } = await params
    const tenantId = await getTenantIdFromHeaders()

    const [sermao, membros, eventos] = await Promise.all([
        db.sermao.findFirst({
            where: { id, tenant_id: tenantId },
            include: {
                pregador: { select: { id: true, first_name: true, last_name: true } },
                evento: { select: { id: true, nome: true, data: true } },
                escolasBiblicas: { select: { id: true, titulo: true, data: true } },
            },
        }),
        db.membro.findMany({
            where: { tenant_id: tenantId, is_active: true },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
        }),
        db.evento.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true, data: true },
            orderBy: { data: 'desc' },
            take: 100,
        }),
    ])

    if (!sermao) redirect('/pregacao')

    // Serialize dates for client
    const sermaoSerializado = {
        ...sermao,
        data_pregacao: sermao.data_pregacao.toISOString(),
        created_at: sermao.created_at.toISOString(),
        updated_at: sermao.updated_at.toISOString(),
        evento: sermao.evento
            ? { ...sermao.evento, data: sermao.evento.data.toISOString() }
            : null,
        escolasBiblicas: sermao.escolasBiblicas.map(ebd => ({
            ...ebd,
            data: ebd.data.toISOString(),
        })),
    }

    const eventosSerializados = eventos.map(e => ({
        ...e,
        data: e.data.toISOString(),
    }))

    return (
        <EditorSermao
            sermao={sermaoSerializado}
            membros={membros}
            eventos={eventosSerializados}
        />
    )
}

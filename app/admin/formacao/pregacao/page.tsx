import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import PregacaoClient from '@/components/pregacao/PregacaoClient'

export default async function AdminPregacaoPage({
    searchParams,
}: {
    searchParams: Promise<{ mes?: string; ano?: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const params = await searchParams
    const tenantId = await getTenantIdFromHeaders()

    const agora = new Date()
    const mes = params.mes ? Number(params.mes) : agora.getMonth() + 1
    const ano = params.ano ? Number(params.ano) : agora.getFullYear()

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 1)

    const [sermoes, membros, eventos] = await Promise.all([
        db.sermao.findMany({
            where: { tenant_id: tenantId, data_pregacao: { gte: inicio, lt: fim } },
            include: {
                pregador: { select: { first_name: true, last_name: true, avatar_file: true } },
                evento: { select: { nome: true, data: true } },
            },
            orderBy: { data_pregacao: 'desc' },
        }),
        db.membro.findMany({
            where: { tenant_id: tenantId, is_active: true },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
        }),
        db.evento.findMany({
            where: { tenant_id: tenantId, data: { gte: new Date() } },
            select: { id: true, nome: true, data: true },
            orderBy: { data: 'asc' },
            take: 50,
        }),
    ])

    const sermoesSerializados = sermoes.map(s => ({
        ...s,
        data_pregacao: s.data_pregacao.toISOString(),
        created_at: s.created_at.toISOString(),
        updated_at: s.updated_at.toISOString(),
        evento: s.evento ? { ...s.evento, data: s.evento.data.toISOString() } : null,
    }))

    const eventosSerializados = eventos.map(e => ({ ...e, data: e.data.toISOString() }))

    return (
        <PregacaoClient
            sermoes={sermoesSerializados}
            membros={membros}
            eventos={eventosSerializados}
            mes={mes}
            ano={ano}
            podeGerir={true}
        />
    )
}

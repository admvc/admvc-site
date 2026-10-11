import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import TurmaClient from '@/components/pregacao/TurmaClient'
import { getCachedMembrosAtivos, getCachedSermoes } from '@/lib/cache'

export default async function AdminTurmaPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const { id } = await params
    const tenantId = await getTenantIdFromHeaders()

    const [turma, membros, sermoes] = await Promise.all([
        db.turmaEBD.findFirst({
            where: { id, tenant_id: tenantId },
            include: {
                curso: true,
                professores: { select: { id: true, first_name: true, last_name: true } },
                matriculas: {
                    include: { membro: { select: { id: true, first_name: true, last_name: true } } },
                    orderBy: { membro: { first_name: 'asc' } },
                },
                aulas: {
                    include: {
                        professor: { select: { first_name: true, last_name: true } },
                        _count: { select: { presencas: true } },
                        presencas: { select: { membro_id: true } },
                        sermao: { select: { id: true, titulo: true } },
                    },
                    orderBy: { data: 'desc' },
                },
                atividades: {
                    include: { notas: true, _count: { select: { notas: true } } },
                    orderBy: { created_at: 'desc' },
                },
            },
        }),
        getCachedMembrosAtivos(tenantId),
        getCachedSermoes(tenantId),
    ])

    if (!turma) redirect('/admin/formacao/ebd')

    const turmaSerializada = {
        ...turma,
        created_at: turma.created_at.toISOString(),
        curso: {
            ...turma.curso,
            data_inicio: turma.curso.data_inicio.toISOString(),
            data_fim: turma.curso.data_fim.toISOString(),
            data_abertura_inscricoes: turma.curso.data_abertura_inscricoes?.toISOString() || null,
            aprovado_em: turma.curso.aprovado_em?.toISOString() || null,
            created_at: turma.curso.created_at.toISOString(),
            updated_at: turma.curso.updated_at.toISOString(),
        },
        matriculas: turma.matriculas.map(m => ({ ...m, data_matricula: m.data_matricula.toISOString() })),
        aulas: turma.aulas.map(a => ({ ...a, data: a.data.toISOString(), created_at: a.created_at.toISOString() })),
        atividades: turma.atividades.map(a => ({ ...a, data_entrega: a.data_entrega?.toISOString() || null, created_at: a.created_at.toISOString() })),
    }

    const sermoesSerializados = sermoes.map(s => ({ ...s, data_pregacao: s.data_pregacao.toISOString() }))

    return (
        <TurmaClient
            turma={turmaSerializada}
            membros={membros}
            sermoes={sermoesSerializados}
            podeGerir={true}
            basePath="/admin/formacao/ebd"
            membroId={session.membroId}
        />
    )
}

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import EBDDashboard from '@/components/pregacao/EBDDashboard'
import BotaoCriarPermanecer from '@/components/admin/BotaoCriarPermanecer'
import { getCachedMembrosAtivos, getCachedSermoes, getCachedDepartamentos, getCachedGrupos } from '@/lib/cache'

export default async function AdminEBDPage({
    searchParams,
}: {
    searchParams: Promise<{ ano?: string; mes?: string; sermao_id?: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const params = await searchParams
    const tenantId = await getTenantIdFromHeaders()

    const agora = new Date()
    const ano = params.ano ? Number(params.ano) : agora.getFullYear()
    const mes = params.mes ? Number(params.mes) : agora.getMonth() + 1

    const inicio = new Date(ano, mes - 1, 1)
    const fim = new Date(ano, mes, 1)

    // No admin, membro tem acesso total a departamentos/grupos (para ver restricoes)
    const membroData = await db.membro.findUnique({
        where: { id: session.membroId },
        select: {
            ministerios: { select: { departamento_id: true } },
            departamentos_liderados: { select: { id: true } },
            grupos: { select: { id: true } },
        },
    })
    const membroDeptIds = [
        ...(membroData?.ministerios?.map((m: any) => m.departamento_id).filter(Boolean) || []),
        ...(membroData?.departamentos_liderados?.map((d: any) => d.id) || []),
    ]
    const membroGrupoIds = membroData?.grupos?.map((g: any) => g.id) || []

    const [cursos, aulas, membros, sermoes, departamentos, grupos, minhasMatriculas] = await Promise.all([
        db.cursoEBD.findMany({
            where: { tenant_id: tenantId },
            include: {
                turmas: {
                    include: {
                        professores: { select: { id: true, first_name: true, last_name: true } },
                        _count: { select: { matriculas: true, aulas: true, atividades: true } },
                    },
                },
                criado_por: { select: { first_name: true, last_name: true } },
                aprovado_por: { select: { first_name: true, last_name: true } },
                interesses: {
                    include: { membro: { select: { id: true, first_name: true, last_name: true } } },
                    orderBy: { created_at: 'desc' as const },
                },
                _count: { select: { turmas: true } },
            },
            orderBy: [{ ano: 'desc' }, { created_at: 'desc' }],
        }),
        db.escolaBiblica.findMany({
            where: { tenant_id: tenantId, data: { gte: inicio, lt: fim } },
            include: {
                professor: { select: { first_name: true, last_name: true } },
                sermao: { select: { id: true, titulo: true } },
                turma: { select: { id: true, nome: true } },
                _count: { select: { presencas: true } },
                presencas: { select: { membro_id: true } },
            },
            orderBy: { data: 'desc' },
        }),
        getCachedMembrosAtivos(tenantId),
        getCachedSermoes(tenantId),
        getCachedDepartamentos(tenantId),
        getCachedGrupos(tenantId),
        db.matriculaEBD.findMany({
            where: { membro_id: session.membroId, tenant_id: tenantId },
            select: { turma: { select: { curso_id: true } } },
        }),
    ])

    const meusCursoIds = new Set(minhasMatriculas.map(m => m.turma.curso_id))
    const temPermanecer = cursos.some(c => c.categoria === 'DISCIPULADO' && c.titulo.includes('Permanecer'))

    const cursosSerializados = cursos.map(c => ({
        ...c,
        data_inicio: c.data_inicio.toISOString(),
        data_fim: c.data_fim.toISOString(),
        data_abertura_inscricoes: c.data_abertura_inscricoes?.toISOString() || null,
        aprovado_em: c.aprovado_em?.toISOString() || null,
        created_at: c.created_at.toISOString(),
        updated_at: c.updated_at.toISOString(),
        turmas: c.turmas.map(t => ({ ...t, created_at: t.created_at.toISOString() })),
        interesses: c.interesses.map(i => ({ ...i, created_at: i.created_at.toISOString(), aprovado_em: i.aprovado_em?.toISOString() || null })),
    }))

    const aulasSerializadas = aulas.map(a => ({
        ...a,
        data: a.data.toISOString(),
        created_at: a.created_at.toISOString(),
    }))

    const sermoesSerializados = sermoes.map(s => ({
        ...s,
        data_pregacao: s.data_pregacao.toISOString(),
    }))

    return (
        <>
        {!temPermanecer && <BotaoCriarPermanecer />}
        <EBDDashboard
            cursos={cursosSerializados}
            aulas={aulasSerializadas}
            membros={membros}
            sermoes={sermoesSerializados}
            departamentos={departamentos}
            grupos={grupos}
            mes={mes}
            ano={ano}
            sermaoIdInicial={params.sermao_id || null}
            podeGerir={true}
            membroId={session.membroId}
            meusCursoIds={Array.from(meusCursoIds)}
            membroDeptIds={membroDeptIds}
            membroGrupoIds={membroGrupoIds}
            basePath="/admin/formacao/ebd"
        />
        </>
    )
}

import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import GestaoGrupoClient from '@/components/membros/GestaoGrupoClient'

export default async function GestaoGrupoPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const db = await getDb()
    const session = await getSessionData();
    if (!session) redirect('/login');

    const grupoId = Number(params.id);

    // Busca os dados do grupo
    const grupo = await db.grupo.findUnique({
        where: { id: grupoId },
        include: {
            lideres: { select: { id: true, first_name: true, last_name: true, avatar_file: true } },
            membros: { select: { id: true, first_name: true, last_name: true, phone_1: true, avatar_file: true } },
            encontros: {
                orderBy: { data: 'desc' },
                include: { presentes: { select: { id: true, first_name: true, last_name: true } } }
            }
        }
    });

    if (!grupo) redirect(`/membros/dashboard?error=${encodeURIComponent('Grupo não encontrado')}`);

    // VERIFICAÇÃO DE PAPÉIS
    const isLider = grupo.lideres.some((lider: any) => lider.id === session.membroId);
    const isMembro = grupo.membros.some((membro: any) => membro.id === session.membroId);
    const isAdmin = isAdminCheck(session.role);

    // Se não for líder, nem membro, nem admin, é expulso
    if (!isLider && !isMembro && !isAdmin) {
        redirect(`/membros/dashboard?error=${encodeURIComponent('Acesso negado. Não pertences a este grupo.')}`);
    }

    const temPermissaoEdicao = isLider || isAdmin;

    // Reuniões da agenda do grupo até ao fim de hoje (horas de parede: Lisboa escrita em UTC)
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const fimDeHoje = new Date(new Date(`${hoje}T00:00:00Z`).getTime() + 86400000)
    const reunioes = (await getTenantClient(session.tenantId).agendaDepartamento.findMany({
        where: { grupo_id: grupoId, inicio: { lt: fimDeHoje }, cancelado_em: null },
        orderBy: { inicio: 'desc' }, take: 40,
        select: { id: true, titulo: true, inicio: true, registo: true, presentes: true, foto_url: true, presentes_membros: { select: { id: true, first_name: true, last_name: true } } },
    })).map((r) => ({ ...r, inicio: r.inicio.toISOString() }))

    return <GestaoGrupoClient grupo={grupo} ehLider={temPermissaoEdicao} reunioes={reunioes} />
}
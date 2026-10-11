import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import GestaoGrupoClient from '@/components/membros/GestaoGrupoClient'

export default async function GestaoGrupoPage({ params }: { params: { id: string } }) {
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

    if (!grupo) redirect('/membros/dashboard?error=Grupo não encontrado');

    // VERIFICAÇÃO DE PAPÉIS
    const isLider = grupo.lideres.some((lider: any) => lider.id === session.membroId);
    const isMembro = grupo.membros.some((membro: any) => membro.id === session.membroId);
    const isAdmin = isAdminCheck(session.role);

    // Se não for líder, nem membro, nem admin, é expulso
    if (!isLider && !isMembro && !isAdmin) {
        redirect('/membros/dashboard?error=Acesso negado. Não pertences a este grupo.');
    }

    const temPermissaoEdicao = isLider || isAdmin;

    return <GestaoGrupoClient grupo={grupo} ehLider={temPermissaoEdicao} />
}
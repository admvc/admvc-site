import prismaGlobal, { getTenantClient } from '@/lib/prisma' // 🔄 Importamos os dois clientes
import { headers } from 'next/headers' // 🔄 Importamos os headers
import EditarMembroClient from '@/components/membros/Client'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function EditarMembroPage({ params }: { params: Promise<{ id: string }> }) {

    // --- 1. SEGURANÇA DE ACESSO (ROLE) ---
    const cookieStore = await cookies();
    const session = cookieStore.get('admvc_session');

    // Se não há cookie, expulsa logo
    if (!session) redirect('/membros/login?error=Sessao expirada');

    const sessionValue = decodeURIComponent(session.value);
    const isAdmin = sessionValue.includes('role:ADMIN');

    if (!isAdmin) {
        redirect('/membros/login?error=Acesso restrito a administradores');
    }

    // --- 2. SEGURANÇA MULTITENANT (IGREJA) ---
    const headersList = await headers();
    const tenantIdStr = headersList.get('x-tenant-id');

    if (!tenantIdStr) {
        redirect('/membros/login?error=Igreja não identificada.');
    }

    // Instancia o Prisma blindado para esta igreja
    const db = getTenantClient(Number(tenantIdStr));

    // --- 3. BUSCA DE DADOS ---
    const { id: idParam } = await params;
    const id = Number(idParam);

    if (isNaN(id)) redirect('/admin/membros');

    // DADOS GLOBAIS (Usam o prismaGlobal)
    const escolaridades = await prismaGlobal.escolaridade.findMany({ orderBy: { id: 'asc' } });
    const todosCargos = await prismaGlobal.cargo.findMany({ orderBy: { nome: 'asc' } });

    // DADOS PRIVADOS DA IGREJA (Usam o db multitenant)
    const [membro, todosDeptos, todosGrupos, familias, congregacoes] = await Promise.all([
        db.membro.findFirst({ // 🔄 TROCADO: findUnique por findFirst
            where: { id },
            include: {
                ministerios: { include: { departamento: true } },
                cargos: true,
                grupos: true,
                familia: true,
            }
        }),
        db.departamento.findMany(),
        db.grupo.findMany(),
        db.familia.findMany({
            select: { id: true, surname: true },
            orderBy: { surname: 'asc' }
        }),
        db.congregacao.findMany({
            select: { id: true, nome: true, cidade: true },
            orderBy: { nome: 'asc' }
        })
    ]);

    // Se o membro não existir ou pertencer a outra igreja, o findFirst retorna null
    if (!membro) redirect('/admin/membros');

    const rolesDisponiveis = [
        { label: 'Membro Comum', value: 'USER' },
        { label: 'Lider de Ministerio', value: 'LEADER' },
        { label: 'Admin de Congregacao', value: 'CONGREGATION_ADMIN' },
        { label: 'Financeiro / Tesouraria', value: 'FINANCE' },
        { label: 'Administrador Geral', value: 'ADMIN' },
    ];

    return (
        <EditarMembroClient
            membro={membro}
            todosCargos={todosCargos}
            todosDeptos={todosDeptos}
            todosGrupos={todosGrupos}
            roles={rolesDisponiveis}
            isAdmin={true}
            escolaridades={escolaridades}
            familias={familias}
            congregacoes={congregacoes}
        />
    );
}
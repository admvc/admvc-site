// components/membros/MembroLayoutWrapper.tsx
// Layout reutilizavel para qualquer rota que precisa do header do membro
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import MembroHeader from '@/components/membros/MembroHeader'
import MobileHeader from '@/components/membros/MobileHeader'
import MobileBottomNav from '@/components/membros/MobileBottomNav'
import PullToRefresh from '@/components/ui/PullToRefresh'

export default async function MembroLayoutWrapper({ children }: { children: React.ReactNode }) {
    const session = await getSessionData()
    if (!session) return <>{children}</>

    const headersList = await headers()
    const tenantIdStr = headersList.get('x-tenant-id')
    if (!tenantIdStr) return <>{children}</>

    let membro: any = null
    let tenantData: any = null
    let escolaridades: any[] = []
    let ultimosAvisos: any[] = []
    let visitantesAtualizados: any[] = []
    let proximosEventos: any[] = []

    try {
        const db = getTenantClient(Number(tenantIdStr))

        // IDs de departamentos e grupos do membro para filtrar avisos
        const membroBasico = await db.membro.findUnique({
            where: { id: session.membroId },
            select: {
                ministerios: { select: { departamento_id: true } },
                grupos: { select: { id: true } },
            }
        })
        const deptIds = membroBasico?.ministerios?.map((m: any) => m.departamento_id).filter(Boolean) || []
        const grupoIds = membroBasico?.grupos?.map((g: any) => g.id).filter(Boolean) || []

        const results = await Promise.all([
            db.membro.findUnique({
                where: { id: session.membroId },
                include: {
                    congregacao: { select: { nome: true } },
                    ministerios: { include: { departamento: true } },
                    departamentos_liderados: true,
                }
            }),
            db.tenant.findFirst({ select: { nome: true } }),
            db.escolaridade.findMany({ orderBy: { id: 'asc' } }),
            db.avisoMural.findMany({
                where: {
                    OR: [
                        { departamento_id: { in: deptIds.length > 0 ? deptIds : [-1] } },
                        { grupo_id: { in: grupoIds.length > 0 ? grupoIds : [-1] } }
                    ]
                },
                include: {
                    autor: { select: { first_name: true, last_name: true, avatar_file: true } },
                    departamento: { select: { nome: true } },
                    grupo: { select: { nome: true } }
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            }),
            db.visitante.findMany({
                where: { status: { in: ['NOVO', 'EM_CONTACTO'] } },
                select: { id: true, nome: true, data_ultima_visita: true, status: true },
                orderBy: { data_ultima_visita: 'desc' },
                take: 5
            }),
            db.evento.findMany({
                where: { data: { gte: new Date() } },
                select: { id: true, nome: true, data: true },
                orderBy: { data: 'asc' },
                take: 10,
            }),
        ])
        membro = results[0]
        tenantData = results[1]
        escolaridades = results[2] as any[]
        ultimosAvisos = results[3] as any[]
        visitantesAtualizados = results[4] as any[]
        proximosEventos = (results[5] as any[] || []).map((e: any) => ({
            id: e.id, nome: e.nome, data: e.data.toISOString(),
        }))
    } catch (err) {
        console.error('[MEMBRO LAYOUT] Erro ao carregar dados:', err)
        return <>{children}</>
    }

    if (!membro) return <>{children}</>

    const checkDepto = (termos: string[]) => {
        const inMin = membro.ministerios.some((m: any) => termos.some(t => m.departamento?.nome.toLowerCase().includes(t)))
        const inLid = membro.departamentos_liderados.some((d: any) => termos.some(t => d.nome.toLowerCase().includes(t)))
        return inMin || inLid
    }

    const role = session.role
    const permissoes = {
        isAdmin: isAdmin(role),
        isLider: membro.departamentos_liderados?.length > 0,
        isMidia: checkDepto(['mídia', 'midia', 'multimédia']),
        isAcolhimento: checkDepto(['acolhimento', 'integração']),
        isCantina: checkDepto(['cantina']),
        isFinance: isAdmin(role) || role === 'FINANCE',
        isLouvor: checkDepto(['louvor', 'música', 'musica', 'banda']),
        isDiaconia: checkDepto(['diaconia', 'diácono', 'diacono']),
        isSocial: checkDepto(['social', 'despensa', 'assistência', 'assistencia']),
    }
    const mostraServico = permissoes.isAdmin || permissoes.isFinance || permissoes.isAcolhimento || permissoes.isCantina || permissoes.isMidia || permissoes.isLouvor || permissoes.isLider || permissoes.isDiaconia || permissoes.isSocial

    const alertas = permissoes.isAcolhimento || permissoes.isAdmin ? visitantesAtualizados : []
    const igrejaName = tenantData?.nome || 'Igreja'

    return (
        <>
            {/* Desktop header — hidden on mobile via className inside MembroHeader */}
            <MembroHeader
                membro={membro}
                igrejaName={igrejaName}
                role={role}
                permissoes={permissoes}
                mostraServico={mostraServico}
                escolaridades={escolaridades}
                avisos={ultimosAvisos}
                alertasAcolhimento={alertas}
            />

            {/* Mobile header */}
            <MobileHeader
                membro={membro}
                igrejaName={igrejaName}
                escolaridades={escolaridades}
                avisos={ultimosAvisos}
                alertasAcolhimento={alertas}
                temDepartamento={(membro.ministerios?.length || 0) > 0}
            />

            <PullToRefresh><div className="bg-bg min-h-screen">{children}</div></PullToRefresh>

            {/* Mobile bottom nav */}
            <MobileBottomNav permissoes={permissoes} proximosEventos={proximosEventos} />
        </>
    )
}

// components/membros/MembroLayoutWrapper.tsx
// Layout reutilizavel para qualquer rota que precisa do header do membro
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import MembroHeader from '@/components/membros/MembroHeader'
import CabecalhoApp from '@/components/app/CabecalhoApp'
import BarraBaixo, { type ItemMais } from '@/components/app/BarraBaixo'
import { modulosAtivosDaIgreja } from '@/lib/modulos'
import { MODULOS, type Modulo } from '@/lib/planos'
import PullToRefresh from '@/components/ui/PullToRefresh'
import { getTenantIdFromHeaders } from '@/lib/db'

export default async function MembroLayoutWrapper({ children }: { children: React.ReactNode }) {
    const session = await getSessionData()
    if (!session) return <>{children}</>

    const tenantIdStr = await getTenantIdFromHeaders()
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

    // "Mais" no telemovel: so o que a igreja tem ligado e a pessoa pode usar
    const ativos = await modulosAtivosDaIgreja()
    const temModulo = (m: Modulo) => ativos.includes(m)
    const gruposQueLidera = await getTenantClient(session.tenantId).grupo.findMany({
        where: { lideres: { some: { id: membro.id } } }, select: { id: true, nome: true }, take: 1,
    }).catch(() => [])
    const itensMais: ItemMais[] = []
    if (temModulo(MODULOS.MURAL)) itensMais.push({ chave: 'avisos', texto: 'Avisos', href: '/membros/mural', detalhe: 'Mensagens da igreja e da sua equipa' })
    if (temModulo(MODULOS.LOUVOR) && (permissoes.isLouvor || permissoes.isAdmin)) itensMais.push({ chave: 'louvor', texto: 'Louvor', href: '/louvor/repertorio', detalhe: 'Repertório e cifras' })
    if (temModulo(MODULOS.GRUPOS) && gruposQueLidera[0]) itensMais.push({ chave: 'grupo', texto: 'O meu grupo', href: `/grupos/gestao/${gruposQueLidera[0].id}`, detalhe: gruposQueLidera[0].nome })
    if (temModulo(MODULOS.ACOLHIMENTO) && (permissoes.isAcolhimento || permissoes.isAdmin)) itensMais.push({ chave: 'acolhimento', texto: 'Acolhimento', href: '/departamentos/acolhimento/dashboard' })
    if (temModulo(MODULOS.HOLYRICS) && (permissoes.isMidia || permissoes.isAdmin)) itensMais.push({ chave: 'midia', texto: 'Mídia', href: '/midia/holyrics', detalhe: 'Holyrics' })
    // Modulos que so aparecem se estiverem ligados no Cloud (e para quem tem acesso)
    const ehLider = permissoes.isLider
    if (temModulo(MODULOS.CANTINA) && (permissoes.isCantina || permissoes.isAdmin)) itensMais.push({ chave: 'cantina', texto: 'Cantina', href: '/cantina' })
    if (temModulo(MODULOS.FINANCEIRO) && permissoes.isFinance) itensMais.push({ chave: 'tesouraria', texto: 'Tesouraria', href: '/tesouraria' })
    if (temModulo(MODULOS.ASSISTENCIA) && (permissoes.isSocial || permissoes.isAdmin || role === 'FINANCE')) itensMais.push({ chave: 'social', texto: 'Assistência social', href: '/assistencia' })
    if (temModulo(MODULOS.PREGACAO)) itensMais.push({ chave: 'pregacao', texto: 'Pregações', href: '/pregacao' })
    if (permissoes.isDiaconia || permissoes.isAdmin) itensMais.push({ chave: 'obreiros', texto: 'Obreiros', href: '/departamentos/obreiros/dashboard' })
    if (temModulo(MODULOS.EBD)) itensMais.push({ chave: 'cursos', texto: 'Cursos', href: '/ensino' })
    if (temModulo(MODULOS.BOLEIA)) itensMais.push({ chave: 'boleias', texto: 'Boleias', href: '/boleia', detalhe: 'Oferecer ou pedir boleia para o culto' })
    if (temModulo(MODULOS.GABINETE)) {
        if (permissoes.isAdmin || ehLider) itensMais.push({ chave: 'gabinete', texto: 'Gabinete', href: '/gabinete', detalhe: 'Agendas e atendimentos' })
        itensMais.push({ chave: 'atendimento', texto: 'Marcar atendimento', href: '/membros/agendar' })
    }
    if (temModulo(MODULOS.INVENTARIO) && permissoes.isAdmin) itensMais.push({ chave: 'inventario', texto: 'Inventário', href: '/admin/inventario' })
    itensMais.push({ chave: 'perfil', texto: 'O meu perfil', href: `/membros/perfil/editar/${membro.id}`, detalhe: 'Dados, senha e os meus dados' })
    if (permissoes.isAdmin) itensMais.push({ chave: 'admin', texto: 'Administração', href: '/admin/dashboard', detalhe: 'Melhor no computador' })
    itensMais.push({ chave: 'privacidade', texto: 'Privacidade', href: '/privacidade' })
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

            {/* Telemovel: cabecalho simples (a app nova) */}
            <CabecalhoApp
                igreja={igrejaName}
                nome={`${membro.first_name} ${membro.last_name}`}
                avatar={membro.avatar_file || null}
                perfilHref={`/membros/perfil/editar/${membro.id}`}
            />

            <PullToRefresh><div className="bg-bg min-h-screen">{children}</div></PullToRefresh>

            {/* Telemovel: Escalas, Agenda e Mais */}
            <BarraBaixo itensMais={itensMais} />
        </>
    )
}

// components/membros/MembroLayoutWrapper.tsx
// Moldura das paginas do membro: no telemovel o cabecalho simples e a barra de
// baixo; no computador o menu lateral fixo (um so nivel). Os mesmos itens nos
// dois, so o que a igreja tem ligado e a pessoa pode usar.
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import FaixaImpersonacao from '@/components/ui/FaixaImpersonacao'
import { getTenantClient } from '@/lib/prisma'
import CabecalhoApp from '@/components/app/CabecalhoApp'
import BarraBaixo, { type ItemMais } from '@/components/app/BarraBaixo'
import MenuLateral from '@/components/app/MenuLateral'
import Moldura from '@/components/app/Moldura'
import { modulosAtivosDaIgreja } from '@/lib/modulos'
import { MODULOS, type Modulo } from '@/lib/planos'
import PullToRefresh from '@/components/ui/PullToRefresh'

export default async function MembroLayoutWrapper({ children }: { children: React.ReactNode }) {
    const session = await getSessionData()
    if (!session) return <>{children}</>

    let membro: any = null
    let tenantData: { nome: string } | null = null
    let ativos: string[] = []
    let gruposQueLidera: { id: number; nome: string }[] = []
    let eventosQueGere = 0
    try {
        const db = getTenantClient(session.tenantId)
        // Tudo em paralelo (a moldura corre em cada pagina)
        ;[membro, tenantData, ativos, gruposQueLidera, eventosQueGere] = await Promise.all([
            db.membro.findUnique({
                where: { id: session.membroId },
                select: {
                    id: true, first_name: true, last_name: true, avatar_file: true,
                    ministerios: { select: { departamento: { select: { nome: true, e_louvor: true } } } },
                    departamentos_liderados: { select: { nome: true, e_louvor: true } },
                },
            }),
            db.tenant.findFirst({ where: { id: session.tenantId }, select: { nome: true } }),
            modulosAtivosDaIgreja(),
            db.grupo.findMany({
                where: { lideres: { some: { id: session.membroId } } }, select: { id: true, nome: true }, take: 1,
            }).catch(() => []),
            // Eventos com inscrição que gere (admins: todos; senão, os do seu grupo/departamento)
            db.eventoInscricao.count({
                where: isAdmin(session.role) ? {} : {
                    OR: [
                        { grupo: { lideres: { some: { id: session.membroId } } } },
                        { departamento: { lider_id: session.membroId } },
                        { departamento: { integrantes: { some: { membro_id: session.membroId, pode_gerir_escalas: true } } } },
                    ],
                },
            }).catch(() => 0),
        ])
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
        isLouvor: membro.ministerios.some((m: any) => m.departamento?.e_louvor) || membro.departamentos_liderados.some((d: any) => d.e_louvor),
        isDiaconia: checkDepto(['diaconia', 'diácono', 'diacono']),
        isSocial: checkDepto(['social', 'despensa', 'assistência', 'assistencia']),
    }

    const temModulo = (m: Modulo) => ativos.includes(m)
    const itensMais: ItemMais[] = []
    itensMais.push({ chave: 'agenda', texto: 'Agenda', href: '/membros/agenda', detalhe: 'Cultos e eventos' })
    if (eventosQueGere > 0) itensMais.push({ chave: 'inscricoes', texto: 'Inscrições', href: '/inscricoes', detalhe: 'Quem se inscreveu nos eventos que organiza' })
    if (temModulo(MODULOS.MURAL)) itensMais.push({ chave: 'avisos', texto: 'Avisos', href: '/membros/mural', detalhe: 'Mensagens da igreja e da sua equipa' })
    if (temModulo(MODULOS.GRUPOS)) {
        if (gruposQueLidera[0]) itensMais.push({ chave: 'grupo', texto: 'O meu grupo', href: `/grupos/gestao/${gruposQueLidera[0].id}`, detalhe: gruposQueLidera[0].nome })
        else if (permissoes.isAdmin) itensMais.push({ chave: 'grupo', texto: 'Grupos', href: '/grupos/admin', detalhe: 'Pequenos grupos e células' })
    }
    if (temModulo(MODULOS.ACOLHIMENTO) && (permissoes.isAcolhimento || permissoes.isAdmin)) itensMais.push({ chave: 'acolhimento', texto: 'Acolhimento', href: '/departamentos/acolhimento/dashboard' })
    if (temModulo(MODULOS.HOLYRICS) && (permissoes.isMidia || permissoes.isLouvor || permissoes.isAdmin)) itensMais.push({ chave: 'culto-holyrics', texto: 'Culto no Holyrics', href: '/midia/culto', detalhe: 'Enviar as músicas do culto de hoje' })
    if (temModulo(MODULOS.HOLYRICS) && (permissoes.isMidia || permissoes.isAdmin)) itensMais.push({ chave: 'midia', texto: 'Mídia', href: '/midia/holyrics', detalhe: 'Holyrics' })
    if (permissoes.isMidia || permissoes.isAdmin) itensMais.push({ chave: 'divulgar', texto: 'Agenda para divulgar', href: '/midia/agenda', detalhe: 'Telão, redes, impressão' })
    if (temModulo(MODULOS.MESA_SOM) && (permissoes.isMidia || permissoes.isLouvor || permissoes.isAdmin)) itensMais.push({ chave: 'mesa', texto: 'Mesa de som', href: '/midia/mesax32' })
    if (temModulo(MODULOS.LUMIKIT) && (permissoes.isMidia || permissoes.isAdmin)) itensMais.push({ chave: 'luz', texto: 'Iluminação', href: '/midia/lumikit' })
    // Modulos que so aparecem se estiverem ligados no Cloud (e para quem tem acesso)
    const ehLider = permissoes.isLider
    if (temModulo(MODULOS.CANTINA) && (permissoes.isCantina || permissoes.isAdmin)) itensMais.push({ chave: 'cantina', texto: 'Cantina', href: '/cantina' })
    if (temModulo(MODULOS.FINANCEIRO) && permissoes.isFinance) itensMais.push({ chave: 'tesouraria', texto: 'Tesouraria', href: '/tesouraria' })
    if (temModulo(MODULOS.ASSISTENCIA) && (permissoes.isSocial || permissoes.isAdmin || role === 'FINANCE')) itensMais.push({ chave: 'social', texto: 'Assistência social', href: '/assistencia' })
    if (temModulo(MODULOS.PREGACAO)) itensMais.push({ chave: 'pregacao', texto: 'Pregações', href: '/pregacao' })
    if (permissoes.isAdmin) itensMais.push({ chave: 'obreiros', texto: 'Obreiros', href: '/departamentos/obreiros/dashboard' })
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
    const nome = `${membro.first_name} ${membro.last_name}`
    const perfilHref = `/membros/perfil/editar/${membro.id}`
    const repertorio = temModulo(MODULOS.LOUVOR) && (permissoes.isLouvor || permissoes.isAdmin)

    return (
        <Moldura
            // Computador: menu lateral fixo
            menu={<MenuLateral igreja={igrejaName} nome={nome} avatar={membro.avatar_file || null} perfilHref={perfilHref}
                itensMais={itensMais} repertorio={repertorio} />}
            // Telemovel: cabecalho simples e barra Inicio, Escalas, Repertorio (louvor) e Mais
            cabecalho={<CabecalhoApp igreja={igrejaName} nome={nome} avatar={membro.avatar_file || null} perfilHref={perfilHref} adminHref={permissoes.isAdmin ? '/admin/dashboard' : undefined} />}
            barra={<BarraBaixo itensMais={itensMais} repertorio={repertorio} />}
        >
            <PullToRefresh><div className="bg-bg min-h-screen"><FaixaImpersonacao />{children}</div></PullToRefresh>
        </Moldura>
    )
}

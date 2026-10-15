// app/departamentos/acolhimento/dashboard/page.tsx
import { getDb } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { getAcolhimentoRole, podeGerirEquipa, podeVerRelatorio, podeVerNotasLider, equipaAcolhimento } from '@/lib/acolhimento-permissions'
import { estaAtrasado, filtroPesquisa } from '@/lib/acolhimento-prazos'
import {
    HeartHandshake, Phone, MessageCircle,
    AlertCircle, Clock, CheckCircle2, Users, BarChart3,
    UserX, Activity, Calendar, Shield, Globe, MapPin, Search
} from 'lucide-react'
import ModalAcompanhamento from '@/components/acolhimento/ModalAcompanhamento'
import ModalHistorico from '@/components/acolhimento/ModalHistorico'
import ModalListaConsolidados from '@/components/acolhimento/ModalListaConsolidados'
import VisitantePipelineBar from '@/components/acolhimento/VisitantePipelineBar'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'
import ModalNovoVisitante from '@/components/acolhimento/ModalNovoVisitante'
import ModalQrBoasVindas from '@/components/acolhimento/ModalQrBoasVindas'

const dataCurta = (d: Date | string) =>
    new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', timeZone: 'UTC' })

export default async function AcolhimentoDashboard({ searchParams }: { searchParams: Promise<{ q?: string; meus?: string; c?: string }> }) {
    const { q = '', meus, c } = await searchParams
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true
        }
    })
    if (!membroLogado) redirect('/membros/login')

    const acolhimentoRole = getAcolhimentoRole(membroLogado, session.role)
    if (acolhimentoRole === 'NONE') {
        redirect('/membros/dashboard?error=Acesso restrito.')
    }

    const isLiderOuAdmin = podeGerirEquipa(acolhimentoRole)
    const isAdmin = isAdminCheck(session.role)
    const verNotas = podeVerNotasLider(acolhimentoRole)
    const soMeus = meus === '1'
    const congregacoes = await db.congregacao.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
    const congFiltro = congregacoes.find(x => String(x.id) === c) ?? null
    // Endereço do painel com os filtros atuais, mudando só o que se pede
    const comFiltros = (mudar: { q?: string; meus?: boolean; c?: number | null }) => {
        const p = new URLSearchParams()
        const nq = mudar.q ?? q, nm = mudar.meus ?? soMeus, nc = mudar.c === undefined ? congFiltro?.id : mudar.c
        if (nq) p.set('q', nq)
        if (nm) p.set('meus', '1')
        if (nc) p.set('c', String(nc))
        return `?${p.toString()}`
    }

    // Pesquisa e "os meus" valem para todas as listas
    const filtro = {
        ...filtroPesquisa(q),
        ...(soMeus ? { responsavel_id: session.membroId } : {}),
        ...(congFiltro ? { congregacao_id: congFiltro.id } : {}),
    }
    const comFicha = {
        acompanhamentos: {
            ...(verNotas ? {} : { where: { tipo_evento: { not: 'NOTA_LIDER' } } }),
            include: { membro: true },
            orderBy: { data_contacto: 'desc' as const },
        },
        responsavel: { select: { first_name: true } },
        congregacao: { select: { nome: true } },
    }
    // As notas do líder não saem para o browser de quem não as pode ver
    const paraEcra = <T extends { notas_lider: string | null }>(v: T): T => (verNotas ? v : { ...v, notas_lider: null })

    const [novosRaw, emContactoRaw, reuniaoPastorRaw, consolidadosRaw, totalConsolidados, saidasRaw, semResponsavel, equipa] = await Promise.all([
        db.visitante.findMany({
            where: { ...filtro, status: 'NOVO' },
            include: comFicha,
            orderBy: { data_primeira_visita: 'desc' }
        }),
        db.visitante.findMany({
            where: { ...filtro, status: 'EM_CONTACTO' },
            include: comFicha,
        }),
        db.visitante.findMany({
            where: { ...filtro, status: 'REUNIAO_PASTOR' },
            include: comFicha,
        }),
        db.visitante.findMany({
            where: { ...filtro, status: 'CONSOLIDADO' },
            include: comFicha,
            orderBy: { data_ultima_visita: 'desc' },
            take: 100
        }),
        db.visitante.count({ where: { ...filtro, status: 'CONSOLIDADO' } }),
        db.visitante.findMany({
            where: { ...filtro, status: { in: ['NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU'] } },
            include: comFicha,
            orderBy: { data_ultima_visita: 'desc' },
            take: 50
        }),
        db.visitante.count({
            where: { status: { in: ['NOVO', 'EM_CONTACTO'] }, responsavel_id: null, ...(congFiltro ? { congregacao_id: congFiltro.id } : {}) }
        }),
        equipaAcolhimento(session.tenantId),
    ])

    const agora = new Date()
    const atrasado = (v: (typeof emContactoRaw)[number]) =>
        estaAtrasado(v, v.acompanhamentos.find(a => a.tipo_evento === 'CONTACTO')?.data_contacto, agora)
    const ultimaData = (v: (typeof emContactoRaw)[number]) =>
        new Date(v.acompanhamentos[0]?.data_contacto || v.data_primeira_visita).getTime()

    const novos = novosRaw.map(paraEcra)
    // Atrasados primeiro; depois o contacto mais recente
    const emContacto = emContactoRaw
        .sort((a, b) => Number(atrasado(b)) - Number(atrasado(a)) || ultimaData(b) - ultimaData(a))
        .map(paraEcra)
    const reuniaoPastor = reuniaoPastorRaw.map(paraEcra)
    const consolidados = consolidadosRaw.map(paraEcra)
    const saidas = saidasRaw.map(paraEcra)
    const totalAtrasados = [...novosRaw, ...emContactoRaw].filter(atrasado).length
    // Com pesquisa ou "os meus", as secções abrem para se verem os resultados
    const filtrado = !!q.trim() || soMeus || !!congFiltro
    const nadaEncontrado = filtrado && novos.length + emContacto.length + reuniaoPastor.length + totalConsolidados + saidas.length === 0

    // Dados extra para lider
    let equipaStats: Array<{ id: number; first_name: string; last_name: string; total: number; ultimoContacto: Date | null }> = []
    let actividadeRecente: any[] = []

    if (isLiderOuAdmin) {
        const membroIds = equipa.map(m => m.id)
        const [actividade, porMembro] = await Promise.all([
            db.acompanhamentoVisitante.findMany({
                where: { tipo_evento: 'CONTACTO' },
                orderBy: { data_contacto: 'desc' },
                take: 15,
                include: {
                    membro: { select: { first_name: true, last_name: true } },
                    visitante: { select: { nome: true, status: true } }
                }
            }),
            db.acompanhamentoVisitante.groupBy({
                by: ['membro_id'],
                where: { membro_id: { in: membroIds }, tipo_evento: 'CONTACTO' },
                _count: true,
                _max: { data_contacto: true },
            }),
        ])
        const stats = new Map(porMembro.map(f => [f.membro_id, f]))

        equipaStats = equipa.map(m => {
            const [first_name, ...resto] = m.nome.split(' ')
            return {
                id: m.id,
                first_name,
                last_name: resto.join(' '),
                total: stats.get(m.id)?._count || 0,
                ultimoContacto: stats.get(m.id)?._max.data_contacto || null,
            }
        }).sort((a, b) => b.total - a.total)

        actividadeRecente = actividade
    }

    const origemIcon = (origem: string | null) => {
        if (!origem) return null
        const map: Record<string, { icon: any; label: string }> = {
            SITE: { icon: Globe, label: 'Site' },
            PRESENCIAL: { icon: MapPin, label: 'Presencial' },
            REDES_SOCIAIS: { icon: Globe, label: 'Redes' },
            INDICACAO: { icon: Users, label: 'Indicação' },
            EVENTO: { icon: Calendar, label: 'Evento' },
        }
        return map[origem] || null
    }

    return (
        <main className="max-w-6xl mx-auto pt-20 md:pt-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-28 md:pb-20">

            {/* HEADER */}
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href={isAdmin ? '/admin/dashboard' : '/membros/dashboard'}
                        className="hidden sm:flex text-[13px] md:text-[14px] font-bold uppercase tracking-wide text-muted hover:text-figueira transition-colors shrink-0">
                        ←
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-bold text-fg truncate">Acolhimento</h1>
                    {isLiderOuAdmin && (
                        <span className="text-[13px] font-bold uppercase tracking-wide bg-figueira/10 text-figueira px-2 py-1 rounded-lg border border-figueira/20 flex items-center gap-1 shrink-0">
                            <Shield size={9} /> {acolhimentoRole === 'ADMIN' ? 'Admin' : 'Líder'}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    {podeVerRelatorio(acolhimentoRole) && (
                        <Link href="/departamentos/acolhimento/relatorio"
                            className="flex items-center gap-2 bg-bg2 border border-soft text-muted px-3 py-2 rounded-xl text-[13px] md:text-[14px] font-bold uppercase tracking-wide hover:text-fg hover:border-figueira/30 transition-all">
                            <BarChart3 size={13} /> <span className="hidden sm:inline">Relatório</span>
                        </Link>
                    )}
                    <ModalNovoVisitante congregacoes={congregacoes} padrao={congFiltro?.id ?? session.congregacaoId} />
                    <ModalQrBoasVindas congregacoes={congregacoes} />
                </div>
            </header>

            {/* PESQUISA + OS MEUS */}
            <form method="get" className="flex flex-col sm:flex-row gap-2">
                <label className="flex-1 flex items-center gap-2 bg-bg2 border border-soft rounded-xl px-3 focus-within:border-figueira">
                    <Search size={14} className="text-muted shrink-0" />
                    <input name="q" defaultValue={q} placeholder="Procurar por nome ou telefone" aria-label="Procurar visitante"
                        className="flex-1 bg-transparent py-2.5 text-sm text-fg outline-none min-w-0" />
                    {soMeus && <input type="hidden" name="meus" value="1" />}
                    {congFiltro && <input type="hidden" name="c" value={congFiltro.id} />}
                </label>
                <div className="flex gap-2">
                    <Link href={comFiltros({ meus: false })}
                        className={`px-3 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide border transition-all ${!soMeus ? 'bg-fg text-bg border-fg' : 'bg-bg2 text-muted border-soft hover:text-fg'}`}>
                        Todos
                    </Link>
                    <Link href={comFiltros({ meus: true })}
                        className={`px-3 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide border transition-all ${soMeus ? 'bg-fg text-bg border-fg' : 'bg-bg2 text-muted border-soft hover:text-fg'}`}>
                        Os meus
                    </Link>
                </div>
            </form>

            {/* CONGREGAÇÃO */}
            {congregacoes.length > 1 && (
                <nav aria-label="Congregação" className="flex flex-wrap gap-2 -mt-3">
                    {[{ id: null as number | null, nome: 'Todas as casas' }, ...congregacoes].map(x => {
                        const ativo = (congFiltro?.id ?? null) === x.id
                        return (
                            <Link key={x.id ?? 'todas'} href={comFiltros({ c: x.id })} aria-current={ativo ? 'page' : undefined}
                                className={`px-3 py-1.5 rounded-full text-[13px] font-bold border transition-all ${ativo ? 'bg-figueira text-white border-figueira' : 'bg-bg2 text-muted border-soft hover:text-fg'}`}>
                                {x.nome}
                            </Link>
                        )
                    })}
                </nav>
            )}

            {nadaEncontrado && (
                <div className="py-10 text-center bg-bg2 border border-soft rounded-2xl">
                    <p className="text-sm font-bold text-muted">Nenhum visitante encontrado.</p>
                    <Link href="?" className="text-[13px] font-bold text-figueira hover:underline">Limpar filtros</Link>
                </div>
            )}

            {/* ALERTAS */}
            {totalAtrasados > 0 && (
                <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-2xl px-5 py-3">
                    <Clock size={16} className="text-red-500 shrink-0" />
                    <p className="text-[14px] md:text-xs font-bold text-red-600">
                        {totalAtrasados} visitante{totalAtrasados !== 1 ? 's' : ''} com o contacto atrasado.
                    </p>
                </div>
            )}
            {isLiderOuAdmin && semResponsavel > 0 && (
                <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[14px] md:text-xs font-bold text-amber-700">
                        <span className="font-bold">{semResponsavel} visitante{semResponsavel !== 1 ? 's' : ''}</span> ativo{semResponsavel !== 1 ? 's' : ''} sem responsável. Atribua na ficha de cada um.
                    </p>
                </div>
            )}

            {/* NOVOS VISITANTES */}
            {novos.length > 0 && (
                <section className="bg-orange-500/5 border border-orange-500/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-500/10">
                        <div className="w-8 h-8 bg-orange-500 text-white rounded-xl flex items-center justify-center animate-pulse">
                            <AlertCircle size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-fg">Novos Registos</h2>
                            <p className="text-[13px] md:text-[14px] font-bold text-orange-600 uppercase tracking-wide">
                                {novos.length} pessoa{novos.length !== 1 ? 's' : ''} aguardam primeiro contacto
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-orange-500/10">
                        {novos.map(v => {
                            const origemInfo = origemIcon(v.origem)
                            return (
                                <div key={v.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 hover:bg-orange-500/5 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                            <span className="text-[13px] md:text-[14px] font-bold text-orange-600">{v.nome[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[14px] font-bold uppercase text-fg truncate">{v.nome}</p>
                                                {origemInfo && (
                                                    <span className="text-[13px] font-bold bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                        {origemInfo.label}
                                                    </span>
                                                )}
                                                {v.quantidade_visitas > 1 && (
                                                    <span className="text-[13px] font-bold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                                        Voltou · {v.quantidade_visitas}.ª visita
                                                    </span>
                                                )}
                                                {atrasado(v) && (
                                                    <span className="text-[13px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">Atrasado</span>
                                                )}
                                                {!congFiltro && v.congregacao && (
                                                    <span className="text-[13px] font-bold text-figueira bg-figueira/10 px-1.5 py-0.5 rounded">{v.congregacao.nome}</span>
                                                )}
                                                {v.responsavel && (
                                                    <span className="text-[13px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                        {v.responsavel.first_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <a href={`tel:${v.telefone}`} className="text-[13px] md:text-[14px] font-bold text-muted flex items-center gap-1 hover:text-fg transition-colors">
                                                    <Phone size={9} /> {v.telefone}
                                                </a>
                                            </div>
                                            <div className="mt-1.5">
                                                <VisitantePipelineBar status={v.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto">
                                        <ModalHistorico visitante={v} viewerRole={acolhimentoRole} equipa={equipa} congregacoes={congregacoes} />
                                        <a href={`https://wa.me/${v.telefone?.replace(/\D/g, '')}`} target="_blank"
                                            className="w-10 h-10 sm:w-8 sm:h-8 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                                            <MessageCircle size={16} className="sm:hidden" />
                                            <MessageCircle size={14} className="hidden sm:block" />
                                        </a>
                                        <ModalAcompanhamento visitante={v} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            {/* EM ACOMPANHAMENTO */}
            <SeccaoColapsavel key={`${filtrado}`} defaultOpen={filtrado}
                titulo="Em Acompanhamento"
                icon={<Clock size={14} className="text-figueira" />}
                badge={<span className="text-[13px] md:text-[14px] font-bold bg-soft px-2 py-0.5 rounded text-muted">{emContacto.length}</span>}
            >
                {emContacto.length === 0 ? (
                    <div className="py-12 text-center">
                        <HeartHandshake size={24} className="mx-auto text-muted/20 mb-3" />
                        <p className="text-[14px] md:text-xs font-bold text-muted uppercase tracking-wide">Nenhum visitante em acompanhamento.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-soft">
                        {emContacto.map(v => {
                            const isAtrasado = atrasado(v)
                            const isSite = v.pedido_oracao?.includes('SITE') || v.pedido_oracao?.includes('CONTACTO') || v.origem === 'SITE'

                            return (
                                <div key={v.id} className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 transition-colors ${isAtrasado ? 'bg-red-500/5' : 'hover:bg-soft/10'}`}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAtrasado ? 'bg-red-500/10' : 'bg-figueira/10'}`}>
                                            <span className={`text-[13px] md:text-[14px] font-bold ${isAtrasado ? 'text-red-500' : 'text-figueira'}`}>{v.nome[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[14px] font-bold uppercase text-fg truncate">{v.nome}</p>
                                                {isSite && (
                                                    <span className="text-[13px] font-bold bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">Site</span>
                                                )}
                                                {isAtrasado && (
                                                    <span className="text-[13px] font-bold bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20">Atrasado</span>
                                                )}
                                                {!congFiltro && v.congregacao && (
                                                    <span className="text-[13px] font-bold text-figueira bg-figueira/10 px-1.5 py-0.5 rounded">{v.congregacao.nome}</span>
                                                )}
                                                {v.responsavel && (
                                                    <span className="text-[13px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                        {v.responsavel.first_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <a href={`tel:${v.telefone}`} className="text-[13px] md:text-[14px] font-bold text-muted flex items-center gap-1 hover:text-fg transition-colors">
                                                    <Phone size={8} /> {v.telefone}
                                                </a>
                                                <span className="text-[13px] md:text-[14px] font-bold text-muted">{v.quantidade_visitas} visita{v.quantidade_visitas !== 1 ? 's' : ''}</span>
                                                <span className="text-[13px] md:text-[14px] font-bold text-muted hidden sm:inline">
                                                    Por: {v.acompanhamentos[0]?.membro?.first_name || 'Sistema'}
                                                </span>
                                                {v.proximo_contacto && (
                                                    <span className="text-[13px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Calendar size={8} /> {dataCurta(v.proximo_contacto)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5">
                                                <VisitantePipelineBar status={v.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto">
                                        <ModalHistorico visitante={v} viewerRole={acolhimentoRole} equipa={equipa} congregacoes={congregacoes} />
                                        <a href={`https://wa.me/${v.telefone?.replace(/\D/g, '')}`} target="_blank"
                                            className="w-10 h-10 sm:w-8 sm:h-8 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                                            <MessageCircle size={16} className="sm:hidden" />
                                            <MessageCircle size={14} className="hidden sm:block" />
                                        </a>
                                        <ModalAcompanhamento visitante={v} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </SeccaoColapsavel>

            {/* REUNIAO COM PASTOR */}
            {reuniaoPastor.length > 0 && (
                <section className="bg-blue-500/5 border border-blue-500/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-blue-500/10">
                        <Users size={14} className="text-blue-500" />
                        <h2 className="text-sm font-bold text-fg">Reunião com Pastor</h2>
                        <span className="text-[13px] md:text-[14px] font-bold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">{reuniaoPastor.length}</span>
                    </div>
                    <div className="divide-y divide-blue-500/10">
                        {reuniaoPastor.map(v => (
                            <div key={v.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3.5 hover:bg-blue-500/5 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] md:text-[14px] font-bold text-blue-600">{v.nome[0]}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[14px] font-bold uppercase text-fg truncate">{v.nome}</p>
                                            {!congFiltro && v.congregacao && (
                                                <span className="text-[13px] font-bold text-figueira bg-figueira/10 px-1.5 py-0.5 rounded">{v.congregacao.nome}</span>
                                            )}
                                            {v.responsavel && (
                                                <span className="text-[13px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                    {v.responsavel.first_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] md:text-[14px] font-bold text-muted flex items-center gap-1.5">
                                            <Phone size={8} /> {v.telefone} · {v.quantidade_visitas} visita{v.quantidade_visitas !== 1 ? 's' : ''}
                                        </p>
                                        <div className="mt-1.5">
                                            <VisitantePipelineBar status={v.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto">
                                    <ModalHistorico visitante={v} viewerRole={acolhimentoRole} equipa={equipa} congregacoes={congregacoes} />
                                    <a href={`https://wa.me/${v.telefone?.replace(/\D/g, '')}`} target="_blank"
                                        className="w-10 h-10 sm:w-8 sm:h-8 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                                        <MessageCircle size={16} className="sm:hidden" />
                                        <MessageCircle size={14} className="hidden sm:block" />
                                    </a>
                                    <ModalAcompanhamento visitante={v} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* CONSOLIDADOS */}
            <SeccaoColapsavel key={`${filtrado}`} defaultOpen={filtrado}
                titulo="Consolidados"
                icon={<CheckCircle2 size={14} className="text-emerald-500" />}
                badge={<span className="text-[13px] md:text-[14px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">{totalConsolidados}</span>}
                headerExtra={<ModalListaConsolidados consolidados={consolidados} />}
            >
                {consolidados.length > 0 ? (
                    <div className="px-5 py-4">
                        <div className="flex -space-x-2">
                            {consolidados.slice(0, 8).map(v => (
                                <div key={v.id} className="w-8 h-8 rounded-lg bg-emerald-500/10 border-2 border-bg2 flex items-center justify-center" title={v.nome}>
                                    <span className="text-[13px] md:text-[14px] font-bold text-emerald-600">{v.nome[0]}</span>
                                </div>
                            ))}
                            {consolidados.length > 8 && (
                                <div className="w-8 h-8 rounded-lg bg-soft border-2 border-bg2 flex items-center justify-center">
                                    <span className="text-[13px] font-bold text-muted">+{consolidados.length - 8}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[13px] md:text-[14px] font-bold text-muted uppercase tracking-wide mt-2">
                            {totalConsolidados} pessoa{totalConsolidados !== 1 ? 's' : ''} integrada{totalConsolidados !== 1 ? 's' : ''} na igreja
                        </p>
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <p className="text-[13px] md:text-[14px] font-bold text-muted uppercase tracking-wide">Nenhum consolidado ainda.</p>
                    </div>
                )}
            </SeccaoColapsavel>

            {/* SAIDAS */}
            {saidas.length > 0 && (
                <SeccaoColapsavel key={`${filtrado}`} defaultOpen={filtrado}
                    titulo="Saídas"
                    icon={<UserX size={14} className="text-red-400" />}
                    badge={<span className="text-[13px] md:text-[14px] font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded">{saidas.length}</span>}
                >
                    <div className="divide-y divide-soft">
                        {saidas.slice(0, 10).map(v => (
                            <div key={v.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-4 gap-y-2 px-5 py-3 hover:bg-soft/10 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-[13px] md:text-[14px] font-bold text-red-400">{v.nome[0]}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-bold uppercase text-fg truncate">{v.nome}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <VisitantePipelineBar status={v.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 shrink-0 w-full sm:w-auto">
                                    <ModalHistorico visitante={v} viewerRole={acolhimentoRole} equipa={equipa} congregacoes={congregacoes} />
                                    <ModalAcompanhamento visitante={v} />
                                </div>
                            </div>
                        ))}
                    </div>
                </SeccaoColapsavel>
            )}

            {/* ═══════════ SECÇÕES DO LÍDER ═══════════ */}
            {isLiderOuAdmin && (
                <>
                    {/* VISÃO DA EQUIPA */}
                    {equipaStats.length > 0 && (
                        <section className="bg-bg2 border border-figueira/20 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-figueira/10">
                                <Shield size={14} className="text-figueira" />
                                <h2 className="text-sm font-bold text-fg">Equipa de Acolhimento</h2>
                                <span className="text-[13px] font-bold uppercase tracking-wide bg-figueira/10 text-figueira px-2 py-0.5 rounded">Só Líder</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-soft">
                                            <th className="text-[13px] md:text-[14px] font-bold uppercase tracking-wide text-muted px-5 py-3">Membro</th>
                                            <th className="text-[13px] md:text-[14px] font-bold uppercase tracking-wide text-muted px-3 py-3 text-center">Contactos</th>
                                            <th className="text-[13px] md:text-[14px] font-bold uppercase tracking-wide text-muted px-3 py-3 text-right hidden sm:table-cell">Último Contacto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-soft">
                                        {equipaStats.map(m => (
                                            <tr key={m.id} className="hover:bg-soft/10 transition-colors">
                                                <td className="px-5 py-3">
                                                    <p className="text-[14px] font-bold uppercase text-fg">{m.first_name} {m.last_name}</p>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className="text-[14px] font-bold text-fg">{m.total}</span>
                                                </td>
                                                <td className="px-3 py-3 text-right hidden sm:table-cell">
                                                    <span className="text-[13px] md:text-[14px] font-bold text-muted">
                                                        {m.ultimoContacto ? dataCurta(m.ultimoContacto) : 'Nunca'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* FEED DE ACTIVIDADE */}
                    {actividadeRecente.length > 0 && (
                        <section className="bg-bg2 border border-figueira/20 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-figueira/10">
                                <Activity size={14} className="text-figueira" />
                                <h2 className="text-sm font-bold text-fg">Atividade recente</h2>
                                <span className="text-[13px] font-bold uppercase tracking-wide bg-figueira/10 text-figueira px-2 py-0.5 rounded">Só Líder</span>
                            </div>
                            <div className="divide-y divide-soft max-h-80 overflow-y-auto">
                                {actividadeRecente.map((a: any) => (
                                    <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-soft/10 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-figueira/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[13px] md:text-[14px] font-bold text-figueira">{a.membro?.first_name?.[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[14px] md:text-xs text-fg">
                                                <span className="font-bold">{a.membro?.first_name}</span>
                                                {' '}registou contacto com{' '}
                                                <span className="font-bold">{a.visitante?.nome}</span>
                                            </p>
                                            {a.observacoes && (
                                                <p className="text-[13px] md:text-[14px] text-muted mt-0.5 line-clamp-1">"{a.observacoes}"</p>
                                            )}
                                        </div>
                                        <span className="text-[13px] md:text-[14px] font-bold text-muted shrink-0">
                                            {new Date(a.data_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )}
        </main>
    )
}


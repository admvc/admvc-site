// app/departamentos/acolhimento/dashboard/page.tsx
import { getDb } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { getAcolhimentoRole, podeGerirEquipa, podeVerRelatorio, type AcolhimentoRole } from '@/lib/acolhimento-permissions'
import {
    HeartHandshake, Phone, MessageCircle, QrCode,
    AlertCircle, Clock, CheckCircle2, Users, BarChart3,
    UserX, Activity, Calendar, Shield, Globe, MapPin
} from 'lucide-react'
import ModalAcompanhamento from '@/components/acolhimento/ModalAcompanhamento'
import ModalHistorico from '@/components/acolhimento/ModalHistorico'
import ModalListaConsolidados from '@/components/acolhimento/ModalListaConsolidados'
import VisitantePipelineBar from '@/components/acolhimento/VisitantePipelineBar'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'

export default async function AcolhimentoDashboard() {
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

    const [novos, emContactoRaw, reuniaoPastorRaw, consolidados, totalConsolidados, saidas, semResponsavel] = await Promise.all([
        db.visitante.findMany({
            where: { status: 'NOVO' },
            include: { responsavel: { select: { first_name: true } } },
            orderBy: { data_primeira_visita: 'desc' }
        }),
        db.visitante.findMany({
            where: { status: 'EM_CONTACTO' },
            include: {
                acompanhamentos: { include: { membro: true }, orderBy: { data_contacto: 'desc' } },
                responsavel: { select: { first_name: true } }
            }
        }),
        db.visitante.findMany({
            where: { status: 'REUNIAO_PASTOR' },
            include: {
                acompanhamentos: { include: { membro: true }, orderBy: { data_contacto: 'desc' } },
                responsavel: { select: { first_name: true } }
            }
        }),
        db.visitante.findMany({
            where: { status: 'CONSOLIDADO' },
            include: {
                acompanhamentos: { include: { membro: true }, orderBy: { data_contacto: 'desc' } },
                responsavel: { select: { first_name: true } }
            },
            orderBy: { data_ultima_visita: 'desc' },
            take: 100
        }),
        db.visitante.count({ where: { status: 'CONSOLIDADO' } }),
        db.visitante.findMany({
            where: { status: { in: ['NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU'] } },
            include: {
                acompanhamentos: { include: { membro: true }, orderBy: { data_contacto: 'desc' } },
                responsavel: { select: { first_name: true } }
            },
            orderBy: { data_ultima_visita: 'desc' },
            take: 50
        }),
        db.visitante.count({
            where: { status: { in: ['NOVO', 'EM_CONTACTO'] }, responsavel_id: null }
        })
    ])

    const limite24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const emContacto = emContactoRaw.sort((a, b) => {
        const dataA = a.acompanhamentos[0]?.data_contacto || a.data_primeira_visita
        const dataB = b.acompanhamentos[0]?.data_contacto || b.data_primeira_visita
        return new Date(dataB).getTime() - new Date(dataA).getTime()
    })

    const atrasados = emContacto.filter(v => {
        const ultima = v.acompanhamentos[0]?.data_contacto || v.data_primeira_visita
        return new Date(ultima) < limite24h
    }).length

    // Dados extra para lider
    let equipaStats: Array<{ id: number; first_name: string; last_name: string; total: number; ultimoContacto: Date | null }> = []
    let actividadeRecente: any[] = []

    if (isLiderOuAdmin) {
        const [equipa, actividade] = await Promise.all([
            db.integranteDepartamento.findMany({
                where: {
                    departamento: { nome: { contains: 'colhimento', mode: 'insensitive' as const } }
                },
                include: {
                    membro: {
                        select: {
                            id: true, first_name: true, last_name: true,
                            companhamentos_visitantes: {
                                orderBy: { data_contacto: 'desc' as const },
                                take: 1,
                                select: { data_contacto: true }
                            }
                        }
                    }
                }
            }),
            db.acompanhamentoVisitante.findMany({
                orderBy: { data_contacto: 'desc' },
                take: 15,
                include: {
                    membro: { select: { first_name: true, last_name: true } },
                    visitante: { select: { nome: true, status: true } }
                }
            })
        ])

        // Count follow-ups per member
        const membroIds = equipa.map(e => e.membro.id)
        const followupCounts = await db.acompanhamentoVisitante.groupBy({
            by: ['membro_id'],
            where: { membro_id: { in: membroIds }, tipo_evento: 'CONTACTO' },
            _count: true
        })
        const countMap = new Map(followupCounts.map(f => [f.membro_id, f._count]))

        equipaStats = equipa.map(e => ({
            id: e.membro.id,
            first_name: e.membro.first_name,
            last_name: e.membro.last_name,
            total: countMap.get(e.membro.id) || 0,
            ultimoContacto: e.membro.companhamentos_visitantes[0]?.data_contacto || null
        })).sort((a, b) => b.total - a.total)

        actividadeRecente = actividade
    }

    const origemIcon = (origem: string | null) => {
        if (!origem) return null
        const map: Record<string, { icon: any; label: string }> = {
            SITE: { icon: Globe, label: 'Site' },
            PRESENCIAL: { icon: MapPin, label: 'Presencial' },
            REDES_SOCIAIS: { icon: Globe, label: 'Redes' },
            INDICACAO: { icon: Users, label: 'Indicacao' },
        }
        return map[origem] || null
    }

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">

            {/* HEADER */}
            <header className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href={isAdmin ? '/admin/dashboard' : '/membros/dashboard'}
                        className="hidden sm:flex text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors shrink-0">
                        ←
                    </Link>
                    <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-fg truncate">Acolhimento</h1>
                    {isLiderOuAdmin && (
                        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest bg-figueira/10 text-figueira px-2 py-1 rounded-lg border border-figueira/20 flex items-center gap-1 shrink-0">
                            <Shield size={9} /> {acolhimentoRole === 'ADMIN' ? 'Admin' : 'Lider'}
                        </span>
                    )}
                </div>
                <div className="flex gap-2 shrink-0">
                    {podeVerRelatorio(acolhimentoRole) && (
                        <Link href="/departamentos/acolhimento/relatorio"
                            className="flex items-center gap-2 bg-bg2 border border-soft text-muted px-3 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                            <BarChart3 size={13} /> <span className="hidden sm:inline">Relatorio</span>
                        </Link>
                    )}
                    <Link href="/boasvindas" target="_blank"
                        className="flex items-center gap-2 bg-fg text-bg px-3 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:bg-figueira transition-all shadow-sm">
                        <QrCode size={13} /> <span className="hidden sm:inline">Boas-Vindas</span>
                    </Link>
                </div>
            </header>

            {/* ALERTA SEM RESPONSAVEL (LIDER) */}
            {isLiderOuAdmin && semResponsavel > 0 && (
                <div className="flex items-center gap-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl px-5 py-3">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-[10px] md:text-xs font-bold text-amber-700">
                        <span className="font-black">{semResponsavel} visitante{semResponsavel !== 1 ? 's' : ''}</span> activo{semResponsavel !== 1 ? 's' : ''} sem responsavel atribuido.
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
                            <h2 className="text-sm font-black uppercase tracking-widest text-fg">Novos Registos</h2>
                            <p className="text-[8px] md:text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                                {novos.length} pessoa{novos.length !== 1 ? 's' : ''} aguardam primeiro contacto
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-orange-500/10">
                        {novos.map(v => {
                            const origemInfo = origemIcon(v.origem)
                            return (
                                <div key={v.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-orange-500/5 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] md:text-[11px] font-black text-orange-600">{v.nome[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[11px] font-black uppercase text-fg truncate">{v.nome}</p>
                                                {origemInfo && (
                                                    <span className="text-[7px] md:text-[9px] font-black bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">
                                                        {origemInfo.label}
                                                    </span>
                                                )}
                                                {v.responsavel && (
                                                    <span className="text-[7px] md:text-[9px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                        {v.responsavel.first_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <a href={`tel:${v.telefone}`} className="text-[9px] md:text-[11px] font-bold text-muted flex items-center gap-1 hover:text-fg transition-colors">
                                                    <Phone size={9} /> {v.telefone}
                                                </a>
                                            </div>
                                            <div className="mt-1.5">
                                                <VisitantePipelineBar status={v.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
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
            <SeccaoColapsavel
                titulo="Em Acompanhamento"
                icon={<Clock size={14} className="text-figueira" />}
                badge={<span className="text-[8px] md:text-[10px] font-black bg-soft px-2 py-0.5 rounded text-muted">{emContacto.length}</span>}
            >
                {emContacto.length === 0 ? (
                    <div className="py-12 text-center">
                        <HeartHandshake size={24} className="mx-auto text-muted/20 mb-3" />
                        <p className="text-[10px] md:text-xs font-black text-muted uppercase tracking-widest">Nenhum visitante em contacto activo.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-soft">
                        {emContacto.map(v => {
                            const ultimaData = v.acompanhamentos[0]?.data_contacto || v.data_primeira_visita
                            const isAtrasado = new Date(ultimaData) < limite24h
                            const isSite = v.pedido_oracao?.includes('SITE') || v.pedido_oracao?.includes('CONTACTO') || v.origem === 'SITE'

                            return (
                                <div key={v.id} className={`flex items-center justify-between gap-4 px-5 py-3.5 transition-colors ${isAtrasado ? 'bg-red-500/5' : 'hover:bg-soft/10'}`}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAtrasado ? 'bg-red-500/10' : 'bg-figueira/10'}`}>
                                            <span className={`text-[9px] md:text-[11px] font-black ${isAtrasado ? 'text-red-500' : 'text-figueira'}`}>{v.nome[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-[11px] font-black uppercase text-fg truncate">{v.nome}</p>
                                                {isSite && (
                                                    <span className="text-[7px] md:text-[9px] font-black bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded border border-blue-500/20">Site</span>
                                                )}
                                                {isAtrasado && (
                                                    <span className="text-[7px] md:text-[9px] font-black bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">+24h</span>
                                                )}
                                                {v.responsavel && (
                                                    <span className="text-[7px] md:text-[9px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                        {v.responsavel.first_name}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <a href={`tel:${v.telefone}`} className="text-[8px] md:text-[10px] font-bold text-muted flex items-center gap-1 hover:text-fg transition-colors">
                                                    <Phone size={8} /> {v.telefone}
                                                </a>
                                                <span className="text-[8px] md:text-[10px] font-bold text-muted">{v.quantidade_visitas} visita{v.quantidade_visitas !== 1 ? 's' : ''}</span>
                                                <span className="text-[8px] md:text-[10px] font-bold text-muted hidden sm:inline">
                                                    Por: {v.acompanhamentos[0]?.membro?.first_name || 'Sistema'}
                                                </span>
                                                {v.proximo_contacto && (
                                                    <span className="text-[7px] md:text-[9px] font-black text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <Calendar size={8} /> {new Date(v.proximo_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1.5">
                                                <VisitantePipelineBar status={v.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <ModalHistorico visitante={v} />
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
            {reuniaoPastorRaw.length > 0 && (
                <section className="bg-blue-500/5 border border-blue-500/20 rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-blue-500/10">
                        <Users size={14} className="text-blue-500" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">Reuniao com Pastor</h2>
                        <span className="text-[8px] md:text-[10px] font-black bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">{reuniaoPastorRaw.length}</span>
                    </div>
                    <div className="divide-y divide-blue-500/10">
                        {reuniaoPastorRaw.map(v => (
                            <div key={v.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-blue-500/5 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-[9px] md:text-[11px] font-black text-blue-600">{v.nome[0]}</span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-[11px] font-black uppercase text-fg truncate">{v.nome}</p>
                                            {v.responsavel && (
                                                <span className="text-[7px] md:text-[9px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                    {v.responsavel.first_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[8px] md:text-[10px] font-bold text-muted flex items-center gap-1.5">
                                            <Phone size={8} /> {v.telefone} · {v.quantidade_visitas} visita{v.quantidade_visitas !== 1 ? 's' : ''}
                                        </p>
                                        <div className="mt-1.5">
                                            <VisitantePipelineBar status={v.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <ModalHistorico visitante={v} />
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
            <SeccaoColapsavel
                titulo="Consolidados"
                icon={<CheckCircle2 size={14} className="text-emerald-500" />}
                badge={<span className="text-[8px] md:text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">{totalConsolidados}</span>}
                headerExtra={<ModalListaConsolidados consolidados={consolidados} />}
            >
                {consolidados.length > 0 ? (
                    <div className="px-5 py-4">
                        <div className="flex -space-x-2">
                            {consolidados.slice(0, 8).map(v => (
                                <div key={v.id} className="w-8 h-8 rounded-lg bg-emerald-500/10 border-2 border-bg2 flex items-center justify-center" title={v.nome}>
                                    <span className="text-[8px] md:text-[10px] font-black text-emerald-600">{v.nome[0]}</span>
                                </div>
                            ))}
                            {consolidados.length > 8 && (
                                <div className="w-8 h-8 rounded-lg bg-soft border-2 border-bg2 flex items-center justify-center">
                                    <span className="text-[7px] md:text-[9px] font-black text-muted">+{consolidados.length - 8}</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[8px] md:text-[10px] font-bold text-muted uppercase tracking-widest mt-2">
                            {totalConsolidados} pessoa{totalConsolidados !== 1 ? 's' : ''} integrada{totalConsolidados !== 1 ? 's' : ''} na igreja
                        </p>
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <p className="text-[9px] md:text-[11px] font-bold text-muted uppercase tracking-widest">Nenhum consolidado ainda.</p>
                    </div>
                )}
            </SeccaoColapsavel>

            {/* SAIDAS */}
            {saidas.length > 0 && (
                <SeccaoColapsavel
                    titulo="Saidas"
                    icon={<UserX size={14} className="text-red-400" />}
                    badge={<span className="text-[8px] md:text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded">{saidas.length}</span>}
                >
                    <div className="divide-y divide-soft">
                        {saidas.slice(0, 10).map(v => (
                            <div key={v.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-soft/10 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                                        <span className="text-[9px] md:text-[11px] font-black text-red-400">{v.nome[0]}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase text-fg truncate">{v.nome}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <VisitantePipelineBar status={v.status} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <ModalHistorico visitante={v} />
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
                                <h2 className="text-sm font-black uppercase tracking-widest text-fg">Equipa de Acolhimento</h2>
                                <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest bg-figueira/10 text-figueira px-2 py-0.5 rounded">So Lider</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-soft">
                                            <th className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted px-5 py-3">Membro</th>
                                            <th className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted px-3 py-3 text-center">Follow-ups</th>
                                            <th className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted px-3 py-3 text-right hidden sm:table-cell">Ultimo Contacto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-soft">
                                        {equipaStats.map(m => (
                                            <tr key={m.id} className="hover:bg-soft/10 transition-colors">
                                                <td className="px-5 py-3">
                                                    <p className="text-[11px] font-black uppercase text-fg">{m.first_name} {m.last_name}</p>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className="text-[11px] font-black text-fg">{m.total}</span>
                                                </td>
                                                <td className="px-3 py-3 text-right hidden sm:table-cell">
                                                    <span className="text-[9px] md:text-[11px] font-bold text-muted">
                                                        {m.ultimoContacto
                                                            ? new Date(m.ultimoContacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
                                                            : 'Nunca'}
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
                                <h2 className="text-sm font-black uppercase tracking-widest text-fg">Actividade Recente</h2>
                                <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest bg-figueira/10 text-figueira px-2 py-0.5 rounded">So Lider</span>
                            </div>
                            <div className="divide-y divide-soft max-h-80 overflow-y-auto">
                                {actividadeRecente.map((a: any) => (
                                    <div key={a.id} className="flex items-start gap-3 px-5 py-3 hover:bg-soft/10 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-figueira/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[8px] md:text-[10px] font-black text-figueira">{a.membro?.first_name?.[0]}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] md:text-xs text-fg">
                                                <span className="font-black">{a.membro?.first_name}</span>
                                                {' '}registou contacto com{' '}
                                                <span className="font-black">{a.visitante?.nome}</span>
                                            </p>
                                            {a.observacoes && (
                                                <p className="text-[9px] md:text-[11px] text-muted italic mt-0.5 line-clamp-1">"{a.observacoes}"</p>
                                            )}
                                        </div>
                                        <span className="text-[8px] md:text-[10px] font-bold text-muted shrink-0">
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


// app/admin/auditoria/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import {
    Shield, Search, Calendar, User, AlertTriangle,
    CheckCircle2, XCircle, LogIn, LogOut, Edit3,
    Trash2, Link2, CreditCard, FileText, Upload,
    Settings, PenLine, Archive, Megaphone, Import
} from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'
import FiltroAuditoria from '@/components/admin/FiltroAuditoria'

const ICONE_ACAO: Record<string, any> = {
    CRIAR: { icon: CheckCircle2, cor: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    EDITAR: { icon: Edit3, cor: 'text-blue-600', bg: 'bg-blue-500/10' },
    APAGAR: { icon: Trash2, cor: 'text-red-600', bg: 'bg-red-500/10' },
    LOGIN: { icon: LogIn, cor: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    LOGIN_FALHOU: { icon: XCircle, cor: 'text-red-600', bg: 'bg-red-500/10' },
    LOGOUT: { icon: LogOut, cor: 'text-muted', bg: 'bg-soft' },
    VINCULAR: { icon: Link2, cor: 'text-blue-600', bg: 'bg-blue-500/10' },
    DESVINCULAR: { icon: Link2, cor: 'text-orange-600', bg: 'bg-orange-500/10' },
    APROVAR: { icon: CheckCircle2, cor: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    ALTERAR_ROLE: { icon: Shield, cor: 'text-orange-600', bg: 'bg-orange-500/10' },
    ALTERAR_STATUS: { icon: AlertTriangle, cor: 'text-orange-600', bg: 'bg-orange-500/10' },
    RESET_SENHA: { icon: Shield, cor: 'text-red-600', bg: 'bg-red-500/10' },
    EXPORT: { icon: FileText, cor: 'text-purple-600', bg: 'bg-purple-500/10' },
    IMPORTAR: { icon: Upload, cor: 'text-purple-600', bg: 'bg-purple-500/10' },
    VER_PERFIL: { icon: User, cor: 'text-muted', bg: 'bg-soft' },
    PUBLICAR: { icon: Megaphone, cor: 'text-figueira', bg: 'bg-figueira/10' },
    UPLOAD: { icon: Upload, cor: 'text-blue-600', bg: 'bg-blue-500/10' },
    CONFIG: { icon: Settings, cor: 'text-indigo-600', bg: 'bg-indigo-500/10' },
    ASSINAR: { icon: PenLine, cor: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    ARQUIVAR: { icon: Archive, cor: 'text-orange-600', bg: 'bg-orange-500/10' },
    REJEITAR: { icon: XCircle, cor: 'text-red-600', bg: 'bg-red-500/10' },
}

const COR_CATEGORIA: Record<string, string> = {
    MEMBROS: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    FAMILIAS: 'bg-figueira/10 text-figueira border-figueira/20',
    ESCALAS: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    FINANCEIRO: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    ACESSO: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    DOCUMENTOS: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    CANTINA: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
    SISTEMA: 'bg-soft text-muted border-soft',
    DEPARTAMENTOS: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    GRUPOS: 'bg-teal-500/10 text-teal-700 border-teal-500/20',
    INVENTARIO: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    CONFIGURACAO: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20',
    LOUVOR: 'bg-violet-500/10 text-violet-700 border-violet-500/20',
    AGENDA: 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20',
    VISITANTES: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    MURAL: 'bg-lime-500/10 text-lime-700 border-lime-500/20',
}

export default async function AuditoriaPage({
    searchParams
}: {
    searchParams: { categoria?: string; acao?: string; q?: string; pagina?: string }
}) {
    const db = await getDb()
    const cookieStore = await cookies()
    const session = cookieStore.get('admvc_session')
    if (!session) redirect('/membros/login')

    const parts = decodeURIComponent(session.value).split('|')
    let tenantId = '1', userRole = ''
    parts.forEach(part => {
        const [k, v] = part.split(':')
        if (k === 'tenant_id') tenantId = v
        if (k === 'role') userRole = v
    })

    if (userRole !== 'ADMIN') redirect('/membros/dashboard')

    const pagina = Number(searchParams.pagina || 1)
    const porPagina = 50
    const skip = (pagina - 1) * porPagina

    const where: any = { tenant_id: Number(tenantId) }
    if (searchParams.categoria) where.categoria = searchParams.categoria
    if (searchParams.acao) where.acao = searchParams.acao
    if (searchParams.q) {
        where.OR = [
            { descricao: { contains: searchParams.q, mode: 'insensitive' } },
            { actor_nome: { contains: searchParams.q, mode: 'insensitive' } },
            { alvo_nome: { contains: searchParams.q, mode: 'insensitive' } },
        ]
    }

    const [logs, total, estatisticas] = await Promise.all([
        db.auditLog.findMany({
            where,
            orderBy: { criado_em: 'desc' },
            take: porPagina,
            skip,
        }),
        db.auditLog.count({ where }),
        db.auditLog.groupBy({
            by: ['categoria'],
            where: { tenant_id: Number(tenantId) },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        })
    ])

    const totalPaginas = Math.ceil(total / porPagina)

    const formatarData = (d: Date) =>
        new Intl.DateTimeFormat('pt-PT', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(new Date(d))

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-32">

            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-soft">
                <div className="space-y-2">
                    <span className="text-figueira font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                        <Shield size={14} /> Governanca e Conformidade
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Auditoria <span className="text-muted/20">do Sistema.</span>
                    </h1>
                </div>
                <div className="text-right">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Total de registos</p>
                    <p className="text-3xl font-black italic text-fg">{total.toLocaleString('pt-PT')}</p>
                </div>
            </header>

            {/* KPIs POR CATEGORIA */}
            <div className="flex flex-wrap gap-2">
                {estatisticas.map(e => (
                    <div key={e.categoria} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] md:text-[11px] font-black uppercase tracking-widest ${COR_CATEGORIA[e.categoria] || COR_CATEGORIA.SISTEMA}`}>
                        {e.categoria}
                        <span className="opacity-60">{e._count.id}</span>
                    </div>
                ))}
            </div>

            {/* FILTROS */}
            <FiltroAuditoria
                categoriaActual={searchParams.categoria}
                acaoActual={searchParams.acao}
                qActual={searchParams.q}
            />

            {/* TABELA */}
            <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                {logs.length === 0 ? (
                    <div className="py-16 text-center">
                        <Shield size={28} className="mx-auto text-muted/20 mb-3" />
                        <p className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted">
                            Nenhum registo encontrado
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[800px]">
                            <thead>
                                <tr className="border-b border-soft bg-bg2">
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted w-40">Data / Hora</th>
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted w-32">Acao</th>
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted w-28">Categoria</th>
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted w-36">Executado por</th>
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">Descricao</th>
                                    <th className="px-5 py-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted w-28">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft/50">
                                {logs.map(log => {
                                    const cfg = ICONE_ACAO[log.acao] || ICONE_ACAO['EDITAR']
                                    const IconeAcao = cfg.icon

                                    return (
                                        <tr key={log.id} className="hover:bg-soft/10 transition-colors">
                                            {/* DATA */}
                                            <td className="px-5 py-3.5">
                                                <p className="text-[10px] md:text-xs font-black text-fg leading-none">
                                                    {formatarData(log.criado_em)}
                                                </p>
                                            </td>

                                            {/* ACAO */}
                                            <td className="px-5 py-3.5">
                                                <span className={`flex items-center gap-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg ${cfg.bg} ${cfg.cor} w-fit`}>
                                                    <IconeAcao size={10} />
                                                    {log.acao.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* CATEGORIA */}
                                            <td className="px-5 py-3.5">
                                                <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${COR_CATEGORIA[log.categoria] || COR_CATEGORIA.SISTEMA}`}>
                                                    {log.categoria}
                                                </span>
                                            </td>

                                            {/* ACTOR */}
                                            <td className="px-5 py-3.5">
                                                <p className="text-[10px] md:text-xs font-bold text-fg truncate max-w-[130px]">
                                                    {log.actor_nome || (log.actor_id ? `#${log.actor_id}` : 'Sistema')}
                                                </p>
                                            </td>

                                            {/* DESCRICAO */}
                                            <td className="px-5 py-3.5">
                                                <p className="text-[10px] md:text-xs text-muted font-medium truncate max-w-xs">
                                                    {log.descricao || '—'}
                                                </p>
                                                {log.alvo_nome && (
                                                    <p className="text-[8px] md:text-[10px] text-figueira/70 font-bold uppercase tracking-widest mt-0.5">
                                                        Alvo: {log.alvo_nome}
                                                    </p>
                                                )}
                                            </td>

                                            {/* IP */}
                                            <td className="px-5 py-3.5">
                                                <code className="text-[9px] md:text-[11px] font-mono text-muted/70">
                                                    {log.ip || '—'}
                                                </code>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* PAGINACAO */}
            {totalPaginas > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">
                        Pagina {pagina} de {totalPaginas} ({total} registos)
                    </p>
                    <div className="flex gap-2">
                        {pagina > 1 && (
                            <a href={`?pagina=${pagina - 1}${searchParams.categoria ? `&categoria=${searchParams.categoria}` : ''}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
                                className="px-4 py-2 bg-bg2 border border-soft rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted hover:border-figueira hover:text-figueira transition-all">
                                Anterior
                            </a>
                        )}
                        {pagina < totalPaginas && (
                            <a href={`?pagina=${pagina + 1}${searchParams.categoria ? `&categoria=${searchParams.categoria}` : ''}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
                                className="px-4 py-2 bg-figueira text-white rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all">
                                Seguinte
                            </a>
                        )}
                    </div>
                </div>
            )}
        </main>
    )
}
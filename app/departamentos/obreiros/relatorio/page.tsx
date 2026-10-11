import { getDb } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSessionData } from '@/lib/auth-utils'
import { getObreirosRole, podeVerRelatorio } from '@/lib/obreiros-permissions'
import { buscarEstatisticasObreiros } from '@/actions/obreiros-actions'
import {
    ArrowLeft, BarChart3, Users, Calendar, Award, TrendingUp
} from 'lucide-react'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'
import ObreirosPeriodoSelector from '@/components/obreiros/ObreirosPeriodoSelector'

const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

export default async function ObreirosRelatorio({
    searchParams
}: {
    searchParams: Promise<{ periodo?: string }>
}) {
    const { periodo: periodoParam } = await searchParams
    const periodo = Number(periodoParam) || 3

    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true,
        },
    })
    if (!membroLogado) redirect('/membros/login')

    const role = getObreirosRole(membroLogado, session.role)
    if (!podeVerRelatorio(role)) {
        redirect('/membros/dashboard?error=Acesso restrito.')
    }

    // Encontrar departamento
    const deptos = await db.departamento.findMany({ select: { id: true, nome: true } })
    const depto = deptos.find((d: any) => TERMOS_DIACONIA.some(t => d.nome.toLowerCase().includes(t)))
    if (!depto) redirect('/departamentos/obreiros/dashboard')

    const result = await buscarEstatisticasObreiros(depto.id, periodo)
    if (!result.ok || !result.data) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4">
                <p className="text-sm font-black uppercase text-muted">Erro ao carregar dados</p>
            </div>
        )
    }

    const stats = result.data
    const maxServicos = stats.ranking.length > 0 ? stats.ranking[0].confirmados : 1
    const maxFuncao = stats.funcaoDistribuicao.length > 0 ? stats.funcaoDistribuicao[0].count : 1
    const maxMensal = stats.tendenciaMensal.length > 0 ? Math.max(...stats.tendenciaMensal.map(m => m.count)) : 1

    return (
        <div className="min-h-screen bg-bg pb-28">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-bg2 border-b border-soft px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
                <div className="flex items-center gap-3">
                    <Link href="/departamentos/obreiros/dashboard" className="w-9 h-9 flex items-center justify-center bg-soft rounded-xl text-muted hover:text-fg transition-all">
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="text-base font-black uppercase italic tracking-tighter text-fg">Relatorio</h1>
                        <p className="text-[7px] font-black uppercase tracking-widest text-figueira">Obreiros · {periodo} {periodo === 1 ? 'mes' : 'meses'}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* Selector de periodo */}
                <Suspense fallback={null}>
                    <ObreirosPeriodoSelector />
                </Suspense>

                {/* KPIs */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1">
                        <Calendar size={18} className="text-blue-400" />
                        <span className="text-2xl font-black text-fg">{stats.totalServicos}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Total Servicos</span>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1">
                        <Users size={18} className="text-figueira" />
                        <span className="text-2xl font-black text-fg">{stats.mediaServicos}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Media/Obreiro</span>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1">
                        <Award size={18} className="text-amber-500" />
                        <span className="text-sm font-black text-fg truncate max-w-full">{stats.melhorObreiro?.nome || '—'}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">
                            {stats.melhorObreiro ? `${stats.melhorObreiro.count} servicos` : 'Mais Activo'}
                        </span>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1">
                        <TrendingUp size={18} className="text-emerald-500" />
                        <span className="text-2xl font-black text-fg">{stats.taxaConfirmacao}%</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Confirmacao</span>
                    </div>
                </div>

                {/* Ranking */}
                <SeccaoColapsavel
                    titulo="Ranking de Servico"
                    icon={<Award size={16} className="text-amber-500" />}
                    badge={
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500">
                            {stats.ranking.length}
                        </span>
                    }
                    defaultOpen
                >
                    <div className="px-5 py-4 space-y-3">
                        {stats.ranking.map((obr: any, idx: number) => {
                            const medalha = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null
                            const percentual = maxServicos > 0 ? Math.round((obr.confirmados / maxServicos) * 100) : 0

                            return (
                                <div key={obr.membroId} className="flex items-center gap-3">
                                    <span className="w-8 text-center text-sm font-black text-fg shrink-0">
                                        {medalha || `${idx + 1}.`}
                                    </span>
                                    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-figueira text-white text-[10px] font-black shrink-0">
                                        {obr.iniciais}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase italic text-fg truncate">{obr.nome}</p>
                                        <div className="mt-1 h-2 bg-soft rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-figueira'}`}
                                                style={{ width: `${percentual}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-black text-fg shrink-0">{obr.confirmados}</span>
                                </div>
                            )
                        })}
                        {stats.ranking.length === 0 && (
                            <p className="text-center text-xs font-black uppercase text-muted py-4">Sem dados neste periodo</p>
                        )}
                    </div>
                </SeccaoColapsavel>

                {/* Distribuicao por Funcao */}
                <SeccaoColapsavel
                    titulo="Distribuicao por Funcao"
                    icon={<BarChart3 size={16} className="text-purple-500" />}
                    defaultOpen
                >
                    <div className="px-5 py-4 space-y-3">
                        {stats.funcaoDistribuicao.map((f: any) => {
                            const percentual = maxFuncao > 0 ? Math.round((f.count / maxFuncao) * 100) : 0
                            return (
                                <div key={f.nome} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-fg">{f.nome}</span>
                                        <span className="text-xs font-black text-figueira">{f.count}</span>
                                    </div>
                                    <div className="h-3 bg-soft rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-purple-500 rounded-full transition-all"
                                            style={{ width: `${percentual}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                        {stats.funcaoDistribuicao.length === 0 && (
                            <p className="text-center text-xs font-black uppercase text-muted py-4">Sem dados neste periodo</p>
                        )}
                    </div>
                </SeccaoColapsavel>

                {/* Tendencia Mensal */}
                <SeccaoColapsavel
                    titulo="Tendencia Mensal"
                    icon={<TrendingUp size={16} className="text-emerald-500" />}
                    defaultOpen
                >
                    <div className="px-5 py-4">
                        {stats.tendenciaMensal.length > 0 ? (
                            <div className="flex items-end gap-2 h-32">
                                {stats.tendenciaMensal.map((m: any) => {
                                    const altura = maxMensal > 0 ? Math.round((m.count / maxMensal) * 100) : 0
                                    return (
                                        <div key={m.mes} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-[10px] font-black text-figueira">{m.count}</span>
                                            <div className="w-full bg-soft rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
                                                <div
                                                    className="w-full bg-emerald-500 rounded-t-lg transition-all"
                                                    style={{ height: `${altura}%`, marginTop: `${100 - altura}%` }}
                                                />
                                            </div>
                                            <span className="text-[7px] font-black uppercase tracking-widest text-muted">{m.mes}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-xs font-black uppercase text-muted py-4">Sem dados neste periodo</p>
                        )}
                    </div>
                </SeccaoColapsavel>
            </div>
        </div>
    )
}

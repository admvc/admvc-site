// app/admin/escalas/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { Settings2, ArrowRight } from 'lucide-react'
import MontadorEscalas from '@/components/escalas/MontadorEscalas'
import ListaEscalados from '@/components/escalas/ListaEscalados'
import { getTipoEvento } from '@/lib/evento-tipos'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function EscalasPage({ searchParams }: { searchParams: Promise<{ congregacao?: string; evento?: string }> }) {
    const db = await getDb()
    const params = await searchParams
    const session = await getSessionData()
    const congFilter = session?.role === 'CONGREGATION_ADMIN' && session.congregacaoId
        ? session.congregacaoId
        : params.congregacao ? Number(params.congregacao) : undefined

    const tenantId = await getTenantIdFromHeaders()

    const dataInicioMes = new Date()
    dataInicioMes.setDate(1)

    const congWhere = congFilter ? { congregacao_id: congFilter } : {}

    const [eventos, departamentos, membrosComFuncoes, congregacoes] = await Promise.all([
        db.evento.findMany({
            where: { data: { gte: dataInicioMes }, ...congWhere },
            include: {
                escalas: {
                    include: {
                        membro: {
                            select: { id: true, first_name: true, last_name: true, avatar_file: true, phone_1: true }
                        },
                        departamento: true
                    },
                    orderBy: [{ departamento: { nome: 'asc' } }]
                }
            },
            orderBy: { data: 'asc' }
        }),
        db.departamento.findMany({
            where: congFilter
                ? { tem_escala: true, OR: [{ congregacaoId: congFilter }, { is_global: true }] }
                : { tem_escala: true },
            select: { id: true, nome: true, congregacaoId: true, is_global: true, funcoes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' as const } } },
            orderBy: { nome: 'asc' }
        }),
        db.membro.findMany({
            where: { status: 'ATIVO', ...congWhere },
            include: {
                ministerios: {
                    select: {
                        departamento_id: true,
                        funcoes: {
                            select: { funcao_id: true, funcao: { select: { id: true, nome: true } } }
                        }
                    }
                },
                departamentos_liderados: { select: { id: true } }
            },
            orderBy: { first_name: 'asc' }
        }),
        tenantId ? db.congregacao.findMany({
            where: { tenant_id: tenantId },
            select: { id: true, nome: true, cidade: true },
            orderBy: { nome: 'asc' }
        }) : [],
    ])

    // Formatar membros com funcoesHabilitadas por departamento
    const membrosFormatados = membrosComFuncoes.map((m: any) => ({
        ...m,
        funcoesHabilitadas: m.ministerios.flatMap((min: any) =>
            min.funcoes.map((f: any) => f.funcao_id)
        ),
    }))

    const hoje = new Date(new Date().setUTCHours(0, 0, 0, 0))
    const eventosFuturos = eventos.filter(e => new Date(e.data) >= hoje)

    // KPIs rapidos
    const totalVoluntarios = eventosFuturos.reduce((sum, ev) => sum + ev.escalas.length, 0)
    const totalEventos = eventosFuturos.length
    const pendentesConfirmacao = eventosFuturos.reduce(
        (sum, ev) => sum + ev.escalas.filter((e: any) => !e.confirmado && !e.motivo_recusa).length, 0
    )

    const selecionado = eventosFuturos.find(e => String(e.id) === params.evento) ?? eventosFuturos[0]
    const contar = (ev: any) => ({
        sim: ev.escalas.filter((e: any) => e.confirmado).length,
        nao: ev.escalas.filter((e: any) => !e.confirmado && e.motivo_recusa).length,
        falta: ev.escalas.filter((e: any) => !e.confirmado && !e.motivo_recusa).length,
    })
    const diaCurto = (d: Date) => new Date(d).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/\./g, '')
    const horaDe = (d: Date) => new Date(d).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    const comCong = (q: string) => params.congregacao ? `${q}&congregacao=${params.congregacao}` : q

    return (
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
            <Breadcrumbs items={[{ label: 'Escalas' }]} />

            <header className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-fg">Escalas</h1>
                    <p className="text-sm text-muted">
                        {totalEventos} culto{totalEventos !== 1 ? 's' : ''} marcado{totalEventos !== 1 ? 's' : ''} · {totalVoluntarios} pessoas escaladas
                        {pendentesConfirmacao > 0 && <> · <span className="font-semibold text-orange-600">{pendentesConfirmacao} por confirmar</span></>}
                    </p>
                </div>
                <Link href="/admin/eventos" className="flex items-center gap-2 text-sm font-semibold text-figueira hover:underline">
                    Gerir eventos <ArrowRight size={14} />
                </Link>
            </header>

            {eventosFuturos.length === 0 ? (
                <p className="text-sm text-muted">Nenhum culto marcado. <Link href="/admin/eventos" className="text-figueira underline">Criar evento</Link></p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
                    {/* PRÓXIMOS CULTOS */}
                    <nav aria-label="Próximos cultos" className="space-y-2 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto lg:pr-1">
                        {eventosFuturos.slice(0, 30).map((ev: any) => {
                            const tipoInfo = getTipoEvento(ev.tipo || 'CULTO_REGULAR')
                            const c = contar(ev)
                            const ativo = selecionado?.id === ev.id
                            return (
                                <Link key={ev.id} href={comCong(`/admin/escalas?evento=${ev.id}`)} aria-current={ativo ? 'page' : undefined}
                                    className={`block rounded-xl border px-4 py-3 transition-colors ${ativo ? 'border-figueira bg-figueira/5' : 'border-soft bg-bg2 hover:border-fg/30'}`}>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${tipoInfo.cor}`} aria-hidden />
                                        <span className="font-semibold capitalize text-fg">{diaCurto(ev.data)}</span>
                                        <span className="text-muted">{horaDe(ev.data)}</span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[15px] font-medium text-fg">{ev.nome}</p>
                                    <p className="mt-1 text-[13px] text-muted">
                                        {ev.escalas.length === 0 ? 'Ninguém escalado' : (
                                            <>
                                                <span className="text-emerald-600">{c.sim} confirmados</span>
                                                {c.falta > 0 && <> · <span className="text-orange-600">{c.falta} por confirmar</span></>}
                                                {c.nao > 0 && <> · <span className="text-red-600">{c.nao} não podem</span></>}
                                            </>
                                        )}
                                    </p>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* O CULTO ESCOLHIDO */}
                    <div className="min-w-0 space-y-4">
                        {selecionado && selecionado.escalas.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-soft px-6 py-8 text-center">
                                <p className="font-semibold text-fg">{selecionado.nome} · <span className="capitalize">{diaCurto(selecionado.data)}</span></p>
                                <p className="mt-1 text-sm text-muted">Ainda ninguém escalado neste culto.</p>
                            </div>
                        ) : <ListaEscalados
                            eventos={selecionado ? [selecionado] : []}
                            isAdmin={true}
                            membros={membrosFormatados}
                            congregacoes={congregacoes}
                            podeEditarRepertorio={true}
                        />}
                        <details className="rounded-2xl border border-soft bg-bg2" open={selecionado?.escalas.length === 0}>
                            <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-semibold text-fg">
                                <Settings2 size={16} className="text-figueira" /> Escalar alguém (qualquer culto e ministério)
                            </summary>
                            <div className="border-t border-soft p-5">
                                <MontadorEscalas eventos={eventosFuturos} departamentos={departamentos} membros={membrosFormatados} />
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </main>
    )
}

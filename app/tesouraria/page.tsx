// app/departamentos/financeiro/dashboard/page.tsx
import { getDb } from '@/lib/db'
import {
    Target, Wallet, Ticket, Archive, CheckCircle2, AlertCircle,
    Coffee, ChevronDown, HandCoins, History, Users,
    Layers, PieChart, Receipt, PlusCircle
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import FormLancamentoOferta from '@/components/financeiro/FormLancamentoOferta'
import BotaoConfirmarMBWay from '@/components/financeiro/BotaoConfirmarMBWay'
import ModalNovaCampanha from '@/components/financeiro/ModalNovaCampanha'
import GrelhaRifa from '@/components/financeiro/GrelhaRifa'
import ModalHistoricoRifa from '@/components/financeiro/ModalHistoricoRifa'
import BotaoAprovarCantina from '@/components/financeiro/BotaoAprovarCantina'
import FiltroTotaisFinanceiro from '@/components/financeiro/FiltroTotaisFinanceiro'
import GestaoObraWidget from '@/components/financeiro/GestaoObraWidget'
import ModalPagamentoRapidoCarne from '@/components/financeiro/ModalPagamentoRapidoCarne'
import BotaoPrivacidade from '@/components/financeiro/BotaoPrivacidade'
import ModalEntradaUnificada from '@/components/financeiro/ModalEntradaUnificada'
import Breadcrumb from '@/components/ui/Breadcrumb'
import ModalRelatorioTesouraria from '@/components/financeiro/ModalRelatorioTesouraria'

export const dynamic = 'force-dynamic'

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

const formatarData = (data: any) =>
    new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(new Date(data)).replace(',', ' às')

export default async function DashboardFinanceiro() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session || !['FINANCE', 'ADMIN'].includes(session.role)) {
        redirect('/membros/dashboard?error=Acesso negado ao módulo financeiro')
    }

    // ── QUERY CONSOLIDADA ────────────────────────────────────────────────────
    const [
        adminLogado,
        objetivos,
        membros,
        lancamentosRecentes,
        pendentesMBWay,
        rifaAtiva,
        rifasFinalizadas,
        pedidosCantina,
        carregamentosAprovados,
        todasContribuicoes,
        totalRifasVendidas,
        rifasAtivasCount,
    ] = await Promise.all([
        // Membro logado
        db.membro.findUnique({
            where: { id: session.membroId },
            select: { first_name: true }
        }),

        // Carnês/objetivos — inclui membro e lançamentos completos
        db.objetivoFinanceiro.findMany({
            include: {
                membro: { select: { id: true, first_name: true, last_name: true } },
                lancamentos: { orderBy: { data_recebimento: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
        }),

        // Membros para selects
        db.membro.findMany({
            select: { id: true, first_name: true, last_name: true, loyverse_id: true },
            orderBy: { first_name: 'asc' }
        }),

        // Últimos lançamentos confirmados (histórico)
        db.lancamentoFinanceiro.findMany({
            take: 8,
            where: { NOT: { forma_pagamento: 'MBWAY' } },
            include: {
                objetivo: {
                    select: {
                        nome: true,
                        membro: { select: { first_name: true, last_name: true } }
                    }
                }
            },
            orderBy: { data_recebimento: 'desc' }
        }),

        // Pendentes MBWay — inclui nome do objetivo e membro
        db.lancamentoFinanceiro.findMany({
            where: { forma_pagamento: 'MBWAY' },
            include: {
                objetivo: {
                    select: {
                        nome: true,
                        membro: { select: { first_name: true, last_name: true } }
                    }
                }
            },
            orderBy: { data_recebimento: 'asc' }
        }),

        // Rifa ativa — inclui TODOS os campos que GrelhaRifa precisa
        db.rifa.findFirst({
            where: { status: 'ATIVA' },
            include: {
                numeros_vendidos: {
                    include: {
                        membro: { select: { id: true, first_name: true, last_name: true } }
                    }
                    // ✅ inclui automaticamente: id, numero, nome_externo, pago, createdAt
                }
            }
        }),

        // Rifas finalizadas — mesma estrutura da ativa
        db.rifa.findMany({
            where: { status: 'FINALIZADA' },
            orderBy: { createdAt: 'desc' },
            include: {
                numeros_vendidos: {
                    include: {
                        membro: { select: { id: true, first_name: true, last_name: true } }
                    }
                }
            }
        }),

        // Pedidos cantina pendentes
        db.pedidoSaldoCantina.findMany({
            where: { status: 'PENDENTE' },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true, loyverse_id: true } }
            },
            orderBy: { createdAt: 'asc' }
        }),

        // Carregamentos aprovados (só para totalizar transações)
        db.pedidoSaldoCantina.findMany({
            where: { status: 'APROVADO' },
            select: { valor: true, createdAt: true }
        }),

        // Contribuições (dízimos/ofertas)
        db.contribuicao.findMany({
            include: { membro: { select: { id: true, first_name: true, last_name: true } } },
            orderBy: { data: 'desc' }
        }),

        // ✅ CORRIGIDO: só select, sem include em simultâneo
        db.rifaNumero.findMany({
            select: {
                createdAt: true,
                rifa: { select: { valor_numero: true } }
            }
        }),

        // Contagem rifas ativas
        db.rifa.count({ where: { status: 'ATIVA' } }),
    ])

    // ── PROCESSAMENTO ────────────────────────────────────────────────────────
    const campanhasMap = objetivos.reduce((acc: any, obj: any) => {
        if (!acc[obj.nome]) {
            acc[obj.nome] = {
                nome: obj.nome,
                valor_mensal: obj.valor_mensal,
                parcelas_total: obj.parcelas_total,
                data_pagamento: obj.data_pagamento,
                objetivos: [],
                // ✅ membros_ids necessário para o ModalNovaCampanha filtrar quem já está
                membros_ids: [],
                totalPago: 0,
                metaTotal: 0,
                valorPendente: 0
            }
        }
        const validos = obj.lancamentos.filter((l: any) => l.forma_pagamento !== 'MBWAY')
        const pendentes = obj.lancamentos.filter((l: any) => l.forma_pagamento === 'MBWAY')
        acc[obj.nome].objetivos.push(obj)
        // ✅ acumula os IDs dos membros que já pertencem à campanha
        acc[obj.nome].membros_ids.push(obj.membro_id)
        acc[obj.nome].totalPago += validos.reduce((s: number, l: any) => s + l.valor_pago, 0)
        acc[obj.nome].valorPendente += pendentes.reduce((s: number, l: any) => s + l.valor_pago, 0)
        acc[obj.nome].metaTotal += obj.valor_mensal * obj.parcelas_total
        return acc
    }, {})
    const campanhasAgrupadas = Object.values(campanhasMap) as any[]

    const dizimistasIds = new Set(todasContribuicoes.filter((c: any) => c.tipo === 'DIZIMO').map((c: any) => c.membro_id))
    const membrosComCarneIds = new Set(objetivos.map(o => o.membro_id))
    // ✅ Sempre passa TODOS os membros — o modal precisa deles para dízimos, ofertas e rifas
    const membrosParaReceber = membros

    // Transações para o gráfico
    const transacoesFlat = [
        ...objetivos.flatMap(o =>
            o.lancamentos
                .filter((l: any) => l.forma_pagamento !== 'MBWAY')
                .map((l: any) => ({ valor: l.valor_pago, data: l.data_recebimento.toISOString(), categoria: 'CARNE' }))
        ),
        ...totalRifasVendidas.map((n: any) => ({
            valor: n.rifa.valor_numero,
            data: n.createdAt.toISOString(),
            categoria: 'RIFA'
        })),
        ...todasContribuicoes.map((c: any) => ({
            valor: c.valor,
            data: (c.data || c.createdAt).toISOString(),
            categoria: c.tipo
        }))
    ]

    // Histórico recente unificado
    const historicoRecente = [
        ...lancamentosRecentes.map((l: any) => ({
            id: `carne-${l.id}`,
            nome: `${l.objetivo.membro.first_name} ${l.objetivo.membro.last_name}`,
            descricao: l.objetivo.nome,
            valor: l.valor_pago,
            data: l.data_recebimento,
            tipo: 'CARNÊ'
        })),
        ...todasContribuicoes.slice(0, 8).map((c: any) => ({
            id: `contrib-${c.id}`,
            nome: c.membro ? `${c.membro.first_name} ${c.membro.last_name}` : 'Anónimo',
            descricao: c.tipo,
            valor: c.valor,
            data: c.data || c.createdAt,
            tipo: c.tipo
        }))
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10)

    const totalArrecadadoGeral =
        transacoesFlat.reduce((s, t) => s + t.valor, 0)

    return (
        <main className="max-w-7xl mx-auto pt-16 md:pt-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-28">

            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-30">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Tesouraria</h1>
                    <p className="text-xs text-muted">Gestao financeira da igreja.</p>
                </div>

                <div className="flex items-center gap-2">
                    <ModalEntradaUnificada
                        membros={membrosParaReceber}
                        carnesAtivos={objetivos}
                        rifaAtiva={rifaAtiva}
                    />

                    <details className="group relative z-30">
                        <summary className="list-none cursor-pointer marker:hidden [&::-webkit-details-marker]:hidden">
                            <div className="h-11 px-4 bg-figueira text-white rounded-xl flex items-center gap-2 hover:bg-figueira/90 transition-all active:scale-95">
                                <PlusCircle size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">Campanha</span>
                                <ChevronDown size={12} className="opacity-50 group-open:rotate-180 transition-transform" />
                            </div>
                        </summary>
                        <div className="absolute right-0 top-full mt-2 w-60 bg-bg border border-soft p-2 rounded-[1.5rem] shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-1.5 z-50">
                            <p className="text-[8px] text-muted font-black uppercase tracking-widest px-3 pt-2 pb-1.5 border-b border-soft/50">Criar Novo Objetivo</p>
                            <ModalNovaCampanha membros={membros} tipoPredefinido="CARNE" campanhasExistentes={campanhasAgrupadas} />
                            <ModalNovaCampanha membros={membros} tipoPredefinido="RIFA" />
                            <div className="border-t border-soft/50 mt-1 pt-1">
                                <ModalRelatorioTesouraria membros={membros} />
                            </div>
                        </div>
                    </details>
                </div>
            </header>

            {/* ── KPIs ─────────────────────────────────────────────────────── */}
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <KpiCard label="Total Arrecadado" value={<span className="valor-dinheiro inline-block">{euro(totalArrecadadoGeral)}</span>} />
                <KpiCard label="Campanhas" value={campanhasAgrupadas.length} />
                <KpiCard label="Rifas Ativas" value={rifasAtivasCount} />
                <KpiCard label="Dizimistas" value={dizimistasIds.size} />

                <div className="p-5 rounded-2xl border border-soft bg-bg2 flex flex-col justify-between gap-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-muted">Privacidade</p>
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-muted leading-tight">Ocultar valores</span>
                        <BotaoPrivacidade />
                    </div>
                </div>
            </section>

            {/* ── ALERTAS PENDENTES ────────────────────────────────────────── */}
            {(pendentesMBWay.length > 0 || pedidosCantina.length > 0) && (
                <section className="space-y-3">
                    {/* MBWAY */}
                    {pendentesMBWay.length > 0 && (
                        <Alerta
                            icon={<AlertCircle size={18} />}
                            cor="orange"
                            titulo={`${pendentesMBWay.length} pagamento${pendentesMBWay.length !== 1 ? 's' : ''} MBWay por validar`}
                            subtitulo="Confirma os pagamentos antes de registar"
                        >
                            <div className="space-y-2 pt-2">
                                {pendentesMBWay.map((l: any) => (
                                    <div key={l.id} className="flex items-center justify-between bg-bg border border-soft rounded-2xl px-4 py-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-fg">
                                                {l.objetivo.membro.first_name} {l.objetivo.membro.last_name}
                                            </p>
                                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest">{l.objetivo.nome}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-fg">{euro(l.valor_pago)}</span>
                                            <BotaoConfirmarMBWay pendentes={[l]} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Alerta>
                    )}

                    {/* CANTINA */}
                    {pedidosCantina.length > 0 && (
                        <Alerta
                            icon={<Coffee size={18} />}
                            cor="blue"
                            titulo={`${pedidosCantina.length} pedido${pedidosCantina.length !== 1 ? 's' : ''} de saldo cantina pendente${pedidosCantina.length !== 1 ? 's' : ''}`}
                            subtitulo="Aprova os carregamentos de saldo"
                        >
                            <div className="space-y-2 pt-2">
                                {pedidosCantina.map((pedido: any) => (
                                    <div key={pedido.id} className="flex items-center justify-between bg-bg border border-soft rounded-2xl px-4 py-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-fg">
                                                {pedido.membro.first_name} {pedido.membro.last_name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-muted">#{pedido.id}</span>
                                                <span className="text-[8px] font-black uppercase tracking-widest text-figueira bg-figueira/10 px-1.5 py-0.5 rounded-md">{pedido.forma_pagamento}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-black text-fg">{euro(Number(pedido.valor))}</span>
                                            <BotaoAprovarCantina
                                                pedidoId={pedido.id}
                                                loyverseId={pedido.membro.loyverse_id}
                                                valor={Number(pedido.valor)}
                                                nomeMembro={pedido.membro.first_name}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Alerta>
                    )}
                </section>
            )}

            {/* ── GRID PRINCIPAL ───────────────────────────────────────────── */}
            <section className="grid xl:grid-cols-2 gap-6">
                <SecaoColapsavel
                    icon={<Target size={18} />}
                    titulo="Progresso Financeiro"
                    subtitulo="Acompanhamento da Obra"
                    corIcone="text-figueira bg-figueira/10"
                >
                    <GestaoObraWidget />
                </SecaoColapsavel>

                <SecaoColapsavel
                    icon={<PieChart size={18} />}
                    titulo="Relatório Consolidado"
                    subtitulo="Resumo de entradas por período"
                    corIcone="text-blue-500 bg-blue-500/10"
                >
                    <FiltroTotaisFinanceiro transacoes={transacoesFlat} />
                </SecaoColapsavel>
            </section>

            {/* ── SORTEIO ATIVO ─────────────────────────────────────────────── */}
            {rifaAtiva && (
                <SecaoColapsavel
                    icon={<Ticket size={18} />}
                    titulo="Sorteio em Andamento"
                    subtitulo={`${rifaAtiva.nome} · ${rifaAtiva.numeros_vendidos.length}/${rifaAtiva.total_numeros} números vendidos`}
                    corIcone="text-figueira bg-figueira/10"
                    defaultOpen
                >
                    <div className="bg-bg border border-soft rounded-2xl overflow-hidden">
                        <GrelhaRifa rifa={rifaAtiva} membros={membros} />
                    </div>
                </SecaoColapsavel>
            )}

            {/* ── CAMPANHAS E CARNÊS ────────────────────────────────────────── */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 pb-2 border-b border-soft">
                    <Target size={16} className="text-figueira" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Campanhas e Carnês</h2>
                    <span className="text-[9px] font-black bg-bg2 border border-soft px-2.5 py-1 rounded-lg text-muted">{campanhasAgrupadas.length}</span>
                </div>

                <div className="space-y-3">
                    {campanhasAgrupadas.map((campanha: any) => {
                        const pct = Math.min((campanha.totalPago / campanha.metaTotal) * 100, 100) || 0
                        const concluida = pct >= 100

                        return (
                            <details key={campanha.nome} className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                                {/* BARRA DE PROGRESSO TOPO */}
                                <div className="h-0.5 bg-soft">
                                    <div className={`h-full transition-all duration-700 ${concluida ? 'bg-emerald-500' : 'bg-figueira'}`} style={{ width: `${pct}%` }} />
                                </div>

                                <summary className="cursor-pointer px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 list-none [&::-webkit-details-marker]:hidden hover:bg-soft/10 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${concluida ? 'bg-emerald-500/10 text-emerald-600' : 'bg-figueira/10 text-figueira'}`}>
                                            {concluida ? <CheckCircle2 size={18} /> : <Layers size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black uppercase tracking-tight text-fg leading-none">{campanha.nome}</h3>
                                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                                <Users size={10} /> {campanha.objetivos.length} membros
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-sm font-black text-fg">
                                                {euro(campanha.totalPago)}
                                                <span className="text-muted text-[10px] font-medium"> / {euro(campanha.metaTotal)}</span>
                                            </p>
                                            {campanha.valorPendente > 0 && (
                                                <p className="text-[8px] font-black text-orange-500 mt-0.5">
                                                    +{euro(campanha.valorPendente)} pendente
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right hidden sm:block w-12">
                                            <p className="text-lg font-black text-figueira italic">{pct.toFixed(0)}%</p>
                                        </div>
                                        <ChevronDown size={15} className="text-muted group-open:rotate-180 transition-transform duration-200 shrink-0" />
                                    </div>
                                </summary>

                                <div className="px-6 pb-6 pt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 border-t border-soft animate-in slide-in-from-top-2 duration-200">
                                    {campanha.objetivos.map((obj: any) => {
                                        const validos = obj.lancamentos.filter((l: any) => l.forma_pagamento !== 'MBWAY')
                                        const totalInd = validos.reduce((s: number, l: any) => s + l.valor_pago, 0)
                                        const metaInd = obj.valor_mensal * obj.parcelas_total
                                        const percInd = Math.min((totalInd / metaInd) * 100, 100)
                                        const parcelasRestantes = obj.parcelas_total - (obj.parcelas_pagas || 0)
                                        const concluido = parcelasRestantes <= 0

                                        return (
                                            <div key={obj.id} className="bg-bg border border-soft rounded-2xl p-4 space-y-3 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-soft">
                                                    <div className={`h-full ${concluido ? 'bg-emerald-500' : 'bg-figueira/50'}`} style={{ width: `${percInd}%` }} />
                                                </div>
                                                <div className="flex justify-between items-start pt-1">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase text-fg">{obj.membro.first_name} {obj.membro.last_name}</p>
                                                        <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                                            {obj.parcelas_pagas || 0}/{obj.parcelas_total} parcelas
                                                        </p>
                                                    </div>
                                                    {concluido
                                                        ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                                        : <ModalPagamentoRapidoCarne
                                                            carneId={obj.id}
                                                            membroNome={`${obj.membro.first_name} ${obj.membro.last_name}`}
                                                            campanhaNome={campanha.nome}
                                                            valorParcela={obj.valor_mensal}
                                                            parcelasRestantes={parcelasRestantes}
                                                        />
                                                    }
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs font-black text-fg">{euro(totalInd)} <span className="text-[9px] text-muted font-medium">/ {euro(metaInd)}</span></p>
                                                    <p className="text-[10px] font-black text-figueira">{percInd.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </details>
                        )
                    })}

                    {campanhasAgrupadas.length === 0 && (
                        <div className="py-12 text-center border-2 border-dashed border-soft rounded-2xl">
                            <p className="text-[9px] font-black text-muted uppercase tracking-widest">Nenhuma campanha ativa.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* ── HISTÓRICO RECENTE ─────────────────────────────────────────── */}
            <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <summary className="cursor-pointer px-6 py-4 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:bg-soft/20 transition-colors">
                    <div className="flex items-center gap-3">
                        <History size={14} className="text-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted">Últimos Lançamentos</span>
                    </div>
                    <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform duration-200" />
                </summary>
                <div className="border-t border-soft p-4 grid grid-cols-1 md:grid-cols-2 gap-2 animate-in slide-in-from-top-2 duration-200">
                    {historicoRecente.map(item => (
                        <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-bg border border-soft rounded-2xl hover:border-figueira/20 transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.tipo === 'CARNÊ' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                    {item.tipo === 'CARNÊ' ? <Receipt size={13} /> : <HandCoins size={13} />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase text-fg leading-none">{item.nome}</p>
                                    <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">{item.descricao} · {formatarData(item.data)}</p>
                                </div>
                            </div>
                            <span className="text-sm font-black text-fg shrink-0 ml-4">{euro(item.valor)}</span>
                        </div>
                    ))}
                    {historicoRecente.length === 0 && (
                        <p className="text-[10px] text-muted italic p-4">Nenhum lançamento recente.</p>
                    )}
                </div>
            </details>

            {/* ── HISTÓRICO DE SORTEIOS ─────────────────────────────────────── */}
            {rifasFinalizadas.length > 0 && (
                <section className="space-y-4 pt-6 border-t border-soft">
                    <div className="flex items-center gap-3">
                        <Archive size={16} className="text-muted" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">Histórico de Sorteios</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {rifasFinalizadas.map((rifa: any) => (
                            <ModalHistoricoRifa key={rifa.id} rifa={rifa} />
                        ))}
                    </div>
                </section>
            )}
        </main>
    )
}

// ── COMPONENTES UTILITÁRIOS ───────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
    return (
        <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all hover:-translate-y-0.5
            ${accent ? 'bg-figueira/5 border-figueira/20' : 'bg-bg2 border-soft'}`}>
            <p className={`text-[8px] font-black uppercase tracking-widest ${accent ? 'text-figueira' : 'text-muted'}`}>{label}</p>
            <p className={`text-2xl font-black italic tracking-tighter leading-none ${accent ? 'text-figueira' : 'text-fg'}`}>{value}</p>
        </div>
    )
}

function Alerta({ icon, cor, titulo, subtitulo, children }: {
    icon: React.ReactNode
    cor: 'orange' | 'blue'
    titulo: string
    subtitulo: string
    children?: React.ReactNode
}) {
    const cores = {
        orange: {
            wrap: 'bg-orange-500/5 border-orange-500/20',
            icon: 'bg-orange-500/10 text-orange-500',
            titulo: 'text-orange-700',
            sub: 'text-orange-600/80',
            chevron: 'group-open:bg-orange-500'
        },
        blue: {
            wrap: 'bg-blue-500/5 border-blue-500/20',
            icon: 'bg-blue-500/10 text-blue-500',
            titulo: 'text-blue-700',
            sub: 'text-blue-600/80',
            chevron: 'group-open:bg-blue-500'
        }
    }
    const c = cores[cor]

    return (
        <details className={`group border rounded-2xl overflow-hidden ${c.wrap}`}>
            <summary className="cursor-pointer px-6 py-5 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:brightness-95 transition-all">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${c.icon}`}>{icon}</div>
                    <div>
                        <p className={`text-sm font-black uppercase tracking-tight leading-none ${c.titulo}`}>{titulo}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${c.sub}`}>{subtitulo}</p>
                    </div>
                </div>
                <div className={`w-8 h-8 bg-bg/50 border border-white/20 rounded-full flex items-center justify-center ${c.chevron} group-open:text-white transition-all`}>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform duration-200" />
                </div>
            </summary>
            <div className="px-6 pb-5 border-t border-white/10 pt-4 animate-in slide-in-from-top-2 duration-200">
                {children}
            </div>
        </details>
    )
}

function SecaoColapsavel({ icon, titulo, subtitulo, corIcone, children, defaultOpen }: {
    icon: React.ReactNode
    titulo: string
    subtitulo: string
    corIcone: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    return (
        <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden" open={defaultOpen}>
            <summary className="cursor-pointer px-6 py-5 flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:bg-soft/10 transition-colors">
                <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${corIcone}`}>{icon}</div>
                    <div>
                        <p className="text-sm font-black uppercase tracking-tight text-fg leading-none">{titulo}</p>
                        <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">{subtitulo}</p>
                    </div>
                </div>
                <ChevronDown size={15} className="text-muted group-open:rotate-180 transition-transform duration-200 shrink-0" />
            </summary>
            <div className="px-6 pb-6 pt-2 border-t border-soft animate-in slide-in-from-top-2 duration-200">
                {children}
            </div>
        </details>
    )
}
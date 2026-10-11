// app/assistencia/movimentos/page.tsx — Movimentos + Registar
import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, ArrowDown, ArrowUp } from 'lucide-react'
import FormMovimento from '@/components/assistencia/FormMovimento'

export const dynamic = 'force-dynamic'

const TIPO_BADGES: Record<string, string> = {
    DOACAO_RECEBIDA: 'bg-green-500/10 text-green-500 border-green-500/20',
    ENTREGA_FAMILIA: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    ENTREGA_ENTIDADE: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    REPASSE_CANTINA: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

const TIPO_LABELS: Record<string, string> = {
    DOACAO_RECEBIDA: 'Doacao Recebida',
    ENTREGA_FAMILIA: 'Entrega a Familia',
    ENTREGA_ENTIDADE: 'Entrega a Entidade',
    REPASSE_CANTINA: 'Repasse Cantina',
}

export default async function MovimentosPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const db = await getDb()

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true,
        }
    })
    if (!membroLogado) redirect('/membros/login')

    const isAdmin = isAdminCheck(session.role)
    const isFinance = session.role === 'FINANCE'
    const termosDepto = ['social', 'despensa', 'assist']
    const isEquipaSocial = membroLogado.ministerios.some((vinculo: any) => {
        const nomeDepto = vinculo.departamento?.nome.toLowerCase() || ''
        return termosDepto.some(t => nomeDepto.includes(t))
    })
    const isLiderSocial = membroLogado.departamentos_liderados.some((d: any) =>
        termosDepto.some(t => d.nome.toLowerCase().includes(t))
    )

    if (!isAdmin && !isFinance && !isEquipaSocial && !isLiderSocial) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa de Assistencia Social.')
    }

    // Itens para o formulario
    const itens = await db.itemAssistenciaSocial.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, stock: true, unidade: true },
    })

    // Movimentos recentes
    const movimentos = await db.movimentoAssistencia.findMany({
        orderBy: { criado_em: 'desc' },
        take: 50,
        include: {
            item: { select: { nome: true, unidade: true } },
        },
    })

    return (
        <main className="max-w-7xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-28 md:pb-32">
            {/* Header */}
            <header className="space-y-2">
                <Link href="/assistencia" className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:brightness-125 transition-all">
                    <HeartHandshake size={14} /> Assistencia Social
                </Link>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                    Movimentos
                </h1>
                <p className="text-xs text-muted">Registar doacoes, entregas e repasses.</p>
            </header>

            {/* Form to register movement */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                    <ArrowDown size={14} className="text-green-500" /> Registar Movimento
                </h2>
                <div className="bg-bg2 border border-soft rounded-2xl p-6">
                    {itens.length === 0 ? (
                        <div className="text-center space-y-2 py-6">
                            <p className="text-sm font-bold text-muted">Nenhum item cadastrado.</p>
                            <p className="text-[10px] text-muted">
                                Adicione itens em{' '}
                                <Link href="/assistencia/stock" className="text-figueira underline">
                                    Gestao de Stock
                                </Link>{' '}
                                primeiro.
                            </p>
                        </div>
                    ) : (
                        <FormMovimento itens={itens} />
                    )}
                </div>
            </section>

            {/* Recent movements */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                    <ArrowUp size={14} className="text-figueira" /> Historico Recente
                </h2>

                {movimentos.length === 0 ? (
                    <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center">
                        <p className="text-sm font-bold text-muted">Nenhum movimento registado.</p>
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        {/* Header row */}
                        <div className="hidden sm:grid sm:grid-cols-6 gap-4 px-6 py-3 border-b border-soft">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Data</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Item</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Tipo</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted text-right">Qtd</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted col-span-2">Destinatario</p>
                        </div>

                        {movimentos.map((mov, idx) => {
                            const isEntrada = mov.tipo === 'DOACAO_RECEBIDA'
                            return (
                                <div key={mov.id} className={`grid grid-cols-2 sm:grid-cols-6 gap-4 px-6 py-4 items-center ${idx > 0 ? 'border-t border-soft' : ''}`}>
                                    {/* Data */}
                                    <div>
                                        <p className="text-sm font-bold text-fg">
                                            {new Date(mov.criado_em).toLocaleDateString('pt-PT', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: '2-digit',
                                            })}
                                        </p>
                                        <p className="text-[9px] text-muted">
                                            {new Date(mov.criado_em).toLocaleTimeString('pt-PT', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>

                                    {/* Item */}
                                    <p className="text-sm font-black uppercase text-fg">{mov.item.nome}</p>

                                    {/* Tipo badge */}
                                    <div>
                                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border ${TIPO_BADGES[mov.tipo] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                            {TIPO_LABELS[mov.tipo] || mov.tipo}
                                        </span>
                                    </div>

                                    {/* Quantidade */}
                                    <p className={`text-lg font-black italic text-right ${isEntrada ? 'text-green-500' : 'text-fg'}`}>
                                        {isEntrada ? '+' : '-'}{mov.quantidade}
                                    </p>

                                    {/* Destinatario + Observacao */}
                                    <div className="col-span-2">
                                        {mov.destinatario && (
                                            <p className="text-sm font-bold text-fg">{mov.destinatario}</p>
                                        )}
                                        {mov.observacao && (
                                            <p className="text-[9px] text-muted">{mov.observacao}</p>
                                        )}
                                        {!mov.destinatario && !mov.observacao && (
                                            <p className="text-[9px] text-muted">-</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>
        </main>
    )
}

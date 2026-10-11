// app/assistencia/page.tsx — Dashboard Assistencia Social
import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, Package, ArrowDown, ArrowUp, AlertTriangle, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

const CATEGORIAS_LABEL: Record<string, string> = {
    ALIMENTO: 'Alimento',
    HIGIENE: 'Higiene',
    VESTUARIO: 'Vestuario',
    OUTRO: 'Outro',
}

const CATEGORIAS_COR: Record<string, string> = {
    ALIMENTO: 'bg-green-500/10 text-green-500 border-green-500/20',
    HIGIENE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    VESTUARIO: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    OUTRO: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

export default async function AssistenciaDashboardPage() {
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

    const [itens, movimentosMes] = await Promise.all([
        db.itemAssistenciaSocial.findMany({
            orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
        }),
        db.movimentoAssistencia.count({
            where: { criado_em: { gte: (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })() } },
        }),
    ])

    const totalItens = itens.length
    const itensStockBaixo = itens.filter(i => i.stock <= i.stock_minimo)

    const porCategoria = itens.reduce<Record<string, typeof itens>>((acc, item) => {
        const cat = item.categoria || 'OUTRO'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
    }, {})

    return (
        <main className="max-w-4xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-5 md:space-y-8 animate-in fade-in duration-700 pb-28 md:pb-32">
            {/* Header */}
            <header className="space-y-1 md:space-y-2">
                <span className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <HeartHandshake size={13} /> Assistencia Social
                </span>
                <h1 className="text-xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                    Painel Geral
                </h1>
            </header>

            {/* Stats — compactos no mobile */}
            <div className="flex items-center gap-4 md:gap-6">
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black italic text-fg">{totalItens}</p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Itens</p>
                </div>
                <div className="w-px h-6 md:h-8 bg-soft" />
                <div className="text-center">
                    <p className={`text-xl md:text-2xl font-black italic ${itensStockBaixo.length > 0 ? 'text-orange-500' : 'text-fg'}`}>{itensStockBaixo.length}</p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Baixo</p>
                </div>
                <div className="w-px h-6 md:h-8 bg-soft" />
                <div className="text-center">
                    <p className="text-xl md:text-2xl font-black italic text-fg">{movimentosMes}</p>
                    <p className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted">Mov. Mes</p>
                </div>
            </div>

            {/* Acções rápidas */}
            <div className="grid grid-cols-3 gap-3">
                <Link href="/assistencia/stock"
                    className="flex flex-col items-center gap-2 bg-bg2 border border-soft rounded-2xl p-4 hover:border-figueira/30 transition-all active:scale-[0.98]">
                    <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                        <Package size={16} />
                    </div>
                    <h4 className="text-[9px] md:text-[11px] font-black uppercase text-fg text-center">Stock</h4>
                </Link>
                <Link href="/assistencia/cestas"
                    className="flex flex-col items-center gap-2 bg-bg2 border border-soft rounded-2xl p-4 hover:border-figueira/30 transition-all active:scale-[0.98]">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <HeartHandshake size={16} />
                    </div>
                    <h4 className="text-[9px] md:text-[11px] font-black uppercase text-fg text-center">Cestas</h4>
                </Link>
                <Link href="/assistencia/movimentos"
                    className="flex flex-col items-center gap-2 bg-bg2 border border-soft rounded-2xl p-4 hover:border-figueira/30 transition-all active:scale-[0.98]">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <ArrowUp size={16} />
                    </div>
                    <h4 className="text-[9px] md:text-[11px] font-black uppercase text-fg text-center">Movimentos</h4>
                </Link>
            </div>

            {/* Alertas de stock baixo */}
            {itensStockBaixo.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-1.5">
                        <AlertTriangle size={11} /> Stock Baixo
                    </p>
                    <div className="space-y-1.5">
                        {itensStockBaixo.map(item => (
                            <div key={item.id} className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-fg">{item.nome}</span>
                                <span className="text-[10px] md:text-xs font-black text-orange-500">
                                    {item.stock}/{item.stock_minimo}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Itens por categoria */}
            {totalItens === 0 ? (
                <div className="bg-bg2 border border-soft rounded-2xl p-8 md:p-12 text-center space-y-3">
                    <Package size={28} className="mx-auto text-muted/20" />
                    <p className="text-xs font-bold text-muted">Nenhum item cadastrado.</p>
                    <Link href="/assistencia/stock" className="text-[10px] md:text-xs text-figueira font-black uppercase tracking-widest">
                        Adicionar itens
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {Object.entries(porCategoria).map(([cat, catItens]) => (
                        <details key={cat} className="bg-bg2 border border-soft rounded-2xl overflow-hidden group/cat" open>
                            <summary className="flex items-center justify-between p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${CATEGORIAS_COR[cat] || CATEGORIAS_COR.OUTRO}`}>
                                        {CATEGORIAS_LABEL[cat] || cat}
                                    </span>
                                    <span className="text-[8px] md:text-[10px] font-bold text-muted">{catItens.length} itens</span>
                                </div>
                                <ChevronRight size={14} className="text-muted transition-transform group-open/cat:rotate-90" />
                            </summary>
                            <div className="border-t border-soft">
                                {catItens.map((item, idx) => (
                                    <div key={item.id} className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-soft/50' : ''}`}>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-black uppercase text-fg truncate">{item.nome}</p>
                                            <p className="text-[8px] md:text-[10px] text-muted">{item.unidade}</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <p className={`text-base font-black italic ${item.stock <= item.stock_minimo ? 'text-orange-500' : 'text-fg'}`}>
                                                {item.stock}
                                            </p>
                                            {item.stock <= item.stock_minimo && (
                                                <AlertTriangle size={12} className="text-orange-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </details>
                    ))}
                </div>
            )}
        </main>
    )
}

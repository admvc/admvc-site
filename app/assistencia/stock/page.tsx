// app/assistencia/stock/page.tsx — Gestao de Stock
import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, Package, Plus, AlertTriangle } from 'lucide-react'
import FormNovoItem from '@/components/assistencia/FormNovoItem'
import BotaoEliminarItem from '@/components/assistencia/BotaoEliminarItem'

export const dynamic = 'force-dynamic'

const CATEGORIA_BADGES: Record<string, string> = {
    ALIMENTO: 'bg-green-500/10 text-green-500 border-green-500/20',
    HIGIENE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    VESTUARIO: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    OUTRO: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
}

const CATEGORIA_LABELS: Record<string, string> = {
    ALIMENTO: 'Alimento',
    HIGIENE: 'Higiene',
    VESTUARIO: 'Vestuario',
    OUTRO: 'Outro',
}

export default async function StockPage() {
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
    const isLiderSocial = isAdmin || isFinance || membroLogado.departamentos_liderados.some((d: any) =>
        termosDepto.some(t => d.nome.toLowerCase().includes(t))
    )

    if (!isAdmin && !isFinance && !isEquipaSocial && !isLiderSocial) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa de Assistencia Social.')
    }

    const podeGerirStock = isLiderSocial

    const itens = await db.itemAssistenciaSocial.findMany({
        orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    })

    return (
        <main className="max-w-7xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10 animate-in fade-in duration-700 pb-28 md:pb-32">
            {/* Header */}
            <header className="space-y-2">
                <Link href="/assistencia" className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:brightness-125 transition-all">
                    <HeartHandshake size={14} /> Assistencia Social
                </Link>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                    Gestao de Stock
                </h1>
                <p className="text-xs text-muted">Adicionar, editar e remover itens do inventario social.</p>
            </header>

            {/* Form to add new item — apenas líder/admin */}
            {podeGerirStock && (
                <section className="space-y-4">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                        <Plus size={14} className="text-figueira" /> Novo Item
                    </h2>
                    <div className="bg-bg2 border border-soft rounded-2xl p-6">
                        <FormNovoItem />
                    </div>
                </section>
            )}

            {/* Items table */}
            <section className="space-y-4">
                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                    <Package size={14} className="text-figueira" /> Itens ({itens.length})
                </h2>

                {itens.length === 0 ? (
                    <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center space-y-3">
                        <Package size={32} className="mx-auto text-muted/20" />
                        <p className="text-sm font-bold text-muted">Nenhum item cadastrado.</p>
                    </div>
                ) : (
                    <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                        {/* Header row */}
                        <div className="hidden sm:grid sm:grid-cols-6 gap-4 px-6 py-3 border-b border-soft">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted col-span-2">Nome</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Categoria</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Unidade</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted text-right">Stock</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted text-right">Acoes</p>
                        </div>

                        {itens.map((item, idx) => {
                            const lowStock = item.stock <= item.stock_minimo
                            return (
                                <div key={item.id} className={`grid grid-cols-2 sm:grid-cols-6 gap-4 px-6 py-4 items-center ${idx > 0 ? 'border-t border-soft' : ''}`}>
                                    {/* Nome */}
                                    <div className="col-span-2">
                                        <p className="text-sm font-black uppercase text-fg">{item.nome}</p>
                                        {lowStock && (
                                            <p className="text-[9px] text-orange-500 font-bold flex items-center gap-1 mt-0.5">
                                                <AlertTriangle size={10} /> Stock baixo (min: {item.stock_minimo})
                                            </p>
                                        )}
                                    </div>

                                    {/* Categoria badge */}
                                    <div>
                                        <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border ${CATEGORIA_BADGES[item.categoria] || CATEGORIA_BADGES.OUTRO}`}>
                                            {CATEGORIA_LABELS[item.categoria] || item.categoria}
                                        </span>
                                    </div>

                                    {/* Unidade */}
                                    <p className="text-sm text-muted font-bold">{item.unidade}</p>

                                    {/* Stock */}
                                    <p className={`text-lg font-black italic text-right ${lowStock ? 'text-orange-500' : 'text-fg'}`}>
                                        {item.stock}
                                    </p>

                                    {/* Actions — apenas líder/admin */}
                                    <div className="flex justify-end">
                                        {podeGerirStock && <BotaoEliminarItem itemId={item.id} itemNome={item.nome} />}
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

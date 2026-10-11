// app/acaosocial/page.tsx
// Despensa / Acao Social — usa sistema local de produtos
import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { HeartHandshake, Package, AlertTriangle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminDespensaPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: { ministerios: { include: { departamento: true } } }
    })

    if (!membroLogado) redirect('/membros/login')

    const isAdmin = isAdminCheck(session.role)
    const isFinance = session.role === 'FINANCE'
    const isEquipaSocial = membroLogado.ministerios.some(vinculo => {
        const nomeDepto = vinculo.departamento?.nome.toLowerCase() || ''
        return nomeDepto.includes('social') || nomeDepto.includes('despensa') || nomeDepto.includes('assistência')
    })

    if (!isAdmin && !isFinance && !isEquipaSocial) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa de Acao Social.')
    }

    // Buscar categorias de despensa/assistencia do sistema local
    const categorias = await db.categoriaCantina.findMany({
        where: {
            ativa: true,
            OR: [
                { nome: { contains: 'Despensa', mode: 'insensitive' } },
                { nome: { contains: 'Assistencia', mode: 'insensitive' } },
                { nome: { contains: 'Assistência', mode: 'insensitive' } },
                { nome: { contains: 'Social', mode: 'insensitive' } },
            ],
        },
        orderBy: { ordem: 'asc' },
    })

    const categoriaIds = categorias.map(c => c.id)

    const produtos = categoriaIds.length > 0
        ? await db.produtoCantina.findMany({
            where: { categoria_id: { in: categoriaIds } },
            include: { categoria: true },
            orderBy: { nome: 'asc' },
        })
        : []

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-32">
            <header className="space-y-2">
                <span className="text-figueira font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                    <HeartHandshake size={14} /> Acao Social
                </span>
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">Despensa</h1>
                <p className="text-xs text-muted">Controlo de donativos e insumos.</p>
            </header>

            {produtos.length === 0 ? (
                <div className="bg-bg2 border border-soft rounded-2xl p-12 text-center space-y-3">
                    <Package size={32} className="mx-auto text-muted/20" />
                    <p className="text-sm font-bold text-muted">Nenhum produto de despensa encontrado.</p>
                    <p className="text-[10px] md:text-xs text-muted">
                        Crie categorias como &quot;Despensa&quot; ou &quot;Assistencia&quot; em{' '}
                        <a href="/cantina/produtos" className="text-figueira underline">Produtos</a>{' '}
                        para que aparecam aqui.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {categorias.map(cat => {
                        const catProdutos = produtos.filter(p => p.categoria_id === cat.id)
                        if (catProdutos.length === 0) return null
                        return (
                            <section key={cat.id} className="space-y-4">
                                <h2 className="text-lg font-black uppercase tracking-widest text-fg flex items-center gap-3">
                                    <Package size={16} className="text-figueira" /> {cat.nome}
                                    <span className="text-[9px] md:text-[11px] font-bold text-muted">({catProdutos.length})</span>
                                </h2>
                                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                                    {catProdutos.map((p, idx) => (
                                        <div key={p.id} className={`flex items-center justify-between px-6 py-4 ${idx > 0 ? 'border-t border-soft' : ''}`}>
                                            <div>
                                                <p className="text-sm font-black uppercase text-fg">{p.nome}</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className={`text-lg font-black italic ${p.stock <= (p.stock_minimo || 0) ? 'text-red-400' : 'text-fg'}`}>
                                                        {p.stock}
                                                    </p>
                                                    <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-muted">unidades</p>
                                                </div>
                                                {p.stock <= (p.stock_minimo || 0) && (
                                                    <AlertTriangle size={14} className="text-orange-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}
        </main>
    )
}

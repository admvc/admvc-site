import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import FormCardapio from '@/components/cantina/FormCardapio'
import Link from 'next/link'
import { ArrowLeft, UtensilsCrossed } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CardapioPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    if (!isAdmin(session.role) && session.role !== 'MANAGER') {
        redirect('/cantina/menu-local')
    }

    const db = await getDb()

    const trintaDiasDepois = new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)

    // Buscar proximos eventos
    const eventos = await db.evento.findMany({
        where: { data: { gte: new Date(), lte: trintaDiasDepois } },
        orderBy: { data: 'asc' },
        include: {
            cardapio: {
                include: {
                    itens: {
                        include: { produto: { select: { id: true, nome: true, preco: true } } },
                    },
                },
            },
        },
    })

    // Buscar todos os produtos disponiveis
    const produtos = await db.produtoCantina.findMany({
        where: { disponivel: true },
        include: { categoria: { select: { id: true, nome: true } } },
        orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
    })

    const eventosSerializados = eventos.map(ev => ({
        id: ev.id,
        nome: ev.nome,
        data: ev.data.toISOString(),
        cardapio: ev.cardapio ? {
            id: ev.cardapio.id,
            produtoIds: ev.cardapio.itens.map(i => i.produto.id),
            itens: ev.cardapio.itens.map(i => ({
                id: i.produto.id,
                nome: i.produto.nome,
                preco: i.produto.preco,
            })),
        } : null,
    }))

    const produtosSerializados = produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        categoria: p.categoria?.nome || 'Outros',
    }))

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 pb-28 animate-in fade-in duration-700">
            <header className="space-y-4">
                <Link
                    href="/cantina/dashboard"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors"
                >
                    <ArrowLeft size={12} /> Voltar
                </Link>
                <div className="text-center space-y-2 pb-6 border-b border-soft">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <UtensilsCrossed size={14} /> Cardapio
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Gerir <span className="text-muted/20">cardapios.</span>
                    </h1>
                </div>
            </header>

            <FormCardapio eventos={eventosSerializados} produtos={produtosSerializados} />
        </main>
    )
}

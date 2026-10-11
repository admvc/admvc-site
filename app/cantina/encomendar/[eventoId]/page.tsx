import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import FormEncomendar from '@/components/cantina/FormEncomendar'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EncomendarPage({ params }: { params: Promise<{ eventoId: string }> }) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const { eventoId: eventoIdStr } = await params
    const eventoId = Number(eventoIdStr)
    if (!eventoId || isNaN(eventoId)) redirect('/cantina/menu-local')

    const db = await getDb()

    // Buscar evento
    const evento = await db.evento.findUnique({ where: { id: eventoId } })
    if (!evento || evento.data < new Date()) {
        redirect('/cantina/menu-local')
    }

    // Check for cardapio
    const cardapio = await db.cardapioCantina.findUnique({
        where: { evento_id: Number(eventoId) },
        include: {
            itens: {
                include: { produto: { include: { categoria: true } } },
            },
        },
    })

    let produtos
    if (cardapio) {
        // Use cardapio products only
        produtos = cardapio.itens
            .map(i => i.produto)
            .filter(p => p.disponivel && (!p.controla_stock || p.stock > 0))
    } else {
        // All available products
        produtos = await db.produtoCantina.findMany({
            where: { disponivel: true, OR: [{ controla_stock: false }, { stock: { gt: 0 } }] },
            include: { categoria: true },
            orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
        })
    }

    // Buscar saldo do membro
    const saldoRecord = await db.saldoCantina.findUnique({
        where: { membro_id: session.membroId },
    })
    const saldo = saldoRecord?.saldo || 0

    // Formatar data do evento
    const eventoData = evento.data.toLocaleDateString('pt-PT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    return (
        <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">
            <header className="space-y-4">
                <Link
                    href="/cantina/menu-local"
                    className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors"
                >
                    <ArrowLeft size={12} /> Voltar ao Menu
                </Link>
                <div className="text-center space-y-2 pb-6 border-b border-soft">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                        <ShoppingCart size={14} /> Pre-Encomenda
                    </span>
                    <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        {evento.nome}
                    </h1>
                    <p className="text-xs text-muted capitalize">{eventoData}</p>
                </div>
            </header>

            {cardapio && (
                <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-figueira">
                        Cardapio do Dia — Menu especial preparado para este evento
                    </p>
                </div>
            )}

            {saldo <= 0 && (
                <Link href="/cantina/carregar" className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-black uppercase text-orange-600">Saldo insuficiente</p>
                        <p className="text-[10px] text-muted">Carregue o seu saldo para poder encomendar.</p>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">Carregar →</span>
                </Link>
            )}

            <FormEncomendar
                eventoId={evento.id}
                eventoNome={evento.nome}
                eventoData={eventoData}
                produtos={produtos.map(p => ({
                    id: p.id,
                    nome: p.nome,
                    preco: p.preco,
                    stock: p.stock,
                    controla_stock: p.controla_stock,
                    categoria: p.categoria,
                }))}
                saldo={saldo}
            />
        </main>
    )
}

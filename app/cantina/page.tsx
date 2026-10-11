// app/cantina/page.tsx
// Pagina principal da cantina — redireciona para o sistema interno

import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Store, ShoppingCart, Package, BarChart3, Clock, CreditCard, HandCoins, Coffee, AlertTriangle, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function GestaoCantinaPage() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: { ministerios: { include: { departamento: true } } }
    })

    if (!membroLogado) redirect('/membros/login')

    const isAdmin = isAdminCheck(session.role)
    const isEquipaCantina = membroLogado.ministerios.some(vinculo => {
        const nomeDepto = vinculo.departamento?.nome.toLowerCase() || ''
        return nomeDepto.includes('cantina')
    })

    if (!isAdmin && !isEquipaCantina) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa da Cantina.')
    }

    // Stats rapidos
    const [totalProdutos, totalCategorias, encomendaHoje] = await Promise.all([
        db.produtoCantina.count({ where: { disponivel: true } }),
        db.categoriaCantina.count({ where: { ativa: true } }),
        db.preEncomendaCantina.count({
            where: { status: 'CONFIRMADA', evento: { data: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }
        }),
    ])

    // Nota: Loyverse e opcional — link no painel admin

    const links = [
        { href: '/cantina/pos', label: 'Ponto de Venda', desc: 'Abrir caixa registadora', icon: CreditCard, cor: 'text-figueira' },
        { href: '/cantina/produtos', label: 'Produtos', desc: `${totalProdutos} produtos activos`, icon: Package, cor: 'text-orange-500' },
        { href: '/cantina/dashboard', label: 'Vendas', desc: 'Relatorios e estatisticas', icon: BarChart3, cor: 'text-blue-500' },
        { href: '/cantina/turnos', label: 'Turnos', desc: 'Abrir e fechar caixa', icon: Clock, cor: 'text-purple-500' },
        { href: '/cantina/encomendas', label: 'Encomendas', desc: `${encomendaHoje} para hoje`, icon: ShoppingCart, cor: 'text-emerald-500' },
        { href: '/cantina/fiados', label: 'Fiados', desc: 'Dividas pendentes', icon: HandCoins, cor: 'text-red-400' },
        { href: '/cantina/menu-local', label: 'Menu Publico', desc: 'Ver como o membro ve', icon: Coffee, cor: 'text-amber-500' },
    ]

    return (
        <main className="max-w-6xl mx-auto pt-16 md:pt-10 px-4 sm:px-6 lg:px-8 space-y-10 animate-in fade-in duration-700 pb-28">

            {/* HEADER */}
            <header className="space-y-4">
                <span className="text-figueira font-black text-[10px] md:text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                    <Store size={14} /> Gestao Cantina
                </span>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Cantina <span className="text-muted/20">ADMVC.</span>
                </h1>
                <p className="text-sm text-muted font-medium max-w-lg">
                    Sistema interno de vendas, produtos, turnos e encomendas.
                </p>
            </header>

            {/* STATS */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-bg2 border border-soft rounded-2xl p-5 text-center">
                    <p className="text-2xl font-black italic text-fg">{totalProdutos}</p>
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Produtos</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-5 text-center">
                    <p className="text-2xl font-black italic text-fg">{totalCategorias}</p>
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Categorias</p>
                </div>
                <div className="bg-bg2 border border-soft rounded-2xl p-5 text-center">
                    <p className="text-2xl font-black italic text-fg">{encomendaHoje}</p>
                    <p className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-muted">Encomendas Hoje</p>
                </div>
            </div>

            {/* LINKS */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {links.map(link => (
                    <Link key={link.href} href={link.href}
                        className="bg-bg2 border border-soft rounded-2xl p-6 hover:border-figueira/30 hover:-translate-y-0.5 transition-all group">
                        <div className="flex items-center gap-3 mb-2">
                            <link.icon size={18} className={link.cor} />
                            <h3 className="text-sm font-black uppercase tracking-widest text-fg group-hover:text-figueira transition-colors">
                                {link.label}
                            </h3>
                        </div>
                        <p className="text-[10px] md:text-xs text-muted font-bold">{link.desc}</p>
                    </Link>
                ))}
            </div>

            {/* LOYVERSE OPCIONAL */}
            {isAdmin && (
                <section className="bg-bg2 border border-soft rounded-2xl p-6 space-y-3">
                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted flex items-center gap-2">
                        <Settings size={12} /> Integracao Loyverse (Opcional)
                    </h3>
                    <p className="text-[10px] md:text-xs text-muted">
                        A integracao com o Loyverse e opcional. Use apenas se quiser sincronizar produtos de uma conta Loyverse existente.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/admin/relatorios/loyverse" className="bg-bg border border-soft text-fg px-4 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:border-figueira/30 transition-all">
                            Diagnostico Loyverse
                        </Link>
                        <Link href="/cantina/produtos" className="bg-bg border border-soft text-fg px-4 py-2 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest hover:border-figueira/30 transition-all">
                            Importar Produtos
                        </Link>
                    </div>
                </section>
            )}
        </main>
    )
}

function Settings(props: any) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    )
}

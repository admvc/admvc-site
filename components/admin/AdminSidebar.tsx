'use client'

// Menu do admin (como o dos membros): fixo, grupos curtos sempre abertos, um so
// nivel, nomes pelo que se faz. So aparece o que a igreja tem ligado (modulos
// no Super Admin); um grupo sem nada ligado desaparece. Ecra largo: icone e
// texto; medio: so icones; telemovel: gaveta.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPinned,
    LayoutDashboard, Users, Home, CalendarDays, HeartHandshake, BarChart3, Shield, LogOut, Package,
    Palette, Church, CreditCard, Menu, X, MonitorPlay, BookOpen, GraduationCap, Coffee, ShoppingCart,
    Wallet2, Clock, Store, Banknote, FileText, PieChart, Heart, CheckSquare, Download, Music2, Car,
    CalendarCheck2, Briefcase, HandHeart, Network,
} from 'lucide-react'
import { logoutAdmin } from '@/actions/auth-actions'

type Item = { label: string; href: string; icon: typeof Users; modulo?: string | string[]; adminOnly?: boolean }
type Grupo = { titulo?: string; itens: Item[] }

function grupos(louvorHref: string | null, obreiros: boolean): Grupo[] {
    return [
        { itens: [{ label: 'Painel', href: '/admin/dashboard', icon: LayoutDashboard }] },
        {
            titulo: 'Igreja',
            itens: [
                { label: 'Membros', href: '/admin/membros', icon: Users },
                { label: 'Ministérios e grupos', href: '/admin/configuracoes', icon: Network },
                { label: 'Congregações', href: '/admin/congregacoes', icon: Church },
                { label: 'Famílias', href: '/admin/familias', icon: Home },
                { label: 'Mapa das famílias', href: '/admin/familias/mapa', icon: MapPinned },
                { label: 'Inventário', href: '/admin/inventario', icon: Package, modulo: 'inventario' },
            ],
        },
        {
            titulo: 'Cultos',
            itens: [
                { label: 'Eventos', href: '/admin/eventos', icon: CalendarDays },
                { label: 'Escalas', href: '/admin/escalas', icon: CalendarCheck2, modulo: 'escalas' },
                { label: 'Pregações', href: '/admin/formacao/pregacao', icon: BookOpen, modulo: 'pregacao' },
                { label: 'Mídia', href: '/admin/midia', icon: MonitorPlay, modulo: ['holyrics', 'mesa_som', 'lumikit'], adminOnly: true },
            ],
        },
        {
            titulo: 'Equipas',
            itens: [
                ...(louvorHref ? [{ label: 'Louvor', href: louvorHref, icon: Music2, modulo: 'louvor' }] : []),
                { label: 'Acolhimento', href: '/departamentos/acolhimento/dashboard', icon: HeartHandshake, modulo: 'acolhimento' },
                ...(obreiros ? [{ label: 'Obreiros', href: '/departamentos/obreiros/dashboard', icon: Users }] : []),
                { label: 'Assistência social', href: '/assistencia', icon: HandHeart, modulo: 'assistencia' },
                { label: 'Cursos', href: '/admin/formacao/ebd', icon: GraduationCap, modulo: 'ebd' },
                { label: 'Boleias', href: '/boleia', icon: Car, modulo: 'boleia' },
                { label: 'Agenda pastoral', href: '/gabinete', icon: Briefcase, modulo: 'gabinete' },
            ],
        },
        {
            titulo: 'Cantina',
            itens: [
                { label: 'Painel da cantina', href: '/cantina', icon: Store, modulo: 'cantina' },
                { label: 'Cardápio', href: '/cantina/cardapio', icon: Coffee, modulo: 'cantina' },
                { label: 'Produtos', href: '/cantina/produtos', icon: Package, modulo: 'cantina' },
                { label: 'Turnos', href: '/cantina/turnos', icon: Clock, modulo: 'cantina' },
                { label: 'Vendas', href: '/cantina/dashboard', icon: BarChart3, modulo: 'cantina' },
                { label: 'Fiados', href: '/cantina/fiados', icon: CreditCard, modulo: 'cantina', adminOnly: true },
                { label: 'Encomendas', href: '/cantina/encomendas', icon: ShoppingCart, modulo: 'cantina' },
                { label: 'Recargas', href: '/cantina/recargas', icon: Wallet2, modulo: 'cantina', adminOnly: true },
                { label: 'Relatório da cantina', href: '/cantina/relatorio-financeiro', icon: PieChart, modulo: 'cantina' },
            ],
        },
        {
            titulo: 'Tesouraria',
            itens: [
                { label: 'Fundos', href: '/financeiro/fundos', icon: Wallet2, modulo: 'financeiro' },
                { label: 'Despesas', href: '/financeiro/despesas', icon: Banknote, modulo: 'financeiro' },
                { label: 'Orçamento', href: '/financeiro/orcamento', icon: BarChart3, modulo: 'financeiro' },
                { label: 'Recibos', href: '/financeiro/recibos', icon: FileText, modulo: 'financeiro' },
                { label: 'Relatórios financeiros', href: '/financeiro/relatorios', icon: PieChart, modulo: 'financeiro' },
                { label: 'Donativos', href: '/financeiro/donativos', icon: Heart, modulo: 'financeiro' },
                { label: 'Promessas', href: '/financeiro/pledges', icon: HeartHandshake, modulo: 'financeiro' },
                { label: 'Reconciliação', href: '/financeiro/reconciliacao', icon: CheckSquare, modulo: 'financeiro' },
                { label: 'Exportar', href: '/financeiro/exportar', icon: Download, modulo: 'financeiro', adminOnly: true },
            ],
        },
        {
            titulo: 'Configurações',
            itens: [
                { label: 'Relatórios', href: '/admin/relatorios', icon: BarChart3, modulo: 'relatorios' },
                { label: 'Personalização', href: '/admin/personalizacao', icon: Palette, modulo: 'personalizacao', adminOnly: true },
                { label: 'Auditoria', href: '/admin/auditoria', icon: Shield, modulo: 'auditoria' },
            ],
        },
    ]
}

export default function AdminSidebar({ adminNome, igrejaName, logoUrl, congregacaoNome, role = 'ADMIN', congregacaoFilter, modulos, louvorHref, obreiros = false }: {
    adminNome?: string; igrejaName?: string; logoUrl?: string | null
    congregacaoNome?: string | null; role?: string; congregacaoFilter?: React.ReactNode
    modulos: string[]; louvorHref: string | null; obreiros?: boolean
}) {
    const isFullAdmin = role === 'ADMIN'
    const pathname = usePathname()
    const [aberto, setAberto] = useState(false)
    useEffect(() => { setAberto(false) }, [pathname])

    const ligado = (m?: string | string[]) => !m || (Array.isArray(m) ? m.some((x) => modulos.includes(x)) : modulos.includes(m))
    const visiveis = grupos(louvorHref, obreiros)
        .map((g) => ({ ...g, itens: g.itens.filter((i) => ligado(i.modulo) && (!i.adminOnly || isFullAdmin)) }))
        .filter((g) => g.itens.length > 0)
    // O item mais específico ganha (/admin/familias/mapa não acende também "Famílias")
    const todosHrefs = visiveis.flatMap((g) => g.itens.map((i) => i.href.split('?')[0]))
    const ativo = (href: string) => {
        const base = href.split('?')[0]
        const casa = (b: string) => pathname === b || pathname.startsWith(b + '/')
        return casa(base) && !todosHrefs.some((h) => h !== base && h.startsWith(base + '/') && casa(h))
    }

    const item = 'a-foco flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold'

    const conteudo = (gaveta: boolean) => {
        // Na gaveta (telemovel) mostra sempre o texto; no computador medio so icones
        const texto = gaveta ? '' : 'md:sr-only lg:not-sr-only'
        const centro = gaveta ? '' : 'md:justify-center lg:justify-start'
        return (
            <>
                <div className="space-y-2 border-b p-3" style={{ borderColor: 'var(--a-borda)' }}>
                    <div className="flex items-center justify-between gap-2">
                        <Link href="/admin/dashboard" title="Painel" className={`a-foco flex min-w-0 items-center gap-2 ${centro}`}>
                            {logoUrl
                                ? <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-[10px] object-cover" />
                                : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}><Shield size={18} aria-hidden /></span>}
                            <span className={`min-w-0 ${texto}`}>
                                <span className="block truncate text-[15px] font-bold">{igrejaName || 'Administração'}</span>
                                <span className="block truncate text-[13px] a-suave">{adminNome ? `Admin · ${adminNome}` : 'Administração'}{congregacaoNome ? ` · ${congregacaoNome}` : ''}</span>
                            </span>
                        </Link>
                        {gaveta && (
                            <button type="button" onClick={() => setAberto(false)} className="a-botao a-botao-secundario !min-h-[40px] !px-2" aria-label="Fechar menu">
                                <X size={20} aria-hidden />
                            </button>
                        )}
                    </div>
                    {congregacaoFilter && <div className={gaveta ? '' : 'md:hidden lg:block'}>{congregacaoFilter}</div>}
                </div>

                <nav aria-label="Administração" className="flex-1 space-y-4 overflow-y-auto p-3">
                    {visiveis.map((g, i) => (
                        <div key={g.titulo ?? i} className="space-y-0.5">
                            {g.titulo && <p className={`px-3 pb-1 text-[13px] font-semibold a-suave ${texto}`}>{g.titulo}</p>}
                            <ul className="space-y-0.5">
                                {g.itens.map((it) => {
                                    const sim = ativo(it.href)
                                    const Icone = it.icon
                                    return (
                                        <li key={it.href}>
                                            <Link href={it.href} title={it.label} aria-current={sim ? 'page' : undefined} className={`${item} ${centro}`}
                                                style={sim ? { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' } : undefined}>
                                                <Icone size={20} strokeWidth={sim ? 2.3 : 1.8} aria-hidden className="shrink-0" />
                                                <span className={texto}>{it.label}</span>
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="space-y-0.5 border-t p-3" style={{ borderColor: 'var(--a-borda)' }}>
                    <Link href="/membros/dashboard" title="App dos membros" className={`${item} ${centro}`}>
                        <Home size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />
                        <span className={texto}>App dos membros</span>
                    </Link>
                    <form action={logoutAdmin}>
                        <button type="submit" title="Sair" className={`${item} ${centro} w-full`} style={{ color: 'var(--a-erro)' }}>
                            <LogOut size={20} strokeWidth={1.8} aria-hidden className="shrink-0" />
                            <span className={texto}>Sair</span>
                        </button>
                    </form>
                </div>
            </>
        )
    }

    return (
        <>
            {/* Telemovel: botao que abre a gaveta */}
            <button type="button" onClick={() => setAberto(true)} aria-label="Abrir o menu"
                className="app-novo a-botao a-botao-principal fixed bottom-4 left-4 z-50 !h-12 !w-12 !p-0 shadow-lg md:hidden">
                <Menu size={22} aria-hidden />
            </button>
            {aberto && (
                <div className="app-novo fixed inset-0 z-[9999] md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setAberto(false)} />
                    <div className="absolute inset-y-0 left-0 flex w-72 flex-col border-r" style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                        {conteudo(true)}
                    </div>
                </div>
            )}

            {/* Computador: fixo */}
            <aside className="app-novo sticky top-0 hidden h-dvh shrink-0 flex-col border-r md:flex md:w-20 lg:w-64"
                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                {conteudo(false)}
            </aside>
        </>
    )
}

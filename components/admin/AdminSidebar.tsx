'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Users, Home, Calendar, CalendarDays, HeartHandshake,
    BarChart3, Shield, LogOut, Package,
    Palette, Church, CreditCard, PanelLeftClose, PanelLeftOpen,
    Menu, X, MonitorPlay, BookOpen, GraduationCap,
    Coffee, ShoppingCart, Wallet2, Clock, ChevronDown, ChevronUp, Store, Banknote,
    FileText, PieChart, Heart, CheckSquare, Download, Music2, Car, MapPin
} from 'lucide-react'
import { logoutAdmin } from '@/actions/auth-actions'

// ── ESTRUTURA DO MENU ────────────────────────────────────────────────────────

// 2. IGREJA
const NAV_IGREJA = [
    { label: 'Estrutura', href: '/admin/configuracoes', icon: HeartHandshake },
    { label: 'Membros', href: '/admin/membros', icon: Users },
    { label: 'Congregacoes', href: '/admin/congregacoes', icon: Church },
    { label: 'Familias', href: '/admin/familias', icon: Home },
    { label: 'Inventario', href: '/admin/inventario', icon: Package },
]

// 3. AGENDA
const NAV_AGENDA = [
    { label: 'Eventos', href: '/admin/eventos', icon: CalendarDays },
    { label: 'Escalas', href: '/admin/escalas', icon: Calendar },
]

// 4. FORMACAO
const NAV_FORMACAO = [
    { label: 'Pregacoes', href: '/admin/formacao/pregacao', icon: BookOpen },
    { label: 'Cursos', href: '/admin/formacao/ebd', icon: GraduationCap },
]

// 5. CANTINA
const NAV_CANTINA = [
    { label: 'Painel', href: '/cantina', icon: Store },
    { label: 'Cardapio', href: '/cantina/cardapio', icon: Coffee },
    { label: 'Produtos', href: '/cantina/produtos', icon: Package },
    { label: 'Turnos', href: '/cantina/turnos', icon: Clock },
    { label: 'Vendas', href: '/cantina/dashboard', icon: BarChart3 },
    { label: 'Fiados', href: '/cantina/fiados', icon: CreditCard, adminOnly: true },
    { label: 'Pre-Encomendas', href: '/cantina/encomendas', icon: ShoppingCart },
    { label: 'Recargas', href: '/cantina/recargas', icon: Wallet2, adminOnly: true },
    { label: 'Relatorios', href: '/cantina/relatorio-financeiro', icon: PieChart },
]

// 6. FINANCEIRO
const NAV_FINANCEIRO = [
    { label: 'Fundos', href: '/financeiro/fundos', icon: Wallet2 },
    { label: 'Despesas', href: '/financeiro/despesas', icon: Banknote },
    { label: 'Orcamento', href: '/financeiro/orcamento', icon: BarChart3 },
    { label: 'Recibos', href: '/financeiro/recibos', icon: FileText },
    { label: 'Relatorios', href: '/financeiro/relatorios', icon: PieChart },
    { label: 'Donativos', href: '/financeiro/donativos', icon: Heart },
    { label: 'Pledges', href: '/financeiro/pledges', icon: HeartHandshake },
    { label: 'Reconciliacao', href: '/financeiro/reconciliacao', icon: CheckSquare },
    { label: 'Exportacao', href: '/financeiro/exportar', icon: Download, adminOnly: true },
]

// 7. MINISTERIOS
const NAV_MINISTERIOS = [
    { label: 'Louvor', href: '/louvor/repertorio', icon: Music2 },
    { label: 'Midia', href: '/admin/midia', icon: MonitorPlay, adminOnly: true },
    { label: 'Assistencia Social', href: '/assistencia', icon: HeartHandshake },
    { label: 'Acolhimento', href: '/departamentos/acolhimento/dashboard', icon: Users },
    { label: 'Diaconia', href: '/pregacao', icon: BookOpen },
    { label: 'Obreiros', href: '/departamentos/obreiros/dashboard', icon: Users },
    { label: 'Boleia Solidaria', href: '/boleia', icon: Car },
    { label: 'EBD / Cursos', href: '/admin/formacao/ebd', icon: GraduationCap },
    { label: 'Agenda Pastoral', href: '/gabinete', icon: Calendar },
]

// 8. CONFIGURACOES
const NAV_CONFIGURACOES = [
    { label: 'Personalizacao', href: '/admin/personalizacao', icon: Palette, adminOnly: true },
    { label: 'Auditoria', href: '/admin/auditoria', icon: Shield },
]

// ── COMPONENTES ──────────────────────────────────────────────────────────────

function NavItems({ items, collapsed, pathname, isFullAdmin, onNavigate }: {
    items: { label: string; href: string; icon: any; adminOnly?: boolean }[]
    collapsed: boolean; pathname: string; isFullAdmin: boolean; onNavigate?: () => void
}) {
    return (
        <>
            {items.filter(item => !item.adminOnly || isFullAdmin).map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                    <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined} onClick={onNavigate}
                        className={`flex items-center rounded-xl transition-all ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'} ${isActive ? 'bg-figueira/10 text-figueira' : 'text-muted hover:bg-soft/30 hover:text-fg'} text-[10px] md:text-[11px] font-bold uppercase tracking-widest`}>
                        <Icon size={14} className="shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                    </Link>
                )
            })}
        </>
    )
}

function CollapsibleGroup({ titulo, icon: Icon, items, collapsed, pathname, isFullAdmin, onNavigate, defaultOpen = false }: {
    titulo: string; icon: any
    items: { label: string; href: string; icon: any; adminOnly?: boolean }[]
    collapsed: boolean; pathname: string; isFullAdmin: boolean; onNavigate?: () => void; defaultOpen?: boolean
}) {
    const hasActive = items.some(i => pathname === i.href || pathname.startsWith(i.href + '/'))
    const [open, setOpen] = useState(defaultOpen || hasActive)

    // Auto-open when a child route is active
    useEffect(() => { if (hasActive) setOpen(true) }, [hasActive])

    const filteredItems = items.filter(item => !item.adminOnly || isFullAdmin)
    if (filteredItems.length === 0) return null

    if (collapsed) {
        return (
            <>
                <div className="border-t border-soft my-1" />
                <NavItems items={items} collapsed={collapsed} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={onNavigate} />
            </>
        )
    }

    return (
        <div className="space-y-0.5">
            <button onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-muted hover:text-fg transition-all rounded-lg">
                <span className="flex items-center gap-1.5">
                    <Icon size={12} /> {titulo}
                </span>
                {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>
            {open && (
                <div className="animate-in fade-in duration-150">
                    <NavItems items={items} collapsed={false} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={onNavigate} />
                </div>
            )}
        </div>
    )
}

// ── SIDEBAR PRINCIPAL ────────────────────────────────────────────────────────

export default function AdminSidebar({ adminNome, igrejaName, logoUrl, congregacaoNome, role = 'ADMIN', congregacaoFilter }: {
    adminNome?: string; igrejaName?: string; logoUrl?: string | null
    congregacaoNome?: string | null; role?: string; congregacaoFilter?: React.ReactNode
}) {
    const isFullAdmin = role === 'ADMIN'
    const pathname = usePathname()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('admin_sidebar_collapsed')
        if (saved === 'true') setCollapsed(true)
    }, [])

    useEffect(() => { setMobileOpen(false) }, [pathname])

    function toggle() {
        const next = !collapsed
        setCollapsed(next)
        localStorage.setItem('admin_sidebar_collapsed', String(next))
    }

    const sidebarContent = (isMobile: boolean) => {
        const c = !isMobile && collapsed
        const nav = isMobile ? () => setMobileOpen(false) : undefined

        return (
            <>
                {/* HEADER */}
                <div className={`border-b border-soft ${isMobile || !c ? 'px-3 py-3' : 'px-1.5 py-3'}`}>
                    <div className={`flex items-center ${c ? 'justify-center' : 'justify-between'}`}>
                        {(isMobile || !c) && (
                            <Link href="/admin/dashboard" className="flex items-center gap-2 px-1 min-w-0" onClick={nav}>
                                {logoUrl ? (
                                    <img src={logoUrl} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                                ) : (
                                    <div className="w-7 h-7 bg-figueira rounded-lg flex items-center justify-center shrink-0">
                                        <Shield size={14} className="text-white" />
                                    </div>
                                )}
                                <span className="font-black italic uppercase tracking-tighter text-fg text-sm truncate">{adminNome || 'Admin'}</span>
                            </Link>
                        )}
                        {isMobile ? (
                            <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-soft/30 transition-all"><X size={20} /></button>
                        ) : (
                            <button onClick={toggle} className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-soft/30 transition-all shrink-0" title={c ? 'Expandir' : 'Recolher'}>
                                {c ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                            </button>
                        )}
                    </div>
                    {(isMobile || !c) && igrejaName && (
                        <div className="mt-2 px-1 space-y-0.5">
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.15em] text-figueira truncate">{igrejaName}</p>
                            {congregacaoNome && <p className="text-[8px] font-bold text-muted truncate">{congregacaoNome}</p>}
                        </div>
                    )}
                    {(isMobile || !c) && congregacaoFilter && <div className="mt-2 px-1">{congregacaoFilter}</div>}
                </div>

                {/* NAV */}
                <nav className={`flex-1 overflow-y-auto space-y-2 ${c ? 'p-1.5' : 'p-3'}`}>
                    {/* 1. Dashboard */}
                    <div className="space-y-0.5">
                        <NavItems items={[{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }]} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />
                    </div>

                    {/* 2. Igreja */}
                    <CollapsibleGroup titulo="Igreja" icon={Church} items={NAV_IGREJA} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} defaultOpen />

                    {/* 3. Agenda */}
                    <CollapsibleGroup titulo="Agenda" icon={CalendarDays} items={NAV_AGENDA} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />

                    {/* 4. Formacao */}
                    <CollapsibleGroup titulo="Formacao" icon={BookOpen} items={NAV_FORMACAO} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />

                    {/* 5. Cantina */}
                    <CollapsibleGroup titulo="Cantina" icon={Store} items={NAV_CANTINA} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />

                    {/* 6. Financeiro */}
                    <CollapsibleGroup titulo="Financeiro" icon={Wallet2} items={NAV_FINANCEIRO} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />

                    {/* 7. Ministerios */}
                    <CollapsibleGroup titulo="Ministerios" icon={Users} items={NAV_MINISTERIOS} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />

                    {/* 8. Configuracoes */}
                    <CollapsibleGroup titulo="Configuracoes" icon={Shield} items={NAV_CONFIGURACOES} collapsed={c} pathname={pathname} isFullAdmin={isFullAdmin} onNavigate={nav} />
                </nav>

                {/* FOOTER */}
                <div className={`border-t border-soft space-y-1 ${c ? 'p-1.5' : 'p-3'}`}>
                    <Link href="/membros/dashboard" onClick={nav} title={c ? 'Painel do Membro' : undefined}
                        className={`flex items-center rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-muted hover:bg-soft/30 hover:text-fg transition-all ${c ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}>
                        <Home size={14} className="shrink-0" />
                        {!c && <span>Painel do Membro</span>}
                    </Link>
                    <form action={logoutAdmin}>
                        <button type="submit" title={c ? 'Sair' : undefined}
                            className={`w-full flex items-center rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all ${c ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}>
                            <LogOut size={14} className="shrink-0" />
                            {!c && <span>Sair</span>}
                        </button>
                    </form>
                </div>
            </>
        )
    }

    return (
        <>
            {/* Mobile trigger */}
            <button onClick={() => setMobileOpen(true)}
                className="md:hidden fixed bottom-4 left-4 z-50 w-12 h-12 bg-figueira text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
                <Menu size={20} />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[9999] md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-bg border-r border-soft flex flex-col animate-in slide-in-from-left duration-200">
                        {sidebarContent(true)}
                    </div>
                </div>
            )}

            {/* Desktop sidebar */}
            <aside className={`hidden md:flex flex-col sticky top-0 h-dvh bg-bg2 border-r border-soft shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
                {sidebarContent(false)}
            </aside>
        </>
    )
}

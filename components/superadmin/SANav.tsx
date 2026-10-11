'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
    Server, Building, CreditCard, Layers, ShieldCheck,
    UserCog, Megaphone, Rocket, Palette, Menu, X, PlusCircle
} from 'lucide-react'

const NAV_PLATAFORMA = [
    { label: 'Visao Geral', href: '/super-admin/dashboard', icon: Server },
    { label: 'Igrejas', href: '/super-admin/igrejas', icon: Building },
    { label: 'Facturacao', href: '/super-admin/billing', icon: CreditCard },
    { label: 'Planos', href: '/super-admin/planos', icon: Layers },
]

const NAV_GESTAO = [
    { label: 'Nova Igreja', href: '/super-admin/nova-igreja', icon: PlusCircle },
    { label: 'Admins', href: '/super-admin/admins', icon: ShieldCheck },
    { label: 'Impersonar', href: '/super-admin/impersonar', icon: UserCog },
    { label: 'Comunicacao', href: '/super-admin/comunicacao', icon: Megaphone },
]

interface Props {
    onboardingPendente: number
    mobile?: boolean
}

export default function SANav({ onboardingPendente, mobile }: Props) {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)

    function isActive(href: string) {
        return pathname === href || pathname.startsWith(href + '/')
    }

    const linkClass = (href: string) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
            isActive(href)
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                : 'text-zinc-400 hover:bg-[#222] hover:text-white border border-transparent'
        }`

    const navContent = (onNavigate?: () => void) => (
        <>
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">Plataforma</p>
            {NAV_PLATAFORMA.map(item => (
                <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(item.href)}>
                    <item.icon size={15} /> {item.label}
                </Link>
            ))}

            <p className="px-4 pt-5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">Gestao</p>
            {NAV_GESTAO.map(item => (
                <Link key={item.href} href={item.href} onClick={onNavigate} className={linkClass(item.href)}>
                    <item.icon size={15} /> {item.label}
                </Link>
            ))}

            {onboardingPendente > 0 && (
                <>
                    <p className="px-4 pt-5 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-3">Setup</p>
                    <Link href="/super-admin/igrejas" onClick={onNavigate}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 transition-all border border-transparent`}>
                        <Rocket size={15} />
                        <span className="flex-1">Onboarding</span>
                        <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center">{onboardingPendente}</span>
                    </Link>
                </>
            )}
        </>
    )

    // Mobile: hamburger trigger + overlay
    if (mobile) {
        return (
            <>
                <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#222] transition-all">
                    <Menu size={20} />
                </button>

                {mobileOpen && (
                    <div className="fixed inset-0 z-[9999]">
                        <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
                        <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#111] border-r border-[#222] flex flex-col animate-in slide-in-from-left duration-200">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
                                <span className="font-black italic uppercase tracking-tighter text-white">Menu</span>
                                <button onClick={() => setMobileOpen(false)} className="text-zinc-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
                                {navContent(() => setMobileOpen(false))}
                            </nav>
                        </div>
                    </div>
                )}
            </>
        )
    }

    // Desktop: inline nav
    return (
        <nav className="p-4 space-y-1.5 mt-2">
            {navContent()}
        </nav>
    )
}

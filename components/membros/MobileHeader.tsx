'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, SunMoon, Settings, UserCircle, CalendarOff } from 'lucide-react'
import { useHighContrast } from '@/hooks/useHighContrast'
import { logoutMembro } from '@/actions/auth-actions'
import DrawerEditarPerfil from '@/components/membros/DrawerEditarPerfil'
import ModalIndisponibilidade from '@/components/membros/ModalIndisponibilidade'
import NotificacaoHeader from '@/components/membros/NotificacaoHeader'

interface Props {
    membro: any
    igrejaName: string
    escolaridades: any[]
    avisos?: any[]
    alertasAcolhimento?: any[]
    temDepartamento?: boolean
}

function HighContrastMenuItem() {
    const { active, toggle } = useHighContrast()
    return (
        <button
            onClick={toggle}
            className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-fg hover:bg-soft transition-all w-full text-left"
            aria-label="Modo alto contraste"
        >
            <SunMoon size={15} className={active ? 'text-figueira' : 'text-muted'} />
            {active ? 'Contraste Normal' : 'Alto Contraste'}
        </button>
    )
}

export default function MobileHeader({ membro, igrejaName, escolaridades, avisos = [], alertasAcolhimento = [], temDepartamento = false }: Props) {
    const pathname = usePathname()
    const iniciais = `${membro.first_name?.[0] || ''}${membro.last_name?.[0] || ''}`
    const [hidden, setHidden] = useState(false)
    const [menuAberto, setMenuAberto] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const lastScrollY = useRef(0)

    const isHome = pathname === '/membros/dashboard'

    useEffect(() => {
        if (!isHome) { setHidden(false); return }

        function onScroll() {
            const y = window.scrollY
            if (y > lastScrollY.current + 10) setHidden(true)
            else if (y < lastScrollY.current - 10) setHidden(false)
            lastScrollY.current = y
        }

        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [isHome])

    useEffect(() => { setHidden(false); lastScrollY.current = 0; setMenuAberto(false) }, [pathname])

    // Fechar menu ao clicar fora
    useEffect(() => {
        if (!menuAberto) return
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [menuAberto])

    const hideHeader = pathname === '/membros/login' || pathname === '/membros/termos' || pathname === '/membros/selecionar-congregacao' || pathname.startsWith('/louvor/setlist') || pathname === '/cantina/pos'
    if (hideHeader) return null

    return (
        <header className={`bg-bg2 border-b border-soft fixed top-0 left-0 right-0 z-40 pt-[env(safe-area-inset-top)] px-4 py-2.5 md:hidden transition-transform duration-300 ${hidden ? '-translate-y-full' : 'translate-y-0'}`}>
            <div className="flex items-center justify-between gap-3">
                {/* ESQUERDA: Foto + Nome da igreja */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-figueira text-white text-[11px] font-black overflow-hidden shrink-0">
                        {membro.avatar_file ? (
                            <Image src={membro.avatar_file} alt="" width={36} height={36} className="rounded-full object-cover" />
                        ) : (
                            iniciais
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase italic tracking-tighter text-fg truncate leading-tight">
                            {membro.first_name} {membro.last_name}
                        </p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-figueira truncate leading-tight">
                            {igrejaName}
                        </p>
                    </div>
                </div>

                {/* DIREITA: Notificações + Engrenagem + Logout */}
                <div className="flex items-center gap-2 shrink-0">
                    <NotificacaoHeader avisos={avisos} alertasAcolhimento={alertasAcolhimento} />

                    {/* Menu Engrenagem */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setMenuAberto(!menuAberto)}
                            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${menuAberto ? 'bg-figueira text-white' : 'bg-soft text-muted hover:text-fg'}`}
                            aria-label="Definições"
                        >
                            <Settings size={13} strokeWidth={3} />
                        </button>

                        {menuAberto && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-bg2 border border-soft rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                <DrawerEditarPerfil
                                    membro={membro}
                                    escolaridades={escolaridades}
                                    trigger={
                                        <div className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-fg hover:bg-soft transition-all cursor-pointer">
                                            <UserCircle size={15} className="text-figueira" />
                                            Editar Perfil
                                        </div>
                                    }
                                />
                                {temDepartamento && (
                                    <ModalIndisponibilidade
                                        trigger={
                                            <div className="flex items-center gap-3 px-4 py-3 text-xs font-bold uppercase tracking-widest text-fg hover:bg-soft transition-all cursor-pointer">
                                                <CalendarOff size={15} className="text-orange-500" />
                                                Indisponibilidades
                                            </div>
                                        }
                                    />
                                )}
                                <div className="border-t border-soft mt-1 pt-1">
                                    <HighContrastMenuItem />
                                </div>
                            </div>
                        )}
                    </div>

                    <form action={logoutMembro}>
                        <button type="submit" className="h-8 w-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                            <LogOut size={13} strokeWidth={3} />
                        </button>
                    </form>
                </div>
            </div>
        </header>
    )
}

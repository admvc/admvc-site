'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
    ShieldCheck, PieChart, LogOut, Users,
    Store, MonitorPlay, HeartHandshake,
    Home, Music2, Lightbulb, Calendar, MessageSquare,
    BookOpen, ChevronDown, ChevronUp, Car, Coffee, Info, Wallet2
} from 'lucide-react'
import { logoutMembro } from '@/actions/auth-actions'
import DrawerEditarPerfil from '@/components/membros/DrawerEditarPerfil'
import ModalIndisponibilidade from '@/components/membros/ModalIndisponibilidade'
import ModalRelatorioEscalas from '@/components/membros/ModalRelatorioEscalas'
import ModalRelatorioLouvor from '@/components/louvor/ModalRelatorioLouvor'
import NotificacaoHeader from '@/components/membros/NotificacaoHeader'
import ModalAjuda from '@/components/membros/ModalAjuda'
import { APP_VERSION } from '@/lib/constants'

interface Props {
    membro: any
    igrejaName: string
    role: string
    permissoes: {
        isAdmin: boolean
        isLider: boolean
        isMidia: boolean
        isAcolhimento: boolean
        isCantina: boolean
        isFinance: boolean
        isLouvor: boolean
        isDiaconia: boolean
        isSocial: boolean
    }
    mostraServico: boolean
    escolaridades: any[]
    avisos?: any[]
    alertasAcolhimento?: any[]
}

export default function MembroHeader({ membro, igrejaName, role, permissoes, mostraServico, escolaridades, avisos = [], alertasAcolhimento = [] }: Props) {
    const pathname = usePathname()
    const [expandido, setExpandido] = useState(false)
    const [menuAberto, setMenuAberto] = useState<string | null>(null)
    const headerRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setMenuAberto(null) }, [pathname])

    useEffect(() => {
        if (!menuAberto) return
        const handler = (e: MouseEvent) => {
            if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuAberto(null)
        }
        document.addEventListener('click', handler)
        return () => document.removeEventListener('click', handler)
    }, [menuAberto])

    useEffect(() => {
        const saved = localStorage.getItem('membro_header_expanded')
        if (saved === 'true') setExpandido(true)
    }, [])

    function toggleExpandido() {
        const next = !expandido
        setExpandido(next)
        localStorage.setItem('membro_header_expanded', String(next))
    }

    function toggleMenu(menu: string) {
        setMenuAberto(prev => prev === menu ? null : menu)
    }

    const hideHeader = pathname === '/membros/login' || pathname === '/membros/termos' || pathname === '/membros/selecionar-congregacao' || pathname.startsWith('/louvor/setlist')
    if (hideHeader) return null

    const iniciais = `${membro.first_name?.[0] || ''}${membro.last_name?.[0] || ''}`
    const isHome = pathname === '/membros/dashboard'
    const podePregacao = permissoes.isAdmin || permissoes.isDiaconia
    const numDeptos = membro.ministerios?.length || 0
    const numGrupos = (membro.grupos?.length || 0) + (membro.lider_de_grupo?.length || 0)
    const roleLabel = role === 'ADMIN' ? 'Administrador' : role === 'CONGREGATION_ADMIN' ? 'Admin Congregacao' : role === 'LEADER' ? 'Lider' : role === 'FINANCE' ? 'Tesouraria' : role === 'MANAGER' ? 'Gestor' : 'Membro'

    const menuItemClass = "text-[9px] md:text-[11px] font-bold uppercase tracking-widest text-fg hover:bg-soft px-3 py-2.5 rounded-lg transition-all flex items-center gap-2.5"

    return (
        <header ref={headerRef} className="bg-bg2 border-b border-soft sticky top-0 z-40 hidden md:block">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* LINHA PRINCIPAL */}
                <div className={`flex items-center justify-between gap-3 transition-all duration-300 ${expandido ? 'py-4' : 'py-3'}`}>
                    <Link href="/membros/dashboard" className="flex items-center gap-3 min-w-0">
                        <div className={`relative shrink-0 transition-all duration-300 ${expandido ? 'w-16 h-16' : 'w-9 h-9'}`}>
                            {membro.avatar_file ? (
                                <Image src={membro.avatar_file} alt="" fill sizes="64px" className="rounded-xl object-cover border border-soft" />
                            ) : (
                                <div className={`w-full h-full rounded-xl bg-fg text-bg flex items-center justify-center font-black border border-soft transition-all duration-300 ${expandido ? 'text-lg' : 'text-[10px]'}`}>
                                    {iniciais}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className={`font-black uppercase tracking-widest text-figueira truncate transition-all duration-300 ${expandido ? 'text-[9px] md:text-[11px]' : 'text-[7px] md:text-[9px]'}`}>
                                {igrejaName}{membro.congregacao ? ` · ${membro.congregacao.nome}` : ''}
                            </p>
                            <h1 className={`font-black text-fg italic tracking-tighter uppercase leading-none truncate transition-all duration-300 ${expandido ? 'text-xl' : 'text-sm'}`}>
                                {membro.first_name} <span className={`text-muted/40 ${expandido ? 'inline' : 'hidden sm:inline'}`}>{membro.last_name}</span>
                            </h1>
                            {expandido && (
                                <div className="animate-in fade-in duration-200 mt-1 space-y-0.5">
                                    <p className="text-[9px] md:text-[11px] font-bold text-muted">
                                        <span className="bg-figueira/10 text-figueira border border-figueira/20 px-2 py-0.5 rounded-md mr-2">{roleLabel}</span>
                                        {membro.email && <span className="text-muted/50">{membro.email}</span>}
                                    </p>
                                    <div className="flex items-center gap-3 text-[8px] md:text-[10px] font-bold text-muted/60">
                                        {numDeptos > 0 && <span>{numDeptos} departamento{numDeptos !== 1 ? 's' : ''}</span>}
                                        {numGrupos > 0 && <span>{numGrupos} grupo{numGrupos !== 1 ? 's' : ''}</span>}
                                        {membro.phone_1 && <span>{membro.phone_1}</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Link>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={toggleExpandido}
                            className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-lg hover:text-figueira hover:border-figueira/30 transition-all"
                            title={expandido ? 'Recolher' : 'Expandir'}>
                            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <Link href="/membros/mural" className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center bg-bg2 border border-soft text-muted rounded-lg hover:text-figueira hover:border-figueira/30 transition-all" title="Mural">
                            <MessageSquare size={14} />
                        </Link>
                        <NotificacaoHeader avisos={avisos} alertasAcolhimento={alertasAcolhimento} />
                        <form action={logoutMembro}>
                            <button type="submit" title="Sair" className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                <LogOut size={14} strokeWidth={3} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* BARRA DE NAVEGACAO — tabs */}
                <div className="border-t border-soft/60 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-1 py-2">
                        <NavTab label="Home" href="/membros/dashboard" active={isHome} />
                        <NavDropdownBtn label="Meu Perfil" active={menuAberto === 'perfil'} onClick={() => toggleMenu('perfil')} />
                        <NavDropdownBtn label="Ministério" active={menuAberto === 'servir'} onClick={() => toggleMenu('servir')} />
                        <NavDropdownBtn label="Igreja" active={menuAberto === 'comunidade'} onClick={() => toggleMenu('comunidade')} />
                        <NavDropdownBtn label="?" active={menuAberto === 'ajuda'} onClick={() => toggleMenu('ajuda')} />
                    </div>
                </div>
            </div>

            {/* DROPDOWNS — renderizados FORA do container com overflow, como paineis fullwidth */}
            {menuAberto && (
                <div className="bg-bg border-t border-soft shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">

                        {/* MEU PERFIL */}
                        {menuAberto === 'perfil' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                                <DrawerEditarPerfil membro={membro} escolaridades={escolaridades} isMenuItem />
                                <ModalIndisponibilidade isMenuItem />
                                <ModalRelatorioEscalas membroId={membro.id} isMenuItem />
                                {permissoes.isLouvor && <ModalRelatorioLouvor />}
                            </div>
                        )}

                        {/* SERVIR */}
                        {menuAberto === 'servir' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                                <Link href="/membros/dashboard?tab=departamentos" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                    <Users size={14} className="text-figueira" /> Onde Eu Sirvo
                                </Link>
                                <Link href="/membros/agendar" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                    <Calendar size={14} className="text-figueira" /> Agendar Reuniao
                                </Link>
                                {permissoes.isAdmin && (
                                    <Link href="/admin/dashboard" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <ShieldCheck size={14} className="text-figueira" /> Painel Admin
                                    </Link>
                                )}
                                {(permissoes.isFinance || permissoes.isAdmin) && (
                                    <Link href="/tesouraria" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <PieChart size={14} className="text-emerald-500" /> Tesouraria
                                    </Link>
                                )}
                                {(permissoes.isCantina || permissoes.isAdmin) && (
                                    <Link href="/cantina" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <Store size={14} className="text-orange-500" /> Cantina
                                    </Link>
                                )}
                                {(permissoes.isAcolhimento || permissoes.isAdmin) && (
                                    <Link href="/departamentos/acolhimento/dashboard" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <HeartHandshake size={14} className="text-rose-500" /> Acolhimento
                                    </Link>
                                )}
                                {podePregacao && (
                                    <Link href="/pregacao" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <BookOpen size={14} className="text-indigo-400" /> Pregacao
                                    </Link>
                                )}
                                {permissoes.isMidia && (
                                    <Link href="/midia/holyrics" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <MonitorPlay size={14} className="text-purple-500" /> Holyrics
                                    </Link>
                                )}
                                {(permissoes.isMidia || permissoes.isLouvor) && (
                                    <Link href="/midia/mesax32" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <Music2 size={14} className="text-blue-500" /> Mesa de Som
                                    </Link>
                                )}
                                {permissoes.isMidia && (
                                    <Link href="/midia/lumikit" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                        <Lightbulb size={14} className="text-amber-500" /> Iluminacao
                                    </Link>
                                )}
                            </div>
                        )}

                        {/* COMUNIDADE */}
                        {menuAberto === 'comunidade' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
                                <Link href="/boleia" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                    <Car size={14} className="text-figueira" /> Boleia Solidaria
                                </Link>
                                <Link href="/cantina/menu-local" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                    <Coffee size={14} className="text-orange-500" /> Menu Cantina
                                </Link>
                                <Link href="/membros/mural" onClick={() => setMenuAberto(null)} className={menuItemClass}>
                                    <MessageSquare size={14} className="text-blue-500" /> Mural
                                </Link>
                            </div>
                        )}

                        {/* AJUDA */}
                        {menuAberto === 'ajuda' && (
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <ModalAjuda isMenuItem />
                                    <span className="text-[9px] md:text-[11px] font-bold text-muted2">Versao: {APP_VERSION}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}

function NavTab({ label, href, active }: { label: string; href: string; active: boolean }) {
    return (
        <Link href={href} className={`px-3.5 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 ${
            active ? 'bg-fg text-bg' : 'text-muted hover:bg-soft/30 hover:text-fg'
        }`}>
            {label}
        </Link>
    )
}

function NavDropdownBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className={`px-3.5 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
            active ? 'bg-fg text-bg' : 'text-muted hover:bg-soft/30 hover:text-fg'
        }`}>
            {label} <ChevronDown size={10} className={`transition-transform ${active ? 'rotate-180' : ''}`} />
        </button>
    )
}

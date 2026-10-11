'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
    Home, HelpCircle, Calendar, Music2, MonitorPlay, HeartHandshake, Store,
    BookOpen, ShieldCheck, X, ChevronDown, ChevronRight, MessageCircle, Clock,
    Lightbulb, Monitor, GraduationCap, Users, Wallet, Receipt, FileText,
    TrendingUp, Heart, HandCoins, RefreshCw, Download, Package, CreditCard,
    BarChart3, PlusCircle, Target, Building2
} from 'lucide-react'
import ModalAjuda from '@/components/membros/ModalAjuda'
import ModalAgendaPastoral from '@/components/membros/ModalAgendaPastoral'

interface Permissoes {
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

interface Evento {
    id: number
    nome: string
    data: string
}

interface Props {
    permissoes: Permissoes
    proximosEventos?: Evento[]
}

export default function MobileBottomNav({ permissoes, proximosEventos = [] }: Props) {
    const pathname = usePathname()
    const [agendaAberta, setAgendaAberta] = useState(false)
    const [louvorAberto, setLouvorAberto] = useState(false)
    const [midiaAberto, setMidiaAberto] = useState(false)
    const [formacaoAberto, setFormacaoAberto] = useState(false)
    const [cantinaAberto, setCantinaAberto] = useState(false)
    const [diaconiaAberto, setDiaconiaAberto] = useState(false)
    const [tesourariaAberto, setTesourariaAberto] = useState(false)
    const [agendaPastoralAberta, setAgendaPastoralAberta] = useState(false)
    const [mostrarTodos, setMostrarTodos] = useState(false)

    const hideNav = pathname === '/membros/login' || pathname === '/membros/termos' || pathname === '/membros/selecionar-congregacao' || pathname.startsWith('/louvor/setlist') || pathname === '/cantina/pos'
    if (hideNav) return null

    // Build dynamic tabs: Home, departamentos, Formacao (admin), Admin, Ajuda (sempre ultimo)
    const tabs: { key: string; icon: typeof Home; label: string; href?: string; action?: () => void; custom?: React.ReactNode }[] = [
        { key: 'home', icon: Home, label: 'Inicio', href: '/membros/dashboard' },
    ]

    if (permissoes.isLouvor) tabs.push({ key: 'louvor', icon: Music2, label: 'Louvor', action: () => setLouvorAberto(true) })
    if (permissoes.isMidia) tabs.push({ key: 'midia', icon: MonitorPlay, label: 'Midia', action: () => setMidiaAberto(true) })
    if (permissoes.isAcolhimento) tabs.push({ key: 'acolhimento', icon: HeartHandshake, label: 'Acolhimento', href: '/departamentos/acolhimento/dashboard' })
    if (permissoes.isCantina) tabs.push({ key: 'cantina', icon: Store, label: 'Cantina', action: () => setCantinaAberto(true) })
    if (permissoes.isSocial) tabs.push({ key: 'social', icon: HeartHandshake, label: 'Social', href: '/assistencia' })
    tabs.push({ key: 'diaconia', icon: Calendar, label: 'Igreja', action: () => setDiaconiaAberto(true) })
    if (permissoes.isFinance) tabs.push({ key: 'tesouraria', icon: Wallet, label: 'Tesouraria', action: () => setTesourariaAberto(true) })
    if (permissoes.isAdmin) tabs.push({ key: 'formacao', icon: GraduationCap, label: 'Formacao', action: () => setFormacaoAberto(true) })
    if (permissoes.isAdmin) tabs.push({ key: 'admin', icon: ShieldCheck, label: 'Admin', href: '/admin/dashboard' })
    // Ajuda sempre no final
    tabs.push({ key: 'ajuda', icon: HelpCircle, label: 'Ajuda', custom: 'ajuda' })
    const eventosVisiveis = mostrarTodos ? proximosEventos : proximosEventos.slice(0, 4)

    return (
        <>
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg2 border-t border-soft pb-[env(safe-area-inset-bottom)] md:hidden">
                <div className={`flex items-center px-2 py-2 ${tabs.length <= 5 ? 'justify-around' : 'overflow-x-auto scrollbar-hide gap-1'}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = tab.href
                            ? (tab.href === '/membros/dashboard' ? pathname === '/membros/dashboard' : pathname.startsWith(tab.href))
                            : false

                        // Ajuda — usa ModalAjuda com trigger
                        if (tab.custom === 'ajuda') {
                            return (
                                <ModalAjuda key={tab.key} trigger={
                                    <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] shrink-0 text-muted hover:text-fg">
                                        <HelpCircle size={20} strokeWidth={1.5} />
                                        <span className="text-[7px] font-black uppercase tracking-widest">Ajuda</span>
                                    </div>
                                } />
                            )
                        }

                        if (tab.action) {
                            return (
                                <button
                                    key={tab.key}
                                    onClick={tab.action}
                                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] shrink-0 text-muted hover:text-fg"
                                >
                                    <Icon size={20} strokeWidth={1.5} />
                                    <span className="text-[7px] font-black uppercase tracking-widest">{tab.label}</span>
                                </button>
                            )
                        }

                        return (
                            <Link
                                key={tab.key}
                                href={tab.href!}
                                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] shrink-0 ${
                                    isActive ? 'text-figueira' : 'text-muted hover:text-fg'
                                }`}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                                <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? 'text-figueira' : ''}`}>
                                    {tab.label}
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* MODAL AGENDA */}
            {agendaAberta && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => { setAgendaAberta(false); setMostrarTodos(false) }}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Agenda</h3>
                                    <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{proximosEventos.length} eventos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setAgendaAberta(false); setMostrarTodos(false) }}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Lista de eventos */}
                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            {eventosVisiveis.length > 0 ? (
                                eventosVisiveis.map((evento) => {
                                    const d = new Date(evento.data)
                                    const dia = d.toLocaleDateString('pt-PT', { day: '2-digit' })
                                    const mes = d.toLocaleDateString('pt-PT', { month: 'short' })
                                    const diaSemana = d.toLocaleDateString('pt-PT', { weekday: 'short' })
                                    const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })

                                    const dataCompleta = d.toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                                    const dataCapitalizada = dataCompleta.charAt(0).toUpperCase() + dataCompleta.slice(1)

                                    function partilharWhatsApp() {
                                        const texto = `⛪ *${evento.nome.toUpperCase()}*\n📅 ${dataCapitalizada}\n⏰ ${hora}\n\n🙏 Vemo-nos lá!`
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank')
                                    }

                                    return (
                                        <details key={evento.id} className="bg-bg2 border border-soft rounded-xl overflow-hidden group/ev">
                                            <summary className="flex items-center gap-3 p-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                                <div className="p-2 rounded-lg bg-fg text-bg text-center min-w-[44px] shrink-0">
                                                    <span className="block text-[7px] font-black uppercase opacity-60">{mes}</span>
                                                    <span className="block text-lg font-black italic leading-tight">{dia}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[11px] font-black uppercase italic text-fg truncate">{evento.nome}</h4>
                                                    <p className="text-[9px] text-muted font-bold mt-0.5">
                                                        {diaSemana} · {hora}
                                                    </p>
                                                </div>
                                                <ChevronRight size={14} className="text-muted shrink-0 transition-transform group-open/ev:rotate-90" />
                                            </summary>

                                            <div className="px-3 pb-3 pt-1 border-t border-soft space-y-3 animate-in fade-in duration-200">
                                                {/* Detalhes */}
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-[10px] text-fg font-medium">
                                                        <Calendar size={11} className="text-figueira shrink-0" />
                                                        {dataCapitalizada}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] text-muted">
                                                        <Clock size={11} className="shrink-0" />
                                                        {hora}
                                                    </div>
                                                </div>

                                                {/* Botão WhatsApp */}
                                                <button
                                                    onClick={partilharWhatsApp}
                                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-50 text-green-600 border border-green-200 text-[9px] font-black uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all active:scale-95"
                                                >
                                                    <MessageCircle size={13} /> Partilhar no WhatsApp
                                                </button>
                                            </div>
                                        </details>
                                    )
                                })
                            ) : (
                                <div className="text-center py-8">
                                    <Calendar size={28} className="mx-auto text-muted/20 mb-2" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">Sem eventos agendados</p>
                                </div>
                            )}

                            {/* Botão ver mais / ver menos */}
                            {proximosEventos.length > 4 && (
                                <button
                                    onClick={() => setMostrarTodos(!mostrarTodos)}
                                    className="w-full py-2.5 text-[9px] font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors flex items-center justify-center gap-1.5"
                                >
                                    <ChevronDown size={12} className={`transition-transform ${mostrarTodos ? 'rotate-180' : ''}`} />
                                    {mostrarTodos ? 'Ver menos' : `Ver todos (${proximosEventos.length})`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL LOUVOR */}
            {louvorAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setLouvorAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Music2 size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Louvor</h3>
                            </div>
                            <button onClick={() => setLouvorAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            <Link
                                href="/louvor/repertorio"
                                onClick={() => setLouvorAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all"
                            >
                                <Music2 size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Repertório</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Setlists, cifras e músicas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link
                                href="/midia/mesax32"
                                onClick={() => setLouvorAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all"
                            >
                                <MonitorPlay size={18} className="text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Mesa X32</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Controlo de som</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL MÍDIA */}
            {midiaAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setMidiaAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                    <MonitorPlay size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Mídia</h3>
                            </div>
                            <button onClick={() => setMidiaAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            <Link href="/midia/holyrics" onClick={() => setMidiaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Monitor size={18} className="text-purple-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Holyrics</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Projeção de letras e media</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/midia/mesax32" onClick={() => setMidiaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Music2 size={18} className="text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Mesa X32</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Controlo de som</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/midia/lumikit" onClick={() => setMidiaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Lightbulb size={18} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Iluminação</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Lumikit</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/louvor/repertorio" onClick={() => setMidiaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Calendar size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Setlist do Culto</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Músicas e repertório do dia</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* MODAL FORMAÇÃO (Admin) */}
            {formacaoAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setFormacaoAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                                    <GraduationCap size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Formação</h3>
                            </div>
                            <button onClick={() => setFormacaoAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            <Link href="/admin/formacao/pregacao" onClick={() => setFormacaoAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <BookOpen size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Pregação</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir pregações e pregadores</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/admin/formacao/ebd" onClick={() => setFormacaoAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <GraduationCap size={18} className="text-purple-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Cursos / EBD</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Criar e administrar cursos</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL CANTINA */}
            {cantinaAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setCantinaAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Store size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Cantina</h3>
                            </div>
                            <button onClick={() => setCantinaAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            <Link href="/cantina/pos" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Store size={18} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Ponto de Venda</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Registar vendas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/dashboard" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Calendar size={18} className="text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Vendas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Dashboard e estatisticas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/produtos" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Store size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Produtos</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir catalogo e stock</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/turnos" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Clock size={18} className="text-purple-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Turnos</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Abrir e fechar caixa</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/despesas" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Wallet size={18} className="text-red-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Despesas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Custos operacionais</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/relatorio-financeiro" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Wallet size={18} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Relatorio Financeiro</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Lucro e prejuizo</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/encomendas" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Package size={18} className="text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Encomendas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir encomendas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/fiados" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <HandCoins size={18} className="text-red-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Fiados</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Contas a receber</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/recargas" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <CreditCard size={18} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Recargas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Recarregar saldos</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/cantina/menu-local" onClick={() => setCantinaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <BookOpen size={18} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Menu Publico</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Menu visivel ao publico</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL TESOURARIA */}
            {tesourariaAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setTesourariaAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Wallet size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Tesouraria</h3>
                            </div>
                            <button onClick={() => setTesourariaAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-2 flex-1">
                            <Link href="/tesouraria" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <PlusCircle size={18} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Lancar Entrada</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Registar ofertas e dizimos</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/tesouraria" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Target size={18} className="text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Campanhas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir carnes e campanhas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/departamentos/financeiro/obra" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Building2 size={18} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Progresso da Obra</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Status e etapas do projeto</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/fundos" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Wallet size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Fundos</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir fundos da igreja</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/despesas" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Receipt size={18} className="text-red-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Despesas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Registar despesas</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/orcamento" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <BarChart3 size={18} className="text-blue-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Orcamento</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Planeamento financeiro</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/recibos" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <FileText size={18} className="text-amber-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Recibos IRS</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Emitir recibos fiscais</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/relatorios" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <TrendingUp size={18} className="text-emerald-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Relatorio</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Relatorios financeiros</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/donativos" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Heart size={18} className="text-pink-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Donativos</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Gerir donativos recebidos</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/pledges" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <HandCoins size={18} className="text-purple-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Promessas</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Compromissos financeiros</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/reconciliacao" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <RefreshCw size={18} className="text-blue-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Reconciliacao</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Reconciliacao bancaria</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                            <Link href="/financeiro/exportar" onClick={() => setTesourariaAberto(false)}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                <Download size={18} className="text-muted shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Exportacao</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Exportar dados financeiros</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </Link>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL IGREJA (Diaconia + Agenda Pastoral + Gabinete) */}
            {diaconiaAberto && createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setDiaconiaAberto(false)}
                >
                    <div
                        className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-soft">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-figueira/10 text-figueira flex items-center justify-center">
                                    <Calendar size={18} />
                                </div>
                                <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Igreja</h3>
                            </div>
                            <button onClick={() => setDiaconiaAberto(false)}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-4 space-y-2">
                            {/* Agenda Pastoral — todos os membros */}
                            <button
                                onClick={() => { setDiaconiaAberto(false); setAgendaPastoralAberta(true) }}
                                className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all w-full text-left"
                            >
                                <Calendar size={18} className="text-figueira shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black uppercase text-fg">Agenda Pastoral</h4>
                                    <p className="text-[8px] text-muted font-bold mt-0.5">Marcar reuniao com o pastor</p>
                                </div>
                                <ChevronRight size={14} className="text-muted" />
                            </button>

                            {/* Pregacao — apenas diaconia */}
                            {permissoes.isDiaconia && (
                                <Link href="/pregacao" onClick={() => setDiaconiaAberto(false)}
                                    className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <BookOpen size={18} className="text-figueira shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black uppercase text-fg">Pregacao</h4>
                                        <p className="text-[8px] text-muted font-bold mt-0.5">Sermoes e pregadores</p>
                                    </div>
                                    <ChevronRight size={14} className="text-muted" />
                                </Link>
                            )}

                            {/* Obreiros — apenas diaconia */}
                            {permissoes.isDiaconia && (
                                <Link href="/departamentos/obreiros/dashboard" onClick={() => setDiaconiaAberto(false)}
                                    className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <Users size={18} className="text-blue-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black uppercase text-fg">Obreiros</h4>
                                        <p className="text-[8px] text-muted font-bold mt-0.5">Gestao de voluntarios</p>
                                    </div>
                                    <ChevronRight size={14} className="text-muted" />
                                </Link>
                            )}

                            {/* Gabinete — admin, pastor, lider */}
                            {(permissoes.isAdmin || permissoes.isLider) && (
                                <Link href="/gabinete" onClick={() => setDiaconiaAberto(false)}
                                    className="flex items-center gap-3 p-4 bg-bg2 border border-soft rounded-xl hover:border-figueira/30 transition-all">
                                    <ShieldCheck size={18} className="text-purple-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-black uppercase text-fg">Gabinete</h4>
                                        <p className="text-[8px] text-muted font-bold mt-0.5">Gerir agenda pastoral</p>
                                    </div>
                                    <ChevronRight size={14} className="text-muted" />
                                </Link>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL AGENDA PASTORAL */}
            <ModalAgendaPastoral
                aberto={agendaPastoralAberta}
                onClose={() => setAgendaPastoralAberta(false)}
            />
        </>
    )
}

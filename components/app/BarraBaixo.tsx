'use client'

// Barra de baixo no telemovel (como o LouveApp): Inicio, Escalas, Repertorio
// (so o louvor) e Mais. "Mais" abre uma lista simples com o resto (so o que a
// igreja tem ligado e a pessoa pode usar). Nunca mais de um nivel.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    CalendarCheck2, CalendarDays, Home, ListMusic, Menu, X, Megaphone, Music2, Users, UserRound,
    HelpCircle, ShieldCheck, LogOut, HeartHandshake, MonitorPlay, Shield,
    Store, Wallet, HandHeart, BookOpen, Church, GraduationCap, Car, Briefcase, CalendarClock, Package,
    SlidersVertical, Lightbulb,
} from 'lucide-react'
import ModalAjuda from '@/components/membros/ModalAjuda'
import { logoutMembro } from '@/actions/auth-actions'

export type ItemMais = {
    chave: 'agenda' | 'avisos' | 'louvor' | 'grupo' | 'acolhimento' | 'midia' | 'perfil' | 'admin' | 'privacidade'
        | 'cantina' | 'tesouraria' | 'social' | 'pregacao' | 'obreiros' | 'cursos' | 'boleias'
        | 'gabinete' | 'atendimento' | 'inventario' | 'mesa' | 'luz'
    texto: string
    href: string
    detalhe?: string
}

export const ICONES: Record<ItemMais['chave'], typeof Users> = {
    agenda: CalendarDays, avisos: Megaphone, louvor: Music2, grupo: Users, acolhimento: HeartHandshake,
    midia: MonitorPlay, perfil: UserRound, admin: ShieldCheck, privacidade: Shield,
    cantina: Store, tesouraria: Wallet, social: HandHeart, pregacao: BookOpen, obreiros: Church,
    cursos: GraduationCap, boleias: Car, gabinete: Briefcase, atendimento: CalendarClock, inventario: Package,
    mesa: SlidersVertical, luz: Lightbulb,
}

export default function BarraBaixo({ itensMais, repertorio = false }: { itensMais: ItemMais[]; repertorio?: boolean }) {
    const pathname = usePathname()
    const [aberto, setAberto] = useState(false)

    // Fecha a lista ao mudar de pagina
    useEffect(() => { setAberto(false) }, [pathname])

    const ativo = (href: string) => (href === '/membros/dashboard' ? pathname === href : href.startsWith('/louvor') ? pathname.startsWith('/louvor') : pathname.startsWith(href))
    const botao = 'a-foco flex flex-1 flex-col items-center justify-center gap-1 min-h-[60px] text-[13px] font-semibold'

    return (
        <>
            <nav aria-label="Navegação principal"
                className="app-novo fixed inset-x-0 bottom-0 z-50 border-t md:hidden"
                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="mx-auto flex max-w-md">
                    {[
                        { href: '/membros/dashboard', texto: 'Início', Icone: Home },
                        { href: '/escalas', texto: 'Escalas', Icone: CalendarCheck2 },
                        ...(repertorio ? [{ href: '/louvor/musicas', texto: 'Repertório', Icone: ListMusic }] : []),
                    ].map(({ href, texto, Icone }) => (
                        <Link key={href} href={href} className={botao} aria-current={ativo(href) ? 'page' : undefined}
                            style={{ color: ativo(href) ? 'var(--a-destaque)' : 'var(--a-suave)' }}>
                            <Icone size={24} strokeWidth={ativo(href) ? 2.4 : 1.8} aria-hidden />
                            {texto}
                        </Link>
                    ))}
                    <button type="button" className={botao} onClick={() => setAberto(true)} aria-expanded={aberto}
                        style={{ color: aberto ? 'var(--a-destaque)' : 'var(--a-suave)' }}>
                        <Menu size={24} strokeWidth={1.8} aria-hidden />
                        Mais
                    </button>
                </div>
            </nav>

            {aberto && (
                <div className="app-novo fixed inset-0 z-[60] flex flex-col md:hidden" role="dialog" aria-modal="true" aria-label="Mais opções"
                    style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
                    <div className="flex items-center justify-between px-4 py-3">
                        <h2 className="text-[22px] font-bold">Mais</h2>
                        <button type="button" onClick={() => setAberto(false)} className="a-botao a-botao-secundario !px-3" aria-label="Fechar">
                            <X size={22} aria-hidden />
                        </button>
                    </div>
                    <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
                        {itensMais.map((item) => {
                            const Icone = ICONES[item.chave]
                            return (
                                <li key={item.chave}>
                                    <Link href={item.href} className="a-card a-foco flex min-h-[60px] items-center gap-4 px-4 py-3">
                                        <Icone size={24} style={{ color: 'var(--a-destaque)' }} aria-hidden />
                                        <span className="flex-1">
                                            <span className="block text-[17px] font-semibold">{item.texto}</span>
                                            {item.detalhe && <span className="block text-[14px] a-suave">{item.detalhe}</span>}
                                        </span>
                                    </Link>
                                </li>
                            )
                        })}
                        <li>
                            <ModalAjuda trigger={
                                <span className="a-card a-foco flex min-h-[60px] w-full items-center gap-4 px-4 py-3">
                                    <HelpCircle size={24} style={{ color: 'var(--a-destaque)' }} aria-hidden />
                                    <span className="text-[17px] font-semibold">Ajuda</span>
                                </span>
                            } />
                        </li>
                        <li>
                            <form action={logoutMembro}>
                                <button type="submit" className="a-card a-foco flex min-h-[60px] w-full items-center gap-4 px-4 py-3 text-left">
                                    <LogOut size={24} style={{ color: 'var(--a-erro)' }} aria-hidden />
                                    <span className="text-[17px] font-semibold">Sair</span>
                                </button>
                            </form>
                        </li>
                    </ul>
                </div>
            )}
        </>
    )
}

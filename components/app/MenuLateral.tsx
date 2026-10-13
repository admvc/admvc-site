'use client'

// Menu lateral fixo no computador (como o LouveApp): icone e texto, um so
// nivel, sem submenus. Em ecras medios so os icones (o nome aparece ao passar
// o rato). Os mesmos itens da barra de baixo e do "Mais" do telemovel.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, CalendarCheck2, HelpCircle, Home, ListMusic, LogOut } from 'lucide-react'
import ModalAjuda from '@/components/membros/ModalAjuda'
import { logoutMembro } from '@/actions/auth-actions'
import { ICONES, type ItemMais } from './BarraBaixo'

export default function MenuLateral({ igreja, nome, avatar, perfilHref, itensMais, repertorio }: {
    igreja: string
    nome: string
    avatar: string | null
    perfilHref: string
    itensMais: ItemMais[]
    repertorio: boolean
}) {
    const pathname = usePathname()

    const principais = [
        { href: '/membros/dashboard', texto: 'Início', Icone: Home },
        { href: '/escalas', texto: 'Escalas', Icone: CalendarCheck2 },
        ...(repertorio ? [{ href: '/louvor/musicas', texto: 'Repertório', Icone: ListMusic }] : []),
    ]
    // Administracao vai para o topo (voltar ao admin), nao no meio da lista
    const admin = itensMais.find((i) => i.chave === 'admin')
    const resto = itensMais.filter((i) => i.chave !== 'perfil' && i.chave !== 'admin')
    const ativo = (href: string) => (href === '/membros/dashboard' ? pathname === href : href.startsWith('/louvor') ? pathname.startsWith('/louvor') : pathname.startsWith(href))
    const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

    const item = 'a-foco flex min-h-[48px] items-center gap-3 rounded-[12px] px-3 text-[16px] font-semibold md:justify-center lg:justify-start'

    const Item = ({ href, texto, Icone }: { href: string; texto: string; Icone: typeof Home }) => {
        const sim = ativo(href)
        return (
            <li>
                <Link href={href} title={texto} aria-current={sim ? 'page' : undefined} className={item}
                    style={sim ? { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' } : undefined}>
                    <Icone size={22} strokeWidth={sim ? 2.4 : 1.8} aria-hidden className="shrink-0" />
                    <span className="md:sr-only lg:not-sr-only">{texto}</span>
                </Link>
            </li>
        )
    }

    return (
        <nav aria-label="Menu" className="app-novo fixed inset-y-0 left-0 z-40 hidden flex-col border-r md:flex md:w-20 lg:w-64"
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
            <Link href={perfilHref} title="O meu perfil" className="a-foco m-3 flex items-center gap-3 rounded-[14px] p-2 md:justify-center lg:justify-start"
                style={{ background: 'var(--a-destaque-suave)' }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold"
                    style={{ background: 'var(--a-card)', color: 'var(--a-destaque)' }} aria-hidden>
                    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : iniciais}
                </span>
                <span className="min-w-0 md:sr-only lg:not-sr-only">
                    <span className="block truncate text-[16px] font-bold">{nome}</span>
                    <span className="block truncate text-[14px] a-suave">{igreja}</span>
                </span>
            </Link>

            {admin && (
                <Link href={admin.href} title="Voltar à administração"
                    className="a-foco mx-3 mb-3 flex min-h-[44px] items-center gap-3 rounded-[12px] px-3 text-[15px] font-semibold md:justify-center lg:justify-start"
                    style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden className="shrink-0" />
                    <span className="md:sr-only lg:not-sr-only">Voltar à administração</span>
                </Link>
            )}

            <div className="flex-1 overflow-y-auto px-3 pb-3">
                <ul className="space-y-1">
                    {principais.map((p) => <Item key={p.href} {...p} />)}
                </ul>
                {resto.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t pt-3" style={{ borderColor: 'var(--a-borda)' }}>
                        {resto.map((i) => <Item key={i.chave} href={i.href} texto={i.texto} Icone={ICONES[i.chave]} />)}
                    </ul>
                )}
            </div>

            <ul className="space-y-1 border-t p-3" style={{ borderColor: 'var(--a-borda)' }}>
                <li>
                    <ModalAjuda itens={itensMais.map((i) => i.chave)} repertorio={repertorio} trigger={
                        <span className={`${item} w-full cursor-pointer`} title="Ajuda">
                            <HelpCircle size={22} strokeWidth={1.8} aria-hidden className="shrink-0" />
                            <span className="md:sr-only lg:not-sr-only">Ajuda</span>
                        </span>
                    } />
                </li>
                <li>
                    <form action={logoutMembro}>
                        <button type="submit" title="Sair" className={`${item} w-full`} style={{ color: 'var(--a-erro)' }}>
                            <LogOut size={22} strokeWidth={1.8} aria-hidden className="shrink-0" />
                            <span className="md:sr-only lg:not-sr-only">Sair</span>
                        </button>
                    </form>
                </li>
            </ul>
        </nav>
    )
}

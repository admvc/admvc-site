// Cabecalho no telemovel: o nome da igreja e a foto da pessoa (abre o perfil).
import Link from 'next/link'
import { Bell } from 'lucide-react'

export default function CabecalhoApp({ igreja, nome, avatar, perfilHref, adminHref, alertas = 0 }: { igreja: string; nome: string; avatar: string | null; perfilHref: string; adminHref?: string; alertas?: number }) {
    const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    return (
        <header className="app-novo fixed inset-x-0 top-0 z-40 border-b md:hidden"
            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', paddingTop: 'env(safe-area-inset-top)' }}>
            <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[17px] font-bold">{igreja}</span>
                    {adminHref && (
                        <Link href={adminHref} className="a-foco shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold"
                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                            ← Admin
                        </Link>
                    )}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                {alertas > 0 && (
                    <Link href="/membros/dashboard#alertas" className="a-foco relative flex h-11 w-11 items-center justify-center rounded-full" aria-label={`${alertas} ${alertas === 1 ? 'aviso' : 'avisos'} de encontros`}>
                        <Bell size={22} aria-hidden />
                        <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold text-white" style={{ background: 'var(--a-erro)' }}>{alertas}</span>
                    </Link>
                )}
                <Link href={perfilHref} className="a-foco flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-[15px] font-bold"
                    style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }} aria-label={`O meu perfil (${nome})`}>
                    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : iniciais}
                </Link>
                </span>
            </div>
        </header>
    )
}

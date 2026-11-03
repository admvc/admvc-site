// Repertorio da igreja (so o ministerio de louvor e os admins).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Compass, Plus } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio, podeVerRepertorio } from '@/lib/louvor-permissoes'
import { repertorioDaIgreja } from '@/lib/ministerios-app'
import ListaRepertorio from '@/components/app/ListaRepertorio'

export const dynamic = 'force-dynamic'

export default async function RepertorioPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    // Em paralelo (cada ida a base conta); so se mostra se puder ver
    const [podeVer, musicas, gere] = await Promise.all([podeVerRepertorio(sessao), repertorioDaIgreja(sessao), podeGerirRepertorio(sessao)])
    if (!podeVer) redirect('/membros/dashboard')

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8 space-y-4">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-[24px] font-bold leading-tight">Repertório</h1>
                    {gere && (
                        <div className="flex items-center gap-2">
                            <Link href="/louvor/musicas/ligar" className="a-botao a-botao-secundario !min-h-[44px]">Arrumar</Link>
                            <Link href="/louvor/musicas/nova" className="a-botao a-botao-principal !min-h-[44px]">
                                <Plus size={20} aria-hidden /> Nova
                            </Link>
                        </div>
                    )}
                </header>
                <Link href="/louvor/descobrir" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <Compass size={18} aria-hidden /> Descobrir músicas
                </Link>
                <ListaRepertorio musicas={musicas} />
            </main>
        </div>
    )
}

// Repertorio da igreja (so o ministerio de louvor e os admins).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus } from 'lucide-react'
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
                        <Link href="/louvor/musicas/nova" className="a-botao a-botao-principal !min-h-[44px]">
                            <Plus size={20} aria-hidden /> Nova
                        </Link>
                    )}
                </header>
                <ListaRepertorio musicas={musicas} />
            </main>
        </div>
    )
}

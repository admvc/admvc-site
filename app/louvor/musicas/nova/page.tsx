// Nova musica no repertorio (quem gere o louvor).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import FormMusica from '@/components/app/FormMusica'

export const dynamic = 'force-dynamic'

export default async function NovaMusicaPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeGerirRepertorio(sessao))) redirect('/louvor/musicas')
    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/louvor/musicas" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Repertório
                </Link>
                <h1 className="text-[24px] font-bold">Nova música</h1>
                <FormMusica />
            </main>
        </div>
    )
}

import Link from 'next/link'
import { verificarLinkNovaSenha } from '@/actions/senha-actions'
import FormNovaSenha from './FormNovaSenha'
import { SENHA_MINIMO } from '@/lib/senhas'

export const dynamic = 'force-dynamic'

export default async function NovaSenhaPage(props: { searchParams: Promise<{ t?: string }> }) {
    const searchParams = await props.searchParams;
    const token = searchParams.t ?? ''
    const valido = token ? await verificarLinkNovaSenha(token) : false

    return (
        <main className="min-h-screen bg-bg flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-6">
                <h1 className="text-3xl font-black text-fg text-center">Definir palavra-passe</h1>
                {valido ? (
                    <FormNovaSenha token={token} minimo={SENHA_MINIMO} />
                ) : (
                    <div className="bg-bg2 border border-soft p-8 rounded-3xl space-y-4 text-center">
                        <p className="text-sm text-fg">Este link já não é válido: passou mais de 1 hora ou já foi usado.</p>
                        <Link href="/membros/recuperar" className="inline-block text-sm font-bold text-figueira underline">Pedir um link novo</Link>
                    </div>
                )}
            </div>
        </main>
    )
}

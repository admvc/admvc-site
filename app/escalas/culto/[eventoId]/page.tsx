// Montar a escala de uma equipa para um culto (lider, pensado para o telemovel).
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { dadosMontarEscala } from '@/lib/escalas-app'
import MontarEscala from '@/components/app/MontarEscala'

export const dynamic = 'force-dynamic'

export default async function MontarEscalaPage(props: {
    params: Promise<{ eventoId: string }>
    searchParams: Promise<{ equipa?: string }>
}) {
    const { eventoId } = await props.params
    const { equipa } = await props.searchParams
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')

    const deptoId = Number(equipa)
    if (!deptoId || !(await podeGerirEscalasDoDepartamento(sessao, deptoId))) redirect('/membros/dashboard')

    const dados = await dadosMontarEscala(sessao, deptoId, Number(eventoId))
    if (!dados) redirect('/membros/dashboard')

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8">
                <MontarEscala dados={dados} />
            </main>
        </div>
    )
}

// Alterar participantes: montar a escala de uma equipa para um culto (lider).
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { dadosMontarEscala } from '@/lib/escalas-app'
import MontarEscala from '@/components/app/MontarEscala'
import SugerirPessoa from '@/components/app/SugerirPessoa'
import { sugestoesPendentes } from '@/actions/sugestao-actions'

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
    if (!deptoId || !(await podeGerirEscalasDoDepartamento(sessao, deptoId))) redirect(`/escalas/culto/${eventoId}?equipa=${equipa ?? ''}`)

    const [dados, pendentes] = await Promise.all([dadosMontarEscala(sessao, deptoId, Number(eventoId)), sugestoesPendentes(deptoId)])
    if (!dados) redirect('/escalas')

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <MontarEscala dados={dados} />
                <SugerirPessoa deptoId={deptoId} funcoes={dados.funcoes.map((f) => ({ id: f.id, nome: f.nome }))} pendentes={pendentes} />
            </main>
        </div>
    )
}

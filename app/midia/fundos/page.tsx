// Banco de fundos da Mídia: imagens de fundo por categoria para as artes de divulgação.
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { listarFundos } from '@/lib/fundos-dados'
import FundosClient from './FundosClient'

export const dynamic = 'force-dynamic'

export default async function MidiaFundos() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração gerem os fundos.')}`)
    const fundos = await listarFundos(sessao.tenantId)

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-5 px-4 pt-20 pb-28 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Banco de fundos</h1>
                    <p className="text-[16px] a-suave">Imagens de fundo para as artes de divulgação, por categoria. Envie várias de uma vez.</p>
                </header>
                <FundosClient inicial={fundos} />
            </main>
        </div>
    )
}

// Arte simples da Assistência Social para o telão: estilo, título, texto e um apelo; descarregar ou publicar num culto
// (aparece em ENCERRAMENTO no Holyrics). Só a equipa da Assistência Social e a administração.
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerArteSocial } from '@/lib/acaosocial-acesso'
import { cultosParaPublicar } from '@/lib/encerramento-artes'
import DivulgarSocialClient from './DivulgarSocialClient'

export const dynamic = 'force-dynamic'

export default async function AcaoSocialDivulgarPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerArteSocial(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a equipa da Assistência Social e a administração fazem esta arte.')}`)
    const cultos = await cultosParaPublicar(sessao.tenantId, 'ASSISTENCIA')
    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-5 px-4 pt-20 pb-24 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Divulgar a Assistência Social</h1>
                    <p className="text-[16px] a-suave">Uma arte para o telão com um título, um texto e um apelo. Descarregue-a ou publique-a num culto.</p>
                </header>
                <DivulgarSocialClient cultos={cultos} />
            </main>
        </div>
    )
}

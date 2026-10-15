// Rotina de um culto: a ordem dos momentos e quem fica com cada um.
// Todos os membros veem; os administradores e a Diaconia alteram.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { dadosDaRotina } from '@/lib/rotina-culto-dados'
import { quandoPorExtenso } from '@/lib/rotina-culto'
import BlocoData from '@/components/app/BlocoData'
import RotinaDoCulto from '@/components/pregacao/RotinaDoCulto'

export const dynamic = 'force-dynamic'

export default async function RotinaDoCultoPage(props: { params: Promise<{ eventoId: string }> }) {
    const { eventoId } = await props.params
    const sessao = await getSessionData()
    if (!sessao) redirect(`/membros/login?volta=/pregacao/culto/${eventoId}`)
    const dados = Number.isInteger(Number(eventoId)) ? await dadosDaRotina(sessao, Number(eventoId)) : null
    if (!dados) redirect('/pregacao')
    const { evento } = dados

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/pregacao" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold no-print" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Rotina dos cultos
                </Link>

                <div className="flex items-stretch gap-3">
                    <BlocoData iso={evento.data} />
                    <div className="a-card flex min-w-0 flex-1 flex-col justify-center px-4 py-3" style={{ background: 'var(--a-destaque-suave)', borderColor: 'transparent' }}>
                        <p className="text-[15px] font-semibold a-suave">Rotina do culto{evento.congregacao ? ` · ${evento.congregacao.nome}` : ''}</p>
                        <h1 className="text-[22px] font-bold leading-tight">{evento.nome}</h1>
                        <p className="text-[15px] font-semibold a-suave">{quandoPorExtenso(evento.data)}</p>
                    </div>
                </div>

                <RotinaDoCulto dados={dados} />
            </main>
        </div>
    )
}

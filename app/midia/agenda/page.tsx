// Agenda para a Mídia: a "Programação da semana" com fotos (editável), a imagem para o telão, a das redes sociais e a
// versão para imprimir. O ecrã é todo um componente de cliente (components/midia/AgendaDivulgarClient.tsx), pensado
// para o telemóvel: separadores, setas para mudar de semana/mês e uma barra fixa com Descarregar e Partilhar.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { segundaDaSemana } from '@/lib/agenda'
import { TEMAS_AGENDA } from '@/lib/agenda-temas'
import AgendaDivulgarClient from '@/components/midia/AgendaDivulgarClient'

export const dynamic = 'force-dynamic'

export default async function AgendaMidia({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração fazem a agenda.')}`)
    const q = await searchParams
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const casas = await getTenantClient(sessao.tenantId).congregacao.findMany({ select: { id: true, nome: true, endereco: true, cidade: true }, orderBy: { nome: 'asc' } })
    // A morada de cada casa, para o rodapé da imagem ('' = a primeira)
    const moradas: Record<string, string> = {}
    for (const x of casas) moradas[String(x.id)] = [x.endereco, x.cidade].map((p) => p?.trim()).filter(Boolean).join(' · ')
    if (casas[0]) moradas[''] = moradas[String(casas[0].id)]
    const c = Number(q.c) || null

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl space-y-5 px-4 pt-20 pb-56 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Agenda para divulgar</h1>
                    <p className="text-[16px] a-suave">Os eventos vêm da Agenda da igreja. Mude lá o que estiver errado e volte aqui.</p>
                    <Link href="/midia/divulgacao" className="a-foco mt-2 inline-flex min-h-[44px] items-center text-[16px] font-semibold underline">Artes de um culto (oração, boas-vindas, oferta, Palavra) →</Link>
                </header>
                <AgendaDivulgarClient
                    hoje={hoje} segundaHoje={segundaDaSemana(hoje)} c={c}
                    congregacoes={casas.map((x) => ({ id: x.id, nome: x.nome }))}
                    temas={TEMAS_AGENDA.map((t) => ({ id: t.id, nome: t.nome, amostra: t.amostra }))}
                    moradas={moradas}
                />
            </main>
        </div>
    )
}

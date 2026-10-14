// Alterar as musicas de um culto (lider do louvor). Com o Holyrics ligado na
// igreja, tambem enviar a setlist para o Holyrics.
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { dadosDaEscala } from '@/lib/ministerios-app'
import { modulosAtivosDaIgreja } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import AlterarMusicas from '@/components/app/AlterarMusicas'
import BotoesHolyrics from '@/components/app/BotoesHolyrics'

export const dynamic = 'force-dynamic'

export default async function AlterarMusicasPage(props: {
    params: Promise<{ eventoId: string }>
    searchParams: Promise<{ equipa?: string }>
}) {
    const { eventoId } = await props.params
    const { equipa } = await props.searchParams
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')

    const dados = await dadosDaEscala(sessao, Number(eventoId), Number(equipa))
    if (!dados) redirect('/escalas')
    if (!dados.gereMusicas) redirect(`/escalas/culto/${eventoId}?equipa=${equipa}`)

    const [ativos, igreja] = await Promise.all([
        modulosAtivosDaIgreja(),
        getTenantClient(sessao.tenantId).tenant.findUnique({ where: { id: sessao.tenantId }, select: { holyrics_url: true, holyrics_token: true } }),
    ])
    const holyrics = ativos.includes(MODULOS.HOLYRICS) && igreja?.holyrics_url && igreja.holyrics_token
        ? { url: igreja.holyrics_url, token: igreja.holyrics_token }
        : null
    const musicas = dados.musicas.map((m) => ({ musicaId: m.musicaId, titulo: m.titulo, artista: m.artista, holyricsId: m.holyricsId }))

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <AlterarMusicas dados={dados} />
                {holyrics && (
                    <BotoesHolyrics url={holyrics.url} token={holyrics.token} musicas={musicas}
                        podeSincronizar={isAdmin(sessao.role)} />
                )}
            </main>
        </div>
    )
}

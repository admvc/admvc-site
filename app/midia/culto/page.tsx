// Culto no Holyrics: as musicas do culto de hoje (ou do proximo) para a lista
// do Holyrics, num clique. Para o computador da midia (guardar nos favoritos).
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeUsarHolyrics } from '@/lib/louvor-permissoes'
import CultoNoHolyrics, { type CultoParaHolyrics } from '@/components/app/CultoNoHolyrics'

export const dynamic = 'force-dynamic'

export default async function CultoNoHolyricsPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeUsarHolyrics(sessao))) redirect('/membros/dashboard')

    const db = getTenantClient(sessao.tenantId)
    // Um culto das 19h continua a ser "o de hoje" ate de madrugada
    const desde = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const [igreja, eventos] = await Promise.all([
        db.tenant.findUnique({ where: { id: sessao.tenantId }, select: { holyrics_url: true, holyrics_token: true } }),
        db.evento.findMany({
            where: { data: { gte: desde }, repertorio: { some: {} } },
            orderBy: { data: 'asc' },
            take: 5,
            select: {
                id: true, nome: true, data: true,
                repertorio: {
                    orderBy: { ordem: 'asc' },
                    select: { musica: { select: { id: true, titulo: true, artista: true, holyrics_id: true } } },
                },
            },
        }),
    ])

    const cultos: CultoParaHolyrics[] = eventos.map((e) => ({
        id: e.id,
        nome: e.nome,
        data: e.data.toISOString(),
        musicas: e.repertorio.map((r) => ({
            musicaId: r.musica.id, titulo: r.musica.titulo, artista: r.musica.artista, holyricsId: r.musica.holyrics_id,
        })),
    }))
    const ligado = igreja?.holyrics_url && igreja.holyrics_token

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md space-y-4 px-4 pt-20 pb-28 md:pt-8">
                <div className="space-y-1">
                    <h1 className="text-[28px] font-bold leading-tight">Culto no Holyrics</h1>
                    <p className="text-[17px] a-suave">As músicas do culto vão para a lista do Holyrics.</p>
                </div>

                {!ligado ? (
                    <div className="a-card space-y-2 p-6 text-center">
                        <p className="text-[18px] font-semibold">O Holyrics ainda não está ligado</p>
                        <p className="text-[16px] a-suave">
                            {isAdmin(sessao.role)
                                ? <>Ponha o endereço e o token em <Link href="/admin/midia" className="underline">Administração → Mídia</Link>.</>
                                : 'Peça ao administrador para pôr o endereço e o token do Holyrics.'}
                        </p>
                    </div>
                ) : cultos.length === 0 ? (
                    <div className="a-card space-y-2 p-6 text-center">
                        <p className="text-[18px] font-semibold">Ainda não há músicas</p>
                        <p className="text-[16px] a-suave">Nenhum culto de hoje em diante tem músicas escolhidas.</p>
                    </div>
                ) : (
                    <CultoNoHolyrics url={igreja.holyrics_url!} token={igreja.holyrics_token!} cultos={cultos} />
                )}
            </main>
        </div>
    )
}

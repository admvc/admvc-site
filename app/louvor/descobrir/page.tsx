// Descobrir músicas: as mais tocadas na igreja e as populares no CSDB em português.
// Vê quem vê o repertório; acrescenta quem o gere.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirRepertorio, podeVerRepertorio } from '@/lib/louvor-permissoes'
import { csdbConfigurado, popularesCsdb } from '@/lib/csdb'
import { desdeMeses, jaNaLista, maisTocadas } from '@/lib/setlist-descobrir'
import { formatarDuracao } from '@/lib/csdb-dados'
import AcrescentarDoCsdb from '@/components/louvor/AcrescentarDoCsdb'

export const dynamic = 'force-dynamic'

export default async function DescobrirPage(props: { searchParams: Promise<{ meses?: string }> }) {
    const { meses: m } = await props.searchParams
    const meses = m === '12' ? 12 : 6
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const [podeVer, gere] = await Promise.all([podeVerRepertorio(sessao), podeGerirRepertorio(sessao)])
    if (!podeVer) redirect('/membros/dashboard')

    const db = getTenantClient(sessao.tenantId)
    const agora = new Date()
    const [execucoes, existentes] = await Promise.all([
        db.repertorioEvento.findMany({
            where: { evento: { data: { gte: desdeMeses(agora, meses), lte: agora } } },
            select: { musica_id: true, evento: { select: { data: true } }, musica: { select: { titulo: true, artista: true, tom: true, ano: true } } },
        }),
        db.musica.findMany({ select: { id: true, titulo: true, titulo_norm: true, csdb_track_id: true } }),
    ])
    const top = maisTocadas(execucoes.map((e) => ({
        musicaId: e.musica_id, titulo: e.musica.titulo, artista: e.musica.artista, tom: e.musica.tom, ano: e.musica.ano, data: e.evento.data,
    })), 15)

    let populares: Awaited<ReturnType<typeof popularesCsdb>> = []
    let erroCsdb: string | null = null
    if (!csdbConfigurado()) erroCsdb = 'O CSDB ainda não está ligado neste portal.'
    else {
        try { populares = await popularesCsdb(sessao.tenantId) } catch (e) { erroCsdb = e instanceof Error ? e.message : 'Não foi possível falar com o CSDB.' }
    }

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8 space-y-6">
                <header className="space-y-1">
                    <Link href="/louvor/musicas" className="a-foco inline-flex min-h-[44px] items-center gap-1 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                        <ChevronLeft size={18} aria-hidden /> Repertório
                    </Link>
                    <h1 className="text-[24px] font-bold leading-tight">Descobrir músicas</h1>
                </header>

                <section aria-labelledby="mais-tocadas" className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 id="mais-tocadas" className="text-[19px] font-bold">Mais tocadas na igreja</h2>
                        <div className="flex gap-2" role="group" aria-label="Período">
                            {[6, 12].map((n) => (
                                <Link key={n} href={`/louvor/descobrir?meses=${n}`} aria-current={meses === n ? 'true' : undefined}
                                    className="a-foco inline-flex min-h-[44px] items-center rounded-full border px-4 text-[15px] font-semibold"
                                    style={meses === n ? { background: 'var(--a-destaque)', color: '#fff', borderColor: 'var(--a-destaque)' } : { borderColor: 'var(--a-borda)' }}>
                                    {n} meses
                                </Link>
                            ))}
                        </div>
                    </div>
                    {top.length === 0 ? (
                        <p className="a-card p-4 text-[16px] a-suave">Ainda não há músicas tocadas nos últimos {meses} meses.</p>
                    ) : (
                        <ol className="a-card a-divide">
                            {top.map((t, i) => (
                                <li key={t.musicaId}>
                                    <Link href={`/louvor/musicas/${t.musicaId}`} className="a-foco flex min-h-[64px] items-center gap-3 px-4 py-3">
                                        <span className="w-6 shrink-0 text-center text-[17px] font-bold a-suave">{i + 1}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[17px] font-semibold">{t.titulo}</span>
                                            <span className="block truncate text-[15px] a-suave">{[t.artista, t.ano].filter(Boolean).join(' · ') || 'Sem artista'}</span>
                                        </span>
                                        <span className="shrink-0 text-[15px] font-semibold">{t.vezes}×</span>
                                        <ChevronRight size={20} className="a-suave" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                <section aria-labelledby="populares" className="space-y-3">
                    <div>
                        <h2 id="populares" className="text-[19px] font-bold">Populares no CSDB em português</h2>
                        <p className="text-[14px] a-suave">Dados do CSDB (banco de músicas cristãs).{!gere && ' Só o líder do louvor acrescenta músicas.'}</p>
                    </div>
                    {erroCsdb ? (
                        <p role="alert" className="a-card p-4 text-[16px]" style={{ color: 'var(--a-erro)' }}>{erroCsdb}</p>
                    ) : populares.length === 0 ? (
                        <p className="a-card p-4 text-[16px] a-suave">O CSDB não devolveu músicas agora.</p>
                    ) : (
                        <ul className="a-card a-divide">
                            {populares.map((f) => {
                                const existente = jaNaLista(existentes, f)
                                const info = [f.artista, f.ano, f.tom, f.bpm ? `${f.bpm} bpm` : null, formatarDuracao(f.duracao_seg)].filter(Boolean).join(' · ')
                                return (
                                    <li key={f.id} className="space-y-2 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-[17px] font-semibold">{f.titulo}</p>
                                            {info && <p className="truncate text-[15px] a-suave">{info}</p>}
                                        </div>
                                        {existente ? (
                                            <Link href={`/louvor/musicas/${existente.id}`} className="a-foco inline-flex min-h-[44px] items-center text-[15px] font-semibold underline">Já está na lista da igreja</Link>
                                        ) : gere ? (
                                            <AcrescentarDoCsdb trackId={f.id} />
                                        ) : null}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    )
}

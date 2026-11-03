// Fotos dos cultos para a Mídia: álbuns (publicar/esconder/apagar), etiquetas, pedidos para retirar e o espaço usado.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import prisma from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { espacoUsado, garantirEtiquetas } from '@/lib/fotos-gestao'
import { albunsParaGestao, fotosComEtiqueta, pedidosParaGestao } from '@/lib/fotos-midia'
import { avisoDeEspaco, formatarBytes, LIMITES_FOTOS, nivelDeEspaco, percentagemUsada } from '@/lib/fotos-limites'
import ListaAlbuns from './ListaAlbuns'
import GestaoEtiquetas from './GestaoEtiquetas'
import Pedidos from './Pedidos'
import GradeFotos from './GradeFotos'

export const dynamic = 'force-dynamic'

type Aba = 'albuns' | 'etiquetas' | 'pedidos'

export default async function MidiaFotos({ searchParams }: { searchParams: Promise<{ aba?: string; etiqueta?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração gerem as fotos.')}`)
    const q = await searchParams
    const aba: Aba = q.aba === 'etiquetas' || q.aba === 'pedidos' ? q.aba : 'albuns'
    const tenantId = sessao.tenantId

    const [etiquetas, albuns, espaco, pedidos] = await Promise.all([
        garantirEtiquetas(tenantId),
        albunsParaGestao(tenantId),
        espacoUsado(tenantId),
        pedidosParaGestao(tenantId),
    ])
    const etiquetaId = Number(q.etiqueta) || null
    const etiquetaAtual = etiquetas.find((e) => e.id === etiquetaId) ?? null
    const fotosDaEtiqueta = aba === 'etiquetas' && etiquetaAtual ? await fotosComEtiqueta(tenantId, etiquetaAtual.id) : []
    const contagens = new Map<number, number>()
    if (aba === 'etiquetas') {
        // quantas fotos tem cada etiqueta
        const r = await prisma.fotoEtiqueta.groupBy({ by: ['etiqueta_id'], where: { etiqueta: { tenant_id: tenantId } }, _count: { _all: true } })
        for (const x of r) contagens.set(x.etiqueta_id, x._count._all)
    }

    const nivel = nivelDeEspaco(espaco.bytes)
    const pct = percentagemUsada(espaco.bytes)
    const aviso = avisoDeEspaco(espaco.bytes)
    const corBarra = nivel === 'cheio' ? 'var(--a-erro, #dc2626)' : nivel === 'aviso' ? '#d97706' : 'var(--a-destaque)'

    const abas: { id: Aba; texto: string; n?: number }[] = [
        { id: 'albuns', texto: 'Álbuns', n: albuns.length },
        { id: 'etiquetas', texto: 'Etiquetas' },
        { id: 'pedidos', texto: 'Pedidos', n: pedidos.pendentes.length },
    ]

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Fotos dos cultos</h1>
                    <p className="text-[16px] a-suave">Os álbuns que aparecem em <Link href="/fotos" className="underline" target="_blank">/fotos</Link>: publique, etiquete e responda a pedidos.</p>
                </header>

                <section className="a-card space-y-2 p-4" aria-label="Espaço usado">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <p className="text-[17px] font-semibold">Espaço usado: {formatarBytes(espaco.bytes)} de {formatarBytes(LIMITES_FOTOS.totalBytes)}</p>
                        <p className="text-[14px] a-suave">{espaco.fotos} {espaco.fotos === 1 ? 'foto' : 'fotos'} · máx. {LIMITES_FOTOS.fotosPorAlbum} fotos e {formatarBytes(LIMITES_FOTOS.bytesPorAlbum)} por álbum</p>
                    </div>
                    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Espaço usado"
                        className="h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--a-borda)' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(pct, espaco.bytes > 0 ? 1.5 : 0)}%`, background: corBarra }} />
                    </div>
                    {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: nivel === 'cheio' ? 'var(--a-erro, #dc2626)' : '#b45309' }}>{aviso}</p>}
                </section>

                <nav aria-label="Secções" className="flex gap-2 overflow-x-auto pb-1">
                    {abas.map((a) => (
                        <Link key={a.id} href={`/midia/fotos?aba=${a.id}`} aria-current={a.id === aba ? 'page' : undefined}
                            className="flex min-h-[48px] shrink-0 items-center gap-2 rounded-[14px] border px-4 text-[15px] font-semibold aria-[current=page]:ring-2 aria-[current=page]:ring-[var(--a-destaque)]"
                            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                            {a.texto}
                            {a.n !== undefined && a.n > 0 && (
                                <span className="rounded-full px-2 text-[13px]" style={a.id === 'pedidos' ? { background: '#dc2626', color: '#fff' } : { background: 'var(--a-borda)' }}>{a.n}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {aba === 'albuns' && <ListaAlbuns albuns={albuns} />}

                {aba === 'etiquetas' && (
                    <>
                        <GestaoEtiquetas
                            etiquetas={etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor, icone: e.icone, esconde: e.esconde, fotos: contagens.get(e.id) ?? 0 }))}
                            atual={etiquetaAtual?.id ?? null} />
                        {etiquetaAtual && (
                            <section className="space-y-3" aria-label={`Fotos com a etiqueta ${etiquetaAtual.nome}`}>
                                <h2 className="text-[19px] font-bold">Todas as fotos com &quot;{etiquetaAtual.nome}&quot; ({fotosDaEtiqueta.length})</h2>
                                {fotosDaEtiqueta.length === 0
                                    ? <p className="a-suave">Ainda não há fotos com esta etiqueta. Marque-as dentro de cada álbum.</p>
                                    : <GradeFotos fotos={fotosDaEtiqueta} />}
                            </section>
                        )}
                    </>
                )}

                {aba === 'pedidos' && <Pedidos pendentes={pedidos.pendentes} recentes={pedidos.recentes} />}
            </main>
        </div>
    )
}

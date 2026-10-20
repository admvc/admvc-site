// Divulgação do culto para a Mídia: escolher o culto, o estilo e as cores, marcar as artes do telão e das redes,
// pôr a foto do preletor, ver, copiar os textos e descarregar.
// O que se guarda é a receita; as imagens geram-se na hora (ver /api/divulgacao/imagem).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { diaCurto, hora } from '@/components/app/datas'
import { normalizarReceita, receitaVazia } from '@/lib/divulgacao-kit'
import DivulgacaoKit from '@/components/app/DivulgacaoKit'

export const dynamic = 'force-dynamic'

// Palpite do "oração por…" pelo nome do evento (Culto de Jovens → Jovens)
const PALPITES: [RegExp, string][] = [[/jovens/i, 'jovens'], [/mulher/i, 'mulheres'], [/homens|varões/i, 'homens'], [/crian/i, 'criancas'], [/fam[ií]lia/i, 'familia']]

export default async function DivulgacaoCulto({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração fazem a divulgação.')}`)
    const q = await searchParams
    const db = getTenantClient(sessao.tenantId)

    // Cultos de ontem para a frente (as horas estão em Lisboa "escrita" em UTC)
    const desde = new Date(agoraLisboa().getTime() - 36 * 3600 * 1000)
    const ate = new Date(desde.getTime() + 60 * 86400000)
    const proximos = await db.evento.findMany({
        where: { data: { gte: desde, lt: ate } },
        orderBy: { data: 'asc' },
        take: 40,
        select: { id: true, nome: true, data: true },
    })
    const pedido = Number(q.evento) || null
    const escolhido = pedido
        ? proximos.find((e) => e.id === pedido) ?? await db.evento.findFirst({ where: { id: pedido }, select: { id: true, nome: true, data: true } })
        : proximos[0] ?? null
    const lista = escolhido && !proximos.some((e) => e.id === escolhido.id) ? [escolhido, ...proximos] : proximos

    let conteudo: React.ReactNode = <p className="a-suave">Não há cultos marcados nos próximos dois meses. Marque-os na Agenda da igreja e volte aqui.</p>
    if (escolhido) {
        const [kit, sermao, contas, casa] = await Promise.all([
            db.kitDivulgacao.findFirst({ where: { evento_id: escolhido.id }, select: { receita: true } }),
            db.sermao.findFirst({
                where: { evento_id: escolhido.id },
                orderBy: { created_at: 'desc' },
                select: { titulo: true, referencias_biblicas: true, pregador: { select: { first_name: true, last_name: true } } },
            }),
            db.contaBancaria.findMany({ where: { ativa: true, iban: { not: null } }, orderBy: { nome: 'asc' }, select: { nome: true, iban: true } }),
            db.congregacao.findFirst({ orderBy: { id: 'asc' }, select: { cidade: true } }),
        ])
        const ibans = contas.filter((c): c is { nome: string; iban: string } => !!c.iban)

        let inicial = receitaVazia()
        if (kit) inicial = normalizarReceita(kit.receita)
        else {
            const refs = Array.isArray(sermao?.referencias_biblicas) ? (sermao!.referencias_biblicas as { livro?: string; capitulo?: number; versiculo_inicio?: number }[]) : []
            const r0 = refs[0]
            inicial = {
                ...inicial,
                alvo: PALPITES.find(([re]) => re.test(escolhido.nome))?.[1] ?? inicial.alvo,
                tema: sermao?.titulo ?? '',
                ref: r0?.livro ? `${r0.livro} ${r0.capitulo ?? ''}${r0.versiculo_inicio ? `:${r0.versiculo_inicio}` : ''}`.trim() : '',
                preletor: sermao ? `${sermao.pregador.first_name} ${sermao.pregador.last_name}`.trim() : '',
                iban: ibans[0]?.iban ?? '',
            }
        }
        conteudo = (
            <DivulgacaoKit key={escolhido.id} eventoId={escolhido.id} eventoNome={escolhido.nome} dataISO={escolhido.data.toISOString()}
                hojeISO={agoraLisboa().toISOString()} local={casa?.cidade ?? ''} receitaInicial={inicial} guardado={!!kit} contas={ibans} />
        )
    }

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Divulgação do culto</h1>
                    <p className="text-[16px] a-suave">Escolha o culto, o estilo e as cores, marque as artes e descarregue. Fica tudo guardado aqui.</p>
                </header>

                {lista.length > 0 && (
                    <nav aria-label="Cultos" className="flex flex-wrap gap-2">
                        {lista.map((e) => (
                            <Link key={e.id} href={`/midia/divulgacao?evento=${e.id}`} aria-current={e.id === escolhido?.id ? 'page' : undefined}
                                className="flex min-h-[48px] items-center rounded-[14px] border px-3 text-[15px] aria-[current=page]:ring-2 aria-[current=page]:ring-[var(--a-acento,#f5a524)]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                {diaCurto(e.data.toISOString())} · {hora(e.data.toISOString())} · {e.nome}
                            </Link>
                        ))}
                    </nav>
                )}

                {conteudo}
            </main>
        </div>
    )
}

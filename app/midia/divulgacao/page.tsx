// Divulgação do culto para a Mídia: escolher o culto, o estilo e as cores, marcar as artes do telão e das redes,
// pôr a foto do preletor, ver, copiar os textos e descarregar.
// O que se guarda é a receita; as imagens geram-se na hora (ver /api/divulgacao/imagem).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import prisma, { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { diaCurto, hora } from '@/components/app/datas'
import { lerAba, normalizarReceita, receitaVazia } from '@/lib/divulgacao-kit'
import { redesDoEstilo } from '@/lib/divulgacao'
import { padraoDoCulto } from '@/lib/divulgacao-padroes'
import DivulgacaoKit from '@/components/app/DivulgacaoKit'
import SeletorCulto from '@/components/app/SeletorCulto'
import { quemPostou } from '@/lib/rotina-alertas'

export const dynamic = 'force-dynamic'

// Palpite do "oração por…" pelo nome do evento (Culto de Jovens → Jovens)
const PALPITES: [RegExp, string][] = [[/jovens/i, 'jovens'], [/mulher/i, 'mulheres'], [/homens|varões/i, 'homens'], [/crian/i, 'criancas'], [/fam[ií]lia/i, 'familia']]

export default async function DivulgacaoCulto({ searchParams }: { searchParams: Promise<{ evento?: string; aba?: string; passo?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração fazem a divulgação.')}`)
    const q = await searchParams
    const aba = lerAba(q.aba)
    // passo do assistente: ?passo=N; com ?aba=… sem passo, o Resumo (5); senão decide o kit (guardado → 5, novo → 1)
    const passoPedido = Number(q.passo)
    const passoInicial = Number.isInteger(passoPedido) && passoPedido >= 1 && passoPedido <= 5 ? passoPedido : q.aba && lerAba(q.aba) === q.aba ? 5 : null
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
    const inicioDeHoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const pedido = Number(q.evento) || null
    const escolhido = pedido
        ? proximos.find((e) => e.id === pedido) ?? await db.evento.findFirst({ where: { id: pedido }, select: { id: true, nome: true, data: true } })
        : proximos.find((e) => e.data >= inicioDeHoje) ?? proximos[0] ?? null   // por omissão: o de hoje, senão o próximo
    const lista = escolhido && !proximos.some((e) => e.id === escolhido.id) ? [escolhido, ...proximos] : proximos
    // Faixa com o escolhido + os próximos; os restantes ficam na lista "Outro culto…"
    const futuros = lista.filter((e) => e.data >= inicioDeHoje)
    const faixa = [escolhido, ...futuros.filter((e) => e.id !== escolhido?.id)].filter((e): e is NonNullable<typeof e> => !!e).slice(0, 6)
    const restantes = lista.filter((e) => !faixa.some((f) => f.id === e.id))

    // Estado do culto nas redes: por publicar / por postar / postado por X (Rotina do culto)
    let estadoRedes = ''
    if (escolhido) {
        const [k, postou] = await Promise.all([db.kitDivulgacao.findFirst({ where: { evento_id: escolhido.id }, select: { publicado_em: true } }), quemPostou(sessao.tenantId, [escolhido.id])])
        const p = postou.get(escolhido.id)
        estadoRedes = !k ? 'Artes por fazer' : !k.publicado_em ? 'Artes por publicar' : p ? `Postado por ${p.nome}` : 'Por postar nas redes'
    }

    let conteudo: React.ReactNode = <p className="a-suave">Não há cultos marcados nos próximos dois meses. Marque-os na Agenda da igreja e volte aqui.</p>
    if (escolhido) {
        const [kit, sermao, contas, casa, igreja] = await Promise.all([
            db.kitDivulgacao.findFirst({ where: { evento_id: escolhido.id }, select: { receita: true, publicado: true, publicado_em: true, publicado_receita: true } }),
            db.sermao.findFirst({
                where: { evento_id: escolhido.id },
                orderBy: { created_at: 'desc' },
                select: { titulo: true, referencias_biblicas: true, pregador: { select: { first_name: true, last_name: true } } },
            }),
            db.contaBancaria.findMany({ where: { ativa: true, iban: { not: null } }, orderBy: { nome: 'asc' }, select: { nome: true, iban: true } }),
            db.congregacao.findFirst({ orderBy: { id: 'asc' }, select: { cidade: true } }),
            prisma.tenant.findUnique({ where: { id: sessao.tenantId }, select: { divulgacao_padrao: true } }),
        ])
        const padrao = igreja?.divulgacao_padrao && typeof igreja.divulgacao_padrao === 'object' ? igreja.divulgacao_padrao as Record<string, unknown> : null
        const ibans = contas.filter((c): c is { nome: string; iban: string } => !!c.iban)

        let inicial = receitaVazia()
        let padraoAuto: string | null = null
        if (kit) inicial = normalizarReceita(kit.receita)
        else {
            const refs = Array.isArray(sermao?.referencias_biblicas) ? (sermao!.referencias_biblicas as { livro?: string; capitulo?: number; versiculo_inicio?: number }[]) : []
            const r0 = refs[0]
            if (padrao) inicial = normalizarReceita({ ...inicial, ...padrao })   // estilo, cores, redes e fundo da igreja
            // sem escolha guardada: o nome do culto sugere o padrão (Jovens, Mulheres, Santa Ceia…); o culto comum fica com o padrão da igreja
            const sugerido = padraoDoCulto(escolhido.nome)
            if (sugerido) { inicial = { ...inicial, estilo: sugerido.estilo, paleta: sugerido.paleta, estilosSeparados: false, modeloRedes: redesDoEstilo(sugerido.estilo) }; padraoAuto = sugerido.id }
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
                hojeISO={agoraLisboa().toISOString()} local={casa?.cidade ?? ''} receitaInicial={inicial} guardado={!!kit} contas={ibans} padrao={padrao ? JSON.stringify(normalizarReceita({ ...receitaVazia(), ...padrao })) : ''}
                publicadoEm={kit?.publicado && kit.publicado_em ? kit.publicado_em.toISOString() : null}
                publicadoJson={kit?.publicado && kit.publicado_receita ? JSON.stringify(normalizarReceita(kit.publicado_receita)) : ''}
                abaInicial={aba} passoInicial={passoInicial} padraoAuto={padraoAuto} />
        )
    }

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-6xl space-y-6 px-4 pt-20 pb-6 md:pt-8 md:pb-10">
                <header>
                    <h1 className="text-[24px] font-bold">Divulgação do culto</h1>
                    <p className="text-[16px] a-suave">Escolha o culto, ajuste as artes e veja o resultado no cartão "Como vai ficar". Fica tudo guardado aqui.</p>
                    <Link href="/midia/rotina" className="a-foco inline-flex min-h-[44px] items-center text-[16px] font-semibold underline">Rotina do culto (alertas e Holyrics) →</Link>
                    {estadoRedes && <p className="text-[16px]"><strong>Estado:</strong> {estadoRedes}</p>}
                </header>

                {lista.length > 0 && (
                    <nav aria-label="Cultos" className="flex gap-2 overflow-x-auto pb-1">
                        {faixa.map((e) => (
                            <Link key={e.id} href={`/midia/divulgacao?evento=${e.id}${aba === 'telao' ? '' : `&aba=${aba}`}`} aria-current={e.id === escolhido?.id ? 'page' : undefined}
                                className="flex min-h-[56px] shrink-0 flex-col justify-center rounded-[14px] border px-3 text-[15px] leading-tight aria-[current=page]:ring-2 aria-[current=page]:ring-[var(--a-acento,#f5a524)]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                <span className="font-semibold">{diaCurto(e.data.toISOString())} · {hora(e.data.toISOString())}</span>
                                <span className="max-w-[12rem] truncate a-suave">{e.nome}</span>
                            </Link>
                        ))}
                        <SeletorCulto opcoes={restantes.map((e) => ({ id: e.id, texto: `${diaCurto(e.data.toISOString())} · ${e.nome}` }))} atual={escolhido?.id ?? null} />
                    </nav>
                )}

                {conteudo}

            </main>
        </div>
    )
}

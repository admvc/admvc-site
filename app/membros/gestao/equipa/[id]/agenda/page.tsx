// Agenda de uma equipa: os próximos encontros (reuniões, orações, ensaios…) e o relatório do mês
// (o que se fez, quem esteve e a foto). Vê a equipa e a administração; marca quem gere a equipa.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { lerMes, limitesDoMes, mesVizinho, nomeDoMes, TIPOS_AGENDA_DEPTO, type TipoAgendaDepto } from '@/lib/agenda'
import { diaPorExtenso, hora } from '@/components/app/datas'
import { AcoesEncontro, FormEncontro, type Encontro, type PessoaEquipa } from '@/components/app/AgendaEquipaClient'
import Imprimir from '@/components/app/Imprimir'

export const dynamic = 'force-dynamic'

export default async function AgendaEquipa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const deptoId = Number((await params).id)
    if (!Number.isInteger(deptoId)) redirect('/membros/dashboard')
    const db = getTenantClient(sessao.tenantId)
    const depto = await db.departamento.findUnique({
        where: { id: deptoId },
        select: {
            id: true, nome: true, lider_id: true,
            lider: { select: { id: true, first_name: true, last_name: true } },
            integrantes: { select: { membro_id: true, membro: { select: { id: true, first_name: true, last_name: true } } } },
        },
    })
    if (!depto) redirect('/membros/dashboard')
    const gere = await podeGerirEscalasDoDepartamento(sessao, deptoId)
    if (!gere && !isAdmin(sessao.role) && depto.lider_id !== sessao.membroId && !depto.integrantes.some((i) => i.membro_id === sessao.membroId)) {
        redirect(`/membros/dashboard?error=${encodeURIComponent('Só quem é desta equipa vê a agenda dela.')}`)
    }

    const hojeTxt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    // "Agora" na convenção das horas (hora de Lisboa escrita em UTC)
    const agoraLisboa = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' }).format(new Date()).replace(' ', 'T') + ':00Z')
    const mes = lerMes((await searchParams).mes, hojeTxt)
    const { inicio, fim } = limitesDoMes(mes)
    const campos = {
        id: true, titulo: true, tipo: true, inicio: true, fim: true, local: true, descricao: true, registo: true, presentes: true, foto_url: true,
        presentes_membros: { select: { id: true, first_name: true, last_name: true } },
    } as const
    const [proximos, doMes] = await Promise.all([
        db.agendaDepartamento.findMany({ where: { departamento_id: deptoId, inicio: { gte: agoraLisboa } }, orderBy: { inicio: 'asc' }, take: 30, select: campos }),
        db.agendaDepartamento.findMany({ where: { departamento_id: deptoId, inicio: { gte: inicio, lt: fim } }, orderBy: { inicio: 'asc' }, select: campos }),
    ])
    const nomeDe = (m: { first_name: string; last_name: string }) => `${m.first_name} ${m.last_name}`.replace(/\s+/g, ' ').trim()
    // A equipa (integrantes + líder), por ordem alfabética: é a lista para marcar quem esteve
    const pessoas = new Map<number, string>()
    for (const i of depto.integrantes) if (i.membro) pessoas.set(i.membro.id, nomeDe(i.membro))
    if (depto.lider) pessoas.set(depto.lider.id, nomeDe(depto.lider))
    const equipa: PessoaEquipa[] = [...pessoas].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    const paraCliente = ({ presentes_membros, ...e }: (typeof proximos)[number]): Encontro => ({
        ...e, inicio: e.inicio.toISOString(), fim: e.fim?.toISOString() ?? null, presentesIds: presentes_membros.map((m) => m.id),
    })
    const tipo = (t: string) => TIPOS_AGENDA_DEPTO[t as TipoAgendaDepto] ?? t
    const passados = doMes.filter((e) => e.inicio < agoraLisboa)
    const totalPresentes = passados.reduce((s, e) => s + (e.presentes ?? 0), 0)
    // Presenças de cada pessoa nos encontros do mês em que se marcou quem esteve
    const comLista = passados.filter((e) => e.presentes_membros.length > 0)
    const presencas = equipa.map((p) => ({ ...p, n: comLista.filter((e) => e.presentes_membros.some((m) => m.id === p.id)).length }))
        .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'))

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <Link href={`/membros/gestao/equipa/${deptoId}`} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] a-suave print:hidden">
                    <ArrowLeft size={18} aria-hidden /> Pessoas da equipa
                </Link>
                <header>
                    <h1 className="text-[24px] font-bold leading-tight">Agenda · {depto.nome}</h1>
                    <p className="text-[16px] a-suave">Reuniões, orações, ensaios… só a equipa e a administração veem.</p>
                </header>

                <section className="space-y-3 print:hidden" aria-labelledby="proximos">
                    <h2 id="proximos" className="text-[19px] font-bold">Próximos</h2>
                    {gere && <FormEncontro deptoId={deptoId} />}
                    {proximos.length === 0 ? <p className="a-card p-4 text-[16px] a-suave">Nada marcado.</p> : (
                        <ul className="space-y-3">
                            {proximos.map((e) => (
                                <li key={e.id} className="a-card space-y-1 px-4 py-3">
                                    <p className="text-[17px] font-semibold">{e.titulo}</p>
                                    <p className="text-[15px] a-suave">{tipo(e.tipo)} · {diaPorExtenso(e.inicio.toISOString())}, {hora(e.inicio.toISOString())}{e.fim ? `–${hora(e.fim.toISOString())}` : ''}</p>
                                    {e.local && <p className="flex items-center gap-1 text-[15px] a-suave"><MapPin size={15} aria-hidden /> {e.local}</p>}
                                    {e.descricao && <p className="whitespace-pre-wrap text-[15px]">{e.descricao}</p>}
                                    {gere && <AcoesEncontro deptoId={deptoId} e={paraCliente(e)} passado={false} />}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="space-y-3" aria-labelledby="relatorio">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 id="relatorio" className="mr-auto text-[19px] font-bold first-letter:uppercase">Relatório · {nomeDoMes(mes)}</h2>
                        <Link href={`?mes=${mesVizinho(mes, -1)}`} className="a-foco flex h-10 w-10 items-center justify-center rounded-full print:hidden" aria-label="Mês anterior"><ChevronLeft size={20} aria-hidden /></Link>
                        <Link href={`?mes=${mesVizinho(mes, 1)}`} className="a-foco flex h-10 w-10 items-center justify-center rounded-full print:hidden" aria-label="Mês seguinte"><ChevronRight size={20} aria-hidden /></Link>
                        <Imprimir />
                    </div>
                    <p className="text-[15px] a-suave">
                        {passados.length} {passados.length === 1 ? 'encontro' : 'encontros'}
                        {Object.entries(passados.reduce<Record<string, number>>((m, e) => ({ ...m, [tipo(e.tipo)]: (m[tipo(e.tipo)] ?? 0) + 1 }), {})).map(([t, n]) => ` · ${n} ${t.toLowerCase()}`).join('')}
                        {totalPresentes > 0 ? ` · ${totalPresentes} presenças` : ''}
                    </p>
                    {doMes.length === 0 ? <p className="a-card p-4 text-[16px] a-suave">Nenhum encontro neste mês.</p> : (
                        <ul className="space-y-3">
                            {doMes.map((e) => {
                                const passou = e.inicio < agoraLisboa
                                return (
                                    <li key={e.id} className="a-card space-y-1 px-4 py-3 break-inside-avoid">
                                        <p className="text-[16px] font-semibold">{e.inicio.toISOString().slice(8, 10)}/{e.inicio.toISOString().slice(5, 7)} · {e.titulo}</p>
                                        <p className="text-[15px] a-suave">{tipo(e.tipo)} · {hora(e.inicio.toISOString())}{e.presentes != null ? ` · ${e.presentes} presentes` : ''}</p>
                                        {e.registo ? <p className="whitespace-pre-wrap text-[15px]">{e.registo}</p>
                                            : passou && <p className="text-[15px] a-suave">Ainda sem registo.</p>}
                                        {e.presentes_membros.length > 0 && (
                                            <p className="text-[15px]"><span className="font-semibold">Estiveram:</span> {e.presentes_membros.map(nomeDe).sort((a, b) => a.localeCompare(b, 'pt')).join(', ')}</p>
                                        )}
                                        {e.foto_url && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <a href={e.foto_url} target="_blank" rel="noreferrer" className="block pt-1"><img src={e.foto_url} alt={`Foto: ${e.titulo}`} loading="lazy" className="max-h-64 w-full rounded-[14px] object-cover print:max-h-48" /></a>
                                        )}
                                        {gere && passou && <div className="print:hidden"><AcoesEncontro deptoId={deptoId} e={paraCliente(e)} passado equipa={equipa} /></div>}
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                    {comLista.length > 0 && (
                        <div className="a-card space-y-2 px-4 py-3 break-inside-avoid">
                            <h3 className="text-[17px] font-bold">Presenças no mês · {comLista.length} {comLista.length === 1 ? 'encontro com lista' : 'encontros com lista'}</h3>
                            <ul className="grid gap-x-6 gap-y-1 text-[15px] sm:grid-cols-2">
                                {presencas.map((p) => (
                                    <li key={p.id} className="flex items-center justify-between gap-3 border-b py-1" style={{ borderColor: 'var(--a-borda)' }}>
                                        <span className="min-w-0 truncate">{p.nome}</span>
                                        <span className="shrink-0 tabular-nums" style={p.n === 0 ? { color: 'var(--a-erro)' } : undefined}>{p.n}/{comLista.length}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}

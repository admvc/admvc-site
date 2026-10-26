// Agenda de um GRUPO: os próximos encontros (reuniões…, também os criados por regras repetidas) e o relatório do mês
// (o que se fez, quem esteve e a foto). Vê o grupo e a administração; marca quem lidera o grupo.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirGrupo } from '@/lib/agenda-grupos'
import { lerMes, limitesDoMes, mesVizinho, nomeDoMes, TIPOS_AGENDA_DEPTO, type TipoAgendaDepto } from '@/lib/agenda'
import { diaPorExtenso, hora } from '@/components/app/datas'
import { AcoesEncontro, FormEncontro, type Encontro, type PessoaEquipa } from '@/components/app/AgendaEquipaClient'
import Imprimir from '@/components/app/Imprimir'

export const dynamic = 'force-dynamic'

export default async function AgendaGrupo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mes?: string; novo?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const grupoId = Number((await params).id)
    if (!Number.isInteger(grupoId)) redirect('/membros/dashboard')
    const db = getTenantClient(sessao.tenantId)
    const grupo = await db.grupo.findUnique({
        where: { id: grupoId },
        select: {
            id: true, nome: true, dia_semana: true, horario: true, endereco: true, numero: true, bairro: true, cidade: true, latitude: true, longitude: true,
            lideres: { select: { id: true, first_name: true, last_name: true } },
            membros: { select: { id: true, first_name: true, last_name: true } },
        },
    })
    if (!grupo) redirect('/membros/dashboard')
    const gere = await podeGerirGrupo(sessao, grupoId)
    if (!gere && !isAdmin(sessao.role) && !grupo.lideres.some((m) => m.id === sessao.membroId) && !grupo.membros.some((m) => m.id === sessao.membroId)) {
        redirect(`/membros/dashboard?error=${encodeURIComponent('Só quem é deste grupo vê a agenda dele.')}`)
    }

    const quando = [grupo.dia_semana, grupo.horario].map((p) => p?.trim()).filter(Boolean).join(', às ')
    const morada = [[grupo.endereco, grupo.numero].filter(Boolean).join(', '), grupo.bairro, grupo.cidade].map((p) => p?.trim()).filter(Boolean).join(' · ')
    const destino = grupo.latitude != null && grupo.longitude != null ? `${grupo.latitude},${grupo.longitude}` : morada
    const mapa = destino ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}` : null

    const hojeTxt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    // "Agora" na convenção das horas (hora de Lisboa escrita em UTC)
    const agoraLisboa = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' }).format(new Date()).replace(' ', 'T') + ':00Z')
    const sp = await searchParams
    const mes = lerMes(sp.mes, hojeTxt)
    const { inicio, fim } = limitesDoMes(mes)
    const campos = {
        id: true, titulo: true, tipo: true, inicio: true, fim: true, local: true, descricao: true, registo: true, presentes: true, foto_url: true,
        presentes_membros: { select: { id: true, first_name: true, last_name: true } }, cancelado_em: true,
        respostas: { select: { membro_id: true, resposta: true, motivo: true, membro: { select: { first_name: true, last_name: true } } } },
    } as const
    const [proximos, doMes] = await Promise.all([
        db.agendaDepartamento.findMany({ where: { grupo_id: grupoId, inicio: { gte: agoraLisboa } }, orderBy: { inicio: 'asc' }, take: 30, select: campos }),
        db.agendaDepartamento.findMany({ where: { grupo_id: grupoId, inicio: { gte: inicio, lt: fim } }, orderBy: { inicio: 'asc' }, select: campos }),
    ])
    const nomeDe = (m: { first_name: string; last_name: string }) => `${m.first_name} ${m.last_name}`.replace(/\s+/g, ' ').trim()
    // O grupo (membros + líderes), por ordem alfabética: é a lista para marcar quem esteve
    const pessoas = new Map<number, string>()
    for (const m of [...grupo.membros, ...grupo.lideres]) pessoas.set(m.id, nomeDe(m))
    const equipa: PessoaEquipa[] = [...pessoas].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    const paraCliente = ({ presentes_membros, respostas, cancelado_em, ...e }: (typeof proximos)[number]): Encontro => ({
        ...e, inicio: e.inicio.toISOString(), fim: e.fim?.toISOString() ?? null, presentesIds: presentes_membros.map((m) => m.id),
        cancelado: !!cancelado_em, vouIds: respostas.filter((r) => r.resposta === 'VOU').map((r) => r.membro_id),
    })
    // Quem gere (e a administração) vê os nomes; os outros só os números
    const verNomes = gere || isAdmin(sessao.role)
    const respostasDe = (e: (typeof proximos)[number]) => {
        const vou = e.respostas.filter((r) => r.resposta === 'VOU')
        const nao = e.respostas.filter((r) => r.resposta === 'NAO_POSSO')
        if (!vou.length && !nao.length) return null
        return (
            <div className="space-y-0.5 text-[15px]">
                <p><span className="font-semibold">Vou:</span> {vou.length}{verNomes && vou.length > 0 ? ` · ${vou.map((r) => nomeDe(r.membro)).sort((a, b) => a.localeCompare(b, 'pt')).join(', ')}` : ''}</p>
                <p><span className="font-semibold">Não posso:</span> {nao.length}{verNomes && nao.length > 0 ? ` · ${nao.map((r) => nomeDe(r.membro) + (r.motivo ? ` (${r.motivo})` : '')).sort((a, b) => a.localeCompare(b, 'pt')).join(', ')}` : ''}</p>
            </div>
        )
    }
    const tipo = (t: string) => TIPOS_AGENDA_DEPTO[t as TipoAgendaDepto] ?? t
    const passados = doMes.filter((e) => e.inicio < agoraLisboa && !e.cancelado_em)
    const totalPresentes = passados.reduce((s, e) => s + (e.presentes ?? 0), 0)

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <Link href="/membros/dashboard" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] a-suave print:hidden">
                    <ArrowLeft size={18} aria-hidden /> Início
                </Link>
                <header>
                    <h1 className="text-[24px] font-bold leading-tight">Agenda · {grupo.nome}</h1>
                    <p className="text-[16px] a-suave">Reuniões do grupo. Só o grupo e a administração veem.</p>
                    {(quando || morada || grupo.lideres.length > 0) && (
                        <div className="a-card mt-3 space-y-1 p-4 text-[16px]">
                            {quando && <p><span className="font-semibold">Quando:</span> {quando}</p>}
                            {morada && (
                                <p className="flex items-start gap-1"><MapPin size={18} className="mt-0.5 shrink-0 a-suave" aria-hidden />
                                    {mapa ? <a href={mapa} target="_blank" rel="noopener noreferrer" className="a-foco underline" style={{ color: 'var(--a-destaque)' }}>{morada}</a> : morada}
                                </p>
                            )}
                            {grupo.lideres.length > 0 && <p className="a-suave">{grupo.lideres.length === 1 ? 'Líder' : 'Líderes'}: {grupo.lideres.map(nomeDe).join(', ')}</p>}
                        </div>
                    )}
                </header>

                <section className="space-y-3 print:hidden" aria-labelledby="proximos">
                    <h2 id="proximos" className="text-[19px] font-bold">Próximos</h2>
                    {gere && <FormEncontro grupoId={grupoId} abertoInicial={sp.novo === '1'} />}
                    {proximos.length === 0 ? <p className="a-card p-4 text-[16px] a-suave">Nada marcado.</p> : (
                        <ul className="space-y-3">
                            {proximos.map((e) => (
                                <li key={e.id} className="a-card space-y-1 px-4 py-3">
                                    <p className={`text-[17px] font-semibold ${e.cancelado_em ? 'line-through a-suave' : ''}`}>{e.titulo}{e.cancelado_em && <span className="ml-2 text-[14px] font-semibold no-underline" style={{ color: 'var(--a-erro)' }}>Cancelado</span>}</p>
                                    <p className={`text-[15px] a-suave ${e.cancelado_em ? 'line-through' : ''}`}>{tipo(e.tipo)} · {diaPorExtenso(e.inicio.toISOString())}, {hora(e.inicio.toISOString())}{e.fim ? `–${hora(e.fim.toISOString())}` : ''}</p>
                                    {e.local && <p className="flex items-center gap-1 text-[15px] a-suave"><MapPin size={15} aria-hidden /> {e.local}</p>}
                                    {e.descricao && !e.cancelado_em && <p className="whitespace-pre-wrap text-[15px]">{e.descricao}</p>}
                                    {!e.cancelado_em && respostasDe(e)}
                                    {gere && <AcoesEncontro grupoId={grupoId} e={paraCliente(e)} passado={false} />}
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
                                        <p className={`text-[16px] font-semibold ${e.cancelado_em ? 'line-through a-suave' : ''}`}>{e.inicio.toISOString().slice(8, 10)}/{e.inicio.toISOString().slice(5, 7)} · {e.titulo}</p>
                                        <p className="text-[15px] a-suave">{tipo(e.tipo)} · {hora(e.inicio.toISOString())}{e.presentes != null ? ` · ${e.presentes} presentes` : ''}{e.cancelado_em ? ' · Cancelado' : ''}</p>
                                        {e.registo ? <p className="whitespace-pre-wrap text-[15px]">{e.registo}</p>
                                            : passou && !e.cancelado_em && <p className="text-[15px] a-suave">Ainda sem registo.</p>}
                                        {e.presentes_membros.length > 0 && (
                                            <p className="text-[15px]"><span className="font-semibold">Estiveram:</span> {e.presentes_membros.map(nomeDe).sort((a, b) => a.localeCompare(b, 'pt')).join(', ')}</p>
                                        )}
                                        {e.foto_url && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <a href={e.foto_url} target="_blank" rel="noreferrer" className="block pt-1"><img src={e.foto_url} alt={`Foto: ${e.titulo}`} loading="lazy" className="max-h-64 w-full rounded-[14px] object-cover print:max-h-48" /></a>
                                        )}
                                        {gere && (passou || e.cancelado_em) && <div className="print:hidden"><AcoesEncontro grupoId={grupoId} e={paraCliente(e)} passado={passou && !e.cancelado_em} equipa={equipa} /></div>}
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

// Agenda: os proximos cultos e eventos, por semana (lista) ou mes a mes (calendario), com a minha
// escala em cada um e os encontros das minhas equipas (reunioes, oracoes, ensaios...).
import { redirect } from 'next/navigation'
import { CalendarDays, CalendarPlus, ChevronDown, List, MapPin, Repeat, Target, UserCheck, Users } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { estadoDaEscala } from '@/lib/escalas-app'
import Estado from '@/components/app/Estado'
import { diaPorExtenso, hora } from '@/components/app/datas'
import Link from 'next/link'
import RotinaLista from '@/components/pregacao/RotinaLista'
import { normalizarItens } from '@/lib/rotina-culto'
import { membrosDosItens } from '@/lib/rotina-culto-dados'
import { checkModulo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import { isAdmin } from '@/lib/auth-utils'
import { lerMes, limitesDoMes, TIPOS_AGENDA_DEPTO, type TipoAgendaDepto } from '@/lib/agenda'
import CalendarioMes from '@/components/CalendarioMes'
import { getTipoEvento } from '@/lib/evento-tipos'
import { gereDepartamento } from '@/lib/escalas-permissoes'
import { geralNaAgenda, grupoOndeEstou, grupoQueLidero, meusGruposIds } from '@/lib/agenda-grupos'

export const dynamic = 'force-dynamic'

function inicioDaSemana(d: Date) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // segunda-feira
    return x
}

function nomeDaSemana(inicio: Date) {
    const esta = inicioDaSemana(new Date())
    const diff = Math.round((inicio.getTime() - esta.getTime()) / (7 * 86400000))
    if (diff === 0) return 'Esta semana'
    if (diff === 1) return 'Próxima semana'
    return `Semana de ${inicio.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long' })}`
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ vista?: string; mes?: string; dia?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const db = getTenantClient(sessao.tenantId)
    const q = await searchParams
    const vista = q.vista === 'calendario' ? 'calendario' : 'lista'
    const hojeTxt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const mes = lerMes(q.mes, hojeTxt)
    const diaEscolhido = typeof q.dia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(q.dia) ? q.dia : (mes === hojeTxt.slice(0, 7) ? hojeTxt : null)

    const hoje = new Date(`${hojeTxt}T00:00:00Z`)
    const periodo = vista === 'calendario'
        ? { gte: limitesDoMes(mes).inicio, lt: limitesDoMes(mes).fim }
        : { gte: hoje, lte: new Date(hoje.getTime() + 56 * 86400000) }

    // Equipas onde posso marcar ensaios e reuniões (o botão "+ Marcar encontro" fica aqui, não no Início)
    const veTudo = await geralNaAgenda(sessao)   // administração ou Pastor
    const [deptosQueGero, gruposQueGero, meusGrupos] = await Promise.all([
        db.departamento.findMany({ where: gereDepartamento(sessao.membroId), select: { id: true, nome: true }, orderBy: { nome: 'asc' } }).catch(() => []),
        db.grupo.findMany({ where: veTudo ? {} : grupoQueLidero(sessao.membroId), select: { id: true, nome: true }, orderBy: { nome: 'asc' } }).catch(() => []),
        meusGruposIds(sessao).catch(() => [] as number[]),
    ])
    const equipasQueGero = [...deptosQueGero.map((d) => ({ chave: `d${d.id}`, nome: d.nome, href: `/membros/gestao/equipa/${d.id}/agenda?novo=1` })), ...gruposQueGero.map((g) => ({ chave: `g${g.id}`, nome: g.nome, href: `/membros/grupo/${g.id}/agenda?novo=1` }))]
    const gereAlgo = equipasQueGero.length > 0

    // Encontros das minhas equipas (o administrador vê todos)
    const encontros = await db.agendaDepartamento.findMany({
        where: {
            inicio: periodo,
            ...(veTudo ? {} : { OR: [{ departamento: { OR: [{ lider_id: sessao.membroId }, { integrantes: { some: { membro_id: sessao.membroId } } }] } }, { grupo: grupoOndeEstou(sessao.membroId) }] }),
        },
        orderBy: { inicio: 'asc' },
        select: { id: true, titulo: true, tipo: true, inicio: true, local: true, cancelado_em: true, departamento_id: true, grupo_id: true, departamento: { select: { nome: true } }, grupo: { select: { nome: true } } },
    })

    const eventos = await db.evento.findMany({
        where: { data: periodo },
        orderBy: { data: 'asc' },
        select: {
            id: true, nome: true, data: true, descricao: true, tipo: true, grupo_id: true,
            grupo: { select: { nome: true } },
            rotina: { select: { itens: true } },
            escalas: {
                where: { motivo_recusa: null },
                select: {
                    membro_id: true, funcao: true, confirmado: true, motivo_recusa: true,
                    funcao_ref: { select: { nome: true } },
                    departamento: { select: { nome: true } },
                    membro: { select: { first_name: true, last_name: true } },
                },
            },
        },
    })

    // A rotina de cada culto (todos os membros veem)
    const rotinas = new Map(eventos.map((ev) => [ev.id, ev.rotina ? normalizarItens(ev.rotina.itens) : []]))
    const [membrosRotina, temPregacao] = await Promise.all([
        membrosDosItens(sessao.tenantId, [...rotinas.values()].flat()),
        checkModulo(MODULOS.PREGACAO),
    ])

    const semanas = new Map<number, typeof eventos>()
    for (const ev of eventos) {
        const k = inicioDaSemana(ev.data).getTime()
        semanas.set(k, [...(semanas.get(k) ?? []), ev])
    }
    const encontrosDaSemana = new Map<number, typeof encontros>()
    for (const e of encontros) {
        const k = inicioDaSemana(e.inicio).getTime()
        encontrosDaSemana.set(k, [...(encontrosDaSemana.get(k) ?? []), e])
        if (!semanas.has(k)) semanas.set(k, [])
    }
    const chavesSemanas = [...semanas.keys()].sort((a, b) => a - b)

    const link = (x: { vista?: string; mes?: string; dia?: string }) => {
        const u = new URLSearchParams()
        const v = x.vista ?? vista
        if (v === 'calendario') u.set('vista', 'calendario')
        if (v === 'calendario' && (x.mes ?? mes)) u.set('mes', x.mes ?? mes)
        if (x.dia) u.set('dia', x.dia)
        const t = u.toString()
        return `/membros/agenda${t ? `?${t}` : ''}`
    }
    const diaDe = (d: Date) => d.toISOString().slice(0, 10)

    // Culto direcionado a um grupo: "Direcionado: Grupo de Homens" (e "o teu grupo" para quem é desse grupo)
    const Direcionado = ({ ev }: { ev: { grupo_id: number | null; grupo: { nome: string } | null } }) => ev.grupo_id ? (
        <span className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
            <Target size={15} aria-hidden /> Direcionado: {ev.grupo?.nome}{meusGrupos.includes(ev.grupo_id) ? ' · o teu grupo' : ''}
        </span>
    ) : null

    const CartaoEncontro = ({ e }: { e: (typeof encontros)[number] }) => (
        <li>
            <Link href={e.grupo_id ? `/membros/grupo/${e.grupo_id}/agenda` : `/membros/gestao/equipa/${e.departamento_id}/agenda`} className="a-card a-foco flex items-center gap-3 px-4 py-3">
                <Users size={20} className="shrink-0 a-suave" aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold" style={e.cancelado_em ? { textDecoration: 'line-through' } : undefined}>{e.titulo}{e.cancelado_em ? ' (cancelado)' : ''}</span>
                    <span className="block text-[14px] a-suave">
                        {TIPOS_AGENDA_DEPTO[e.tipo as TipoAgendaDepto] ?? e.tipo} · {e.departamento?.nome ?? e.grupo?.nome} · {diaPorExtenso(e.inicio.toISOString())}, às {hora(e.inicio.toISOString())}
                    </span>
                    {e.local && <span className="flex items-center gap-1 text-[14px] a-suave"><MapPin size={14} aria-hidden /> {e.local}</span>}
                </span>
            </Link>
        </li>
    )

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-6">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-[24px] font-bold">Agenda</h1>
                    <div className="flex gap-1 rounded-[14px] p-1" style={{ background: 'var(--a-borda)' }} role="tablist" aria-label="Ver como">
                        <Link role="tab" aria-selected={vista === 'lista'} href={link({ vista: 'lista' })} className={`a-foco flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[15px] font-semibold ${vista === 'lista' ? '' : 'a-suave'}`}
                            style={vista === 'lista' ? { background: 'var(--a-card)' } : undefined}><List size={17} aria-hidden /> Lista</Link>
                        <Link role="tab" aria-selected={vista === 'calendario'} href={link({ vista: 'calendario' })} className={`a-foco flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[15px] font-semibold ${vista === 'calendario' ? '' : 'a-suave'}`}
                            style={vista === 'calendario' ? { background: 'var(--a-card)' } : undefined}><CalendarDays size={17} aria-hidden /> Calendário</Link>
                    </div>
                </header>

                {gereAlgo && (
                    <section className="a-card space-y-2 p-4" aria-label="Marcar encontro">
                        <p className="flex items-center gap-2 text-[17px] font-semibold"><CalendarPlus size={20} aria-hidden /> Marcar ensaio ou reunião</p>
                        <div className="flex flex-wrap gap-2">
                            {equipasQueGero.map((d) => (
                                <Link key={d.chave} href={d.href} className="a-botao a-botao-secundario !min-h-[44px]">{d.nome}</Link>
                            ))}
                        </div>
                        <Link href="/membros/agenda/regras" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold underline"><Repeat size={18} aria-hidden /> Repetir todos os meses (ex.: toda a 1.ª segunda)</Link>
                    </section>
                )}

                {vista === 'calendario' && (
                    <>
                        <CalendarioMes mes={mes} hoje={hojeTxt} diaEscolhido={diaEscolhido} href={(x) => link({ vista: 'calendario', ...x })}
                            itens={[
                                ...eventos.map((ev) => ({ chave: `e${ev.id}`, dia: diaDe(ev.data), titulo: ev.nome, cor: 'var(--a-destaque)' })),
                                ...encontros.map((e) => ({ chave: `d${e.id}`, dia: diaDe(e.inicio), titulo: e.titulo, cor: '#d97706' })),
                            ]} />
                        <p className="flex gap-4 text-[14px] a-suave">
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--a-destaque)' }} /> Cultos e eventos</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: '#d97706' }} /> As minhas equipas</span>
                        </p>
                        {diaEscolhido && (() => {
                            const doDia = eventos.filter((ev) => diaDe(ev.data) === diaEscolhido)
                            const encDoDia = encontros.filter((e) => diaDe(e.inicio) === diaEscolhido)
                            return (
                                <section className="space-y-3" aria-label="Neste dia">
                                    <h2 className="text-[17px] font-bold">{diaPorExtenso(`${diaEscolhido}T12:00:00Z`)}</h2>
                                    {doDia.length + encDoDia.length === 0 && <p className="a-card p-4 text-[16px] a-suave">Nada marcado neste dia.</p>}
                                    <ul className="space-y-3">
                                        {doDia.map((ev) => (
                                            <li key={ev.id} className="a-card px-4 py-3">
                                                <span className="block text-[17px] font-semibold">{ev.nome}</span>
                                                <span className="block text-[15px] a-suave">{hora(ev.data.toISOString())} · {getTipoEvento(ev.tipo).label}</span>
                                                <Direcionado ev={ev} />
                                                {ev.escalas.filter((e) => e.membro_id === sessao.membroId).map((m, i) => (
                                                    <span key={i} className="mt-1 flex flex-wrap items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                                                        <UserCheck size={17} aria-hidden /> Sirvo: {m.funcao_ref?.nome || m.funcao} <Estado estado={estadoDaEscala(m)} />
                                                    </span>
                                                ))}
                                            </li>
                                        ))}
                                        {encDoDia.map((e) => <CartaoEncontro key={e.id} e={e} />)}
                                    </ul>
                                </section>
                            )
                        })()}
                    </>
                )}

                {vista === 'lista' && eventos.length + encontros.length === 0 && <p className="a-card p-5 text-[16px] a-suave">Não há cultos nem eventos marcados nas próximas semanas.</p>}

                {vista === 'lista' && chavesSemanas.map((k) => [k, semanas.get(k)!] as const).map(([k, lista]) => (
                    <section key={k} className="space-y-3">
                        <h2 className="text-[17px] font-bold a-suave">{nomeDaSemana(new Date(k))}</h2>
                        <ul className="space-y-3">
                            {lista.map((ev) => {
                                const minhas = ev.escalas.filter((e) => e.membro_id === sessao.membroId)
                                const porDepto = new Map<string, string[]>()
                                for (const e of ev.escalas) {
                                    const d = e.departamento.nome
                                    porDepto.set(d, [...(porDepto.get(d) ?? []), `${e.membro.first_name} ${e.membro.last_name} (${e.funcao_ref?.nome || e.funcao})`])
                                }
                                return (
                                    <li key={ev.id}>
                                        <details className="a-card group">
                                            <summary className="a-foco flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                                                <span className="flex-1">
                                                    <span className="block text-[17px] font-semibold">{ev.nome}</span>
                                                    <span className="block text-[15px] a-suave">{diaPorExtenso(ev.data.toISOString())}, às {hora(ev.data.toISOString())}</span>
                                                    <Direcionado ev={ev} />
                                                    {minhas.map((m, i) => (
                                                        <span key={i} className="mt-1 flex flex-wrap items-center gap-2 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                                                            <UserCheck size={17} aria-hidden /> Sirvo: {m.funcao_ref?.nome || m.funcao}
                                                            <Estado estado={estadoDaEscala(m)} />
                                                        </span>
                                                    ))}
                                                </span>
                                                <ChevronDown size={22} className="a-suave transition-transform group-open:rotate-180" aria-hidden />
                                            </summary>
                                            <div className="space-y-3 border-t px-4 py-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>
                                                {ev.descricao && <p className="a-suave">{ev.descricao}</p>}
                                                {(rotinas.get(ev.id) ?? []).length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="font-semibold">Rotina do culto</p>
                                                        <RotinaLista inicio={ev.data.toISOString()} itens={rotinas.get(ev.id)!} membros={membrosRotina} compacta />
                                                        {temPregacao && <Link href={`/pregacao/culto/${ev.id}`} className="a-foco inline-flex min-h-[44px] items-center text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                                                            Ver e partilhar a rotina
                                                        </Link>}
                                                    </div>
                                                )}
                                                {porDepto.size > 0 ? (
                                                    [...porDepto.entries()].map(([d, pessoas]) => (
                                                        <p key={d}><span className="font-semibold">{d}:</span> {pessoas.join(', ')}</p>
                                                    ))
                                                ) : (
                                                    <p className="a-suave">Ainda sem escalas.</p>
                                                )}
                                            </div>
                                        </details>
                                    </li>
                                )
                            })}
                        </ul>
                        {(encontrosDaSemana.get(k) ?? []).length > 0 && (
                            <ul className="space-y-3">{encontrosDaSemana.get(k)!.map((e) => <CartaoEncontro key={e.id} e={e} />)}</ul>
                        )}
                    </section>
                ))}
            </main>
        </div>
    )
}

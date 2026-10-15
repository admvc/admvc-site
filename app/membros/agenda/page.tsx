// Agenda: os proximos cultos e eventos, por semana, com a minha escala em cada um.
import { redirect } from 'next/navigation'
import { ChevronDown, UserCheck } from 'lucide-react'
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

export default async function AgendaPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const db = getTenantClient(sessao.tenantId)

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const eventos = await db.evento.findMany({
        where: { data: { gte: hoje, lte: new Date(hoje.getTime() + 56 * 86400000) } },
        orderBy: { data: 'asc' },
        select: {
            id: true, nome: true, data: true, descricao: true,
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

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md px-4 pt-20 pb-28 md:pt-8 space-y-6">
                <h1 className="text-[24px] font-bold">Agenda</h1>
                {eventos.length === 0 && <p className="a-card p-5 text-[16px] a-suave">Não há cultos nem eventos marcados nas próximas semanas.</p>}

                {[...semanas.entries()].map(([k, lista]) => (
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
                    </section>
                ))}
            </main>
        </div>
    )
}

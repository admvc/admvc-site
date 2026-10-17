// Agenda do mês para imprimir (A4): "visitante" (bonita, por semanas) ou "relatorio" (tabela).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { DIAS_SEMANA, eventosDaAgenda, podeFazerAgenda, porDia } from '@/lib/agenda-midia'
import { lerMes, limitesDoMes, nomeDoMes, segundaDaSemana } from '@/lib/agenda'
import { getTipoEvento } from '@/lib/evento-tipos'
import Imprimir from '@/components/app/Imprimir'

export const dynamic = 'force-dynamic'

export default async function ImprimirAgenda({ searchParams }: { searchParams: Promise<{ formato?: string; mes?: string; c?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect('/membros/dashboard')
    const q = await searchParams
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const mes = lerMes(q.mes, hoje)
    const c = Number(q.c) || null
    const relatorio = q.formato === 'relatorio'
    const { inicio, fim } = limitesDoMes(mes)
    const [linhas, casa] = await Promise.all([
        eventosDaAgenda(sessao.tenantId, inicio, fim, c),
        c ? getTenantClient(sessao.tenantId).congregacao.findUnique({ where: { id: c }, select: { nome: true } }) : null,
    ])
    const dias = porDia(linhas)
    const semanas = new Map<string, typeof dias>()
    for (const d of dias) { const k = segundaDaSemana(d.dia); semanas.set(k, [...(semanas.get(k) ?? []), d]) }
    const nomeDia = (dia: string) => DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()]

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-28 md:pt-8 print:p-0">
                <div className="flex flex-wrap items-center gap-2 print:hidden">
                    <Link href={`/midia/agenda?mes=${mes}${c ? `&c=${c}` : ''}`} className="a-foco mr-auto inline-flex min-h-[44px] items-center gap-2 text-[16px] a-suave"><ArrowLeft size={18} aria-hidden /> Agenda para divulgar</Link>
                    <Imprimir />
                </div>

                <header className="border-b pb-3 text-center" style={{ borderColor: 'var(--a-borda)' }}>
                    <p className="text-[15px] uppercase tracking-[0.3em] a-suave">Agenda ADMVC{casa ? ` · ${casa.nome}` : ''}</p>
                    <h1 className="text-[30px] font-bold first-letter:uppercase">{nomeDoMes(mes)}</h1>
                </header>

                {dias.length === 0 && <p className="text-center a-suave">Sem eventos marcados neste mês.</p>}

                {relatorio ? (
                    <table className="w-full border-collapse text-[15px]">
                        <thead><tr className="border-b text-left" style={{ borderColor: 'var(--a-borda)' }}>
                            <th className="py-2">Data</th><th>Dia</th><th>Hora</th><th>Evento</th><th>Tipo</th><th>Casa</th>
                        </tr></thead>
                        <tbody>
                            {linhas.map((l, i) => (
                                <tr key={i} className="border-b" style={{ borderColor: 'var(--a-borda)' }}>
                                    <td className="py-1.5">{l.dia.slice(8)}/{l.dia.slice(5, 7)}</td><td>{nomeDia(l.dia).split('-')[0]}</td><td>{l.hora}</td>
                                    <td className="font-semibold">{l.nome}</td><td>{getTipoEvento(l.tipo).label}</td><td>{l.casa ?? 'Todas'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot><tr><td colSpan={6} className="pt-2 text-[14px] a-suave">{linhas.length} eventos</td></tr></tfoot>
                    </table>
                ) : (
                    <div className="space-y-5">
                        {[...semanas.entries()].map(([k, ds]) => (
                            <section key={k} className="break-inside-avoid">
                                <h2 className="mb-2 text-[14px] font-semibold uppercase tracking-widest a-suave">Semana de {k.slice(8)}/{k.slice(5, 7)}</h2>
                                <ul className="space-y-2">
                                    {ds.map((d) => (
                                        <li key={d.dia} className="flex gap-4 border-l-4 pl-3" style={{ borderColor: '#f5a524' }}>
                                            <span className="w-28 shrink-0">
                                                <span className="block text-[17px] font-bold" style={{ color: '#c97a00' }}>{nomeDia(d.dia)}</span>
                                                <span className="text-[14px] a-suave">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</span>
                                            </span>
                                            <span className="space-y-0.5">
                                                {d.linhas.map((l, i) => <span key={i} className="block text-[16px]"><strong>{l.hora}</strong> · {l.nome}</span>)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                        <p className="pt-4 text-center text-[15px] a-suave">Seja bem-vindo! Estamos à sua espera.</p>
                    </div>
                )}
            </main>
        </div>
    )
}
